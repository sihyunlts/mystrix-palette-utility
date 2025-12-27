import React from 'react';
import { Slider } from './Slider';

interface GlobalAdjustmentBoxProps {
  saturation: number;
  contrast: number;
  onSaturationChange: (val: number) => void;
  onContrastChange: (val: number) => void;
}

export const GlobalAdjustmentBox: React.FC<GlobalAdjustmentBoxProps> = ({ 
  saturation, 
  contrast, 
  onSaturationChange, 
  onContrastChange 
}) => {
  const handleReset = () => {
    onSaturationChange(0);
    onContrastChange(0);
  };

  const hasChanges = saturation !== 0 || contrast !== 0;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      width: '100%'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '70px' }}>
        <span className="text-label" style={{ fontSize: '11px', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Global</span>
        {hasChanges && (
          <div 
            onClick={handleReset}
            className="text-code"
            style={{ 
              cursor: 'pointer', 
              color: 'var(--color-danger)', 
              fontSize: '11px',
              textDecoration: 'underline'
            }}
          >
            Reset
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        <Slider
          label="Saturation"
          value={saturation}
          min={-100}
          max={100}
          onChange={onSaturationChange}
          valueDisplay={`${saturation > 0 ? '+' : ''}${saturation}%`}
        />
        <Slider
          label="Contrast"
          value={contrast}
          min={-15}
          max={15}
          onChange={onContrastChange}
          valueDisplay={`${contrast > 0 ? '+' : ''}${contrast}%`}
        />
      </div>
    </div>
  );
};
