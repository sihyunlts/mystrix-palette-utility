import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useTransitionStatus,
} from '@floating-ui/react';
import { Color, Palette } from '../../types';
import styles from './MystrixPreview.module.css';
import { ColorPicker } from './ColorPicker';
import { getPreviewDisplayColors } from './previewDisplay';
import {
  MYSTRIX_GRID_SIZE,
  MYSTRIX_PADS_PER_HOUSING,
  MYSTRIX_UNDER_LIGHT_SIDES,
  toUnderLightPreviewIndex,
} from '../../utils/mystrixLayout';
import type { MystrixUnderLightSide } from '../../utils/mystrixLayout';

interface PaletteGridProps {
  palette: Palette;
  selectedIndex?: number;
  onColorSelect?: (index: number) => void;
  onDismissSelected?: () => void;
  selectedColor: Color;
  onSelectedColorChange?: (color: Color) => void;
  lightshowColors?: Map<number, Color>;
  isLightshowActive?: boolean;
  animateTransitions?: boolean;
}

interface HousingCanvasProps {
  title: string;
  startIndex: number;
  gridRef: React.RefObject<HTMLDivElement | null>;
  baseColors: Color[];
  selectedIndex?: number;
  onColorSelect?: (index: number) => void;
  onDismissSelected?: () => void;
  onPickerAnchorChange?: (startIndex: number, anchor: PickerAnchor | null) => void;
  lightshowColors?: Map<number, Color>;
  isLightshowActive?: boolean;
  animateTransitions?: boolean;
  hideSelectedLabel?: boolean;
}

interface CanvasSize {
  width: number;
  height: number;
}

interface HousingGeometry {
  size: number;
  offsetX: number;
  offsetY: number;
  cellSize: number;
  step: number;
}

interface PadRect {
  x: number;
  y: number;
  size: number;
  centerX: number;
  centerY: number;
}

interface DisplayColors {
  core: string;
  mid: string;
  edge: string;
}

interface RenderPad {
  localIndex: number;
  variant: PadVariant;
  rawColor: Color;
  selectionProgress: number;
}

interface RenderUnderLight {
  side: MystrixUnderLightSide;
  position: number;
  rawColor: Color;
}

interface PickerAnchor {
  left: number;
  top: number;
}

interface RenderedPickerState {
  anchor: PickerAnchor;
  selectedIndex: number;
  color: Color;
}

interface PadLabel {
  value: number;
  style: React.CSSProperties;
}

interface SelectedPadMeta {
  pickerAnchor: PickerAnchor;
  label: PadLabel;
}

type PadVariant =
  | 'normal'
  | 'bottomRightChamfer'
  | 'bottomLeftChamfer'
  | 'topRightChamfer'
  | 'topLeftChamfer';

const GAP_RATIO = 0.004;
const SELECTED_SCALE = 1.1;
const COLOR_TRANSITION_MS = 100;
const SELECTION_TRANSITION_MS = 150;
const PAD_LABEL_TRANSITION_MS = 120;
const UNDER_LIGHT_LENGTH_RATIO = 1;
const UNDER_LIGHT_THICKNESS_RATIO = 0.03;
const UNDER_LIGHT_SIDE_CENTER = 0.055;

const OFF_COLOR: Color = { r: 0, g: 0, b: 0 };

const SOURCE_VIEWBOX_SIZE = 110;
const SOURCE_VIEWBOX_OFFSET = 5;
const SOURCE_PATH_MARGIN = 2;
const SOURCE_PATH_SCALE = (100 - SOURCE_PATH_MARGIN * 2) / 100;
const localMin = (SOURCE_VIEWBOX_OFFSET + SOURCE_PATH_MARGIN) / SOURCE_VIEWBOX_SIZE;
const localMax = (SOURCE_VIEWBOX_OFFSET + (100 - SOURCE_PATH_MARGIN)) / SOURCE_VIEWBOX_SIZE;
const localChamfer = ((8 / 42) * 100 * SOURCE_PATH_SCALE) / SOURCE_VIEWBOX_SIZE;
const localRadius = ((2.5 / 42) * 100 * SOURCE_PATH_SCALE) / SOURCE_VIEWBOX_SIZE;
const localFillet = ((1.5 / 42) * 100 * SOURCE_PATH_SCALE) / SOURCE_VIEWBOX_SIZE;

