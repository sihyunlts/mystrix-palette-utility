import React from 'react';
import { Color } from '../types';
import { ColorPicker } from './ColorPicker';
import styles from './SelectedPadInfo.module.css';

interface SelectedPadInfoProps {
  selectedIndex?: number;
  color: Color;
  onColorChange: (color: Color) => void;
}

export const SelectedPadInfo: React.FC<SelectedPadInfoProps> = ({ 
  selectedIndex, 
  color, 
  onColorChange 
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.group}>
        <span className={styles.label}>Selected Pad</span>
        <div className={styles.divider} />
        
        <span className={styles.indexValue}>
          {selectedIndex !== undefined ? selectedIndex : '---'}
        </span>
      </div>

      <div className={styles.divider} />

      <div className={styles.group}>
        <div className={`${styles.colorPickerWrapper} ${selectedIndex === undefined ? styles.disabled : ''}`}>
          <ColorPicker
            color={color}
            onChange={onColorChange}
            size={50}
          />
        </div>
        <div className={styles.rgbGroup}>
          <span className={styles.label}>RGB Value</span>
          <code className={styles.rgbValue}>
            {selectedIndex !== undefined 
              ? `${color.r}, ${color.g}, ${color.b}`
              : '-, -, -'}
          </code>
        </div>
      </div>
    </div>
  );
};
