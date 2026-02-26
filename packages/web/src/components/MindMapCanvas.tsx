// ABOUTME: SVG canvas component with pan/zoom viewport for rendering mind maps.
// ABOUTME: Renders all visible nodes and edges from Editor state.

import { useCallback, useRef } from "react";
import type { MindMapNode } from "@mindforge/core";
import { useEditor } from "../hooks/useEditor";
import { NodeView } from "./NodeView";
import { EdgeView } from "./EdgeView";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

export function MindMapCanvas() {
  const editor = useEditor();
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  const camera = editor.getCamera();
  const visibleNodes = editor.getVisibleNodes();
  const selectedId = editor.getSelectedId();
  const rootIds = new Set(editor.getRoots().map((r) => r.id));

  // Collect all parent-child edges for visible nodes
  const edges: { parent: MindMapNode; child: MindMapNode }[] = [];
  const nodeMap = new Map<string, MindMapNode>();
  for (const node of visibleNodes) {
    nodeMap.set(node.id, node);
  }
  for (const node of visibleNodes) {
    if (node.parentId !== null) {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        edges.push({ parent, child: node });
      }
    }
  }

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const cam = editor.getCamera();

      if (e.ctrlKey || e.metaKey) {
        // Zoom: pinch-to-zoom or Cmd+scroll
        const zoomFactor = 1 - e.deltaY * 0.005;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.zoom * zoomFactor));

        // Zoom toward cursor position
        const svg = svgRef.current;
        if (svg) {
          const rect = svg.getBoundingClientRect();
          const cursorX = e.clientX - rect.left;
          const cursorY = e.clientY - rect.top;

          // World coordinates under cursor before zoom
          const worldX = (cursorX - cam.x) / cam.zoom;
          const worldY = (cursorY - cam.y) / cam.zoom;

          // New camera position to keep world point under cursor
          const newX = cursorX - worldX * newZoom;
          const newY = cursorY - worldY * newZoom;

          editor.setCamera(newX, newY, newZoom);
        }
      } else {
        // Pan
        editor.setCamera(cam.x - e.deltaX, cam.y - e.deltaY, cam.zoom);
      }
    },
    [editor],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only pan on middle-click or direct canvas click (not on nodes)
      const target = e.target as SVGElement;
      if (target.tagName === "svg" || target.classList.contains("canvas-bg")) {
        isPanning.current = true;
        lastPointer.current = { x: e.clientX, y: e.clientY };
        (e.target as SVGElement).setPointerCapture(e.pointerId);
      }
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      const cam = editor.getCamera();
      editor.setCamera(cam.x + dx, cam.y + dy, cam.zoom);
    },
    [editor],
  );

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      editor.select(nodeId);
    },
    [editor],
  );

  return (
    <svg
      ref={svgRef}
      style={{
        width: "100%",
        height: "100%",
        cursor: isPanning.current ? "grabbing" : "default",
      }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <rect className="canvas-bg" width="100%" height="100%" fill="#f9fafb" />
      <g transform={`translate(${camera.x}, ${camera.y}) scale(${camera.zoom})`}>
        {edges.map((edge) => (
          <EdgeView
            key={`${edge.parent.id}-${edge.child.id}`}
            parent={edge.parent}
            child={edge.child}
          />
        ))}
        {visibleNodes.map((node) => (
          <g
            key={node.id}
            onClick={() => handleNodeClick(node.id)}
            style={{ cursor: "pointer" }}
          >
            <NodeView node={node} isSelected={node.id === selectedId} isRoot={rootIds.has(node.id)} />
          </g>
        ))}
      </g>
    </svg>
  );
}
