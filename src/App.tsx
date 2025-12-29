import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Color, Palette } from './types';
import { MatrixOSMIDI } from './utils/midi';
import { MIDIConnection } from './components/MIDIConnection';
import { PaletteGrid } from './components/MystrixPreview';
import { DropdownButton } from './components/DropdownButton';
import { Button } from './components/Button';
import { ModalProvider, useModal } from './components/Modal';
import { SelectedPadInfo } from './components/SelectedPadInfo';
import { GlobalAdjustmentBox } from './components/GlobalAdjustmentBox';
import { SectionHeader } from './components/SectionHeader';
import { loadPaletteFromFile, savePaletteToFile, parsePaletteFile } from './utils/paletteFile';
import { LightshowPlayer, HardwareLightshowEvent, UILightshowEvent } from './utils/LightshowPlayer';
import { applyGlobalSettings } from './utils/colorUtils';
import { Midi } from '@tonejs/midi';
import styles from './App.module.css';

// Dynamic Preset Loader
// Scan src/presets for any files and treat them as palette data
const presetsContext = (require as any).context('./presets', false, /.*/);
const PRESET_DESCRIPTIONS: Record<string, string> = {
  'novation_rg': 'The Red and Green only palette used by early Novation Launchpads.',
  'novation_rgb': 'The modern full RGB palette applied by default to all RGB Launchpads after the Launchpad MK2.',
  'mat1jaczyyy': 'A custom-tuned RGB palette by mat1jaczyyy.',
  'sihyunlights': 'A palette nearly identical to the Novation RGB palette, but with the 71st color adjusted to be darker.'
};

const INITIAL_PRESETS = presetsContext.keys()
  .filter((key: string) => !key.endsWith('.ts') && !key.endsWith('.js'))
  .map((key: string) => {
    const id = key.replace('./', '').replace(/\.[^/.]+$/, "").toLowerCase();
    const name = key.replace('./', '').replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
    return {
      id: key,
      name: name,
      description: PRESET_DESCRIPTIONS[id] || 'A custom palette preset for Mystrix.',
      url: presetsContext(key)
    };
  });

// Parse once for the definitive reference of "Factory" colors
const DEFAULT_PALETTE_COLORS = parsePaletteFile(
`0, 0 0 0;
1, 7 7 7;
2, 31 31 31;
3, 63 63 63;
4, 63 18 18;
5, 63 0 0;
6, 21 0 0;
7, 6 0 0;
8, 63 46 26;
9, 63 20 0;
10, 21 7 0;
11, 9 6 0;
12, 63 63 18;
13, 63 63 0;
14, 21 21 0;
15, 6 6 0;
16, 33 63 18;
17, 20 63 0;
18, 7 21 0;
19, 4 10 0;
20, 18 63 18;
21, 0 63 0;
22, 0 21 0;
23, 0 6 0;
24, 18 63 23;
25, 0 63 6;
26, 0 21 3;
27, 0 6 0;
28, 18 63 33;
29, 0 63 21;
30, 0 21 7;
31, 0 7 4;
32, 18 63 45;
33, 0 63 37;
34, 0 21 13;
35, 0 6 4;
36, 18 48 63;
37, 0 41 63;
38, 0 16 20;
39, 0 3 6;
40, 18 33 63;
41, 0 21 63;
42, 0 7 21;
43, 0 1 6;
44, 18 18 63;
45, 0 0 63;
46, 0 0 21;
47, 0 0 6;
48, 33 18 63;
49, 20 0 63;
50, 6 0 24;
51, 3 0 11;
52, 63 18 63;
53, 63 0 63;
54, 21 0 21;
55, 6 0 6;
56, 63 18 33;
57, 63 0 20;
58, 21 0 7;
59, 8 0 4;
60, 63 5 0;
61, 37 13 0;
62, 29 20 0;
63, 16 24 0;
64, 0 14 0;
65, 0 21 13;
66, 0 20 31;
67, 0 0 63;
68, 0 17 19;
69, 9 0 50;
70, 31 31 31;
71, 7 7 7;
72, 63 0 0;
73, 46 63 11;
74, 43 58 1;
75, 24 63 2;
76, 3 34 0;
77, 0 63 33;
78, 0 41 63;
79, 0 10 63;
80, 15 0 63;
81, 30 0 63;
82, 43 6 30;
83, 15 8 0;
84, 63 18 0;
85, 33 55 1;
86, 28 63 5;
87, 0 63 0;
88, 14 63 9;
89, 21 63 27;
90, 13 63 50;
91, 22 34 63;
92, 12 20 48;
93, 33 31 57;
94, 52 7 63;
95, 63 0 22;
96, 63 31 0;
97, 45 43 0;
98, 35 63 0;
99, 32 22 1;
100, 14 10 0;
101, 4 18 3;
102, 3 19 13;
103, 5 5 10;
104, 5 7 22;
105, 25 14 6;
106, 41 0 2;
107, 54 20 15;
108, 53 26 6;
109, 63 55 9;
110, 39 55 11;
111, 25 44 3;
112, 7 7 11;
113, 54 63 26;
114, 31 63 46;
115, 38 37 63;
116, 35 25 63;
117, 15 15 15;
118, 28 28 28;
119, 55 63 63;
120, 39 0 0;
121, 13 0 0;
122, 6 51 0;
123, 1 16 0;
124, 45 43 0;
125, 15 12 0;
126, 44 23 0;
127, 18 5 0;`);

