import React from 'react';
import { useTranslation } from 'react-i18next';
import { Slider } from '../ui/Slider';
import { SectionHeader } from '../ui/SectionHeader';
import styles from './GlobalAdjustmentBox.module.css';

interface HueAdjustmentBoxProps {
  hueShift: number;
  onHueShiftChange: (val: number) => void;
  onReset?: () => void;
  sliderShouldAnimate?: boolean;
}

export const HueAdjustmentBox: React.FC<HueAdjustmentBoxProps> = ({
  hueShift,
  onHueShiftChange,
  onReset,
  sliderShouldAnimate = false,
}) => {
  const { t } = useTranslation();

  const handleReset = () => {
    if (onReset) {
      onReset();
      return;
    }

    onHueShiftChange(0);
  };

  return (
    <div className={styles.container}>
      <SectionHeader
        title={t('labels.hueShift')}
        buttonText={hueShift !== 0 ? t('buttons.reset') : undefined}
        onButtonClick={handleReset}
      />

      <div className={styles.controls}>
        <Slider
          label={t('labels.hue')}
          value={hueShift}
          min={-180}
          max={180}
          onChange={onHueShiftChange}
          valueDisplay={`${hueShift > 0 ? '+' : ''}${hueShift}deg`}
          animate={sliderShouldAnimate}
        />
      </div>
    </div>
  );
};
