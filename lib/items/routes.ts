export function workspaceItemHref(itemId: string) {
  return `/app/items/${encodeURIComponent(itemId)}`;
}