const createPadPathString = (variant: PadVariant) => {
  if (variant === 'bottomRightChamfer') {
    return `M${localMin + localRadius},${localMin} H${localMax - localRadius} Q${localMax},${localMin} ${localMax},${localMin + localRadius} V${localMax - localChamfer - localFillet} Q${localMax},${localMax - localChamfer} ${localMax - localFillet},${localMax - localChamfer + localFillet} L${localMax - localChamfer + localFillet},${localMax - localFillet} Q${localMax - localChamfer},${localMax} ${localMax - localChamfer - localFillet},${localMax} H${localMin + localRadius} Q${localMin},${localMax} ${localMin},${localMax - localRadius} V${localMin + localRadius} Q${localMin},${localMin} ${localMin + localRadius},${localMin} Z`;
  }

  if (variant === 'bottomLeftChamfer') {
    return `M${localMin + localRadius},${localMin} H${localMax - localRadius} Q${localMax},${localMin} ${localMax},${localMin + localRadius} V${localMax - localRadius} Q${localMax},${localMax} ${localMax - localRadius},${localMax} H${localMin + localChamfer + localFillet} Q${localMin + localChamfer},${localMax} ${localMin + localChamfer - localFillet},${localMax - localFillet} L${localMin + localFillet},${localMax - localChamfer + localFillet} Q${localMin},${localMax - localChamfer} ${localMin},${localMax - localChamfer - localFillet} V${localMin + localRadius} Q${localMin},${localMin} ${localMin + localRadius},${localMin} Z`;
  }

  if (variant === 'topRightChamfer') {
    return `M${localMin + localRadius},${localMin} H${localMax - localChamfer - localFillet} Q${localMax - localChamfer},${localMin} ${localMax - localChamfer + localFillet},${localMin + localFillet} L${localMax - localFillet},${localMin + localChamfer - localFillet} Q${localMax},${localMin + localChamfer} ${localMax},${localMin + localChamfer + localFillet} V${localMax - localRadius} Q${localMax},${localMax} ${localMax - localRadius},${localMax} H${localMin + localRadius} Q${localMin},${localMax} ${localMin},${localMax - localRadius} V${localMin + localRadius} Q${localMin},${localMin} ${localMin + localRadius},${localMin} Z`;
  }

  if (variant === 'topLeftChamfer') {
    return `M${localMin + localChamfer + localFillet},${localMin} H${localMax - localRadius} Q${localMax},${localMin} ${localMax},${localMin + localRadius} V${localMax - localRadius} Q${localMax},${localMax} ${localMax - localRadius},${localMax} H${localMin + localRadius} Q${localMin},${localMax} ${localMin},${localMax - localRadius} V${localMin + localChamfer + localFillet} Q${localMin},${localMin + localChamfer} ${localMin + localFillet},${localMin + localChamfer - localFillet} L${localMin + localChamfer - localFillet},${localMin + localFillet} Q${localMin + localChamfer},${localMin} ${localMin + localChamfer + localFillet},${localMin} Z`;
  }

  return `M${localMin + localRadius},${localMin} H${localMax - localRadius} Q${localMax},${localMin} ${localMax},${localMin + localRadius} V${localMax - localRadius} Q${localMax},${localMax} ${localMax - localRadius},${localMax} H${localMin + localRadius} Q${localMin},${localMax} ${localMin},${localMax - localRadius} V${localMin + localRadius} Q${localMin},${localMin} ${localMin + localRadius},${localMin} Z`;
};

const PAD_PATHS: Record<PadVariant, Path2D> = {
  normal: new Path2D(createPadPathString('normal')),
  bottomRightChamfer: new Path2D(createPadPathString('bottomRightChamfer')),
  bottomLeftChamfer: new Path2D(createPadPathString('bottomLeftChamfer')),
  topRightChamfer: new Path2D(createPadPathString('topRightChamfer')),
  topLeftChamfer: new Path2D(createPadPathString('topLeftChamfer')),
};

