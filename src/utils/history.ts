const HISTORY_KEY = 'liuyao.history.records';
const MAX_HISTORY = 20;

export interface HistoryRecord {
  id: string;
  title: string;
  subtitle: string;
  method: string;
  question?: string;
  url: string;
  createdAt: string;
}

function readRaw(): HistoryRecord[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryRecord);
  } catch {
    return [];
  }
}

function isHistoryRecord(value: unknown): value is HistoryRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<HistoryRecord>;
  return typeof record.id === 'string'
    && typeof record.title === 'string'
    && typeof record.subtitle === 'string'
    && typeof record.method === 'string'
    && typeof record.url === 'string'
    && typeof record.createdAt === 'string';
}

export function getHistoryRecords(): HistoryRecord[] {
  return readRaw();
}

export function saveHistoryRecord(record: Omit<HistoryRecord, 'id' | 'createdAt'>): void {
  try {
    const createdAt = new Date().toISOString();
    const id = `${createdAt}:${record.url}`;
    const next: HistoryRecord = { ...record, id, createdAt };
    const existing = readRaw().filter(item => item.url !== record.url);
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([next, ...existing].slice(0, MAX_HISTORY)),
    );
  } catch {
    // History is best-effort; the app remains usable without localStorage.
  }
}

export function clearHistoryRecords(): void {
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Ignore unavailable localStorage.
  }
}
