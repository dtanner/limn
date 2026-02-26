// ABOUTME: SVG component rendering a single mind map node.
// ABOUTME: Displays a rounded rectangle with text content.

import type { MindMapNode } from "@mindforge/core";

const BORDER_RADIUS = 6;
const PADDING_X = 8;
const PADDING_Y = 6;
const FONT_SIZE = 14;
const LINE_HEIGHT = 20;

interface NodeViewProps {
  node: MindMapNode;
  isSelected: boolean;
}

export function NodeView({ node, isSelected }: NodeViewProps) {
  const lines = node.text.split("\n");

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      <rect
        width={node.width}
        height={node.height}
        rx={BORDER_RADIUS}
        ry={BORDER_RADIUS}
        fill={isSelected ? "#e0edff" : "#ffffff"}
        stroke={isSelected ? "#3b82f6" : "#d1d5db"}
        strokeWidth={isSelected ? 2 : 1}
      />
      {node.collapsed && node.children.length > 0 && (
        <circle
          cx={node.width + 6}
          cy={node.height / 2}
          r={4}
          fill="#9ca3af"
        />
      )}
      {lines.map((line, i) => (
        <text
          key={i}
          x={PADDING_X}
          y={PADDING_Y + FONT_SIZE + i * LINE_HEIGHT}
          fontSize={FONT_SIZE}
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="#1f2937"
        >
          {line || "\u00A0"}
        </text>
      ))}
    </g>
  );
}
