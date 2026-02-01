import { useState, useRef, useCallback, useEffect } from 'react';
import { LightshowPlayer, HardwareLightshowEvent, UILightshowEvent } from '../utils/LightshowPlayer';
import { Color, Palette } from '../types';
import { Midi } from '@tonejs/midi';
import { expand6bit } from '../utils/paletteFile';

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

// Default palette data for system animations (6-bit values converted to 8-bit)
const DEFAULT_PALETTE_COLORS_6BIT: [number, number, number][] = [
  [0, 0, 0], [7, 7, 7], [31, 31, 31], [63, 63, 63],
  [63, 18, 18], [63, 0, 0], [21, 0, 0], [6, 0, 0],
  [63, 46, 26], [63, 20, 0], [21, 7, 0], [9, 6, 0],
  [63, 63, 18], [63, 63, 0], [21, 21, 0], [6, 6, 0],
  [33, 63, 18], [20, 63, 0], [7, 21, 0], [4, 10, 0],
  [18, 63, 18], [0, 63, 0], [0, 21, 0], [0, 6, 0],
  [18, 63, 23], [0, 63, 6], [0, 21, 3], [0, 6, 0],
  [18, 63, 33], [0, 63, 21], [0, 21, 7], [0, 7, 4],
  [18, 63, 45], [0, 63, 37], [0, 21, 13], [0, 6, 4],
  [18, 48, 63], [0, 41, 63], [0, 16, 20], [0, 3, 6],
  [18, 33, 63], [0, 21, 63], [0, 7, 21], [0, 1, 6],
  [18, 18, 63], [0, 0, 63], [0, 0, 21], [0, 0, 6],
  [33, 18, 63], [20, 0, 63], [6, 0, 24], [3, 0, 11],
  [63, 18, 63], [63, 0, 63], [21, 0, 21], [6, 0, 6],
  [63, 18, 33], [63, 0, 20], [21, 0, 7], [8, 0, 4],
  [63, 5, 0], [37, 13, 0], [29, 20, 0], [16, 24, 0],
  [0, 14, 0], [0, 21, 13], [0, 20, 31], [0, 0, 63],
  [0, 17, 19], [9, 0, 50], [31, 31, 31], [7, 7, 7],
  [63, 0, 0], [46, 63, 11], [43, 58, 1], [24, 63, 2],
  [3, 34, 0], [0, 63, 33], [0, 41, 63], [0, 10, 63],
  [15, 0, 63], [30, 0, 63], [43, 6, 30], [15, 8, 0],
  [63, 18, 0], [33, 55, 1], [28, 63, 5], [0, 63, 0],
  [14, 63, 9], [21, 63, 27], [13, 63, 50], [22, 34, 63],
  [12, 20, 48], [33, 31, 57], [52, 7, 63], [63, 0, 22],
  [63, 31, 0], [45, 43, 0], [35, 63, 0], [32, 22, 1],
  [14, 10, 0], [4, 18, 3], [3, 19, 13], [5, 5, 10],
  [5, 7, 22], [25, 14, 6], [41, 0, 2], [54, 20, 15],
  [53, 26, 6], [63, 55, 9], [39, 55, 11], [25, 44, 3],
  [7, 7, 11], [54, 63, 26], [31, 63, 46], [38, 37, 63],
  [35, 25, 63], [15, 15, 15], [28, 28, 28], [55, 63, 63],
  [39, 0, 0], [13, 0, 0], [6, 51, 0], [1, 16, 0],
  [45, 43, 0], [15, 12, 0], [44, 23, 0], [18, 5, 0]
];

// Convert 6-bit values to 8-bit for proper rendering
const DEFAULT_PALETTE_COLORS: Color[] = DEFAULT_PALETTE_COLORS_6BIT.map(
  ([r, g, b]) => ({ r: expand6bit(r), g: expand6bit(g), b: expand6bit(b) })
);

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
        await new Promise(r => setTimeout(r, 300));
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
