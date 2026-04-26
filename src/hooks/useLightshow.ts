import { useState, useRef, useCallback, useEffect } from 'react';
import { LightshowPlayer, HardwareLightshowEvent, UILightshowEvent } from '../utils/LightshowPlayer';
import { Color, Palette } from '../types';
import { Midi } from '@tonejs/midi';
import { FACTORY_PALETTE_COLORS } from '../utils/factoryPalette';
import { isUnderLightPreviewIndex } from '../utils/mystrixLayout';
import { MatrixOSMIDI, type DirectLedPreviewChange } from '../utils/midi';

// Cache parsed MIDI objects so system animations can start without reparsing.
const MIDI_OBJ_CACHE: Map<string, Midi> = new Map();
const HARDWARE_PREVIEW_LATENCY_MS = 25;
const LIGHTSHOW_START_DELAY_MS = 300;
const LIGHTSHOW_END_FADE_MS = 250;

// Eager load and parse system MIDI files
const preloadSystemMIDI = async () => {
  try {
    const source = '/connected.mid';
    const response = await fetch(source);
    const arrayBuffer = await response.arrayBuffer();
    MIDI_OBJ_CACHE.set(source, new Midi(arrayBuffer));
  } catch (e) {
    console.warn('Failed to pre-cache system MIDI:', e);
  }
};
preloadSystemMIDI();

