import { EVENT_TYPES } from "../../../core/limits.js";
import { DOMAIN_EVENT_NAMES, emitDomainEvent, onDomainEvent } from "../../../../events/domainEvents.js";
import { filterVisibleEvents } from "../../../../services/alterEventAccess.js";
import { sanitizePendingEvent } from "../../../../services/alterEvent.js";
import { toQueuedEvent } from "../subscribe.js";

describe("domain event subscription", () => {
  test("event names match the schedule type list", () => {
    expect(DOMAIN_EVENT_NAMES).toEqual(EVENT_TYPES);
  });

  test("form events carry the board, the form, and approval or submission", () => {
    expect(
      toQueuedEvent("form_submitted", {
        formName: "출석부",
        boardName: "생활",
        kind: "submission",
        formId: "form-1",
        boardId: "board-1",
        title: "출석부",
      })
    ).toMatchObject({
      title: "생활 · 출석부 · 제출",
      formName: "출석부",
      boardName: "생활",
      kind: "submission",
    });
    expect(
      toQueuedEvent("approval_requested", {
        formName: "결석계",
        boardName: "생활",
        kind: "approval",
        title: "홍길동 · 승인 요청",
      }).title
    ).toBe("생활 · 결석계 · 승인");
    expect(
      toQueuedEvent("form_posted", {
        formName: "점검",
        boardName: "수업",
        kind: "post",
      }).title
    ).toBe("수업 · 점검 · 게시");
    expect(toQueuedEvent("calendar_created", { title: "개학식" }).title).toBe("개학식");
    expect(toQueuedEvent("dm_received", { title: "1:1 메시지" }).title).toBe("1:1 메시지");
  });

  test("the queue keeps the names and the tool view shows them", async () => {
    const queued = toQueuedEvent("form_submitted", {
      entityType: "altSheetRow",
      entityId: "row-1",
      actorUserId: "student-1",
      formName: "출석부",
      boardName: "생활",
      kind: "submission",
      formId: "form-1",
      boardId: "board-1",
      content: "비밀 본문",
    });
    const stored = sanitizePendingEvent(queued);
    expect(stored.formName).toBe("출석부");
    expect(stored.boardName).toBe("생활");
    expect(stored.kind).toBe("submission");
    expect(stored.title).toBe("생활 · 출석부 · 제출");
    expect(stored.content).toBeUndefined();
    const visible = await filterVisibleEvents([stored], async () => ({ excerpt: "요약" }));
    expect(visible[0]).toMatchObject({
      title: "생활 · 출석부 · 제출",
      formName: "출석부",
      boardName: "생활",
      kind: "submission",
      excerpt: "요약",
    });
  });

  test("unknown names are not delivered", () => {
    const seen = [];
    const off = onDomainEvent("calendar_created", (payload) => seen.push(payload));
    emitDomainEvent("not_a_domain_event", { academyId: "a" });
    off();
    expect(seen).toEqual([]);
  });
});
