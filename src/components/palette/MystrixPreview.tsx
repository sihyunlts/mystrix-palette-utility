import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Color, Palette } from '../../types';
import styles from './MystrixPreview.module.css';
import { getPreviewDisplayColors } from './previewDisplay';

interface PaletteGridProps {
  palette: Palette;
  selectedIndex?: number;
  onColorSelect?: (index: number) => void;
  lightshowColors?: Map<number, Color>;
  isLightshowActive?: boolean;
}

interface HousingCanvasProps {
  title: string;
  startIndex: number;
  baseColors: Color[];
  selectedIndex?: number;
  onColorSelect?: (index: number) => void;
  lightshowColors?: Map<number, Color>;
  isLightshowActive?: boolean;
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

type PadVariant =
  | 'normal'
  | 'bottomRightChamfer'
  | 'bottomLeftChamfer'
  | 'topRightChamfer'
  | 'topLeftChamfer';

const GRID_SIZE = 8;
const PADS_PER_HOUSING = GRID_SIZE * GRID_SIZE;
const GAP_RATIO = 0.004;
const SELECTED_SCALE = 1.1;
const LABEL_OFFSET_PX = 6;
const COLOR_TRANSITION_MS = 100;
const SELECTION_TRANSITION_MS = 150;

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
const hasPadMotion = (from: RenderPad, to: RenderPad) => (
  from.rawColor.r !== to.rawColor.r ||
  from.rawColor.g !== to.rawColor.g ||
  from.rawColor.b !== to.rawColor.b ||
  from.selectionProgress !== to.selectionProgress
);

const createHousingGeometry = (width: number, height: number): HousingGeometry | null => {
  if (width <= 0 || height <= 0) {
    return null;
  }

  const size = Math.min(width, height);
  const offsetX = (width - size) / 2;
  const offsetY = (height - size) / 2;
  const gap = size * GAP_RATIO;
  const cellSize = (size - gap * (GRID_SIZE - 1)) / GRID_SIZE;

  return {
    size,
    offsetX,
    offsetY,
    cellSize,
    step: cellSize + gap,
  };
};

const getPadRect = (localIndex: number, geometry: HousingGeometry, scale = 1): PadRect => {
  const column = localIndex % GRID_SIZE;
  const row = Math.floor(localIndex / GRID_SIZE);
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

  if (column < 0 || column >= GRID_SIZE || row < 0 || row >= GRID_SIZE) {
    return null;
  }

  const withinCellX = localX - column * geometry.step;
  const withinCellY = localY - row * geometry.step;

  if (withinCellX > geometry.cellSize || withinCellY > geometry.cellSize) {
    return null;
  }

  return row * GRID_SIZE + column;
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

const HousingCanvas = memo(({
  title,
  startIndex,
  baseColors,
  selectedIndex,
  onColorSelect,
  lightshowColors,
  isLightshowActive,
}: HousingCanvasProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const glowCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatedPadsRef = useRef<RenderPad[] | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const nextWidth = entry.contentRect.width;
      const nextHeight = entry.contentRect.height;

      setSize((prev) => (
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight }
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
    () => Array.from({ length: PADS_PER_HOUSING }, (_, localIndex) => {
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

  useLayoutEffect(() => {
    const glowCanvas = glowCanvasRef.current;
    const canvas = canvasRef.current;
    if (!glowCanvas || !canvas || !geometry) {
      return;
    }

    const glowContext = glowCanvas.getContext('2d');
    const context = canvas.getContext('2d');
    if (!glowContext || !context) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(size.width * dpr));
    const pixelHeight = Math.max(1, Math.round(size.height * dpr));

    if (glowCanvas.width !== pixelWidth || glowCanvas.height !== pixelHeight) {
      glowCanvas.width = pixelWidth;
      glowCanvas.height = pixelHeight;
    }

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    const drawPads = (pads: RenderPad[]) => {
      glowContext.setTransform(1, 0, 0, 1, 0, 0);
      glowContext.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
      glowContext.setTransform(dpr, 0, 0, dpr, 0, 0);

      for (const pad of pads) {
        drawPadGlow(glowContext, pad, geometry);
      }

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      for (const pad of pads) {
        drawPadBody(context, pad, geometry);
      }
    };

    const fromPads = animatedPadsRef.current?.length === targetPads.length
      ? animatedPadsRef.current
      : targetPads;

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }

    if (!fromPads.some((pad, index) => hasPadMotion(pad, targetPads[index]))) {
      animatedPadsRef.current = targetPads;
      drawPads(targetPads);
      return;
    }

    // Resizing a canvas clears its bitmap immediately, so keep the previous
    // frame visible before the animated transition starts.
    drawPads(fromPads);

    const startedAt = performance.now();
    const renderFrame = (timestamp: number) => {
      const colorProgress = Math.min((timestamp - startedAt) / COLOR_TRANSITION_MS, 1);
      const selectionProgress = easeOutCubic(
        Math.min((timestamp - startedAt) / SELECTION_TRANSITION_MS, 1)
      );

      const nextPads = targetPads.map((targetPad, index) => ({
        localIndex: targetPad.localIndex,
        variant: targetPad.variant,
        rawColor: lerpColor(fromPads[index].rawColor, targetPad.rawColor, colorProgress),
        selectionProgress: lerp(
          fromPads[index].selectionProgress,
          targetPad.selectionProgress,
          selectionProgress
        ),
      }));

      animatedPadsRef.current = nextPads;
      drawPads(nextPads);

      if (colorProgress < 1 || selectionProgress < 1) {
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
  }, [geometry, targetPads]);

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
      return;
    }

    onColorSelect(startIndex + localIndex);
  };

  let selectedPadLabel: { value: number; style: React.CSSProperties } | null = null;
  if (
    geometry &&
    !isLightshowActive &&
    selectedIndex !== undefined &&
    selectedIndex >= startIndex &&
    selectedIndex < startIndex + PADS_PER_HOUSING
  ) {
    const localIndex = selectedIndex - startIndex;
    const rect = getPadRect(localIndex, geometry, SELECTED_SCALE);

    selectedPadLabel = {
      value: selectedIndex,
      style: {
        left: `${rect.centerX}px`,
        top: `${rect.y + rect.size + LABEL_OFFSET_PX}px`,
      },
    };
  }

  return (
    <div className={styles.housingContainer}>
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
          {selectedPadLabel && (
            <div
              className={`${styles.padLabel} font-size-sm`}
              style={selectedPadLabel.style}
            >
              {selectedPadLabel.value}
            </div>
          )}
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
  lightshowColors,
  isLightshowActive,
}: PaletteGridProps) => {
  const baseColors = palette.colors;

  return (
    <div className={styles.gridContainer}>
      <HousingCanvas
        title="0 - 63"
        startIndex={0}
        baseColors={baseColors}
        selectedIndex={selectedIndex}
        onColorSelect={onColorSelect}
        lightshowColors={lightshowColors}
        isLightshowActive={isLightshowActive}
      />
      <HousingCanvas
        title="64 - 127"
        startIndex={64}
        baseColors={baseColors}
        selectedIndex={selectedIndex}
        onColorSelect={onColorSelect}
        lightshowColors={lightshowColors}
        isLightshowActive={isLightshowActive}
      />
    </div>
  );
});
