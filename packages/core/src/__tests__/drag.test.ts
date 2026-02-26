// ABOUTME: Tests for drag-to-reposition and drag-to-reparent node interactions.
// ABOUTME: Verifies pointer simulation, subtree movement, undo, and reparent proximity.

import { describe, it, expect, beforeEach } from "vitest";
import { TestEditor } from "../test-editor/TestEditor";
import { resetIdCounter } from "../store/MindMapStore";

describe("drag to reposition", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  function createSimpleTree(): TestEditor {
    const editor = new TestEditor();
    // Root at (0, 0), child at (250, 0), grandchild at (500, 0)
    editor.addRoot("root", 0, 0);
    editor.select("n0");
    editor.exitEditMode();
    editor.addChild("n0", "child");
    editor.exitEditMode();
    editor.addChild("n1", "grandchild");
    editor.exitEditMode();
    return editor;
  }

  it("should start and end a drag on a node", () => {
    const editor = createSimpleTree();
    editor.pointerDown("n1", 260, 10);
    expect(editor.isDragging()).toBe(true);
    editor.pointerUp();
    expect(editor.isDragging()).toBe(false);
  });

  it("should move a node to a new position during drag", () => {
    const editor = createSimpleTree();
    const originalX = editor.getNode("n1").x;
    const originalY = editor.getNode("n1").y;

    editor.pointerDown("n1", originalX + 10, originalY + 10);
    editor.pointerMove(originalX + 60, originalY + 110);
    editor.pointerUp();

    // Node should have moved by (50, 100)
    expect(editor.getNode("n1").x).toBeCloseTo(originalX + 50, 0);
    expect(editor.getNode("n1").y).toBeCloseTo(originalY + 100, 0);
  });

  it("should move entire subtree as a rigid unit", () => {
    const editor = createSimpleTree();
    const childX = editor.getNode("n1").x;
    const childY = editor.getNode("n1").y;
    const grandchildX = editor.getNode("n2").x;
    const grandchildY = editor.getNode("n2").y;

    // Drag child node by (50, 100)
    editor.pointerDown("n1", childX + 10, childY + 10);
    editor.pointerMove(childX + 60, childY + 110);
    editor.pointerUp();

    // Both child and grandchild should have moved by (50, 100)
    expect(editor.getNode("n1").x).toBeCloseTo(childX + 50, 0);
    expect(editor.getNode("n1").y).toBeCloseTo(childY + 100, 0);
    expect(editor.getNode("n2").x).toBeCloseTo(grandchildX + 50, 0);
    expect(editor.getNode("n2").y).toBeCloseTo(grandchildY + 100, 0);
  });

  it("should select the dragged node", () => {
    const editor = createSimpleTree();
    editor.select("n0");
    editor.exitEditMode();

    const childX = editor.getNode("n1").x;
    const childY = editor.getNode("n1").y;

    editor.pointerDown("n1", childX + 10, childY + 10);
    expect(editor.getSelectedId()).toBe("n1");
    editor.pointerUp();
  });

  it("should be undoable as a single operation", () => {
    const editor = createSimpleTree();
    const originalX = editor.getNode("n1").x;
    const originalY = editor.getNode("n1").y;

    // Drag with multiple moves
    editor.pointerDown("n1", originalX + 10, originalY + 10);
    editor.pointerMove(originalX + 30, originalY + 30);
    editor.pointerMove(originalX + 60, originalY + 110);
    editor.pointerUp();

    expect(editor.getNode("n1").x).toBeCloseTo(originalX + 50, 0);

    // Single undo should revert the entire drag
    editor.undo();
    expect(editor.getNode("n1").x).toBeCloseTo(originalX, 0);
    expect(editor.getNode("n1").y).toBeCloseTo(originalY, 0);
  });

  it("should not move anything if pointer doesn't move", () => {
    const editor = createSimpleTree();
    const originalX = editor.getNode("n1").x;
    const originalY = editor.getNode("n1").y;

    editor.pointerDown("n1", originalX + 10, originalY + 10);
    editor.pointerUp();

    expect(editor.getNode("n1").x).toBe(originalX);
    expect(editor.getNode("n1").y).toBe(originalY);
  });

  it("should exit edit mode when starting a drag", () => {
    const editor = createSimpleTree();
    editor.select("n0");
    editor.enterEditMode();
    expect(editor.isEditing()).toBe(true);

    const childX = editor.getNode("n1").x;
    const childY = editor.getNode("n1").y;
    editor.pointerDown("n1", childX + 10, childY + 10);
    expect(editor.isEditing()).toBe(false);
  });
});

