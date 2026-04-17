import React from 'react';
import { FloatingPortal } from '@floating-ui/react';
import { Button } from './Button';
import styles from './DropdownButton.module.css';
import { usePopover } from '../../hooks/usePopover';

type DropdownOption = 
  | { label: string; value: number | string; url?: never; type?: 'item' }
  | { label: string; url: string; value?: never; type?: 'item' }
  | { label: string; type: 'header'; value?: never; url?: never }
  | { type: 'divider'; label?: never; value?: never; url?: never };

interface DropdownButtonProps {
  label: string;
  options: DropdownOption[];
  onSelect?: (value: any) => void;
  disabled?: boolean;
  color?: string; // Kept for backward compat, mapped to style
  loading?: boolean;
  loadingLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  dropdownPosition?: 'top' | 'bottom';
  align?: 'left' | 'right';
  className?: string;
}

export const DropdownButton: React.FC<DropdownButtonProps> = ({
  label,
  options,
  onSelect,
  disabled = false,
  color,
  loading = false,
  loadingLabel = 'Loading...',
  variant = 'primary',
  dropdownPosition = 'top',
  align = 'left',
  className = ''
}) => {
  const dropdownPlacement = `${dropdownPosition}-${align === 'right' ? 'end' : 'start'}` as const;
  const fallbackPlacement = `${dropdownPosition === 'bottom' ? 'top' : 'bottom'}-${align === 'right' ? 'end' : 'start'}` as const;
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
    placement: dropdownPlacement,
    fallbackPlacements: [fallbackPlacement],
    offsetPx: 8,
  });

  const handleOptionClick = (option: DropdownOption) => {
    if ('value' in option && option.value !== undefined && onSelect) {
      onSelect(option.value);
    }
    close();
  };

  const buttonClass = `${styles.button} ${isOpen ? styles.open : ''}`;
  const buttonStyle = color ? { backgroundColor: color } : {};

  return (
    <div className={`${styles.container} ${className}`}>
      <Button
        ref={referenceRef}
        {...getReferenceProps()}
        disabled={disabled || loading}
        isLoading={loading}
        variant={variant}
        className={buttonClass}
        style={buttonStyle}
        icon={!loading ? 'chevron-down' : undefined}
        iconPosition="right"
      >
        {loading ? loadingLabel : label}
      </Button>

      {isMounted && (
        <FloatingPortal>
          <div
            ref={floatingRef}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <div
              className={styles.menu}
              data-placement={placement}
              data-status={transitionStatus}
            >
              {options.map((option, index) => {
                if (option.type === 'divider') {
                  return <div key={index} className={styles.divider} />;
                }

                if (option.type === 'header') {
                  return (
                    <div key={index} className={`${styles.sectionHeader} font-size-sm`}>
                      {option.label}
                    </div>
                  );
                }

                const isLink = 'url' in option && option.url !== undefined;

                if (isLink) {
                  return (
                    <a
                      key={index}
                      href={option.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={close}
                      className={`${styles.menuItem} font-size-md color-main`}
                    >
                      {option.label}
                    </a>
                  );
                }

                return (
                  <button
                    key={option.value}
                    onClick={() => handleOptionClick(option)}
                    className={`${styles.menuItem} font-size-md color-main`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
};

export const LinkDropdownButton = DropdownButton;
