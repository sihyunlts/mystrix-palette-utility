import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import styles from './DropdownButton.module.css';

type DropdownOption = 
  | { label: string; value: number; url?: never }
  | { label: string; url: string; value?: never };

interface DropdownButtonProps {
  label: string;
  options: DropdownOption[];
  onSelect?: (value: number) => void;
  disabled?: boolean;
  color?: string; // Kept for backward compat, mapped to style
  loading?: boolean;
  loadingLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  dropdownPosition?: 'top' | 'bottom';
  align?: 'left' | 'right';
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
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleOptionClick = (option: DropdownOption) => {
    if ('value' in option && option.value !== undefined && onSelect) {
      onSelect(option.value);
    }
    setIsOpen(false);
  };

  const buttonClass = `${styles.button} ${isOpen ? styles.open : ''}`;
  const iconClass = `${styles.icon} ${isOpen ? styles.open : ''}`;
  const menuClass = `${styles.menu} ${styles[dropdownPosition]} ${styles[`align${align.charAt(0).toUpperCase() + align.slice(1)}`]}`;

  const buttonStyle = color ? { backgroundColor: color } : {};

  return (
    <div className={styles.container} ref={dropdownRef}>
      <Button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        isLoading={loading}
        variant={variant}
        className={buttonClass}
        style={buttonStyle}
      >
        {loading ? loadingLabel : label}
        {!loading && (
          <span className={iconClass}>
            ▼
          </span>
        )}
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className={styles.backdrop}
          onClick={() => setIsOpen(false)}
        />
      )}

      {isOpen && (
        <div className={menuClass}>
          {options.map((option, index) => {
            const isLink = 'url' in option && option.url !== undefined;

            if (isLink) {
              return (
                <a
                  key={index}
                  href={option.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className={styles.menuItem}
                >
                  {option.label}
                </a>
              );
            }

            return (
              <button
                key={option.value}
                onClick={() => handleOptionClick(option)}
                className={styles.menuItem}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// LinkDropdownButton is now integrated into DropdownButton
// Use DropdownButton with options containing 'url' property instead
export const LinkDropdownButton = DropdownButton;