describe("drag to reparent", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  function createTwoChildTree(): TestEditor {
    const editor = new TestEditor();
    // Root at (0, 0)
    editor.addRoot("root", 0, 0);
    editor.select("n0");
    editor.exitEditMode();
    // child1 at (250, ~y1)
    editor.addChild("n0", "child1");
    editor.exitEditMode();
    // child2 at (250, ~y2)
    editor.addChild("n0", "child2");
    editor.exitEditMode();
    return editor;
  }

  it("should detect reparent target when dragged near another node", () => {
    const editor = createTwoChildTree();
    const child1 = editor.getNode("n1");

    // Drag child1 close to child2
    const child2 = editor.getNode("n2");
    editor.pointerDown("n1", child1.x + 10, child1.y + 10);
    // Move near child2's right edge (where a child would attach)
    editor.pointerMove(child2.x + child2.width + 50, child2.y + child2.height / 2);

    expect(editor.getReparentTarget()).toBe("n2");
    editor.pointerUp();
  });

  it("should reparent node when dropped on reparent target", () => {
    const editor = createTwoChildTree();
    const child1 = editor.getNode("n1");
    const child2 = editor.getNode("n2");

    // Drag child1 close to child2
    editor.pointerDown("n1", child1.x + 10, child1.y + 10);
    editor.pointerMove(child2.x + child2.width + 50, child2.y + child2.height / 2);
    editor.pointerUp();

    // child1 should now be a child of child2
    expect(editor.getNode("n1").parentId).toBe("n2");
    editor.expectChildren("n0", ["n2"]);
    editor.expectChildren("n2", ["n1"]);
  });

  it("should not reparent when dropped in open space", () => {
    const editor = createTwoChildTree();
    const child1 = editor.getNode("n1");

    // Drag child1 to open space far from any node
    editor.pointerDown("n1", child1.x + 10, child1.y + 10);
    editor.pointerMove(1000, 1000);
    editor.pointerUp();

    // child1 should still be a child of root
    expect(editor.getNode("n1").parentId).toBe("n0");
  });

  it("should not allow reparent to own descendant", () => {
    const editor = new TestEditor();
    editor.addRoot("root", 0, 0);
    editor.select("n0");
    editor.exitEditMode();
    editor.addChild("n0", "parent");
    editor.exitEditMode();
    editor.addChild("n1", "child");
    editor.exitEditMode();

    const parent = editor.getNode("n1");
    const child = editor.getNode("n2");

    // Drag parent near its own child
    editor.pointerDown("n1", parent.x + 10, parent.y + 10);
    editor.pointerMove(child.x + child.width + 50, child.y + child.height / 2);

    // Should NOT detect child as reparent target
    expect(editor.getReparentTarget()).toBeNull();
    editor.pointerUp();

    // parent should still have child as its child, not the other way around
    expect(editor.getNode("n1").parentId).toBe("n0");
  });

  it("should clear reparent target after drop", () => {
    const editor = createTwoChildTree();
    const child1 = editor.getNode("n1");
    const child2 = editor.getNode("n2");

    editor.pointerDown("n1", child1.x + 10, child1.y + 10);
    editor.pointerMove(child2.x + child2.width + 50, child2.y + child2.height / 2);
    expect(editor.getReparentTarget()).toBe("n2");

    editor.pointerUp();
    expect(editor.getReparentTarget()).toBeNull();
  });

  it("should be undoable as a single operation", () => {
    const editor = createTwoChildTree();
    const child1 = editor.getNode("n1");
    const child2 = editor.getNode("n2");
    const origParent = child1.parentId;

    editor.pointerDown("n1", child1.x + 10, child1.y + 10);
    editor.pointerMove(child2.x + child2.width + 50, child2.y + child2.height / 2);
    editor.pointerUp();

    expect(editor.getNode("n1").parentId).toBe("n2");

    editor.undo();
    expect(editor.getNode("n1").parentId).toBe(origParent);
  });
});
