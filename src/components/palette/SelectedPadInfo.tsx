import React from 'react';
import { FloatingPortal } from '@floating-ui/react';
import { useTranslation } from 'react-i18next';
import { Color } from '../../types';
import { ColorPicker } from './ColorPicker';
import { SectionHeader } from '../ui/SectionHeader';
import styles from './SelectedPadInfo.module.css';
import { usePopover } from '../../hooks/usePopover';

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
  const {
    referenceRef,
    floatingRef,
    isOpen,
    floatingStyles,
    placement,
    transitionStatus,
    getReferenceProps,
    getFloatingProps,
    isMounted,
    close,
  } = usePopover({
    placement: 'bottom-start',
    fallbackPlacements: ['top-start'],
    offsetPx: 12,
  });

  // Close picker if no pad is selected
  React.useEffect(() => {
    if (selectedIndex === undefined && isOpen) {
      close();
    }
  }, [selectedIndex, isOpen, close]);

  return (
    <div className={styles.container}>
      <SectionHeader title={t('labels.selectedPad')} />
      
      <div className={styles.content}>
        <div className={styles.swatchWrapper}>
          <div 
            ref={referenceRef}
            {...getReferenceProps()}
            className={styles.swatch}
            style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
          />
        </div>

        {isMounted && (
          <FloatingPortal>
            <div
              ref={floatingRef}
              style={floatingStyles}
              {...getFloatingProps()}
            >
              <div
                className={styles.popover}
                data-placement={placement}
                data-status={transitionStatus}
              >
                <ColorPicker
                  color={color}
                  onChange={onColorChange}
                />
              </div>
            </div>
          </FloatingPortal>
        )}

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
