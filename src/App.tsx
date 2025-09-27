import React, { useState, useEffect, useRef } from 'react';
import { Color, Palette } from './types';
import { MatrixOSMIDI } from './utils/midi';
import { MIDIConnection } from './components/MIDIConnection';
import { PaletteGrid } from './components/PaletteGrid';
import { loadPaletteFromFile, savePaletteToFile, parsePaletteFile } from './utils/paletteFile';

function App() {
  const [midiOutput, setMidiOutput] = useState<MIDIOutput | null>(null);
  const [matrixOS, setMatrixOS] = useState<MatrixOSMIDI | null>(null);
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [selectedPalette, setSelectedPalette] = useState<number>(0);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<MIDIOutput | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize palettes with Novation default
  useEffect(() => {
    const novationPalette =
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
127, 18 5 0;`;

    const defaultColors = parsePaletteFile(novationPalette);
    
    const initialPalettes: Palette[] = Array.from({ length: 4 }, (_, i) => ({
      id: i,
      name: `Custom Palette ${i + 1}`,
      colors: defaultColors,
      available: true
    }));
    setPalettes(initialPalettes);
  }, []);

  const handleDeviceConnected = (device: MIDIOutput) => {
    setMidiOutput(device);
    setMatrixOS(new MatrixOSMIDI(device));
  };

  const handleDeviceDisconnected = () => {
    setMidiOutput(null);
    setMatrixOS(null);
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

  const handleColorChange = (index: number, color: Color) => {
    setPalettes(prev => prev.map(palette => 
      palette.id === selectedPalette 
        ? {
            ...palette,
            colors: palette.colors.map((c, i) => i === index ? color : c),
            available: true
          }
        : palette
    ));
  };

  const handleUpload = async () => {
    if (!matrixOS) return;

    setIsUploading(true);
    try {
      await matrixOS.uploadPalette(selectedPalette, palettes[selectedPalette].colors);
      setPalettes(prev => prev.map(palette => 
        palette.id === selectedPalette 
          ? { ...palette, available: true }
          : palette
      ));
      alert('Palette uploaded successfully!');
    } catch (error) {
      alert('Upload failed: ' + error);
    } finally {
      setIsUploading(false);
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
      setPalettes(prev => prev.map(palette => 
        palette.id === selectedPalette 
          ? { ...palette, colors, available: true }
          : palette
      ));
      alert('Palette loaded successfully!');
    } catch (error) {
      alert('Failed to load palette: ' + error);
    }
  };

  const handleSaveFile = () => {
    savePaletteToFile(palettes[selectedPalette]);
  };

  const handlePaletteSelect = (paletteId: number) => {
    setSelectedPalette(paletteId);
    setSelectedColorIndex(undefined);
  };

  return (
    <div style={{ 
      maxWidth: '960px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#fff', marginBottom: '10px' }}>
          Mystrix Palette Utility
        </h1>
        <p style={{ color: '#ccc' }}>
          Edit and upload custom color palettes to your Mystrix
        </p>
      </header>

      <MIDIConnection
        onDeviceConnected={handleDeviceConnected}
        onDeviceDisconnected={handleDeviceDisconnected}
        selectedDevice={selectedDevice}
        onDeviceSelect={handleDeviceSelect}
      />

      {midiOutput && (
        <div style={{ marginTop: '30px' }}>
          {/* Palette Selection */}
          <div style={{ marginBottom: '20px' }}>
            <h2>Select Palette</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              {palettes.map(palette => (
                <button
                  key={palette.id}
                  onClick={() => handlePaletteSelect(palette.id)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: selectedPalette === palette.id ? '#007acc' : '#333',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {palette.name} {palette.available ? '✓' : '○'}
                </button>
              ))}
            </div>
          </div>

          {/* Palette Editor */}
          <PaletteGrid
            palette={palettes[selectedPalette]}
            onColorChange={handleColorChange}
            selectedIndex={selectedColorIndex}
            onColorSelect={setSelectedColorIndex}
          />

          {/* Upload Control */}
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            marginTop: '20px',
            padding: '20px',
            backgroundColor: '#222',
            borderRadius: '8px'
          }}>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              style={{
                padding: '10px 20px',
                backgroundColor: isUploading ? '#666' : '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isUploading ? 'not-allowed' : 'pointer'
              }}
            >
              {isUploading ? 'Uploading...' : 'Upload to Device'}
            </button>

            <button
              onClick={handleLoadFile}
              style={{
                padding: '10px 20px',
                backgroundColor: '#9c27b0',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Load Palette File
            </button>

            <button
              onClick={handleSaveFile}
              style={{
                padding: '10px 20px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Save Palette File
            </button>
          </div>

        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}

export default App;
