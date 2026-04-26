import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Color } from '../types';
import { MatrixOSMIDI } from '../utils/midi';

const LIVE_PALETTE_PREVIEW_DEBOUNCE_MS = 80;
const PALETTE_PREVIEW_WINDOW_SIZE = 64;

interface UseLivePalettePreviewOptions {
  matrixOS: MatrixOSMIDI | null;
  colors: Color[];
  currentPage: 'palette' | 'backup';
  isLightshowActive: boolean;
  animateTransitions: boolean;
}

export const useLivePalettePreview = ({
  matrixOS,
  colors,
  currentPage,
  isLightshowActive,
  animateTransitions,
}: UseLivePalettePreviewOptions) => {
  const [windowStartIndex, setWindowStartIndex] = useState(0);
  const timeoutRef = useRef<number | null>(null);
  const lastWindowStartRef = useRef<number | null>(null);
  const lastMatrixOSRef = useRef<MatrixOSMIDI | null>(null);
  const wasLightshowActiveRef = useRef(false);

  const clearScheduledPreview = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const setPreviewWindowForIndex = useCallback((index: number) => {
    setWindowStartIndex(index >= PALETTE_PREVIEW_WINDOW_SIZE ? PALETTE_PREVIEW_WINDOW_SIZE : 0);
  }, []);

  const previewColor = useCallback((index: number, color: Color) => {
    if (isLightshowActive || currentPage !== 'palette') {
      return;
    }

    matrixOS?.previewPaletteColor(index, color);
  }, [currentPage, isLightshowActive, matrixOS]);

  useLayoutEffect(() => {
    clearScheduledPreview();

    if (isLightshowActive) {
      wasLightshowActiveRef.current = true;
      return;
    }

    if (!matrixOS || currentPage !== 'palette') {
      return;
    }

    const forceFull =
      lastWindowStartRef.current !== windowStartIndex ||
      lastMatrixOSRef.current !== matrixOS ||
      wasLightshowActiveRef.current;
    const shouldAnimate = animateTransitions || wasLightshowActiveRef.current;
    const previewDelay = shouldAnimate || forceFull ? 0 : LIVE_PALETTE_PREVIEW_DEBOUNCE_MS;

    const sendLivePreview = () => {
      try {
        matrixOS.previewPaletteWindow(windowStartIndex, colors, forceFull, shouldAnimate);
        lastWindowStartRef.current = windowStartIndex;
        lastMatrixOSRef.current = matrixOS;
        wasLightshowActiveRef.current = false;
      } catch (error) {
        console.warn('Failed to send live palette preview:', error);
      } finally {
        timeoutRef.current = null;
      }
    };

    if (previewDelay === 0) {
      sendLivePreview();
    } else {
      timeoutRef.current = window.setTimeout(sendLivePreview, previewDelay);
    }

    return clearScheduledPreview;
  }, [
    animateTransitions,
    clearScheduledPreview,
    colors,
    currentPage,
    isLightshowActive,
    matrixOS,
    windowStartIndex,
  ]);

  return {
    previewColor,
    setPreviewWindowForIndex,
  };
};
