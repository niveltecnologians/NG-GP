// Un usuario se considera "en línea" si mandó un heartbeat en los
// últimos 90 segundos (ver app/api/presence/heartbeat y components/PresenceHeartbeat.tsx).
const ONLINE_THRESHOLD_MS = 90 * 1000;

export function isOnline(lastSeenAt: Date | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}
