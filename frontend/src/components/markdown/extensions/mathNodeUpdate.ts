export type MathNodeLike = {
  type: { name: string };
  attrs?: { latex?: string };
};

/** NodeView.update: 타입이 맞으면 true. latex가 바뀔 때만 render를 부른다. */
export const applyMathNodeUpdate = (
  expectedType: string,
  updatedNode: MathNodeLike,
  currentLatex: string,
  render: (latex: string) => void
): boolean => {
  if (updatedNode.type.name !== expectedType) return false;
  const next = updatedNode.attrs?.latex ?? "";
  if (next !== currentLatex) render(next);
  return true;
};
