import { useState, useRef, useCallback, useEffect } from 'react';
import { LightshowPlayer, HardwareLightshowEvent, UILightshowEvent } from '../utils/LightshowPlayer';
import { Color, Palette } from '../types';
import { Midi } from '@tonejs/midi';

// Singleton caches
const MIDI_CACHE: Map<string, ArrayBuffer> = new Map();
const MIDI_OBJ_CACHE: Map<string, Midi> = new Map();

// Eager load and parse system MIDI files
const preloadSystemMIDI = async () => {
  try {
    const source = '/connected.mid';
    const response = await fetch(source);
    const arrayBuffer = await response.arrayBuffer();
    MIDI_CACHE.set(source, arrayBuffer);
    MIDI_OBJ_CACHE.set(source, new Midi(arrayBuffer));
  } catch (e) {
    console.warn('Failed to pre-cache system MIDI:', e);
  }
};
preloadSystemMIDI();

// Default palette data for system animations
const DEFAULT_PALETTE_COLORS: Color[] = [
    { r: 0, g: 0, b: 0 },
    { r: 7, g: 7, b: 7 },
    { r: 31, g: 31, b: 31 },
    { r: 63, g: 63, b: 63 },
    { r: 63, g: 18, b: 18 },
    { r: 63, g: 0, b: 0 },
    { r: 21, g: 0, b: 0 },
    { r: 6, g: 0, b: 0 },
    { r: 63, g: 46, b: 26 },
    { r: 63, g: 20, b: 0 },
    { r: 21, g: 7, b: 0 },
    { r: 9, g: 6, b: 0 },
    { r: 63, g: 63, b: 18 },
    { r: 63, g: 63, b: 0 },
    { r: 21, g: 21, b: 0 },
    { r: 6, g: 6, b: 0 },
    { r: 33, g: 63, b: 18 },
    { r: 20, g: 63, b: 0 },
    { r: 7, g: 21, b: 0 },
    { r: 4, g: 10, b: 0 },
    { r: 18, g: 63, b: 18 },
    { r: 0, g: 63, b: 0 },
    { r: 0, g: 21, b: 0 },
    { r: 0, g: 6, b: 0 },
    { r: 18, g: 63, b: 23 },
    { r: 0, g: 63, b: 6 },
    { r: 0, g: 21, b: 3 },
    { r: 0, g: 6, b: 0 },
    { r: 18, g: 63, b: 33 },
    { r: 0, g: 63, b: 21 },
    { r: 0, g: 21, b: 7 },
    { r: 0, g: 7, b: 4 },
    { r: 18, g: 63, b: 45 },
    { r: 0, g: 63, b: 37 },
    { r: 0, g: 21, b: 13 },
    { r: 0, g: 6, b: 4 },
    { r: 18, g: 48, b: 63 },
    { r: 0, g: 41, b: 63 },
    { r: 0, g: 16, b: 20 },
    { r: 0, g: 3, b: 6 },
    { r: 18, g: 33, b: 63 },
    { r: 0, g: 21, b: 63 },
    { r: 0, g: 7, b: 21 },
    { r: 0, g: 1, b: 6 },
    { r: 18, g: 18, b: 63 },
    { r: 0, g: 0, b: 63 },
    { r: 0, g: 0, b: 21 },
    { r: 0, g: 0, b: 6 },
    { r: 33, g: 18, b: 63 },
    { r: 20, g: 0, b: 63 },
    { r: 6, g: 0, b: 24 },
    { r: 3, g: 0, b: 11 },
    { r: 63, g: 18, b: 63 },
    { r: 63, g: 0, b: 63 },
    { r: 21, g: 0, b: 21 },
    { r: 6, g: 0, b: 6 },
    { r: 63, g: 18, b: 33 },
    { r: 63, g: 0, b: 20 },
    { r: 21, g: 0, b: 7 },
    { r: 8, g: 0, b: 4 },
    { r: 63, g: 5, b: 0 },
    { r: 37, g: 13, b: 0 },
    { r: 29, g: 20, b: 0 },
    { r: 16, g: 24, b: 0 },
    { r: 0, g: 14, b: 0 },
    { r: 0, g: 21, b: 13 },
    { r: 0, g: 20, b: 31 },
    { r: 0, g: 0, b: 63 },
    { r: 0, g: 17, b: 19 },
    { r: 9, g: 0, b: 50 },
    { r: 31, g: 31, b: 31 },
    { r: 7, g: 7, b: 7 },
    { r: 63, g: 0, b: 0 },
    { r: 46, g: 63, b: 11 },
    { r: 43, g: 58, b: 1 },
    { r: 24, g: 63, b: 2 },
    { r: 3, g: 34, b: 0 },
    { r: 0, g: 63, b: 33 },
    { r: 0, g: 41, b: 63 },
    { r: 0, g: 10, b: 63 },
    { r: 15, g: 0, b: 63 },
    { r: 30, g: 0, b: 63 },
    { r: 43, g: 6, b: 30 },
    { r: 15, g: 8, b: 0 },
    { r: 63, g: 18, b: 0 },
    { r: 33, g: 55, b: 1 },
    { r: 28, g: 63, b: 5 },
    { r: 0, g: 63, b: 0 },
    { r: 14, g: 63, b: 9 },
    { r: 21, g: 63, b: 27 },
    { r: 13, g: 63, b: 50 },
    { r: 22, g: 34, b: 63 },
    { r: 12, g: 20, b: 48 },
    { r: 33, g: 31, b: 57 },
    { r: 52, g: 7, b: 63 },
    { r: 63, g: 0, b: 22 },
    { r: 63, g: 31, b: 0 },
    { r: 45, g: 43, b: 0 },
    { r: 35, g: 63, b: 0 },
    { r: 32, g: 22, b: 1 },
    { r: 14, g: 10, b: 0 },
    { r: 4, g: 18, b: 3 },
    { r: 3, g: 19, b: 13 },
    { r: 5, g: 5, b: 10 },
    { r: 5, g: 7, b: 22 },
    { r: 25, g: 14, b: 6 },
    { r: 41, g: 0, b: 2 },
    { r: 54, g: 20, b: 15 },
    { r: 53, g: 26, b: 6 },
    { r: 63, g: 55, b: 9 },
    { r: 39, g: 55, b: 11 },
    { r: 25, g: 44, b: 3 },
    { r: 7, g: 7, b: 11 },
    { r: 54, g: 63, b: 26 },
    { r: 31, g: 63, b: 46 },
    { r: 38, g: 37, b: 63 },
    { r: 35, g: 25, b: 63 },
    { r: 15, g: 15, b: 15 },
    { r: 28, g: 28, b: 28 },
    { r: 55, g: 63, b: 63 },
    { r: 39, g: 0, b: 0 },
    { r: 13, g: 0, b: 0 },
    { r: 6, g: 51, b: 0 },
    { r: 1, g: 16, b: 0 },
    { r: 45, g: 43, b: 0 },
    { r: 15, g: 12, b: 0 },
    { r: 44, g: 23, b: 0 },
    { r: 18, g: 5, b: 0 }
];

