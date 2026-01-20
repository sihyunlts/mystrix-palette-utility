import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  const handleReset = () => {
    onSaturationChange(0);
    onContrastChange(0);
  };

  const hasChanges = saturation !== 0 || contrast !== 0;

  return (
    <div className={styles.container}>
      <div className={styles.labelSection}>
        <span className="font-size-md">{t('labels.global')}</span>
        {hasChanges && (
          <div 
            onClick={handleReset}
            className={styles.resetButton}
          >
           {t('buttons.reset')}
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <Slider
          label={t('labels.saturation')}
          value={saturation}
          min={-100}
          max={100}
          onChange={onSaturationChange}
          valueDisplay={`${saturation > 0 ? '+' : ''}${saturation}%`}
        />
        <Slider
          label={t('labels.contrast')}
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
