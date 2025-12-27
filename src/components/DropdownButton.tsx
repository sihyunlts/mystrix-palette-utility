import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';

interface DropdownButtonProps {
  label: string;
  options: { label: string; value: number }[];
  onSelect: (value: number) => void;
  disabled?: boolean;
  color?: string; // Kept for backward compat, mapped to style
  loading?: boolean;
  loadingLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; // Added explicit variant
}

export const DropdownButton: React.FC<DropdownButtonProps> = ({
  label,
  options,
  onSelect,
  disabled = false,
  color,
  loading = false,
  loadingLabel = 'Loading...',
  variant = 'primary'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef}>
      <Button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        isLoading={loading}
        variant={variant}
        style={{
            ...(color ? { backgroundColor: color } : {}),
            minWidth: '140px',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: isOpen ? 101 : 'auto'
        }}
      >
        <span>{loading ? loadingLabel : label}</span>
        {!loading && (
          <span style={{ fontSize: '10px', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▼
          </span>
        )}
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            cursor: 'default'
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          right: 0, 
          marginBottom: '8px',
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-subtle)',
          overflow: 'hidden',
          zIndex: 100,
          boxShadow: 'var(--shadow-main)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onSelect(option.value);
                setIsOpen(false);
              }}
              style={{
                textAlign: 'left',
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--color-text-important)',
                cursor: 'pointer',
                fontSize: '14px',
                borderBottom: '1px solid var(--color-border)',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-subtle)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
