import { StartItemRunButton } from "@/components/start-item-run-button";

export function ConvertToShopButton({ itemId }: { itemId: string }) {
  return (
    <StartItemRunButton
      itemId={itemId}
      kind="listing_draft"
      label="Trasforma in annuncio"
      busyLabel="Creo la bozza…"
    />
  );
}
