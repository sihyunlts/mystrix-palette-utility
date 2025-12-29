import React from 'react';
import { Slider } from './Slider';
import styles from './GlobalAdjustmentBox.module.css';

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
    <div className={styles.container}>
      <div className={styles.labelSection}>
        <span className="font-size-xs">Global</span>
        {hasChanges && (
          <div 
            onClick={handleReset}
            className={styles.resetButton}
          >
            Reset
          </div>
        )}
      </div>

      <div className={styles.controls}>
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
