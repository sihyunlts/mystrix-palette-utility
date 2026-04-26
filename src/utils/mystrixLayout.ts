export const MYSTRIX_GRID_SIZE = 8;
export const MYSTRIX_PADS_PER_HOUSING = MYSTRIX_GRID_SIZE * MYSTRIX_GRID_SIZE;
const MYSTRIX_UNDER_LIGHT_PREVIEW_INDEX_OFFSET = 128;

export const MYSTRIX_UNDER_LIGHT_SIDES = [
  { side: 'top', notes: [28, 29, 30, 31, 32, 33, 34, 35] },
  { side: 'right', notes: [100, 101, 102, 103, 104, 105, 106, 107] },
  { side: 'bottom', notes: [116, 117, 118, 119, 120, 121, 122, 123] },
  { side: 'left', notes: [108, 109, 110, 111, 112, 113, 114, 115] },
] as const;

export type MystrixUnderLightSide = (typeof MYSTRIX_UNDER_LIGHT_SIDES)[number]['side'];

const MYSTRIX_UNDER_LIGHT_NOTES = MYSTRIX_UNDER_LIGHT_SIDES.flatMap(({ notes }) => notes);

export const toUnderLightPreviewIndex = (note: number) => (
  MYSTRIX_UNDER_LIGHT_PREVIEW_INDEX_OFFSET + note
);

export const isUnderLightPreviewIndex = (index: number) => (
  index >= MYSTRIX_UNDER_LIGHT_PREVIEW_INDEX_OFFSET
);

const NOTE_TO_PREVIEW_INDEX: Record<number, number> = (() => {
  const map: Record<number, number> = {};
  for (let row = 0; row < MYSTRIX_GRID_SIZE; row++) {
    for (let column = 0; column < MYSTRIX_GRID_SIZE; column++) {
      const note = column < 4
        ? 36 + (MYSTRIX_GRID_SIZE - 1 - row) * 4 + column
        : 68 + (MYSTRIX_GRID_SIZE - 1 - row) * 4 + (column - 4);
      map[note] = row * MYSTRIX_GRID_SIZE + column;
    }
  }
  for (const note of MYSTRIX_UNDER_LIGHT_NOTES) {
    map[note] = toUnderLightPreviewIndex(note);
  }
  return map;
})();

export const toMystrixPreviewIndex = (note: number) => (
  NOTE_TO_PREVIEW_INDEX[note] ?? null
);
