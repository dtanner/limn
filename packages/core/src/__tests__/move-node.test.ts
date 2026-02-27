// ABOUTME: Tests for Option+arrow structural node moves.
// ABOUTME: Covers reorder, overflow to parent's sibling, outdent, and indent.

import { describe, test, expect, beforeEach } from "vitest";
import { TestEditor } from "../test-editor/TestEditor";
import { resetIdCounter } from "../store/MindMapStore";

describe("moveNode structural moves", () => {
  let editor: TestEditor;

  beforeEach(() => {
    resetIdCounter();
  });

  // Helper: root with 3 children, each with text
  function createThreeChildTree(): TestEditor {
    editor = new TestEditor();
    editor.addRoot("root", 0, 0);
    editor.select("n0");
    editor.exitEditMode();
    editor.addChild("n0", "child1");
    editor.exitEditMode();
    editor.addChild("n0", "child2");
    editor.exitEditMode();
    editor.addChild("n0", "child3");
    editor.exitEditMode();
    return editor;
  }

  // Helper: root -> parent1 (with child1, child2), parent2 (with child3)
  function createTwoParentTree(): TestEditor {
    editor = new TestEditor();
    editor.addRoot("root", 0, 0);
    editor.select("n0");
    editor.exitEditMode();
    // n1: parent1
    editor.addChild("n0", "parent1");
    editor.exitEditMode();
    // n2: parent2
    editor.addChild("n0", "parent2");
    editor.exitEditMode();
    // n3: child of parent1
    editor.addChild("n1", "child1");
    editor.exitEditMode();
    // n4: child of parent1
    editor.addChild("n1", "child2");
    editor.exitEditMode();
    // n5: child of parent2
    editor.addChild("n2", "child3");
    editor.exitEditMode();
    return editor;
  }

  describe("Option+Up/Down: reorder within siblings", () => {
    test("Option+Down moves node down among siblings", () => {
      createThreeChildTree();
      editor.select("n1");
      editor.pressKey("ArrowDown", { alt: true });
      editor.expectChildren("n0", ["n2", "n1", "n3"]);
      // Position should update
      expect(editor.getNode("n1").y).toBeGreaterThan(editor.getNode("n2").y);
    });

    test("Option+Up moves node up among siblings", () => {
      createThreeChildTree();
      editor.select("n2");
      editor.pressKey("ArrowUp", { alt: true });
      editor.expectChildren("n0", ["n2", "n1", "n3"]);
      expect(editor.getNode("n2").y).toBeLessThan(editor.getNode("n1").y);
    });

    test("Option+j moves node down (vim-style)", () => {
      createThreeChildTree();
      editor.select("n1");
      editor.pressKey("j", { alt: true });
      editor.expectChildren("n0", ["n2", "n1", "n3"]);
    });

    test("Option+k moves node up (vim-style)", () => {
      createThreeChildTree();
      editor.select("n2");
      editor.pressKey("k", { alt: true });
      editor.expectChildren("n0", ["n2", "n1", "n3"]);
    });
  });

  describe("Option+Up/Down: overflow to parent's sibling", () => {
    test("Option+Up from first child moves to previous parent's last child", () => {
      createTwoParentTree();
      // n3 is first child of parent1 (n1)
      editor.select("n3");
      editor.pressKey("ArrowUp", { alt: true });
      // n3 was already first, moves up again...
      // Actually n3 is first child of n1. Moving up: no sibling above,
      // no previous sibling of n1? Actually n1 is first child of root.
      // So this should be a no-op.
      editor.expectChildren("n1", ["n3", "n4"]);
    });

    test("Option+Down from last child moves to next parent's first child", () => {
      createTwoParentTree();
      // n4 is second (last) child of parent1 (n1)
      editor.select("n4");
      editor.pressKey("ArrowDown", { alt: true });
      // n4 should become first child of parent2 (n2)
      expect(editor.getNode("n4").parentId).toBe("n2");
      editor.expectChildren("n1", ["n3"]);
      editor.expectChildren("n2", ["n4", "n5"]);
    });

    test("Option+Up from first child moves to previous parent's sibling", () => {
      createTwoParentTree();
      // n5 is only child of parent2 (n2). n2's previous sibling is n1.
      editor.select("n5");
      editor.pressKey("ArrowUp", { alt: true });
      // n5 should become last child of parent1 (n1)
      expect(editor.getNode("n5").parentId).toBe("n1");
      editor.expectChildren("n1", ["n3", "n4", "n5"]);
      editor.expectChildren("n2", []);
    });

    test("overflow preserves selection", () => {
      createTwoParentTree();
      editor.select("n4");
      editor.pressKey("ArrowDown", { alt: true });
      editor.expectSelected("n4");
    });
  });

  describe("Option+Left/Right: outdent and indent", () => {
    test("outdent moves node to grandparent (right-side branch)", () => {
      createTwoParentTree();
      // n3 is child of parent1 (n1), which is child of root (n0)
      // Right-side branch: outdent = Option+Left
      editor.select("n3");
      editor.pressKey("ArrowLeft", { alt: true });
      // n3 should now be child of root, inserted after parent1
      expect(editor.getNode("n3").parentId).toBe("n0");
      editor.expectChildren("n0", ["n1", "n3", "n2"]);
    });

    test("indent moves node to become child of previous sibling (right-side branch)", () => {
      createThreeChildTree();
      // n2 is second child of root (n0). Previous sibling is n1.
      // Right-side branch: indent = Option+Right
      editor.select("n2");
      editor.pressKey("ArrowRight", { alt: true });
      // n2 should now be last child of n1
      expect(editor.getNode("n2").parentId).toBe("n1");
      editor.expectChildren("n0", ["n1", "n3"]);
      editor.expectChildren("n1", ["n2"]);
    });

    test("Option+h outdents on right-side branch (vim-style)", () => {
      createTwoParentTree();
      editor.select("n3");
      editor.pressKey("h", { alt: true });
      expect(editor.getNode("n3").parentId).toBe("n0");
    });

    test("Option+l indents on right-side branch (vim-style)", () => {
      createThreeChildTree();
      editor.select("n2");
      editor.pressKey("l", { alt: true });
      expect(editor.getNode("n2").parentId).toBe("n1");
    });

    test("outdent is no-op for direct children of root", () => {
      createThreeChildTree();
      editor.select("n1");
      editor.pressKey("ArrowLeft", { alt: true });
      // n1 should still be child of root
      expect(editor.getNode("n1").parentId).toBe("n0");
      editor.expectChildren("n0", ["n1", "n2", "n3"]);
    });

    test("indent is no-op when node has no previous sibling", () => {
      createThreeChildTree();
      editor.select("n1");
      editor.pressKey("ArrowRight", { alt: true });
      // n1 has no previous sibling, should stay as-is
      expect(editor.getNode("n1").parentId).toBe("n0");
      editor.expectChildren("n0", ["n1", "n2", "n3"]);
    });
  });

  describe("no-op on root nodes", () => {
    test("Option+Up is no-op on root node", () => {
      createThreeChildTree();
      editor.select("n0");
      editor.pressKey("ArrowUp", { alt: true });
      expect(editor.getNode("n0").parentId).toBeNull();
    });

    test("Option+Down is no-op on root node", () => {
      createThreeChildTree();
      editor.select("n0");
      editor.pressKey("ArrowDown", { alt: true });
      expect(editor.getNode("n0").parentId).toBeNull();
    });

    test("Option+Left is no-op on root node", () => {
      createThreeChildTree();
      editor.select("n0");
      editor.pressKey("ArrowLeft", { alt: true });
      expect(editor.getNode("n0").parentId).toBeNull();
    });

    test("Option+Right is no-op on root node", () => {
      createThreeChildTree();
      editor.select("n0");
      editor.pressKey("ArrowRight", { alt: true });
      expect(editor.getNode("n0").parentId).toBeNull();
    });
  });

  describe("undo/redo", () => {
    test("reorder via Option+Down is undoable", () => {
      createThreeChildTree();
      editor.select("n1");
      editor.pressKey("ArrowDown", { alt: true });
      editor.expectChildren("n0", ["n2", "n1", "n3"]);
      editor.undo();
      editor.expectChildren("n0", ["n1", "n2", "n3"]);
    });

    test("overflow move is undoable", () => {
      createTwoParentTree();
      editor.select("n4");
      editor.pressKey("ArrowDown", { alt: true });
      expect(editor.getNode("n4").parentId).toBe("n2");
      editor.undo();
      expect(editor.getNode("n4").parentId).toBe("n1");
      editor.expectChildren("n1", ["n3", "n4"]);
    });

    test("outdent is undoable", () => {
      createTwoParentTree();
      editor.select("n3");
      editor.pressKey("ArrowLeft", { alt: true });
      expect(editor.getNode("n3").parentId).toBe("n0");
      editor.undo();
      expect(editor.getNode("n3").parentId).toBe("n1");
      editor.expectChildren("n1", ["n3", "n4"]);
    });

    test("indent is undoable", () => {
      createThreeChildTree();
      editor.select("n2");
      editor.pressKey("ArrowRight", { alt: true });
      expect(editor.getNode("n2").parentId).toBe("n1");
      editor.undo();
      expect(editor.getNode("n2").parentId).toBe("n0");
      editor.expectChildren("n0", ["n1", "n2", "n3"]);
    });
  });

  describe("left-side branch direction awareness", () => {
    test("outdent uses Option+Right on left-side branch", () => {
      // Create a node on the left side of root
      editor = new TestEditor();
      editor.addRoot("root", 0, 0);
      editor.select("n0");
      editor.exitEditMode();
      // Place parent on the left side manually
      editor.addChild("n0", "parent");
      editor.exitEditMode();
      // Move parent to left side of root
      editor.setNodePosition("n1", -250, 0);
      // Add child to parent
      editor.addChild("n1", "child");
      editor.exitEditMode();

      // On left-side branch, outdent = Option+Right (away from root)
      editor.select("n2");
      editor.pressKey("ArrowRight", { alt: true });
      expect(editor.getNode("n2").parentId).toBe("n0");
    });

    test("indent uses Option+Left on left-side branch", () => {
      editor = new TestEditor();
      editor.addRoot("root", 0, 0);
      editor.select("n0");
      editor.exitEditMode();
      // Two children on left side
      editor.addChild("n0", "sibling1");
      editor.exitEditMode();
      editor.setNodePosition("n1", -250, -26);
      editor.addChild("n0", "sibling2");
      editor.exitEditMode();
      editor.setNodePosition("n2", -250, 26);

      // On left-side branch, indent = Option+Left (toward root)
      editor.select("n2");
      editor.pressKey("ArrowLeft", { alt: true });
      expect(editor.getNode("n2").parentId).toBe("n1");
    });
  });
});
