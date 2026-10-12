// Plain-language helpers shared by the dashboard views.

export const THREAT_LABELS = {
  CHAINSAW: 'Chainsaw',
  GUNSHOT: 'Gunshot',
  VEHICLE_ENGINE: 'Vehicle engine',
  ILLEGAL_VESSEL: 'Illegal vessel',
  BLAST_FISHING: 'Blast fishing',
  UNKNOWN: 'Unclassified',
};

export function threatLabel(type) {
  if (!type) return 'Unclassified';
  if (THREAT_LABELS[type]) return THREAT_LABELS[type];
  const text = String(type).replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Detections newer than this count as "active" in the status banner.
export const ACTIVE_WINDOW_MINUTES = 30;

export function alertTime(alert) {
  const raw = alert && (alert.timestamp || alert.receivedAt);
  const t = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(t) ? null : t;
}

export function timeAgo(timeMs, nowMs = Date.now()) {
  if (timeMs == null) return 'just now';
  const secs = Math.max(0, Math.round((nowMs - timeMs) / 1000));
  if (secs < 45) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}
