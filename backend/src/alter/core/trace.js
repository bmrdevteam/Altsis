/** One model turn that called tools, and whether every result was wrapped. */
export const toolTurn = (names, wrapped) => {
  const called = (Array.isArray(names) ? names : [])
    .map((name) => String(name || ""))
    .filter(Boolean);
  const bodies = (Array.isArray(wrapped) ? wrapped : []).map((row) => String(row ?? ""));
  return {
    names: called,
    untrusted:
      called.length > 0 &&
      bodies.length > 0 &&
      bodies.every((row) => row.includes('untrusted="true"')),
  };
};
