"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

export function PwaRegistration() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reloadRequested = useRef(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    let active = true;
    let registration: ServiceWorkerRegistration | null = null;
    const workerListeners: Array<{
      worker: ServiceWorker;
      listener: () => void;
    }> = [];

    function offerUpdate(worker: ServiceWorker | null) {
      if (active && worker && navigator.serviceWorker.controller) setWaitingWorker(worker);
    }

    function watchInstallingWorker(worker: ServiceWorker | null) {
      if (!worker) return;
      const listener = () => {
        if (worker.state === "installed") offerUpdate(worker);
      };
      worker.addEventListener("statechange", listener);
      workerListeners.push({ worker, listener });
    }

    function onControllerChange() {
      if (reloadRequested.current) window.location.reload();
    }

    function checkForUpdate() {
      if (document.visibilityState === "visible") void registration?.update().catch(() => undefined);
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
      .then((nextRegistration) => {
        if (!active) return;
        registration = nextRegistration;
        offerUpdate(nextRegistration.waiting);
        watchInstallingWorker(nextRegistration.installing);
        nextRegistration.addEventListener("updatefound", () => {
          watchInstallingWorker(nextRegistration.installing);
        });
        void nextRegistration.update().catch(() => undefined);
      })
      .catch(() => undefined);

    document.addEventListener("visibilitychange", checkForUpdate);
    window.addEventListener("online", checkForUpdate);
    const updateInterval = window.setInterval(checkForUpdate, 60 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(updateInterval);
      document.removeEventListener("visibilitychange", checkForUpdate);
      window.removeEventListener("online", checkForUpdate);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      workerListeners.forEach(({ worker, listener }) => {
        worker.removeEventListener("statechange", listener);
      });
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (waitingWorker && dialog && !dialog.open) dialog.showModal();
  }, [waitingWorker]);

  function updateNow() {
    if (!waitingWorker) return;
    setUpdating(true);
    reloadRequested.current = true;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  function updateLater() {
    dialogRef.current?.close();
    setWaitingWorker(null);
  }

  if (!waitingWorker) return null;

  return (
    <dialog
      ref={dialogRef}
      className="version-dialog"
      aria-labelledby="version-dialog-title"
      aria-describedby="version-dialog-description"
      onCancel={updateLater}
    >
      <div className="version-modal">
        <span className="version-modal-icon" aria-hidden="true"><Sparkles size={24} /></span>
        <span className="eyebrow">Aggiornamento disponibile</span>
        <h2 id="version-dialog-title">Una nuova versione di Fleai è pronta.</h2>
        <p id="version-dialog-description">
          Abbiamo pubblicato miglioramenti e correzioni. Aggiorna ora per utilizzarli senza perdere i dati già salvati.
        </p>
        <div className="version-modal-actions">
          <button type="button" className="button button-lime" onClick={updateNow} disabled={updating} autoFocus>
            {updating ? <><span className="spinner" /> Aggiornamento…</> : <><RefreshCw size={17} /> Aggiorna ora</>}
          </button>
          <button type="button" className="button button-ghost" onClick={updateLater} disabled={updating}>
            Più tardi
          </button>
        </div>
      </div>
    </dialog>
  );
}
