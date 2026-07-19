import type { ItemStatus } from "@/lib/contracts";

const allowedTransitions: Record<ItemStatus, ReadonlySet<ItemStatus>> = {
  draft: new Set(["published", "archived"]),
  published: new Set(["draft", "reserved", "sold", "archived"]),
  reserved: new Set(["published", "sold", "archived"]),
  sold: new Set(["archived"]),
  archived: new Set(["draft"]),
};

export function canAdminTransitionItem(from: ItemStatus, to: ItemStatus) {
  return from === to || allowedTransitions[from].has(to);
}

export function assertAdminTargetCanBeSuspended(input: {
  actorId: string;
  targetId: string;
  targetIsAdmin: boolean;
}) {
  if (input.actorId === input.targetId) return "Non puoi sospendere il tuo account amministratore.";
  if (input.targetIsAdmin) return "Gli account amministratore non possono essere sospesi dal pannello.";
  return null;
}
