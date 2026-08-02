"use client";

import { useEffect } from "react";

// Componente invisible: mientras la persona tiene la app abierta, avisa
// cada cierto tiempo que sigue conectada (así el resto del equipo ve el
// punto verde de "en línea" en el chat).
export default function PresenceHeartbeat() {
  useEffect(() => {
    function ping() {
      fetch("/api/presence/heartbeat", { method: "POST" }).catch(() => {});
    }
    ping();
    const interval = setInterval(ping, 30000);

    function onVisibility() {
      if (document.visibilityState === "visible") ping();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
