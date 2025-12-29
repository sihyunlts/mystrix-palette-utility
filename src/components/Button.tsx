import React from 'react';
import styles from './Button.module.css';

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
  const classNames = [
    styles.button,
    styles[variant],
    active ? styles.active : '',
    isLoading ? styles.loading : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button 
      disabled={disabled || isLoading}
      className={classNames}
      style={style}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
};
