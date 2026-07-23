export default function ItemDetailLoading() {
  return (
    <div className="panel workspace-item-feedback workspace-item-loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <div>
        <strong>Apro la scheda dell’oggetto…</strong>
        <p className="muted">Sto caricando foto e dati privati. Nessuna ricerca AI è stata avviata.</p>
      </div>
    </div>
  );
}
