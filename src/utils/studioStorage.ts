/**
 * Persistent IndexedDB Storage for Custom Cloned Voices & Generated Audio History
 * Eliminates the 5MB localStorage quota limit so users can save unlimited high-resolution
 * cloned voices (with reference audio) and generated studio outputs on Android & Web.
 */

import { ClonedVoiceProfile, GeneratedAudioItem } from "../types/voice";

const DB_NAME = "KanthoCloneStudioDB";
const DB_VERSION = 1;
const STORE_VOICES = "custom_voices";
const STORE_HISTORY = "audio_history";

function openStudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      return reject(new Error("IndexedDB not supported"));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_VOICES)) {
        db.createObjectStore(STORE_VOICES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        db.createObjectStore(STORE_HISTORY, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadCustomVoicesFromDb(): Promise<ClonedVoiceProfile[]> {
  try {
    const db = await openStudioDb();
    return await new Promise<ClonedVoiceProfile[]>((resolve, reject) => {
      const tx = db.transaction(STORE_VOICES, "readonly");
      const store = tx.objectStore(STORE_VOICES);
      const req = store.getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveCustomVoicesToDb(voices: ClonedVoiceProfile[]): Promise<void> {
  try {
    const db = await openStudioDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_VOICES, "readwrite");
      const store = tx.objectStore(STORE_VOICES);
      store.clear();
      for (const v of voices) {
        store.put(v);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore fallback errors
  }
}

export async function loadHistoryFromDb(): Promise<GeneratedAudioItem[]> {
  try {
    const db = await openStudioDb();
    return await new Promise<GeneratedAudioItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE_HISTORY, "readonly");
      const store = tx.objectStore(STORE_HISTORY);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = Array.isArray(req.result) ? (req.result as GeneratedAudioItem[]) : [];
        resolve(list.slice(0, 30));
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveHistoryToDb(items: GeneratedAudioItem[]): Promise<void> {
  try {
    const db = await openStudioDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_HISTORY, "readwrite");
      const store = tx.objectStore(STORE_HISTORY);
      store.clear();
      for (const item of items.slice(0, 25)) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore fallback errors
  }
}

/**
 * Generates an accurate SubRip (.SRT) subtitle file synced to the audio duration
 * for instant import into CapCut, Premiere Pro, InShot, or YouTube Studio.
 */
export function generateSrtSubtitles(scriptText: string, totalDurationSec: number): string {
  const clean = scriptText
    .replace(/<breath>|<laugh>|<gasp>|\|mhm\||\|yeah\|/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "";

  const rawClauses = clean
    .split(/(?<=[।.!?,;—\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const clauses: string[] = [];
  for (const clause of rawClauses) {
    const words = clause.split(/\s+/);
    if (words.length <= 10) {
      clauses.push(clause);
    } else {
      for (let i = 0; i < words.length; i += 8) {
        clauses.push(words.slice(i, i + 8).join(" "));
      }
    }
  }

  if (clauses.length === 0) clauses.push(clean);

  const totalChars = Math.max(1, clauses.reduce((acc, c) => acc + c.length, 0));
  const safeDuration = Math.max(1.5, totalDurationSec || 5.0);

  const formatSrtTimestamp = (sec: number): string => {
    const totalMs = Math.max(0, Math.round(sec * 1000));
    const hours = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
  };

  let cursorSec = 0;
  const blocks: string[] = [];

  clauses.forEach((clause, idx) => {
    const weight = clause.length / totalChars;
    const segDur = Math.max(0.8, safeDuration * weight);
    const startSec = cursorSec;
    const endSec =
      idx === clauses.length - 1 ? safeDuration : Math.min(safeDuration, cursorSec + segDur);
    cursorSec = endSec;

    blocks.push(
      `${idx + 1}\n${formatSrtTimestamp(startSec)} --> ${formatSrtTimestamp(endSec)}\n${clause}`
    );
  });

  return blocks.join("\n\n") + "\n";
}
