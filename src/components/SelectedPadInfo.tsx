import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <div className={styles.group}>
        <span className={`${styles.label} font-size-sm`}>{t('labels.selectedPad')}</span>
        <div className={styles.divider} />
        
        <span className={`${styles.indexValue} font-size-lg`}>
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
          <span className={`${styles.label} font-size-sm`}>{t('labels.rgbValue')}</span>
          <code className={`${styles.rgbValue} font-size-sm`}>
            {selectedIndex !== undefined 
              ? `${color.r}, ${color.g}, ${color.b}`
              : '-, -, -'}
          </code>
        </div>
      </div>
    </div>
  );
};
