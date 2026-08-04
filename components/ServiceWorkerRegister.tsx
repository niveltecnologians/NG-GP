"use client";

import { useEffect } from "react";

// Registra el service worker (public/sw.js) apenas carga cualquier página.
// Es lo que le falta al sitio para que Chrome/Android ofrezca instalar la
// app "de verdad" (con ícono propio y pantalla completa) en vez de un
// simple acceso directo al navegador.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Si falla (por ejemplo en un navegador viejo), la app sigue
        // funcionando igual, solo sin la instalación "completa".
      });
    }
  }, []);

  return null;
}
