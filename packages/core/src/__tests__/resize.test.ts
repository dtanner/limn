// ABOUTME: Tests for drag-to-resize node width (widthConstrained mode).
// ABOUTME: Verifies width resize handle, text reflow, undo, and constraints.

import { describe, it, expect, beforeEach } from "vitest";
import { TestEditor } from "../test-editor/TestEditor";
import { resetIdCounter } from "../store/MindMapStore";

describe("node width resize", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  function createNode(): TestEditor {
    const editor = new TestEditor();
    editor.addRoot("Hello world", 0, 0);
    editor.exitEditMode();
    return editor;
  }

  it("should start and end a width resize", () => {
    const editor = createNode();
    editor.startWidthResize("n0");
    expect(editor.isResizingWidth()).toBe(true);
    editor.endWidthResize();
    expect(editor.isResizingWidth()).toBe(false);
  });

  it("should update node width during resize", () => {
    const editor = createNode();
    const originalWidth = editor.getNode("n0").width;
    editor.startWidthResize("n0");
    editor.updateWidthResize(originalWidth + 50);
    editor.endWidthResize();
    expect(editor.getNode("n0").width).toBe(originalWidth + 50);
  });

  it("should set widthConstrained to true after resize", () => {
    const editor = createNode();
    expect(editor.getNode("n0").widthConstrained).toBe(false);
    editor.startWidthResize("n0");
    editor.updateWidthResize(200);
    editor.endWidthResize();
    expect(editor.getNode("n0").widthConstrained).toBe(true);
  });

  it("should reflow text and adjust height when width changes", () => {
    const editor = createNode();
    editor.setText("n0", "This is a longer text that should reflow when width is constrained");
    const originalHeight = editor.getNode("n0").height;

    // Make the node narrow enough to force text wrapping
    editor.startWidthResize("n0");
    editor.updateWidthResize(80);
    editor.endWidthResize();

    // Height should increase due to text wrapping
    expect(editor.getNode("n0").height).toBeGreaterThan(originalHeight);
    expect(editor.getNode("n0").width).toBe(80);
  });

  it("should enforce minimum width of 60px", () => {
    const editor = createNode();
    editor.startWidthResize("n0");
    editor.updateWidthResize(20);
    editor.endWidthResize();
    expect(editor.getNode("n0").width).toBe(60);
  });

  it("should be undoable as a single operation", () => {
    const editor = createNode();
    const originalWidth = editor.getNode("n0").width;
    const originalConstrained = editor.getNode("n0").widthConstrained;

    editor.startWidthResize("n0");
    editor.updateWidthResize(200);
    editor.updateWidthResize(250);
    editor.endWidthResize();

    expect(editor.getNode("n0").width).toBe(250);

    editor.undo();
    expect(editor.getNode("n0").width).toBe(originalWidth);
    expect(editor.getNode("n0").widthConstrained).toBe(originalConstrained);
  });

  it("should not create undo entry if width didn't change", () => {
    const editor = createNode();
    // Do a real resize first, so we have a known undo target
    editor.startWidthResize("n0");
    editor.updateWidthResize(200);
    editor.endWidthResize();
    expect(editor.getNode("n0").width).toBe(200);

    // Now do a no-op resize (start then immediately end)
    editor.startWidthResize("n0");
    editor.endWidthResize();

    // Width should still be 200
    expect(editor.getNode("n0").width).toBe(200);

    // Undo should revert the real resize, not the no-op
    editor.undo();
    expect(editor.getNode("n0").widthConstrained).toBe(false);
  });
});