export const useLightshow = (
  midiOutput: MIDIOutput | null,
  effectivePalette: Palette,
  mapMIDINoteToPadIndex: (note: number) => number | null
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

  const midiOutputRef = useRef(midiOutput);
  useEffect(() => {
    midiOutputRef.current = midiOutput;
  }, [midiOutput]);

  const playLightshow = useCallback(async (source: string | File, device?: MIDIOutput) => {
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
    const activePaletteColors = isSystemAnimation ? DEFAULT_PALETTE_COLORS : effectivePaletteRef.current.colors;

    const targetOutput = device || midiOutputRef.current;
    
    try {
      let midiObj: any;

      // 1. Data Loading Phase (with nested caching)
      if (typeof source === 'string') {
        if (MIDI_OBJ_CACHE.has(source)) {
          midiObj = MIDI_OBJ_CACHE.get(source);
        } else {
          let arrayBuffer: ArrayBuffer;
          if (MIDI_CACHE.has(source)) {
            arrayBuffer = MIDI_CACHE.get(source)!;
          } else {
            const response = await fetch(source);
            arrayBuffer = await response.arrayBuffer();
            MIDI_CACHE.set(source, arrayBuffer);
          }
          // The parsing itself is expensive, cache the result
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

      const player = new LightshowPlayer(
        (hwEvents: HardwareLightshowEvent[]) => {
          if (playbackId !== currentPlaybackIdRef.current) return;
          if (!targetOutput) return;

          hwEvents.forEach(event => {
             // Add 25ms offset to account for typical React render + browser frame latency
             targetOutput.send(new Uint8Array([0x90, event.index, event.velocity]), event.timestamp + 25);
          });
        },
        (uiEvents: UILightshowEvent[]) => {
          if (playbackId !== currentPlaybackIdRef.current) return;

          setLightshowColors(prev => {
            const next = new Map(prev);
            uiEvents.forEach(event => {
              const mapped = mapMIDINoteToPadIndex(event.index);
              if (mapped === null) return;
              
              if (event.velocity > 0) {
                // Use the determined active palette logic
                const color = activePaletteColors[event.velocity] || { r: 255, g: 255, b: 255 };
                next.set(mapped, color);
                next.set(mapped + 64, color);

                // Track polyphony
                const currentCount = activePadCounts.get(mapped) || 0;
                activePadCounts.set(mapped, currentCount + 1);
              } else {
                const currentCount = activePadCounts.get(mapped) || 0;
                const newCount = Math.max(0, currentCount - 1);
                activePadCounts.set(mapped, newCount);

                if (newCount <= 0) {
                  next.delete(mapped);
                  next.delete(mapped + 64);
                }
              }
            });
            return next;
          });
        },
        async () => {
          if (playbackId === currentPlaybackIdRef.current) {
            setLightshowColors(new Map());
            await new Promise(r => setTimeout(r, 250));
            if (playbackId === currentPlaybackIdRef.current) {
              setIsLightshowActive(false);
            }
          }
        }
      );

      lightshowPlayerRef.current = player;
      player.setMidi(midiObj);
      
      // 3. Timing Orchestration: Wait for palette fade-out (0.08s) before starting MIDI
      if (playbackId === currentPlaybackIdRef.current) {
        await new Promise(r => setTimeout(r, 100));
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
  }, [mapMIDINoteToPadIndex]); // midiOutput removed from dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        lightshowPlayerRef.current?.stop();
        setIsLightshowActive(false);
    }
  }, []);

  return {
    isLightshowActive,
    lightshowColors,
    playLightshow
  };
};