const getPadVariant = (localIndex: number): PadVariant => {
  switch (localIndex) {
    case 27:
      return 'bottomRightChamfer';
    case 28:
      return 'bottomLeftChamfer';
    case 35:
      return 'topRightChamfer';
    case 36:
      return 'topLeftChamfer';
    default:
      return 'normal';
  }
};

const normalizeChannel = (value: number | undefined) => (
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(255, Math.round(value)))
    : 0
);
const normalizeColor = (color: Partial<Color> | null | undefined): Color => ({
  r: normalizeChannel(color?.r),
  g: normalizeChannel(color?.g),
  b: normalizeChannel(color?.b),
});
const isOffColor = (color: Color) => color.r === 0 && color.g === 0 && color.b === 0;
const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress;
const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);
const getSelectionScale = (selectionProgress: number) => 1 + (SELECTED_SCALE - 1) * selectionProgress;
const lerpColor = (from: Color, to: Color, progress: number): Color => ({
  r: normalizeChannel(lerp(from.r, to.r, progress)),
  g: normalizeChannel(lerp(from.g, to.g, progress)),
  b: normalizeChannel(lerp(from.b, to.b, progress)),
});
const hasColorMotion = (
  from: { rawColor: Color },
  to: { rawColor: Color }
) => (
  from.rawColor.r !== to.rawColor.r ||
  from.rawColor.g !== to.rawColor.g ||
  from.rawColor.b !== to.rawColor.b
);
const hasPadSelectionMotion = (from: RenderPad, to: RenderPad) => (
  from.selectionProgress !== to.selectionProgress
);
const resizeCanvas = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number
) => {
  const pixelWidth = Math.max(1, Math.round(width * dpr));
  const pixelHeight = Math.max(1, Math.round(height * dpr));

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
};
const clearCanvas = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dpr: number
) => {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
};
const createHousingGeometry = (width: number, height: number): HousingGeometry | null => {
  if (width <= 0 || height <= 0) {
    return null;
  }

  const size = Math.min(width, height);
  const offsetX = (width - size) / 2;
  const offsetY = (height - size) / 2;
  const gap = size * GAP_RATIO;
  const cellSize = (size - gap * (MYSTRIX_GRID_SIZE - 1)) / MYSTRIX_GRID_SIZE;

  return {
    size,
    offsetX,
    offsetY,
    cellSize,
    step: cellSize + gap,
  };
};

const getPadRect = (localIndex: number, geometry: HousingGeometry, scale = 1): PadRect => {
  const column = localIndex % MYSTRIX_GRID_SIZE;
  const row = Math.floor(localIndex / MYSTRIX_GRID_SIZE);
  const drawSize = geometry.cellSize * scale;
  const x = geometry.offsetX + column * geometry.step + (geometry.cellSize - drawSize) / 2;
  const y = geometry.offsetY + row * geometry.step + (geometry.cellSize - drawSize) / 2;

  return {
    x,
    y,
    size: drawSize,
    centerX: x + drawSize / 2,
    centerY: y + drawSize / 2,
  };
};

const getPadIndexAtPoint = (x: number, y: number, geometry: HousingGeometry) => {
  const localX = x - geometry.offsetX;
  const localY = y - geometry.offsetY;

  if (localX < 0 || localY < 0 || localX >= geometry.size || localY >= geometry.size) {
    return null;
  }

  const column = Math.floor(localX / geometry.step);
  const row = Math.floor(localY / geometry.step);

  if (column < 0 || column >= MYSTRIX_GRID_SIZE || row < 0 || row >= MYSTRIX_GRID_SIZE) {
    return null;
  }

  const withinCellX = localX - column * geometry.step;
  const withinCellY = localY - row * geometry.step;

  if (withinCellX > geometry.cellSize || withinCellY > geometry.cellSize) {
    return null;
  }

  return row * MYSTRIX_GRID_SIZE + column;
};

