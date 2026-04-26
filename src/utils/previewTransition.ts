import { Color } from '../types';

export const COLOR_TRANSITION_MS = 100;
export const SELECTION_TRANSITION_MS = 150;

export const normalizeChannel = (value: number | undefined) => (
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(255, Math.round(value)))
    : 0
);

export const normalizeColor = (color: Partial<Color> | null | undefined): Color => ({
  r: normalizeChannel(color?.r),
  g: normalizeChannel(color?.g),
  b: normalizeChannel(color?.b),
});

export const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress;

export const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);

export const lerpColor = (from: Color, to: Color, progress: number): Color => ({
  r: normalizeChannel(lerp(from.r, to.r, progress)),
  g: normalizeChannel(lerp(from.g, to.g, progress)),
  b: normalizeChannel(lerp(from.b, to.b, progress)),
});
