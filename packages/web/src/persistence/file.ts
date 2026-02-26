// ABOUTME: File save/load using browser-fs-access for File System Access API with fallback.
// ABOUTME: Handles .mindmap files, remembers file handle for subsequent saves.

import { fileSave, fileOpen, supported as fsAccessSupported } from "browser-fs-access";
import type { Editor } from "@mindforge/core";
import { migrateToLatest } from "@mindforge/core";
import type { MindMapFileFormat } from "@mindforge/core";

const MINDMAP_EXTENSION = ".mindmap";
const MINDMAP_MIME = "application/json";

const FILE_OPTIONS = {
  mimeTypes: [MINDMAP_MIME],
  extensions: [MINDMAP_EXTENSION],
  description: "MindForge Mind Map",
};

/** Whether the File System Access API is supported (Chromium). */
export const isFileSystemAccessSupported = fsAccessSupported;

/** State for remembering the current file handle. */
let currentHandle: FileSystemFileHandle | null = null;
let currentFilename: string | null = null;

/** Get the current filename (for display in title bar). */
export function getCurrentFilename(): string | null {
  return currentFilename;
}

/** Clear the current file handle (e.g., when creating a new document). */
export function clearFileHandle(): void {
  currentHandle = null;
  currentFilename = null;
}

/**
 * Save the current editor state to a file.
 * On Chromium: uses showSaveFilePicker, reuses handle for subsequent saves.
 * On Safari/Firefox: triggers a download via <a download>.
 */
export async function saveToFile(editor: Editor): Promise<void> {
  const data = editor.toJSON();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: MINDMAP_MIME });

  const defaultName = currentFilename ?? `${data.meta.id}${MINDMAP_EXTENSION}`;

  const handle = await fileSave(blob, {
    fileName: defaultName,
    ...FILE_OPTIONS,
  }, currentHandle ?? undefined);

  // Remember the handle for subsequent saves (Chromium only)
  if (handle) {
    currentHandle = handle;
    currentFilename = handle.name;
  }
}

/**
 * Open a .mindmap file and load it into the editor.
 * Runs forward migrations if the file version is older than current.
 */
export async function openFile(editor: Editor): Promise<void> {
  const file = await fileOpen({
    ...FILE_OPTIONS,
    id: "mindforge",
  });

  const text = await file.text();
  const raw = JSON.parse(text);
  const data: MindMapFileFormat = migrateToLatest(raw);

  editor.loadJSON(data);

  // Remember the handle for subsequent saves (Chromium only)
  if (file.handle) {
    currentHandle = file.handle;
    currentFilename = file.handle.name;
  } else {
    currentHandle = null;
    currentFilename = file.name;
  }
}