const drawPadGlow = (context: CanvasRenderingContext2D, pad: RenderPad, geometry: HousingGeometry) => {
  const rect = getPadRect(pad.localIndex, geometry, getSelectionScale(pad.selectionProgress));
  const path = PAD_PATHS[pad.variant];

  if (isOffColor(pad.rawColor)) {
    return;
  }

  const glowScale = lerp(1.02, 1.06, pad.selectionProgress);

  context.save();
  context.translate(rect.centerX, rect.centerY);
  context.scale(rect.size * glowScale, rect.size * glowScale);
  context.translate(-0.5, -0.5);
  context.fillStyle = `rgba(${pad.rawColor.r}, ${pad.rawColor.g}, ${pad.rawColor.b}, ${lerp(0.42, 0.68, pad.selectionProgress)})`;
  context.fill(path);
  context.restore();
};

const drawPadBody = (context: CanvasRenderingContext2D, pad: RenderPad, geometry: HousingGeometry) => {
  const rect = getPadRect(pad.localIndex, geometry, getSelectionScale(pad.selectionProgress));
  const path = PAD_PATHS[pad.variant];
  const displayColors: DisplayColors = getPreviewDisplayColors(pad.rawColor);

  context.save();
  context.translate(rect.x, rect.y);
  context.scale(rect.size, rect.size);

  const bodyGradient = context.createRadialGradient(0.5, 0.5, 0, 0.5, 0.5, 0.7);
  bodyGradient.addColorStop(0, displayColors.core);
  bodyGradient.addColorStop(0.3, displayColors.core);
  bodyGradient.addColorStop(0.7, displayColors.mid);
  bodyGradient.addColorStop(1, displayColors.edge);

  context.fillStyle = bodyGradient;
  context.fill(path);

  if (pad.selectionProgress > 0) {
    context.strokeStyle = `rgba(255,255,255,${pad.selectionProgress})`;
    context.lineWidth = 0.04;
    context.lineJoin = 'round';
    context.stroke(path);
  }

  context.strokeStyle = 'rgba(255,255,255,0.1)';
  context.lineWidth = 0.01;
  context.lineJoin = 'round';
  context.stroke(path);

  context.restore();
};

