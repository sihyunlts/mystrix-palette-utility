import React from 'react';
import { Button } from './Button';
import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  title: string;
  buttonText?: string;
  onButtonClick?: () => void;
  icon?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  buttonText,
  onButtonClick,
  icon
}) => {
  return (
    <div className={styles.header}>
      <h3>{title}</h3>
      {buttonText && onButtonClick && (
        <Button onClick={onButtonClick} variant="ghost" size="small" icon={icon}>
          {buttonText}
        </Button>
      )}
    </div>
  );
};