export const useLightshow = (
  matrixOS: MatrixOSMIDI | null,
  effectivePalette: Palette,
  mapMIDINoteToPadIndex: (note: number) => number | null,
  mapMIDINoteToSysexTarget: (note: number) => number | null
) => {
  const [isLightshowActive, setIsLightshowActive] = useState(false);
  const [lightshowColors, setLightshowColors] = useState<Map<number, Color>>(new Map());
  const lightshowPlayerRef = useRef<LightshowPlayer | null>(null);
  const currentPlaybackIdRef = useRef<number>(0);
  
  // Ref to effectively access current palette inside callbacks without re-triggering them
  const effectivePaletteRef = useRef(effectivePalette);
  useEffect(() => {
    effectivePaletteRef.current = effectivePalette;
  }, [effectivePalette]);

  const matrixOSRef = useRef(matrixOS);
  useEffect(() => {
    matrixOSRef.current = matrixOS;
  }, [matrixOS]);

  const playLightshow = useCallback(async (source: string | File, previewMatrixOS?: MatrixOSMIDI) => {
    const playbackId = ++currentPlaybackIdRef.current;
    
    // Stop existing playback immediately
    if (lightshowPlayerRef.current) {
      lightshowPlayerRef.current.stop();
      lightshowPlayerRef.current = null;
    }
    
    // Reset state for new playback
    setLightshowColors(new Map());
    setIsLightshowActive(true);

    // Determine palette source: System animations use Factory Palette, User Previews use Current Palette
    const isSystemAnimation = typeof source === 'string' && source.startsWith('/');
    const activePaletteColors = isSystemAnimation ? FACTORY_PALETTE_COLORS : effectivePaletteRef.current.colors;

    const targetMatrixOS = previewMatrixOS ?? matrixOSRef.current;
    targetMatrixOS?.clearPreview(true);
    
    try {
      let midiObj: Midi;

      // 1. Data Loading Phase
      if (typeof source === 'string') {
        if (MIDI_OBJ_CACHE.has(source)) {
          midiObj = MIDI_OBJ_CACHE.get(source)!;
        } else {
          const response = await fetch(source);
          const arrayBuffer = await response.arrayBuffer();
          midiObj = new Midi(arrayBuffer);
          MIDI_OBJ_CACHE.set(source, midiObj);
        }
      } else {
        const arrayBuffer = await source.arrayBuffer();
        midiObj = new Midi(arrayBuffer);
      }

      // 2. Post-load Race Check: If a newer playback started while fetching/parsing, abort.
      if (playbackId !== currentPlaybackIdRef.current) return;

      const activePadCounts = new Map<number, number>();
      const hardwareActiveTargetCounts = new Map<number, number>();

      const player = new LightshowPlayer(
        (hwEvents: HardwareLightshowEvent[]) => {
          if (playbackId !== currentPlaybackIdRef.current) return;
          if (!targetMatrixOS) return;

          const changesByTimestamp = new Map<number, DirectLedPreviewChange[]>();
          hwEvents.forEach(event => {
            const target = mapMIDINoteToSysexTarget(event.index);
            if (target === null) {
              return;
            }

            const currentCount = hardwareActiveTargetCounts.get(target) || 0;
            let color: Color | null = null;

            if (event.velocity > 0) {
              hardwareActiveTargetCounts.set(target, currentCount + 1);
              color = activePaletteColors[event.velocity] || { r: 255, g: 255, b: 255 };
            } else {
              const nextCount = Math.max(0, currentCount - 1);
              hardwareActiveTargetCounts.set(target, nextCount);
              if (nextCount <= 0) {
                color = { r: 0, g: 0, b: 0 };
              }
            }

            if (!color) {
              return;
            }

            const timestamp = event.timestamp + HARDWARE_PREVIEW_LATENCY_MS;
            const changes = changesByTimestamp.get(timestamp) || [];
            changes.push({ target, color });
            changesByTimestamp.set(timestamp, changes);
          });

          changesByTimestamp.forEach((changes, timestamp) => {
            targetMatrixOS.sendDirectLedPreview(changes, timestamp);
          });
        },
        (uiEvents: UILightshowEvent[]) => {
          if (playbackId !== currentPlaybackIdRef.current) return;

          const colorUpdates = uiEvents.reduce<Array<{
            indexes: number[];
            color: Color | null;
          }>>((updates, event) => {
            const mapped = mapMIDINoteToPadIndex(event.index);
            if (mapped === null) {
              return updates;
            }

            const indexes = isUnderLightPreviewIndex(mapped) ? [mapped] : [mapped, mapped + 64];

            if (event.velocity > 0) {
              const color = activePaletteColors[event.velocity] || { r: 255, g: 255, b: 255 };
              activePadCounts.set(mapped, (activePadCounts.get(mapped) || 0) + 1);
              updates.push({ indexes, color });
              return updates;
            }

            const newCount = Math.max(0, (activePadCounts.get(mapped) || 0) - 1);
            activePadCounts.set(mapped, newCount);

            if (newCount <= 0) {
              updates.push({ indexes, color: null });
            }
            return updates;
          }, []);

          if (colorUpdates.length === 0) {
            return;
          }

          setLightshowColors(prev => {
            const next = new Map(prev);
            colorUpdates.forEach(({ indexes, color }) => (
              indexes.forEach((index) => (
                color ? next.set(index, color) : next.delete(index)
              ))
            ));
            return next;
          });
        },
        async () => {
          if (playbackId === currentPlaybackIdRef.current) {
            setLightshowColors(new Map());
            await new Promise(r => setTimeout(r, LIGHTSHOW_END_FADE_MS));
            if (playbackId === currentPlaybackIdRef.current) {
              setIsLightshowActive(false);
            }
          }
        }
      );

      lightshowPlayerRef.current = player;
      player.setMidi(midiObj);
      
      // Let the UI and hardware palette preview disappear before MIDI events start.
      if (playbackId === currentPlaybackIdRef.current) {
        await new Promise(r => setTimeout(r, LIGHTSHOW_START_DELAY_MS));
      }

      // Final Race Check before starting the animation loop
      if (playbackId === currentPlaybackIdRef.current) {
        player.play();
      }
    } catch (error) {
      console.warn(`Failed to play lightshow ${source}:`, error);
      if (playbackId === currentPlaybackIdRef.current) {
        setIsLightshowActive(false);
      }
    }
  }, [mapMIDINoteToPadIndex, mapMIDINoteToSysexTarget]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      lightshowPlayerRef.current?.stop();
    };
  }, []);

  return {
    isLightshowActive,
    lightshowColors,
    playLightshow
  };
};
