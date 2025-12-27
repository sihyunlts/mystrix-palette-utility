import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Color, Palette } from './types';
import { MatrixOSMIDI } from './utils/midi';
import { MIDIConnection } from './components/MIDIConnection';
import { PaletteGrid } from './components/PaletteGrid';
import { DropdownButton } from './components/DropdownButton';
import { Button } from './components/Button';
import { ModalProvider, useModal } from './components/Modal';
import { SelectedPadInfo } from './components/SelectedPadInfo';
import { GlobalAdjustmentBox } from './components/GlobalAdjustmentBox';
import { loadPaletteFromFile, savePaletteToFile, parsePaletteFile } from './utils/paletteFile';
import { LightshowPlayer, LightshowEvent } from './utils/LightshowPlayer';
import { applyGlobalSettings } from './utils/colorUtils';

// Dynamic Preset Loader
// Scan src/presets for any files and treat them as palette data
const presetsContext = (require as any).context('./presets', false, /.*/);
const INITIAL_PRESETS = presetsContext.keys()
  .filter((key: string) => !key.endsWith('.ts') && !key.endsWith('.js')) // Ignore source files
  .map((key: string) => {
    const name = key.replace('./', '').replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
    return {
      id: key,
      name: name,
      url: presetsContext(key) // Webpack returns the asset URL
    };
  });

