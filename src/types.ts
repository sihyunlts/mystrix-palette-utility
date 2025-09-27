export interface Color {
  r: number;
  g: number;
  b: number;
}

export interface Palette {
  id: number;
  name: string;
  colors: Color[];
  available: boolean;
}

export interface MIDIDevice {
  id: string;
  name: string;
  manufacturer: string;
}

export interface MatrixOSPalette {
  id: number;
  colors: Color[];
  available: boolean;
}
