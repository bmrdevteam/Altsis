/**
 * Re-check that the routine owner may still see an event.
 * Pending rows keep ids and a short title. Bodies are read here, truncated.
 */

import mongoose from "mongoose";
import {
  AltForm,
  AltSheetRow,
  Board,
  CalendarEvent,
  ChatMessage,
  ChatRoom,
  User,
} from "../models/index.js";
import { canManageForm, getAltBoardRole } from "./altForms.js";
import { truncateSummary } from "./alterScheduleTime.js";

const EXCERPT = 180;

const safeId = (value) => {
  const text = String(value || "").trim();
  if (!mongoose.Types.ObjectId.isValid(text)) return "";
  try {
    return String(new mongoose.Types.ObjectId(text)) === text ? text : "";
  } catch {
    return "";
  }
};

const ownerOf = async (academyId, routine) => {
  if (routine.owner) return routine.owner;
  return User(academyId).findById(routine.user).select("_id userId userName auth").lean();
};

const boardOf = async (academyId, boardId) => {
  if (!boardId) return null;
  return Board(academyId).findById(boardId).lean();
};

const readRow = async (academyId, evt, readers) => {
  if (readers.row) return readers.row(evt);
  const id = safeId(evt.entityId);
  if (!id) return null;
  return AltSheetRow(academyId).findById(id).select("form board data isDraft").lean();
};

const readForm = async (academyId, formId, readers) => {
  if (readers.form) return readers.form(formId);
  const id = safeId(formId);
  if (!id) return null;
  return AltForm(academyId).findById(id).lean();
};

const readBoard = async (academyId, boardId, readers) => {
  if (!boardId) return null;
  if (readers.board) return readers.board(boardId);
  return boardOf(academyId, boardId);
};

const readCalendar = async (academyId, evt, readers) => {
  if (readers.calendar) return readers.calendar(evt);
  const id = safeId(evt.entityId);
  if (!id) return null;
  return CalendarEvent(academyId).findById(id).select("title description scope").lean();
};

const readMessage = async (academyId, evt, readers) => {
  if (readers.message) return readers.message(evt);
  const id = safeId(evt.entityId);
  if (!id) return null;
  return ChatMessage(academyId).findById(id).select("content room sender").lean();
};

const readRoom = async (academyId, roomId, readers) => {
  if (readers.room) return readers.room(roomId);
  const id = safeId(roomId);
  if (!id) return null;
  return ChatRoom(academyId).findById(id).select("type participants").lean();
};

/**
 * readers is for tests. Production uses the academy models.
 */
export const accessToEvent = async (academyId, routine, evt, readers = {}) => {
  const owner = readers.owner ? await readers.owner(routine) : await ownerOf(academyId, routine);
  if (!owner) return null;
  const roleOf = readers.role || ((board, person) => getAltBoardRole(board, person));
  const manageOf = readers.manage || ((board, person) => canManageForm(board, person));
  if (evt.type === "approval_requested" || evt.type === "form_submitted") {
    const row = await readRow(academyId, evt, readers);
    const formId = evt.formId || row?.form;
    const form = await readForm(academyId, formId, readers);
    const board = await readBoard(academyId, evt.boardId || row?.board || form?.board, readers);
    if (!board) return null;
    if (evt.type === "approval_requested") {
      if (!roleOf(board, owner)) return null;
      return {
        excerpt: truncateSummary(evt.title || form?.title || "", EXCERPT),
        ...(row ? {} : { unavailable: true }),
      };
    }
    if (!manageOf(board, owner)) return null;
    if (row?.isDraft) return null;
    if (!row) {
      const label = evt.title || form?.title || "";
      if (!label) return null;
      return { excerpt: truncateSummary(label, EXCERPT), unavailable: true };
    }
    if (!form) return null;
    const data = row?.data && typeof row.data === "object" ? row.data : {};
    const text = Object.values(data)
      .filter((value) => typeof value === "string")
      .join(" ");
    return { excerpt: truncateSummary(text || evt.title || form.title || "", EXCERPT) };
  }
  if (evt.type === "form_posted") {
    const form = await readForm(academyId, evt.formId || evt.entityId, readers);
    const board = await readBoard(academyId, evt.boardId || form?.board, readers);
    if (!board || !roleOf(board, owner)) return null;
    if (form?.isDraft) return null;
    if (!form) {
      return { excerpt: truncateSummary(evt.title || "", EXCERPT), unavailable: true };
    }
    return { excerpt: truncateSummary(form?.title || evt.title || "", EXCERPT) };
  }
  if (evt.type === "calendar_created") {
    const event = await readCalendar(academyId, evt, readers);
    if (event?.scope === "personal" || evt.calendarScope === "personal") return null;
    if (!event) {
      if (evt.calendarScope !== "school") return null;
      return { excerpt: truncateSummary(evt.title || "", EXCERPT), unavailable: true };
    }
    return {
      excerpt: truncateSummary(
        [event.title, event.description].filter(Boolean).join(" "),
        EXCERPT
      ),
    };
  }
  if (evt.type === "dm_received") {
    if (routine.event?.dmOptIn !== true) return null;
    const message = await readMessage(academyId, evt, readers);
    if (!message) return null;
    const room = await readRoom(academyId, message.room, readers);
    if (!room || room.type !== "direct") return null;
    const member = (room.participants || []).some(
      (person) => String(person.user) === String(owner._id)
    );
    if (!member) return null;
    return { excerpt: truncateSummary(message.content || "", EXCERPT) };
  }
  return null;
};

export const canQueueEvent = async (academyId, routine, evt, readers) => {
  if (evt.type === "calendar_created" && evt.calendarScope === "personal") return false;
  if (evt.type === "dm_received" && routine.event?.dmOptIn !== true) return false;
  const seen = await accessToEvent(academyId, routine, evt, readers);
  return !!seen;
};

export const filterVisibleEvents = async (events, canSee) => {
  const kept = [];
  for (const evt of events || []) {
    const seen = await canSee(evt);
    if (!seen) continue;
    const visible = {
      type: evt.type,
      entityType: evt.entityType,
      entityId: String(evt.entityId || ""),
      title: String(evt.title || ""),
      at: evt.at,
      excerpt: String(seen.excerpt || "").slice(0, EXCERPT),
    };
    if (evt.formId) visible.formId = String(evt.formId);
    if (evt.boardId) visible.boardId = String(evt.boardId);
    if (seen.unavailable) visible.unavailable = true;
    kept.push(visible);
  }
  return kept;
};

export const loadVisibleTriggerEvents = async (academyId, doc) =>
  filterVisibleEvents(doc?.pending?.events || [], (evt) => accessToEvent(academyId, doc, evt));
