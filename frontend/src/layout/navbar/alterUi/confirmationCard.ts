export type AlterConfirmationCard = {
  id: string;
  stage: string;
  skillId?: string;
  title?: string;
  status?: string;
  expiresAt?: string;
  summary?: string;
};

/** pending cards can be pressed. A spent or expired card cannot run the skill again. */
export const confirmationCardState = (
  card: AlterConfirmationCard | null | undefined,
  now = Date.now()
) => {
  if (!card?.id) return "absent";
  if (card.status === "consumed" || card.status === "cancelled") return card.status;
  const expires = card.expiresAt ? new Date(card.expiresAt).getTime() : 0;
  if (expires && expires <= now) return "expired";
  if (card.stage === "before_apply") return "apply";
  return "pending";
};
