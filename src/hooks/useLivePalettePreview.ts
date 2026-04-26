import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Color } from '../types';
import { MatrixOSMIDI } from '../utils/midi';

const LIVE_PALETTE_PREVIEW_INTERVAL_MS = 20;
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
  const lastPreviewSentAtRef = useRef(0);
  const latestPreviewRequestRef = useRef<UseLivePalettePreviewOptions & { windowStartIndex: number } | null>(null);
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
    if (isLightshowActive) {
      latestPreviewRequestRef.current = null;
      clearScheduledPreview();
      wasLightshowActiveRef.current = true;
      return;
    }

    if (!matrixOS || currentPage !== 'palette') {
      latestPreviewRequestRef.current = null;
      clearScheduledPreview();
      return;
    }

    latestPreviewRequestRef.current = {
      matrixOS,
      colors,
      currentPage,
      isLightshowActive,
      animateTransitions,
      windowStartIndex,
    };

    const sendLivePreview = () => {
      const request = latestPreviewRequestRef.current;

      if (!request?.matrixOS || request.currentPage !== 'palette' || request.isLightshowActive) {
        timeoutRef.current = null;
        return;
      }

      const requestForceFull =
        lastWindowStartRef.current !== request.windowStartIndex ||
        lastMatrixOSRef.current !== request.matrixOS ||
        wasLightshowActiveRef.current;
      const requestShouldAnimate = request.animateTransitions || wasLightshowActiveRef.current;

      try {
        request.matrixOS.previewPaletteWindow(
          request.windowStartIndex,
          request.colors,
          requestForceFull,
          requestShouldAnimate
        );
        lastPreviewSentAtRef.current = performance.now();
        lastWindowStartRef.current = request.windowStartIndex;
        lastMatrixOSRef.current = request.matrixOS;
        wasLightshowActiveRef.current = false;
      } catch (error) {
        console.warn('Failed to send live palette preview:', error);
      } finally {
        timeoutRef.current = null;
      }
    };

    const forceFull =
      lastWindowStartRef.current !== windowStartIndex ||
      lastMatrixOSRef.current !== matrixOS ||
      wasLightshowActiveRef.current;
    const shouldAnimate = animateTransitions || wasLightshowActiveRef.current;

    if (shouldAnimate || forceFull) {
      clearScheduledPreview();
      sendLivePreview();
      return;
    }

    const elapsed = performance.now() - lastPreviewSentAtRef.current;
    const delay = Math.max(0, LIVE_PALETTE_PREVIEW_INTERVAL_MS - elapsed);

    if (delay === 0) {
      clearScheduledPreview();
      sendLivePreview();
      return;
    }

    if (timeoutRef.current === null) {
      timeoutRef.current = window.setTimeout(sendLivePreview, delay);
    }
  }, [
    animateTransitions,
    clearScheduledPreview,
    colors,
    currentPage,
    isLightshowActive,
    matrixOS,
    windowStartIndex,
  ]);

  useLayoutEffect(() => clearScheduledPreview, [clearScheduledPreview]);

  return {
    previewColor,
    setPreviewWindowForIndex,
  };
};
