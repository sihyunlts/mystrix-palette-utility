import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
  isLoading?: boolean;
  active?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false,
  active = false,
  className = '',
  style,
  disabled,
  ...props 
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: active ? 'var(--color-primary)' : 'var(--color-primary)',
          color: 'var(--color-text-main)',
          border: 'none',
          boxShadow: active ? '0 0 15px var(--color-primary)' : 'none',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--color-danger)',
          color: 'var(--color-text-main)',
          border: 'none',
        };
      case 'secondary':
        return {
          backgroundColor: active ? 'var(--color-primary)' : 'var(--color-secondary)',
          color: 'var(--color-text-main)',
          border: 'none',
        };
      case 'ghost':
        return {
          backgroundColor: active ? 'rgba(65, 113, 255, 0.1)' : 'transparent',
          color: active ? 'var(--color-primary)' : 'var(--color-text-dim)',
          border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        };
      case 'icon':
          return {
              backgroundColor: 'transparent',
              color: active ? 'var(--color-primary)' : 'inherit',
              border: 'none',
              padding: '8px',
          }
      default:
        return {};
    }
  };

  const baseStyles: React.CSSProperties = {
    padding: variant === 'icon' ? '8px' : '12px 24px',
    borderRadius: 'var(--radius-subtle)',
    fontWeight: 600,
    fontSize: variant === 'icon' ? 'inherit' : '14px',
    cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    opacity: (disabled || isLoading) ? 0.6 : 1,
    minWidth: variant === 'icon' ? 'auto' : 'unset',
    ...getVariantStyles(),
    ...style,
  };

  return (
    <button 
      disabled={disabled || isLoading}
      style={baseStyles}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
};
