import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon' | 'badge';
  size?: 'default' | 'small';
  isLoading?: boolean;
  active?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'default',
  isLoading = false,
  active = false,
  icon,
  iconPosition = 'left',
  className = '',
  style,
  disabled,
  ...props
}, ref) => {
  const getColorClass = () => {
    if (variant === 'ghost' || variant === 'icon' || variant === 'badge') {
      return active ? 'color-primary' : 'color-dim';
    }
    return 'color-main';
  };

  const classNames = [
    styles.button,
    'font-weight-medium',
    size === 'small' ? 'font-size-sm' : 'font-size-md',
    size === 'small' ? styles.small : '',
    getColorClass(),
    styles[variant],
    active ? styles.active : '',
    isLoading ? styles.loading : '',
    className
  ].filter(Boolean).join(' ');

  const hasIcon = icon && children;

  const renderIcon = () => (
    icon && <i className={`fa-solid fa-${icon} ${size === 'small' ? 'fa-sm' : ''}`}></i>
  );

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`${classNames} ${hasIcon && size !== 'small' ? styles.hasIcon : ''}`}
      style={style}
      {...props}
    >
      {isLoading ? (
        'Loading...'
      ) : (
        <>
          {iconPosition === 'left' && renderIcon()}
          {children}
          {iconPosition === 'right' && renderIcon()}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';
