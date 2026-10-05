/**
 * Wrap a string so each line fits inside maxWidth.
 * Explicit newlines are preserved as paragraph breaks.
 * Words wider than the box are split by character.
 */
export function wrapTextToWidth(
  text: string,
  maxWidth: number,
  measure: (sample: string) => number,
): string[] {
  if (!text) return [""];
  const limit = maxWidth > 0 ? maxWidth : Number.POSITIVE_INFINITY;
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of paragraph.split(" ")) {
      if (!current) {
        current = fitWord(word, limit, measure, lines);
        continue;
      }
      const candidate = `${current} ${word}`;
      if (measure(candidate) <= limit) {
        current = candidate;
      } else {
        lines.push(current);
        current = fitWord(word, limit, measure, lines);
      }
    }
    if (current) lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

function fitWord(
  word: string,
  limit: number,
  measure: (sample: string) => number,
  lines: string[],
): string {
  if (measure(word) <= limit) return word;
  let chunk = "";
  for (const ch of word) {
    const next = chunk + ch;
    if (measure(next) <= limit) {
      chunk = next;
    } else {
      if (chunk) lines.push(chunk);
      chunk = ch;
    }
  }
  return chunk;
}

/** Approximate box height for wrapped editor text, in CSS pixels. */
export function estimateWrappedHeight(text: string, fontSize: number, width: number): number {
  const size = fontSize > 0 ? fontSize : 14;
  const box = width > 0 ? width : 240;
  const lines = wrapTextToWidth(text, box, (sample) => sample.length * size * 0.55);
  return Math.max(size * 1.4, lines.length * size * 1.35 + 4);
}

export const DEFAULT_TEXT_BOX_WIDTH = 240;
