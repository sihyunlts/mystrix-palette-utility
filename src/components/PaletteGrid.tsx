import React from 'react';
import { Color, Palette } from '../types';
import { ColorPicker } from './ColorPicker';

interface PaletteGridProps {
  palette: Palette;
  onColorChange: (index: number, color: Color) => void;
  selectedIndex?: number;
  onColorSelect?: (index: number) => void;
}

export const PaletteGrid: React.FC<PaletteGridProps> = ({
  palette,
  onColorChange,
  selectedIndex,
  onColorSelect
}) => {
  const gridSize = 16; // 16x8 grid for 128 colors
  const cellSize = 20;

  const renderColorCell = (row: number, col: number) => {
    const blockIndex = Math.floor(col / 4);
    const withinBlockCol = col % 4;
    const colorIndex = blockIndex * 32 + (7 - row) * 4 + withinBlockCol;
    const color = palette.colors[colorIndex] || { r: 0, g: 0, b: 0 };
    const isSelected = selectedIndex === colorIndex;

    return (
      <div
        key={`${row}-${col}`}
        style={{
          width: cellSize,
          height: cellSize,
          backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
          border: isSelected ? '2px solid #00ffff' : '1px solid #333',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={() => onColorSelect?.(colorIndex)}
      >
        {isSelected && (
          <div
            style={{
              position: 'absolute',
              top: '-25px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#333',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              whiteSpace: 'nowrap'
            }}
          >
            #{colorIndex.toString().padStart(3, '0')}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ marginBottom: '10px' }}>
        {palette.name} {palette.available ? '✓' : '○'}
      </h3>
      
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
          gap: '1px',
          border: '1px solid #555',
          padding: '5px',
          backgroundColor: '#222'
        }}
      >
        {Array.from({ length: 8 }, (_, row) =>
          Array.from({ length: 16 }, (_, col) => renderColorCell(row, col))
        ).flat()}
      </div>
      
      {selectedIndex !== undefined && (
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>Color {selectedIndex}:</span>
          <ColorPicker
            color={palette.colors[selectedIndex] || { r: 0, g: 0, b: 0 }}
            onChange={(color) => onColorChange(selectedIndex, color)}
            size={30}
          />
          <div
            style={{
              padding: '5px 10px',
              backgroundColor: '#333',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            RGB({palette.colors[selectedIndex]?.r || 0}, {palette.colors[selectedIndex]?.g || 0}, {palette.colors[selectedIndex]?.b || 0})
          </div>
        </div>
      )}
    </div>
  );
};
