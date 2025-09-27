import { Color, Palette } from '../types';

// Parse palette file in Novation format (6-bit values 0-63)
export function parsePaletteFile(content: string): Color[] {
  // Handle both \n and \r\n line endings, and split by both \n and \r
  const lines = content.split(/\r?\n|\r/).filter(line => line.trim());
  const colors: Color[] = Array(128).fill(null).map(() => ({ r: 0, g: 0, b: 0 }));

  for (const line of lines) {
    const match = line.match(/^(\d+),\s*(\d+)\s+(\d+)\s+(\d+);?$/);
    if (match) {
      const index = parseInt(match[1]);
      const r6bit = parseInt(match[2]);
      const g6bit = parseInt(match[3]);
      const b6bit = parseInt(match[4]);
      
      if (index >= 0 && index < 128) {
        // Convert 6-bit to 8-bit
        colors[index] = { 
          r: expand6bit(r6bit), 
          g: expand6bit(g6bit), 
          b: expand6bit(b6bit) 
        };
      }
    }
  }
  return colors;
}

// Export palette to Novation format (6-bit values 0-63)
export function exportPaletteFile(colors: Color[]): string {
  const lines: string[] = [];
  
  for (let i = 0; i < 128; i++) {
    const color = colors[i] || { r: 0, g: 0, b: 0 };
    // Convert 8-bit to 6-bit
    const r6bit = compress8bit(color.r);
    const g6bit = compress8bit(color.g);
    const b6bit = compress8bit(color.b);
    lines.push(`${i}, ${r6bit} ${g6bit} ${b6bit};`);
  }
  
  return lines.join('\n');
}

// Load palette from file
export function loadPaletteFromFile(file: File): Promise<Color[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const colors = parsePaletteFile(content);
        resolve(colors);
      } catch (error) {
        reject(new Error('Failed to parse palette file: ' + error));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

// Save palette to file
export function savePaletteToFile(palette: Palette): void {
  const content = exportPaletteFile(palette.colors);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${palette.name.replace(/\s+/g, '_')}`;
  a.click();
  
  URL.revokeObjectURL(url);
}

// Convert between 6-bit and 8-bit color values
export function expand6bit(value: number): number {
  return (value << 2) + (value >> 4);
}

export function compress8bit(value: number): number {
  return value >> 2;
}
