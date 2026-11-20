// Progress and settings, kept in this browser only. Every access is guarded:
// private windows and blocked storage just mean nothing is remembered.

export type ObjectiveState = 'done' | 'skipped';

export interface SaveData {
  version: 1;
  settings: { muted: boolean; readable: boolean };
  level1: {
    objectives: Record<string, ObjectiveState>;
    seenLogin: boolean;
    complete: boolean;
  };
  placards: string[];
}

const KEY = 'mad-models/save';

function fresh(): SaveData {
  return {
    version: 1,
    settings: { muted: false, readable: false },
    level1: { objectives: {}, seenLogin: false, complete: false },
    placards: [],
  };
}

export function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const data = JSON.parse(raw) as Partial<SaveData>;
    if (data.version !== 1) return fresh();
    const base = fresh();
    return {
      ...base,
      ...data,
      settings: { ...base.settings, ...data.settings },
      level1: { ...base.level1, ...data.level1 },
      placards: data.placards ?? [],
    } as SaveData;
  } catch {
    return fresh();
  }
}

export function save(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage unavailable: progress lasts for this visit only
  }
}

export function reset(): SaveData {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  return fresh();
}