// Parse once for the definitive reference of "Factory" colors
const DEFAULT_PALETTE_COLORS = parsePaletteFile(`0, 0 0 0;
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

const AppContent: React.FC = () => {
  const { showModal } = useModal();
  const [midiOutput, setMidiOutput] = useState<MIDIOutput | null>(null);
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
    // Split 4x8 Mapping Logic:
    // The 8x8 is divided into two 4x8 vertical strips.
    // Strip 1 (Cols 0-3): Note = 36 + (7-r)*4 + c
    // Strip 2 (Cols 4-7): Note = 68 + (7-r)*4 + (c-4)
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        let calNote = 0;
        if (c < 4) {
          calNote = 36 + (7 - r) * 4 + c;
        } else {
          calNote = 68 + (7 - r) * 4 + (c - 4);
        }

        if (calNote === note) {
          return r * 8 + c;
        }
      }
    }
    return null;
  }, []);




  const playLightshow = useCallback(async (source: string | File, device?: MIDIOutput) => {
    if (lightshowPlayerRef.current) {
      lightshowPlayerRef.current.stop();
    }

    setIsLightshowActive(true);

    // Capture the target output (current state or override)
    const targetOutput = device || midiOutput;
    
    // activePadCounts is created per playback session to track polyphony
    const activePadCounts = new Map<number, number>();

    const player = new LightshowPlayer(
      (events: LightshowEvent[]) => {
        // Prepare batch updates
        const nextColorsUpdate = new Map<number, {r: number, g: number, b: number}>();
        const padsToClear = new Set<number>(); // eslint-disable-line @typescript-eslint/no-unused-vars
        
        // 1. Process all events for logical state and physical output
        events.forEach(event => {
          const mapped = mapMIDINoteToPadIndex(event.index);
          
          // Ref Counting for polyphony
          if (mapped !== null) {
            const currentCount = activePadCounts.get(mapped) || 0;
            let newCount = currentCount;
            
            if (event.velocity > 0) {
              newCount++;
            } else {
              newCount = Math.max(0, newCount - 1);
            }
            activePadCounts.set(mapped, newCount);

            // Determine action for this pad
            const color = DEFAULT_PALETTE_COLORS[event.velocity] || { r: 255, g: 255, b: 255 };

            if (event.velocity > 0) {
                // Note On: Stage update
                nextColorsUpdate.set(mapped, color);
                // If we set a color, we ensure it's not marked for clearing in this batch
                padsToClear.delete(mapped);
            } else {
                // Note Off: Only stage clear if ref count is 0
                if (newCount === 0) {
                    padsToClear.add(mapped);
                }
            }
          }

          // 2. Send to Physical Hardware (STAY RAW) - Send ALL events immediately
          if (targetOutput) {
            targetOutput.send(new Uint8Array([0x90, event.index, event.velocity]));
          }
        });

        // 3. Update Virtual UI (React State) - ONCE per batch
        // We will replay the effective changes from the batch onto the React state
        setLightshowColors(prev => {
           const next = new Map(prev);
           
           events.forEach(event => {
             const mapped = mapMIDINoteToPadIndex(event.index);
             if (mapped === null) return;
             
             // Use Default Colors
             const color = DEFAULT_PALETTE_COLORS[event.velocity] || { r: 255, g: 255, b: 255 };
             
             if (event.velocity > 0) {
                 next.set(mapped, color);
                 next.set(mapped + 64, color);
             } else {
                 if ((activePadCounts.get(mapped) || 0) <= 0) {
                     next.delete(mapped);
                     next.delete(mapped + 64);
                 }
             }
           });
           
           return next;
        });

      },
      async () => {
        // onFinished callback - orchestrate re-appearance
        setLightshowColors(new Map()); // 1. Clear override colors
        await new Promise(r => setTimeout(r, 250)); // 2. Wait for final glows to dissipate
        setIsLightshowActive(false); // 3. Fade background back in
      }
    );
    
    // Assign immediately to prevent race conditions during load
    lightshowPlayerRef.current = player;

    try {
      if (source instanceof File) {
        const buffer = await source.arrayBuffer();
        await player.loadArrayBuffer(buffer);
      } else {
        await player.load(source);
      }
      
      // Race condition check: If another lightshow started while we were loading, abort.
      if (lightshowPlayerRef.current !== player) return;
      
      // Orchestrate startup: Fade out first
      setIsLightshowActive(true); 
      await new Promise(r => setTimeout(r, 250)); 
      
      // Check again after delay
      if (lightshowPlayerRef.current !== player) return;

      // Then play
      player.play();

    } catch (error) {
      console.warn(`Failed to load lightshow ${source}:`, error);
      if (lightshowPlayerRef.current === player) {
        setIsLightshowActive(false);
      }
    }
  }, [midiOutput, mapMIDINoteToPadIndex]);



  useEffect(() => {
    return () => {
        lightshowPlayerRef.current?.stop();
        setIsLightshowActive(false);
    }
  }, []);

  const handleDeviceConnected = (device: MIDIOutput) => {
    setMidiOutput(device);
    setMatrixOS(new MatrixOSMIDI(device));
    playLightshow('/connected.mid', device);
  };

  const handleDeviceDisconnected = () => {
    setMidiOutput(null);
    setMatrixOS(null);
    setSelectedDevice(null);
  };

  const handleDeviceSelect = (device: MIDIOutput | null) => {
    setSelectedDevice(device);
    if (device) {
      setMidiOutput(device);
      setMatrixOS(new MatrixOSMIDI(device));
    } else {
      setMidiOutput(null);
      setMatrixOS(null);
    }
  };

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
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--color-bg-main)', 
      color: 'var(--color-text-main)',
      padding: '40px' 
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <header style={{ 
          marginBottom: '40px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'baseline',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '20px'
        }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
            Mystrix <span style={{ color: 'var(--color-accent)' }}>Palette</span> Editor
          </h1>
        </header>

        <main className="layout-grid">
          {/* Left Column: Branding and Connection */}
          <aside className="sidebar" style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            padding: '24px',
            backgroundColor: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-main)',
            border: '1px solid var(--color-border)',
            height: 'fit-content'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                Mystrix <span style={{ color: 'var(--color-accent)' }}>Palette</span>
              </h1>
            </div>

            <div style={{ 
              paddingTop: '20px',
              borderTop: '1px solid var(--color-border)'
            }}>
              <div className="text-label" style={{ marginBottom: '12px' }}>
                Device Connection
              </div>
              <MIDIConnection
                onDeviceConnected={handleDeviceConnected}
                onDeviceDisconnected={handleDeviceDisconnected}
                selectedDevice={selectedDevice}
                onDeviceSelect={handleDeviceSelect}
              />
            </div>
            
            <div style={{ 
              paddingTop: '20px',
              borderTop: '1px solid var(--color-border)'
            }}>
              <div className="text-label" style={{ marginBottom: '12px' }}>
                Lightshow Preview
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '13px', color: 'var(--color-text-dim)', lineHeight: '1.4' }}>
                   Upload a MIDI file to preview the lightshow effect on the grid.
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                   <Button 
                      variant="ghost" 
                      onClick={() => previewInputRef.current?.click()}
                      style={{ flex: 1, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
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
            </div>
          </aside>

          {/* Right Column: Main Workspace */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{
              backgroundColor: 'var(--color-bg-surface)',
              padding: '24px',
              borderRadius: 'var(--radius-main)',
              border: '1px solid var(--color-border)',
            }}>
              <PaletteGrid
                palette={effectivePalette}
                selectedIndex={selectedColorIndex}
                onColorSelect={(index) => setSelectedColorIndex(prev => prev === index ? undefined : index)}
                lightshowColors={lightshowColors}
                isLightshowActive={isLightshowActive}
              />

              <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '20px', marginTop: '24px' }}>
                <div style={{
                  flex: '1 1 360px',
                  display: 'flex',
                }}>
                  <SelectedPadInfo
                    selectedIndex={selectedColorIndex}
                    color={(selectedColorIndex !== undefined ? palette.colors[selectedColorIndex] : null) || { r: 0, g: 0, b: 0 }}
                    onColorChange={(color) => selectedColorIndex !== undefined && handleColorChange(selectedColorIndex, color)}
                  />
                </div>

                {globalSaturation !== undefined && globalContrast !== undefined && (
                  <div style={{
                    flex: '1 1 360px',
                    borderRadius: 'var(--radius-main)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '20px'
                  }}>
                    <GlobalAdjustmentBox 
                      saturation={globalSaturation}
                      contrast={globalContrast}
                      onSaturationChange={setGlobalSaturation}
                      onContrastChange={setGlobalContrast}
                    />
                  </div>
                )}
              </div>

              <div className="controls-row">
                <div style={{ display: 'flex', gap: '12px' }}>
                  <DropdownButton 
                      label="Upload to..." 
                      options={slotOptions} 
                      onSelect={handleUpload}
                      disabled={isUploading || !midiOutput}
                      loading={isUploading}
                      loadingLabel="Uploading..."
                  />
                  
                  <DropdownButton 
                      label="Delete from..." 
                      options={slotOptions} 
                      onSelect={handleDelete}
                      disabled={isUploading || !midiOutput}
                      variant="danger"
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
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

            {/* Presets Box */}
            <div style={{
              backgroundColor: 'var(--color-bg-surface)',
              padding: '24px',
              borderRadius: 'var(--radius-main)',
              border: '1px solid var(--color-border)',
            }}>
              <div className="text-label" style={{ marginBottom: '16px' }}>
                Palette Presets
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {INITIAL_PRESETS.map((preset: any) => (
                  <Button
                    key={preset.id}
                    variant="ghost"
                    onClick={() => handleApplyPreset(preset.url, preset.name)}
                    style={{ 
                      fontSize: '13px', 
                      borderColor: palette.name === preset.name ? 'var(--color-primary)' : 'var(--color-border)',
                      backgroundColor: palette.name === preset.name ? 'rgba(65, 113, 255, 0.1)' : 'transparent',
                      color: palette.name === preset.name ? 'var(--color-primary)' : 'var(--color-text-main)'
                    }}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
      <input
        ref={previewInputRef}
        type="file"
        accept=".mid,.midi"
        onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPreviewFile(file);
        }}
        style={{ display: 'none' }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
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
