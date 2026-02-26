// ABOUTME: DOM-based TextMeasurer using an off-screen element.
// ABOUTME: Measures actual text dimensions for accurate node sizing.

import type { TextMeasurer, NodeStyle } from "@mindforge/core";

const FONT_SIZE = 14;
const FONT_FAMILY = "system-ui, -apple-system, sans-serif";
const LINE_HEIGHT = 20;
const PADDING_X = 10;
const PADDING_Y = 6;
const MIN_WIDTH = 100;

let measureEl: HTMLDivElement | null = null;

function getMeasureElement(): HTMLDivElement {
  if (measureEl) return measureEl;
  measureEl = document.createElement("div");
  measureEl.style.position = "absolute";
  measureEl.style.visibility = "hidden";
  measureEl.style.whiteSpace = "pre";
  measureEl.style.fontSize = `${FONT_SIZE}px`;
  measureEl.style.fontFamily = FONT_FAMILY;
  measureEl.style.lineHeight = `${LINE_HEIGHT}px`;
  measureEl.style.padding = `${PADDING_Y}px ${PADDING_X}px`;
  measureEl.style.boxSizing = "border-box";
  document.body.appendChild(measureEl);
  return measureEl;
}

export const domTextMeasurer: TextMeasurer = {
  measure(text: string, _style?: NodeStyle) {
    const el = getMeasureElement();
    el.style.whiteSpace = "pre";
    el.style.width = "";
    el.textContent = text || "\u00A0";
    const width = Math.max(MIN_WIDTH, Math.ceil(el.offsetWidth));
    const height = Math.max(32, Math.ceil(el.offsetHeight));
    return { width, height };
  },

  reflow(text: string, maxWidth: number, _style?: NodeStyle) {
    const el = getMeasureElement();
    el.style.whiteSpace = "pre-wrap";
    el.style.wordBreak = "break-word";
    el.style.width = `${maxWidth}px`;
    el.textContent = text || "\u00A0";
    const height = Math.max(32, Math.ceil(el.offsetHeight));
    return { width: maxWidth, height };
  },
};
