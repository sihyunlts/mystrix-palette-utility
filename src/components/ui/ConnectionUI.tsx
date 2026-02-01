import React from 'react';
import { SectionHeader } from './SectionHeader';
import styles from './ConnectionUI.module.css';

interface DeviceItemProps {
  name: string;
  manufacturer?: string;
  isConnected?: boolean;
  onClick: () => void;
}

export const DeviceItem: React.FC<DeviceItemProps> = ({ 
  name, 
  manufacturer, 
  isConnected = false, 
  onClick 
}) => {
  const className = isConnected ? styles.connectedDevice : styles.deviceButton;
  
  return (
    <button onClick={onClick} className={className}>
      <span className={`font-size-md color-main font-weight-medium ${isConnected ? 'color-positive font-weight-bold' : ''}`}>
        {name}
      </span>
      {manufacturer && (
        <span className="font-size-sm">
          {manufacturer}
        </span>
      )}
    </button>
  );
};

interface ConnectionUIProps {
  title: string;
  headerButtonText?: string;
  onHeaderButtonClick?: () => void;
  headerIcon?: string;
  isLoading?: boolean;
  loadingMessage?: string;
  error?: string | null;
  emptyMessage?: string;
  children?: React.ReactNode;
}

export const ConnectionUI: React.FC<ConnectionUIProps> = ({
  title,
  headerButtonText,
  onHeaderButtonClick,
  headerIcon,
  isLoading,
  loadingMessage,
  error,
  emptyMessage,
  children
}) => {
  if (isLoading) {
    return (
      <div className={styles.loadingBox}>
        <div className="font-size-md">{loadingMessage}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <SectionHeader 
        title={title}
        buttonText={headerButtonText}
        onButtonClick={onHeaderButtonClick} 
        icon={headerIcon}
      />
      
      {error ? (
        <div className={styles.errorBox}>
          <span className="font-size-md color-negative">{error}</span>
        </div>
      ) : (
        <div className={styles.deviceList}>
          {children || (
            <div className={styles.emptyState}>
              <span className="font-size-md">{emptyMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
