import React from 'react';
import { Color } from '../types';
import { ColorPicker } from './ColorPicker';

interface SelectedPadInfoProps {
  selectedIndex?: number;
  color: Color;
  onColorChange: (color: Color) => void;
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontWeight: 500
};

const CODE_STYLE: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace",
  fontSize: '13px'
};

export const SelectedPadInfo: React.FC<SelectedPadInfoProps> = ({ 
  selectedIndex, 
  color, 
  onColorChange 
}) => {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      borderRadius: 'var(--radius-main)',
      border: '1px solid var(--color-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ ...LABEL_STYLE, minWidth: '80px' }}>Selected Pad</span>
        <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--color-border)', margin: '0 12px' }} />
        
        <span style={{ ...CODE_STYLE, fontSize: '16px', color: 'var(--color-text-main)', minWidth: '30px' }}>
          {selectedIndex !== undefined ? selectedIndex : '---'}
        </span>
      </div>

      <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--color-border)', margin: '0 12px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          opacity: selectedIndex !== undefined ? 1 : 0.5, 
          pointerEvents: selectedIndex !== undefined ? 'auto' : 'none' 
        }}>
          <ColorPicker
            color={color}
            onChange={onColorChange}
            size={50}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={LABEL_STYLE}>RGB Value</span>
          <code style={{ ...CODE_STYLE, color: 'var(--color-text-main)' }}>
            {selectedIndex !== undefined 
              ? `${color.r}, ${color.g}, ${color.b}`
              : '-, -, -'}
          </code>
        </div>
      </div>
    </div>
  );
};
