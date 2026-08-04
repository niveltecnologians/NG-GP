"use client";

import { useEffect, useState } from "react";

// Botón "Instalar app" visible en el navbar (celular y escritorio).
// - Android/Chrome/Edge: el navegador dispara el evento "beforeinstallprompt";
//   lo guardamos y, al tocar el botón, mostramos el diálogo nativo de instalar.
// - iPhone/iPad (Safari): no existe ese evento, así que el botón abre un
//   mini instructivo ("toca compartir → Agregar a inicio").
// - Si ya está instalada (se abrió como app, "standalone"), el botón se oculta.
export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    setIsStandalone(!!standalone);

    const ua = window.navigator.userAgent || "";
    setIsIos(/iphone|ipad|ipod/i.test(ua));

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    function handleInstalled() {
      setDeferredPrompt(null);
      setIsStandalone(true);
    }
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (isStandalone) return null;
  if (!deferredPrompt && !isIos) return null; // el navegador no ofrece instalación (o ya se descartó)

  async function handleClick() {
    if (isIos) {
      setShowIosHelp(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="hidden text-xs text-slate-400 hover:text-brand-600 sm:inline"
        title="Instalar esta app en tu celular o computadora"
      >
        📲 Instalar app
      </button>

      {showIosHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setShowIosHelp(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-sm space-y-3 p-6 text-sm">
            <h2 className="text-lg font-semibold">Instalar en iPhone/iPad</h2>
            <ol className="list-decimal space-y-2 pl-4 text-slate-600">
              <li>Toca el botón de compartir (el cuadrado con la flecha hacia arriba) en la barra de Safari.</li>
              <li>
                Baja el menú y elige <strong>"Agregar a inicio"</strong>.
              </li>
              <li>Confirma. Va a quedar un ícono en tu pantalla de inicio.</li>
            </ol>
            <p className="text-xs text-slate-400">Tiene que ser desde Safari — Chrome en iPhone no puede instalarla.</p>
            <div className="flex justify-end">
              <button onClick={() => setShowIosHelp(false)} className="btn-secondary py-1.5 text-xs">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