const NOTE_TO_PAD_INDEX: Record<number, number> = (() => {
  const map: Record<number, number> = {};
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const calNote = c < 4 ? (36 + (7 - r) * 4 + c) : (68 + (7 - r) * 4 + (c - 4));
      map[calNote] = r * 8 + c;
    }
  }
  return map;
})();

const MIDI_CACHE: Map<string, ArrayBuffer> = new Map();
const MIDI_OBJ_CACHE: Map<string, Midi> = new Map();

// Eager load and parse system MIDI files to prevent connection lag
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

const useWindowWidth = () => {
  const [width, setWidth] = React.useState(window.innerWidth);
  React.useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
};

const AppContent: React.FC = () => {
    const width = useWindowWidth();
    const isMobile = width <= 900;
    const isSmallMobile = width <= 600;

  const { showModal } = useModal();
  const [midiOutput, setMidiOutput] = useState<MIDIOutput | null>(null);
  const midiOutputRef = useRef<MIDIOutput | null>(null);
  useEffect(() => {
    midiOutputRef.current = midiOutput;
  }, [midiOutput]);

  const [matrixOS, setMatrixOS] = useState<MatrixOSMIDI | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<MIDIOutput | null>(null);
  
  // Single Palette Workflow
  const [palette, setPalette] = useState<Palette>(() => ({
    id: 1,
    name: "Novation RGB",
    colors: [...DEFAULT_PALETTE_COLORS], // Clone initial defaults
    available: true
  }));
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | undefined>(undefined);

  const [isLightshowActive, setIsLightshowActive] = useState(false);
  const [lightshowColors, setLightshowColors] = useState<Map<number, Color>>(new Map());
  const lightshowPlayerRef = useRef<LightshowPlayer | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Preview Loop Feature
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);

  // Global Adjustment State (Non-destructive)
  const [globalSaturation, setGlobalSaturation] = useState(0);
  const [globalContrast, setGlobalContrast] = useState(0);

  // Computed Palette with Global Adjustments
  const effectivePalette = useMemo(() => {
    return {
        ...palette,
        colors: applyGlobalSettings(palette.colors, globalSaturation, globalContrast)
    };
  }, [palette, globalSaturation, globalContrast]);

  const mapMIDINoteToPadIndex = useCallback((note: number): number | null => {
    return NOTE_TO_PAD_INDEX[note] ?? null;
  }, []);


  const currentPlaybackIdRef = useRef<number>(0);
  const connectionEpochRef = useRef<number>(0);

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
                const color = DEFAULT_PALETTE_COLORS[event.velocity] || { r: 255, g: 255, b: 255 };
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



  useEffect(() => {
    return () => {
        lightshowPlayerRef.current?.stop();
        setIsLightshowActive(false);
    }
  }, []);

  const handleDeviceConnected = useCallback(async (device: MIDIOutput) => {
    const epoch = ++connectionEpochRef.current;
    
    // Stabilization delay (allows OS/Browser MIDI enumeration to settle)
    await new Promise(r => setTimeout(r, 400));
    
    // Check if this connection attempt is still the most recent one
    if (epoch !== connectionEpochRef.current) return;

    setMidiOutput(device);
    setMatrixOS(new MatrixOSMIDI(device));
    setSelectedDevice(device); // Sync the selection state
    playLightshow('/connected.mid', device);
  }, [playLightshow]);

  const handleDeviceDisconnected = useCallback(() => {
    setMidiOutput(null);
    setMatrixOS(null);
    setSelectedDevice(null);
  }, []);

  const handleDeviceSelect = useCallback((device: MIDIOutput | null) => {
    setSelectedDevice(device);
    if (device) {
      setMidiOutput(device);
      setMatrixOS(new MatrixOSMIDI(device));
    } else {
      setMidiOutput(null);
      setMatrixOS(null);
    }
  }, []);

  const handleColorChange = useCallback((index: number, color: Color) => {
    setPalette(prev => ({
      ...prev,
      colors: prev.colors.map((c, i) => i === index ? color : c)
    }));
  }, []);

  const handleUpload = async (slotId: number) => {
    if (!matrixOS) return;

    setIsUploading(true);
    try {
      // Hardware expects 0-based index (0=Slot1), but UI provides 1-based.
      await matrixOS.uploadPalette(slotId - 1, effectivePalette.colors);
      playLightshow('/done.mid', midiOutput || undefined); 
    } catch (error) {
      showModal({
        title: 'Upload Failed',
        message: String(error),
        type: 'alert',
        isDanger: true
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (slotId: number) => {
    if (!matrixOS) return;

    const confirmed = await showModal({
      title: 'This feature won\'t work.',
      message: `The official MatrixOS does not support this feature. Furthermore, since you can simply overwrite the palette, most users don't even need this functionality. However, I added it because I found unused palettes cluttering the display unsightly...`,
      type: 'confirm',
      confirmLabel: 'Uhh okay',
      isDanger: true
    });

    if (!confirmed) return;

    try {
      // Hardware expects 0-based index
      await matrixOS.deletePalette(slotId - 1);
      playLightshow('/del_done.mid', midiOutput || undefined);
    } catch (error) {
      showModal({
        title: 'Deletion Failed',
        message: String(error),
        type: 'alert',
        isDanger: true
      });
    }
  };

  const handleLoadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const colors = await loadPaletteFromFile(file);
      setPalette(prev => ({ ...prev, colors }));
      setGlobalSaturation(0);
      setGlobalContrast(0);
    } catch (error) {
      showModal({
        title: 'Load Failed',
        message: 'Failed to load palette: ' + error,
        type: 'alert',
        isDanger: true
      });
    }
  };

  const handleSaveFile = () => {
    savePaletteToFile(effectivePalette);
  };

  const handleApplyPreset = async (url: string, name: string) => {
    try {
        const response = await fetch(url);
        const data = await response.text();
        const colors = parsePaletteFile(data);
        setPalette({
            id: Date.now(),
            name: name,
            colors: colors,
            available: true
        });
        setGlobalSaturation(0);
        setGlobalContrast(0);
        setSelectedColorIndex(undefined);
    } catch (error) {
        showModal({
            title: 'Preset Load Failed',
            message: 'Failed to fetch preset data: ' + error,
            type: 'alert',
            isDanger: true
        });
    }
  };

  const slotOptions = [
    { label: 'Slot 1', value: 1 },
    { label: 'Slot 2', value: 2 },
    { label: 'Slot 3', value: 3 },
    { label: 'Slot 4', value: 4 },
  ];

  return (
    <div className={styles.root}>
        <header className={styles.header}>
          <div className={styles.logoContainer}>
            <img src="/favicon.ico" alt="Mystrix Logo" className={styles.logo} />
            <h1 className={styles.title}>
              Mystrix Palette Utility
            </h1>
          </div>
          
          <DropdownButton
            label="Links"
            variant="ghost"
            options={[
              { label: 'Mystrix', type: 'header' },
              { label: 'MatrixOS wiki', url: 'https://matrix.203.io' },
              { label: 'MatrixOS Control Map Editor', url: 'https://edit.203.io/' },
              { label: 'MatrixOS Simulator', url: 'https://demo.203.io' },
              { type: 'divider' },
              { label: 'sihyunlights', type: 'header' },
              { label: 'sihyunlights.com', url: 'https://sihyunlights.com' }
            ]}
            dropdownPosition="bottom"
            align="right"
          />
        </header>
      <div className={styles.container}>
        <main className={`${styles.main} ${isMobile ? styles.mobile : ''}`}>
          {/* Left Column */}
          <aside className={`${styles.leftColumn}`}>
            <div className={`sidebar ${styles.sidebarSection} ${isMobile ? styles.mobile : ''}`}>
                <MIDIConnection
                  onDeviceConnected={handleDeviceConnected}
                  onDeviceDisconnected={handleDeviceDisconnected}
                  selectedDevice={selectedDevice}
                  onDeviceSelect={handleDeviceSelect}
                />
            </div>
            <div className={`sidebar ${styles.sidebarSection} ${isMobile ? styles.mobile : ''}`}>
                  <SectionHeader title="Lightshow Preview" />
                  <div className={`${styles.previewDescription} font-size-sm`}>
                    Upload a MIDI file to preview the lightshow effect on the grid.
                  </div>

                  <div className={styles.previewControls}>
                    <Button 
                        variant="ghost" 
                        onClick={() => previewInputRef.current?.click()}
                        className={styles.previewButton}
                    >
                      {previewFile ? previewFile.name : 'Select MIDI File'}
                    </Button>
                    
                    <Button 
                        variant="primary"
                        disabled={!previewFile || isLightshowActive}
                        onClick={() => {
                            if (previewFile) {
                                playLightshow(previewFile);
                            }
                        }}
                    >
                      ►
                    </Button>
                  </div>
                </div>
          </aside>

          {/* Right Column: Main Workspace */}
          <div className={styles.centerColumn}>
            <div className={styles.workspace}>
              <PaletteGrid
                palette={effectivePalette}
                selectedIndex={selectedColorIndex}
                onColorSelect={(index) => setSelectedColorIndex(prev => prev === index ? undefined : index)}
                lightshowColors={lightshowColors}
                isLightshowActive={isLightshowActive}
              />

              <div className={styles.controls}>
                <div className={styles.controlSection}>
                  <SelectedPadInfo
                    selectedIndex={selectedColorIndex}
                    color={(selectedColorIndex !== undefined ? palette.colors[selectedColorIndex] : null) || { r: 0, g: 0, b: 0 }}
                    onColorChange={(color) => selectedColorIndex !== undefined && handleColorChange(selectedColorIndex, color)}
                  />
                </div>

                {globalSaturation !== undefined && globalContrast !== undefined && (
                  <div className={styles.globalAdjustmentWrapper}>
                    <GlobalAdjustmentBox 
                      saturation={globalSaturation}
                      contrast={globalContrast}
                      onSaturationChange={setGlobalSaturation}
                      onContrastChange={setGlobalContrast}
                    />
                  </div>
                )}
              </div>

              <div className={`${styles.actionBar} ${isSmallMobile ? styles.mobile : ''}`}>
                <div className={styles.actionGroup}>
                  <DropdownButton 
                      label="Upload" 
                      options={slotOptions} 
                      onSelect={handleUpload}
                      disabled={isUploading || !midiOutput}
                      loading={isUploading}
                      loadingLabel="Uploading..."
                  />
                  
                  <DropdownButton 
                      label="Delete" 
                      options={slotOptions} 
                      onSelect={handleDelete}
                      disabled={isUploading || !midiOutput}
                      variant="danger"
                  />
                </div>

                <div className={styles.actionGroup}>
                  <Button
                      variant="secondary"
                      onClick={handleLoadFile}
                  >
                      Import
                  </Button>

                  <Button
                      variant="secondary"
                      onClick={handleSaveFile}
                  >
                      Export
                  </Button>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Presets */}
          <aside className={`${styles.rightColumn}`}>
            <div className={`sidebar ${styles.presetSection} ${isMobile ? styles.mobile : ''}`}>
              <SectionHeader title="Palette Presets" />
              <div className={styles.presetList}>
                {INITIAL_PRESETS.map((preset: any) => (
                  <div key={preset.id} className={styles.presetItem}>
                    <Button
                      variant="ghost"
                      active={palette.name === preset.name}
                      onClick={() => handleApplyPreset(preset.url, preset.name)}
                      className={styles.presetButton}
                    >
                      {preset.name}
                    </Button>
                    <Button
                      variant="badge"
                      icon="circle-info"
                      title="Info"
                      onClick={(e) => {
                        e.stopPropagation();
                        showModal({
                          title: preset.name,
                          message: preset.description,
                          type: 'alert'
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </main>
        <footer className={styles.footer}>
          <div className="font-size-md color-dim">for matrixos, by sihyunlights.</div>
          <div className="font-size-md color-muted font-weight-normal">website under construction.</div>
        </footer>
      </div>
      <input
        ref={previewInputRef}
        type="file"
        accept=".mid,.midi"
        onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPreviewFile(file);
        }}
        className={styles.hiddenInput}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*"
        onChange={handleFileChange}
        className={styles.hiddenInput}
      />
    </div>
  );
};

export default function App() {
  return (
    <ModalProvider>
      <AppContent />
    </ModalProvider>
  );
}
