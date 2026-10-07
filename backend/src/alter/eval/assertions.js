import { assertReadOnlyPrompt } from "../../services/alterScheduleTime.js";

const MARKDOWN_RE = /\*\*|```|\[[^\]]*]\([^)]+\)/;

const includes = (text, needle) => String(text || "").includes(needle);

/** True when `pattern` is a valid regex and matches `text`. Invalid patterns do not match. */
export const textMatches = (text, pattern) => {
  const source = String(pattern ?? "");
  if (!source) return false;
  try {
    return new RegExp(source).test(String(text ?? ""));
  } catch (_) {
    return false;
  }
};

const fail = (id, message) => `${id}: ${message}`;

const textOf = (result) => String(result?.text || "");

/** In real mode a `real` block replaces `expect`. Scripted phrases stay on the scripted side. */
export const expectForMode = (scenario, mode) => {
  if (mode === "real" && scenario?.real && typeof scenario.real === "object") return scenario.real;
  return scenario?.expect || {};
};

export const checkExpect = (scenario, result, mode = "scripted") => {
  const id = scenario.id;
  const expect = expectForMode(scenario, mode);
  const errors = [];
  const text = textOf(result);
  const toolNames = result?.toolNames || [];
  const tools = expect.tools || {};

  if (Array.isArray(tools.exact)) {
    const same =
      toolNames.length === tools.exact.length &&
      toolNames.every((name, index) => name === tools.exact[index]);
    if (!same) errors.push(fail(id, `tools ${JSON.stringify(toolNames)} !== ${JSON.stringify(tools.exact)}`));
  }
  for (const name of tools.mustCall || []) {
    if (!toolNames.includes(name)) errors.push(fail(id, `missing tool ${name}`));
  }
  for (const name of tools.mustNotCall || []) {
    if (toolNames.includes(name)) errors.push(fail(id, `called ${name}`));
  }
  for (const name of tools.subset || []) {
    if (!toolNames.includes(name)) errors.push(fail(id, `missing tool ${name}`));
  }
  if (Array.isArray(tools.allow)) {
    for (const name of toolNames) {
      if (!tools.allow.includes(name)) errors.push(fail(id, `tool ${name} is not allowed`));
    }
  }
  if (tools.sameTurn) {
    const first = (result.trace || [])[0]?.names || [];
    const required = tools.mustCall?.length
      ? tools.mustCall
      : tools.exact?.length
        ? tools.exact
        : tools.subset || [];
    for (const name of required) {
      if (!first.includes(name)) errors.push(fail(id, `${name} was not in the first turn`));
    }
  }
  if (Number.isFinite(expect.maxToolSteps) && Number(result.toolSteps) > expect.maxToolSteps) {
    errors.push(fail(id, `tool steps ${result.toolSteps} > ${expect.maxToolSteps}`));
  }

  const textExpect = expect.text || {};
  for (const needle of textExpect.contains || []) {
    if (!includes(text, needle)) errors.push(fail(id, `text missing ${needle}`));
  }
  for (const needle of textExpect.notContains || []) {
    if (includes(text, needle)) errors.push(fail(id, `text has ${needle}`));
  }
  if (Array.isArray(textExpect.anyOf) && textExpect.anyOf.length) {
    if (!textExpect.anyOf.some((needle) => includes(text, needle))) {
      errors.push(fail(id, `text matched none of ${textExpect.anyOf.join(" / ")}`));
    }
  }
  for (const pattern of textExpect.matches || []) {
    let ok = false;
    try {
      ok = new RegExp(pattern).test(text);
    } catch (_) {
      errors.push(fail(id, `bad pattern ${pattern}`));
      continue;
    }
    if (!ok) errors.push(fail(id, `text missed /${pattern}/`));
  }
  for (const needle of textExpect.containsOnce || []) {
    const found = text.split(needle).length - 1;
    if (found !== 1) errors.push(fail(id, `${needle} appears ${found} times`));
  }
  if (Array.isArray(textExpect.ordered)) {
    let at = -1;
    for (const needle of textExpect.ordered) {
      const next = text.indexOf(needle);
      if (next < 0 || next < at) {
        errors.push(fail(id, `order broken at ${needle}`));
        break;
      }
      at = next;
    }
  }

  if (expect.notification) {
    const note = result.notification;
    if (!note) errors.push(fail(id, "notification missing"));
    else {
      if (expect.notification.type && note.type !== expect.notification.type) {
        errors.push(fail(id, `notification ${note.type}`));
      }
      const body = String(note.description || "");
      if (body.length > expect.notification.maxChars) {
        errors.push(fail(id, `notification length ${body.length}`));
      }
      if (expect.notification.noMarkdown && MARKDOWN_RE.test(body)) {
        errors.push(fail(id, "notification has markdown"));
      }
    }
  }

  if (expect.untrusted) {
    const wrapped = (result.trace || []).some((row) => row?.untrusted === true);
    if (!wrapped) errors.push(fail(id, "tool result was not wrapped"));
  }

  if (expect.proposal) {
    const proposal = result.proposal;
    if (!proposal) errors.push(fail(id, "proposal missing"));
    else {
      if (expect.proposal.action && proposal.action !== expect.proposal.action) {
        errors.push(fail(id, `proposal action ${proposal.action}`));
      }
      if (expect.proposal.saved === false && proposal.saved === true) {
        errors.push(fail(id, "proposal was saved"));
      }
      if (expect.proposal.schedule) {
        if (proposal.schedule?.kind !== expect.proposal.schedule.kind) {
          errors.push(fail(id, `schedule kind ${proposal.schedule?.kind}`));
        }
        if (proposal.schedule?.time !== expect.proposal.schedule.time) {
          errors.push(fail(id, `schedule time ${proposal.schedule?.time}`));
        }
      }
      for (const needle of expect.proposal.promptNotContains || []) {
        if (includes(proposal.prompt, needle)) errors.push(fail(id, `prompt has ${needle}`));
      }
      if (expect.proposal.promptReadOnly) {
        try {
          assertReadOnlyPrompt(proposal.prompt);
        } catch (_) {
          errors.push(fail(id, "routine prompt has a write verb"));
        }
      }
    }
  }

  const linkPath = (path) => {
    const raw = String(path || "");
    try {
      const url = new URL(raw, "http://eval.local");
      const doc = url.searchParams.get("doc");
      if (doc) return `${url.pathname}?doc=${doc}`;
      return `${url.pathname}${url.search}`;
    } catch (_) {
      return raw;
    }
  };
  for (const path of expect.links || []) {
    const paths = (result.links || []).map((link) => linkPath(link.path));
    if (!paths.includes(linkPath(path))) errors.push(fail(id, `link missing ${path}`));
  }
  for (const path of expect.linksExclude || []) {
    const paths = (result.links || []).map((link) => link.path);
    if (paths.includes(path)) errors.push(fail(id, `unexpected link ${path}`));
  }

  if (expect.status != null && result.status !== expect.status) {
    errors.push(fail(id, `status ${result.status}`));
  }
  if (expect.code && result.code !== expect.code) errors.push(fail(id, `code ${result.code}`));
  if (expect.messageContains && !includes(result.message, expect.messageContains)) {
    errors.push(fail(id, `message ${result.message}`));
  }
  if (Array.isArray(expect.statuses)) {
    const got = result.statuses || [];
    if (got.length !== expect.statuses.length || got.some((code, i) => code !== expect.statuses[i])) {
      errors.push(fail(id, `statuses ${JSON.stringify(got)}`));
    }
  }
  if (Array.isArray(expect.codes)) {
    const got = result.codes || [];
    if (expect.codes.some((code) => !got.includes(code))) {
      errors.push(fail(id, `codes ${JSON.stringify(got)}`));
    }
  }
  if (expect.created != null && result.created !== expect.created) {
    errors.push(fail(id, `created ${result.created}`));
  }
  if (expect.sameId === true && result.sameId !== true) errors.push(fail(id, "confirm was not idempotent"));
  if (expect.count != null && result.count !== expect.count) errors.push(fail(id, `count ${result.count}`));
  if (expect.allowed === true && result.allowed !== true) errors.push(fail(id, "read prompt was refused"));
  if (expect.refused === true && result.refused !== true) errors.push(fail(id, "write prompt was stored"));
  if (expect.unavailable === true && result.unavailable !== true) {
    errors.push(fail(id, "deleted row was dropped"));
  }
  if (expect.enqueueReason && result.enqueueReason !== expect.enqueueReason) {
    errors.push(fail(id, `enqueue ${result.enqueueReason}`));
  }
  if (expect.notified === false && result.notified) errors.push(fail(id, "notification was sent"));
  if (expect.runStatus && result.runStatus !== expect.runStatus) {
    errors.push(fail(id, `run ${result.runStatus}`));
  }
  if (Number.isFinite(expect.parseErrors) && result.parseErrors !== expect.parseErrors) {
    errors.push(fail(id, `parse errors ${result.parseErrors}`));
  }
  for (const needle of expect.excerptContains || []) {
    if (!includes(result.excerpt, needle)) errors.push(fail(id, `excerpt missing ${needle}`));
  }
  for (const needle of expect.excerptNotContains || []) {
    if (includes(result.excerpt, needle)) errors.push(fail(id, `excerpt has ${needle}`));
  }
  return errors;
};
