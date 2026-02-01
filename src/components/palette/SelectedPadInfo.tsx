import React from 'react';
import { useTranslation } from 'react-i18next';
import { Color } from '../../types';
import { ColorPicker } from './ColorPicker';
import { SectionHeader } from '../ui/SectionHeader';
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
  const [isOpen, setIsOpen] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 200);
  };

  // Close picker if no pad is selected
  React.useEffect(() => {
    if (selectedIndex === undefined && isOpen && !isClosing) {
      handleClose();
    }
  }, [selectedIndex, isOpen, isClosing]);

  return (
    <div className={styles.container}>
      <SectionHeader title={t('labels.selectedPad')} />
      
      <div className={styles.content}>
        <div className={styles.swatchWrapper}>
          <div 
            className={styles.swatch}
            style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
            onClick={() => {
              if (isOpen) handleClose();
              else setIsOpen(true);
            }}
          />
            {isOpen && (
              <div 
                className={`${styles.popover} ${isClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
              >
              <div className={styles.backdrop} onClick={handleClose} />
              <ColorPicker
                color={color}
                onChange={onColorChange}
              />
            </div>
          )}
        </div>

        <div className={styles.divider} />

        <div className={styles.indexSection}>
          <span className={`font-size-xl text-code font-weight-medium`}>
            {selectedIndex !== undefined ? selectedIndex : '---'}
          </span>
        </div>

        <div className={styles.divider} />

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