const drawUnderLightSegment = (
  context: CanvasRenderingContext2D,
  side: MystrixUnderLightSide,
  position: number,
  color: Color,
  geometry: HousingGeometry,
  viewportSize: CanvasSize,
  width: number,
  height: number
) => {
  if (isOffColor(color)) {
    return;
  }

  const isHorizontal = side === 'top' || side === 'bottom';
  const isNearSide = side === 'top' || side === 'left';
  const padRect = getPadRect(isHorizontal ? position : position * MYSTRIX_GRID_SIZE, geometry);
  const length = geometry.cellSize * UNDER_LIGHT_LENGTH_RATIO;
  const thickness = (isHorizontal ? height : width) * UNDER_LIGHT_THICKNESS_RATIO;
  const alongCenter = (isHorizontal ? width - viewportSize.width : height - viewportSize.height) / 2 +
    (isHorizontal ? padRect.centerX : padRect.centerY);
  const sideCenter = (isNearSide ? UNDER_LIGHT_SIDE_CENTER : 1 - UNDER_LIGHT_SIDE_CENTER) *
    (isHorizontal ? height : width);

  const x = isHorizontal ? alongCenter - length / 2 : sideCenter - thickness / 2;
  const y = isHorizontal ? sideCenter - thickness / 2 : alongCenter - length / 2;
  const segmentWidth = isHorizontal ? length : thickness;
  const segmentHeight = isHorizontal ? thickness : length;

  context.save();
  context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.95)`;
  context.beginPath();
  context.roundRect(x, y, segmentWidth, segmentHeight, Math.min(segmentWidth, segmentHeight) / 2);
  context.fill();
  context.restore();
};

const HousingCanvas = memo(({
  title,
  startIndex,
  gridRef,
  baseColors,
  selectedIndex,
  onColorSelect,
  onDismissSelected,
  onPickerAnchorChange,
  lightshowColors,
  isLightshowActive,
  animateTransitions = false,
  hideSelectedLabel = false,
}: HousingCanvasProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const underLightCanvasRef = useRef<HTMLCanvasElement>(null);
  const glowCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatedPadsRef = useRef<RenderPad[] | null>(null);
  const animatedUnderLightsRef = useRef<RenderUnderLight[] | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousLightshowActiveRef = useRef(isLightshowActive);
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const [renderedPadLabel, setRenderedPadLabel] = useState<PadLabel | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const nextSize = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };

      setSize((prev) => (
        prev.width === nextSize.width && prev.height === nextSize.height ? prev : nextSize
      ));
    });

    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  const geometry = useMemo(
    () => createHousingGeometry(size.width, size.height),
    [size.height, size.width]
  );

  const targetPads = useMemo<RenderPad[]>(
    () => Array.from({ length: MYSTRIX_PADS_PER_HOUSING }, (_, localIndex) => {
      const absoluteIndex = startIndex + localIndex;
      const lightshowColor = lightshowColors?.get(absoluteIndex);
      const baseColor = baseColors[absoluteIndex] ?? OFF_COLOR;
      const rawColor = normalizeColor(lightshowColor ?? (isLightshowActive ? OFF_COLOR : baseColor));

      return {
        localIndex,
        variant: getPadVariant(localIndex),
        rawColor,
        selectionProgress: selectedIndex === absoluteIndex ? 1 : 0,
      };
    }),
    [baseColors, isLightshowActive, lightshowColors, selectedIndex, startIndex]
  );

  const targetUnderLights = useMemo<RenderUnderLight[]>(
    () => MYSTRIX_UNDER_LIGHT_SIDES.flatMap(({ side, notes }) => (
      notes.map((note, position) => {
        const lightshowColor = lightshowColors?.get(toUnderLightPreviewIndex(note));
        const rawColor = normalizeColor(isLightshowActive ? lightshowColor ?? OFF_COLOR : OFF_COLOR);

        return {
          side,
          position,
          rawColor,
        };
      })
    )),
    [isLightshowActive, lightshowColors]
  );

  useLayoutEffect(() => {
    const underLightCanvas = underLightCanvasRef.current;
    const glowCanvas = glowCanvasRef.current;
    const canvas = canvasRef.current;
    if (!underLightCanvas || !glowCanvas || !canvas || !geometry) {
      return;
    }

    const underLightContext = underLightCanvas.getContext('2d');
    const glowContext = glowCanvas.getContext('2d');
    const context = canvas.getContext('2d');
    if (!underLightContext || !glowContext || !context) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const underLightWidth = Math.max(1, underLightCanvas.clientWidth);
    const underLightHeight = Math.max(1, underLightCanvas.clientHeight);

    resizeCanvas(underLightCanvas, underLightWidth, underLightHeight, dpr);
    resizeCanvas(glowCanvas, size.width, size.height, dpr);
    resizeCanvas(canvas, size.width, size.height, dpr);

    const drawPreview = (pads: RenderPad[], underLights: RenderUnderLight[]) => {
      clearCanvas(underLightContext, underLightCanvas, dpr);
      for (const underLight of underLights) {
        drawUnderLightSegment(
          underLightContext,
          underLight.side,
          underLight.position,
          underLight.rawColor,
          geometry,
          size,
          underLightWidth,
          underLightHeight
        );
      }

      clearCanvas(glowContext, glowCanvas, dpr);
      for (const pad of pads) {
        drawPadGlow(glowContext, pad, geometry);
      }

      clearCanvas(context, canvas, dpr);
      for (const pad of pads) {
        drawPadBody(context, pad, geometry);
      }
    };

    const fromPads = animatedPadsRef.current?.length === targetPads.length
      ? animatedPadsRef.current
      : targetPads;
    const fromUnderLights = animatedUnderLightsRef.current?.length === targetUnderLights.length
      ? animatedUnderLightsRef.current
      : targetUnderLights;
    const didLightshowStateChange = previousLightshowActiveRef.current !== isLightshowActive;
    const shouldAnimateColor = animateTransitions || didLightshowStateChange;
    const shouldAnimateSelection = fromPads.some((pad, index) => (
      hasPadSelectionMotion(pad, targetPads[index])
    ));
    previousLightshowActiveRef.current = isLightshowActive;
    const shouldAnimate = shouldAnimateColor || shouldAnimateSelection;

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }

    const hasPadMotion = fromPads.some((pad, index) => (
      hasColorMotion(pad, targetPads[index]) || hasPadSelectionMotion(pad, targetPads[index])
    ));
    const hasUnderLightMotion = fromUnderLights.some((underLight, index) => (
      hasColorMotion(underLight, targetUnderLights[index])
    ));

    if (!shouldAnimate || (!hasPadMotion && !hasUnderLightMotion)) {
      animatedPadsRef.current = targetPads;
      animatedUnderLightsRef.current = targetUnderLights;
      drawPreview(targetPads, targetUnderLights);
      return;
    }

    // Resizing a canvas clears its bitmap immediately, so keep the previous
    // frame visible before the animated transition starts.
    drawPreview(fromPads, fromUnderLights);

    const startedAt = performance.now();
    const renderFrame = (timestamp: number) => {
      const colorProgress = Math.min((timestamp - startedAt) / COLOR_TRANSITION_MS, 1);
      const selectionProgress = easeOutCubic(
        Math.min((timestamp - startedAt) / SELECTION_TRANSITION_MS, 1)
      );

      const nextPads = targetPads.map((targetPad, index) => ({
        localIndex: targetPad.localIndex,
        variant: targetPad.variant,
        rawColor: shouldAnimateColor
          ? lerpColor(fromPads[index].rawColor, targetPad.rawColor, colorProgress)
          : targetPad.rawColor,
        selectionProgress: shouldAnimateSelection
          ? lerp(
              fromPads[index].selectionProgress,
              targetPad.selectionProgress,
              selectionProgress
            )
          : targetPad.selectionProgress,
      }));
      const nextUnderLights = targetUnderLights.map((targetUnderLight, index) => ({
        side: targetUnderLight.side,
        position: targetUnderLight.position,
        rawColor: shouldAnimateColor
          ? lerpColor(fromUnderLights[index].rawColor, targetUnderLight.rawColor, colorProgress)
          : targetUnderLight.rawColor,
      }));

      animatedPadsRef.current = nextPads;
      animatedUnderLightsRef.current = nextUnderLights;
      drawPreview(nextPads, nextUnderLights);

      if (
        (shouldAnimateColor && colorProgress < 1) ||
        (shouldAnimateSelection && selectionProgress < 1)
      ) {
        animationFrameRef.current = window.requestAnimationFrame(renderFrame);
        return;
      }

      animationFrameRef.current = null;
    };

    animationFrameRef.current = window.requestAnimationFrame(renderFrame);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [
    animateTransitions,
    geometry,
    isLightshowActive,
    size.height,
    size.width,
    targetPads,
    targetUnderLights,
  ]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!geometry || !onColorSelect) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const localIndex = getPadIndexAtPoint(
      event.clientX - bounds.left,
      event.clientY - bounds.top,
      geometry
    );

    if (localIndex === null) {
      onDismissSelected?.();
      return;
    }

    onColorSelect(startIndex + localIndex);
  };

  const selectedPadMeta = useMemo<SelectedPadMeta | null>(() => {
    if (
      !geometry ||
      isLightshowActive ||
      selectedIndex === undefined ||
      selectedIndex < startIndex ||
      selectedIndex >= startIndex + MYSTRIX_PADS_PER_HOUSING
    ) {
      return null;
    }

    const localIndex = selectedIndex - startIndex;
    const rect = getPadRect(localIndex, geometry, SELECTED_SCALE);

    return {
      pickerAnchor: {
        left: rect.centerX,
        top: rect.y + rect.size,
      },
      label: {
        value: selectedIndex,
        style: {
          left: `${rect.centerX}px`,
          top: `${rect.centerY}px`,
        },
      },
    };
  }, [geometry, isLightshowActive, selectedIndex, startIndex]);

  useLayoutEffect(() => {
    if (!onPickerAnchorChange) {
      return;
    }

    if (!selectedPadMeta?.pickerAnchor || !viewportRef.current || !gridRef.current) {
      onPickerAnchorChange(startIndex, null);
      return;
    }

    const viewportRect = viewportRef.current.getBoundingClientRect();
    const gridRect = gridRef.current.getBoundingClientRect();

    onPickerAnchorChange(startIndex, {
      left: viewportRect.left - gridRect.left + selectedPadMeta.pickerAnchor.left,
      top: viewportRect.top - gridRect.top + selectedPadMeta.pickerAnchor.top,
    });
  }, [gridRef, onPickerAnchorChange, selectedPadMeta, startIndex]);

  useEffect(() => {
    if (selectedPadMeta?.label) {
      setRenderedPadLabel(selectedPadMeta.label);
      return;
    }

    if (!renderedPadLabel) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setRenderedPadLabel(null);
    }, PAD_LABEL_TRANSITION_MS);

    return () => window.clearTimeout(timeout);
  }, [renderedPadLabel, selectedPadMeta]);

  const padLabelVisible = Boolean(selectedPadMeta?.label && !hideSelectedLabel);

  return (
    <div className={styles.housingContainer}>
      <div className={styles.housingShell}>
        <canvas
          ref={underLightCanvasRef}
          className={styles.underLightCanvas}
          aria-hidden="true"
        />
        <div className={styles.housing}>
          <div ref={viewportRef} className={styles.canvasViewport}>
            <canvas
              ref={glowCanvasRef}
              className={styles.glowCanvas}
              aria-hidden="true"
            />
            <canvas
              ref={canvasRef}
              className={styles.canvas}
              onClick={handleCanvasClick}
            />
            {renderedPadLabel && (
              <div
                className={`${styles.padLabel} ${padLabelVisible ? styles.padLabelVisible : ''} font-size-sm`}
                style={renderedPadLabel.style}
              >
                {renderedPadLabel.value}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className={`${styles.housingLabel} text-code color-muted font-size-md`}>{title}</div>
    </div>
  );
});

export const PaletteGrid = memo(({
  palette,
  selectedIndex,
  onColorSelect,
  onDismissSelected,
  selectedColor,
  onSelectedColorChange,
  lightshowColors,
  isLightshowActive,
  animateTransitions = false,
}: PaletteGridProps) => {
  const baseColors = palette.colors;
  const gridRef = useRef<HTMLDivElement>(null);
  const previousSelectedIndexRef = useRef<number | undefined>(selectedIndex);
  const [pickerAnchor, setPickerAnchor] = useState<PickerAnchor | null>(null);
  const [renderedPicker, setRenderedPicker] = useState<RenderedPickerState | null>(null);
  const [animatePickerMove, setAnimatePickerMove] = useState(false);
  const [isPickerInteracting, setIsPickerInteracting] = useState(false);
  const activeHousingStart = selectedIndex !== undefined && selectedIndex >= MYSTRIX_PADS_PER_HOUSING
    ? MYSTRIX_PADS_PER_HOUSING
    : 0;

  const {
    refs,
    floatingStyles,
    context,
    placement,
    update,
  } = useFloating({
    open: Boolean(
      pickerAnchor &&
      !isLightshowActive &&
      selectedIndex !== undefined
    ),
    onOpenChange: (nextOpen) => {
      if (!nextOpen) {
        onDismissSelected?.();
      }
    },
    placement: 'bottom',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({ fallbackPlacements: ['top'] }),
      shift({ padding: 8 }),
    ],
  });
  const dismiss = useDismiss(context, {
    outsidePress: (event) => !gridRef.current?.contains(event.target as Node),
    outsidePressEvent: 'click',
  });
  const { getFloatingProps } = useInteractions([dismiss]);
  const { isMounted, status } = useTransitionStatus(context, {
    duration: {
      open: 200,
      close: 150,
    },
  });

  const handlePickerAnchorChange = useCallback((
    housingStart: number,
    anchor: PickerAnchor | null,
  ) => {
    if (housingStart !== activeHousingStart) {
      return;
    }

    if (!anchor) {
      setPickerAnchor(null);
      return;
    }

    setPickerAnchor((prev) => (
      prev &&
        prev.left === anchor.left &&
        prev.top === anchor.top
        ? prev
        : anchor
    ));
  }, [activeHousingStart]);

  useLayoutEffect(() => {
    const previousSelectedIndex = previousSelectedIndexRef.current;
    setAnimatePickerMove(
      previousSelectedIndex !== undefined && selectedIndex !== undefined
    );
    previousSelectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useLayoutEffect(() => {
    if (pickerAnchor && selectedIndex !== undefined) {
      setRenderedPicker({
        anchor: pickerAnchor,
        selectedIndex,
        color: selectedColor,
      });
      return;
    }

    if (!isMounted) {
      setRenderedPicker(null);
    }
  }, [isMounted, pickerAnchor, selectedColor, selectedIndex]);

  useEffect(() => {
    if (selectedIndex === undefined || isLightshowActive) {
      setIsPickerInteracting(false);
    }
  }, [isLightshowActive, selectedIndex]);

  useLayoutEffect(() => {
    if (!pickerAnchor) {
      return;
    }

    update();
  }, [pickerAnchor, update]);

  const displayedPicker = useMemo(() => {
    const anchor = (
      pickerAnchor &&
      !isLightshowActive &&
      selectedIndex !== undefined
    ) ? pickerAnchor : renderedPicker?.anchor;
    const index = selectedIndex ?? renderedPicker?.selectedIndex;
    const color = selectedIndex !== undefined ? selectedColor : renderedPicker?.color;

    if (!anchor || index === undefined || !color) {
      return null;
    }

    return {
      anchor,
      index,
      color,
      style: {
        left: `${anchor.left}px`,
        top: `${anchor.top}px`,
      } satisfies React.CSSProperties,
    };
  }, [isLightshowActive, pickerAnchor, renderedPicker, selectedColor, selectedIndex]);

  return (
    <div ref={gridRef} className={styles.gridContainer}>
      <HousingCanvas
        title="0 - 63"
        startIndex={0}
        gridRef={gridRef}
        baseColors={baseColors}
        selectedIndex={selectedIndex}
        onColorSelect={onColorSelect}
        onDismissSelected={onDismissSelected}
        onPickerAnchorChange={handlePickerAnchorChange}
        lightshowColors={lightshowColors}
        isLightshowActive={isLightshowActive}
        animateTransitions={animateTransitions}
        hideSelectedLabel={isPickerInteracting}
      />
      <HousingCanvas
        title="64 - 127"
        startIndex={64}
        gridRef={gridRef}
        baseColors={baseColors}
        selectedIndex={selectedIndex}
        onColorSelect={onColorSelect}
        onDismissSelected={onDismissSelected}
        onPickerAnchorChange={handlePickerAnchorChange}
        lightshowColors={lightshowColors}
        isLightshowActive={isLightshowActive}
        animateTransitions={animateTransitions}
        hideSelectedLabel={isPickerInteracting}
      />
      {displayedPicker && (
        <div
          ref={refs.setReference}
          className={styles.pickerAnchor}
          style={displayedPicker.style}
        />
      )}
      {isMounted && displayedPicker && onSelectedColorChange && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            className={`${styles.pickerFloating} ${animatePickerMove ? styles.pickerFloatingAnimated : ''}`}
            style={{
              ...floatingStyles,
              zIndex: 1000,
            }}
            {...getFloatingProps()}
          >
            <div
              className="floating-transition"
              data-placement={placement}
              data-status={status}
            >
              <ColorPicker
                color={displayedPicker.color}
                onChange={onSelectedColorChange}
                onInteractionChange={setIsPickerInteracting}
              />
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
});
