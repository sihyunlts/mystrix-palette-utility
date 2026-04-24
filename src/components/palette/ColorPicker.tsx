import React, { useEffect, useRef, useState } from 'react';
import { Color } from '../../types';
import styles from './ColorPicker.module.css';

interface ColorPickerProps {
  color: Color;
  onChange: (color: Color) => void;
  onInteractionChange?: (isInteracting: boolean) => void;
}

interface HsvDraft {
  h: number;
  s: number;
  v: number;
}

type ActiveControl = 'sl' | 'hue' | null;
type RgbChannel = 'r' | 'g' | 'b';

const RGB_CHANNELS: RgbChannel[] = ['r', 'g', 'b'];

const clamp = (value: number, min: number, max: number) => (
  Math.max(min, Math.min(value, max))
);

const hsvToRgb = (h: number, s: number, v: number): Color => {
  const normalizedS = s / 100;
  const normalizedV = v / 100;
  const c = normalizedV * normalizedS;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = normalizedV - c;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
  } else if (h >= 120 && h < 180) {
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
};

const rgbToHsv = (r: number, g: number, b: number) => {
  const normalizedR = r / 255;
  const normalizedG = g / 255;
  const normalizedB = b / 255;
  const max = Math.max(normalizedR, normalizedG, normalizedB);
  const min = Math.min(normalizedR, normalizedG, normalizedB);
  const delta = max - min;
  let h = 0;
  const s = max === 0 ? 0 : delta / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case normalizedR:
        h = (normalizedG - normalizedB) / delta + (normalizedG < normalizedB ? 6 : 0);
        break;
      case normalizedG:
        h = (normalizedB - normalizedR) / delta + 2;
        break;
      default:
        h = (normalizedR - normalizedG) / delta + 4;
        break;
    }

    h /= 6;
  }

  return {
    h: Math.round(h * 360) % 360,
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
};

const syncDraftFromColor = (color: Color, fallbackHue: number): HsvDraft => {
  const converted = rgbToHsv(color.r, color.g, color.b);

  return {
    h: converted.s > 0 ? converted.h : fallbackHue,
    s: converted.s,
    v: converted.v,
  };
};

export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  onInteractionChange,
}) => {
  const [draft, setDraft] = useState<HsvDraft>(() => syncDraftFromColor(color, 0));
  const isInteractingRef = useRef(false);
  const activeControlRef = useRef<ActiveControl>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const draftRef = useRef(draft);
  const lastHueRef = useRef(draft.h);

  useEffect(() => {
    if (isInteractingRef.current) {
      return;
    }

    const nextDraft = syncDraftFromColor(color, lastHueRef.current);
    if (nextDraft.s > 0) {
      lastHueRef.current = nextDraft.h;
    }

    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }, [color]);

  useEffect(() => (
    () => onInteractionChange?.(false)
  ), [onInteractionChange]);

  const updateDraft = (nextDraft: HsvDraft) => {
    draftRef.current = nextDraft;
    if (nextDraft.s > 0) {
      lastHueRef.current = nextDraft.h;
    }

    setDraft(nextDraft);
    onChange(hsvToRgb(nextDraft.h, nextDraft.s, nextDraft.v));
  };

  const updateFromSlPointer = (element: HTMLDivElement, clientX: number, clientY: number) => {
    const rect = element.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const y = clamp(clientY - rect.top, 0, rect.height);
    const nextDraft = {
      h: draftRef.current.h,
      s: Math.round((x / rect.width) * 100),
      v: Math.round(100 - (y / rect.height) * 100),
    };

    updateDraft(nextDraft);
  };

  const updateFromHuePointer = (element: HTMLDivElement, clientX: number) => {
    const rect = element.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const nextDraft = {
      ...draftRef.current,
      h: Math.min(Math.round((x / rect.width) * 360), 359),
    };

    updateDraft(nextDraft);
  };

  const beginInteraction = (
    event: React.PointerEvent<HTMLDivElement>,
    control: Exclude<ActiveControl, null>
  ) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    isInteractingRef.current = true;
    onInteractionChange?.(true);
    activeControlRef.current = control;
    activePointerIdRef.current = event.pointerId;

    if (control === 'sl') {
      updateFromSlPointer(event.currentTarget, event.clientX, event.clientY);
      return;
    }

    updateFromHuePointer(event.currentTarget, event.clientX);
  };

  const handleSlPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    beginInteraction(event, 'sl');
  };

  const handleSlPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      activeControlRef.current !== 'sl' ||
      activePointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    updateFromSlPointer(event.currentTarget, event.clientX, event.clientY);
  };

  const handleHuePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    beginInteraction(event, 'hue');
  };

  const handleHuePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      activeControlRef.current !== 'hue' ||
      activePointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    updateFromHuePointer(event.currentTarget, event.clientX);
  };

  const endInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    isInteractingRef.current = false;
    onInteractionChange?.(false);
    activeControlRef.current = null;
    activePointerIdRef.current = null;
  };

  const handleRgbInputChange = (channel: RgbChannel, rawValue: string) => {
    const nextValue = clamp(parseInt(rawValue, 10) || 0, 0, 255);
    onChange({ ...color, [channel]: nextValue });
  };

  return (
    <div className={styles.picker}>
      <div
        className={styles.slPicker}
        style={{ backgroundColor: `hsl(${draft.h}, 100%, 50%)` }}
        onPointerDown={handleSlPointerDown}
        onPointerMove={handleSlPointerMove}
        onPointerUp={endInteraction}
        onPointerCancel={endInteraction}
      >
        <div className={styles.slGradient} />
        <div
          className={styles.slCursor}
          style={{ left: `${draft.s}%`, top: `${100 - draft.v}%` }}
        />
      </div>

      <div
        className={styles.huePicker}
        onPointerDown={handleHuePointerDown}
        onPointerMove={handleHuePointerMove}
        onPointerUp={endInteraction}
        onPointerCancel={endInteraction}
      >
        <div className={styles.hueCursor} style={{ left: `${draft.h / 3.6}%` }} />
      </div>

      <div className={styles.rgbInputs}>
        {RGB_CHANNELS.map((channel) => (
          <div key={channel} className={styles.inputGroup}>
            <label className="font-size-sm">{channel.toUpperCase()}</label>
            <input
              type="number"
              min="0"
              max="255"
              value={color[channel]}
              onChange={(event) => handleRgbInputChange(channel, event.target.value)}
              onWheel={(event) => event.currentTarget.blur()}
              className={`${styles.input} font-size-sm`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
