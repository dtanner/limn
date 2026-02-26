// ABOUTME: IndexedDB auto-save using idb-keyval with debounced writes.
// ABOUTME: Persists mind map state between sessions; supports cross-tab sync.

import { get, set } from "idb-keyval";
import type { Editor } from "@mindforge/core";
import type { MindMapFileFormat } from "@mindforge/core";

const SAVE_DEBOUNCE_MS = 500;
const IDB_PREFIX = "mindforge:doc:";
const IDB_REVISION_PREFIX = "mindforge:rev:";
const BROADCAST_CHANNEL_NAME = "mindforge-sync";

interface StoredDocument {
  data: MindMapFileFormat;
  savedAt: number;
}

/** Load a document from IndexedDB by its meta.id. */
export async function loadFromIDB(docId: string): Promise<MindMapFileFormat | null> {
  const stored = await get<StoredDocument>(IDB_PREFIX + docId);
  return stored?.data ?? null;
}

/** Save a document to IndexedDB. */
async function saveToIDB(docId: string, data: MindMapFileFormat, revision: number): Promise<void> {
  await set(IDB_PREFIX + docId, { data, savedAt: Date.now() } satisfies StoredDocument);
  await set(IDB_REVISION_PREFIX + docId, revision);
}

/**
 * Set up auto-save for an editor.
 * Returns a cleanup function that stops auto-save and closes the BroadcastChannel.
 */
export function setupAutoSave(
  editor: Editor,
  docId: string,
  onRemoteUpdate?: (data: MindMapFileFormat) => void,
): () => void {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let revision = 0;
  let channel: BroadcastChannel | null = null;

  // Set up BroadcastChannel for cross-tab sync
  try {
    channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.onmessage = async (event) => {
      const msg = event.data;
      if (msg.docId === docId && msg.revision > revision) {
        revision = msg.revision;
        const data = await loadFromIDB(docId);
        if (data && onRemoteUpdate) {
          onRemoteUpdate(data);
        }
      }
    };
  } catch {
    // BroadcastChannel not available (e.g., some test environments)
  }

  // Subscribe to editor changes
  const unsubscribe = editor.subscribe(() => {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(async () => {
      saveTimer = null;
      revision++;
      const data = editor.toJSON();
      await saveToIDB(docId, data, revision);

      // Broadcast to other tabs
      try {
        channel?.postMessage({ docId, revision });
      } catch {
        // Channel may be closed
      }
    }, SAVE_DEBOUNCE_MS);
  });

  return () => {
    unsubscribe();
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
    }
    channel?.close();
  };
}
