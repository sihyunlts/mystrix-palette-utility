import React, { createContext, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import styles from './Modal.module.css';

type ModalType = 'alert' | 'confirm';

interface ModalOptions {
  title: string;
  message: string;
  type: ModalType;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
}

interface ModalContextType {
  showModal: (options: ModalOptions) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [options, setOptions] = useState<ModalOptions | null>(null);
  
  // Store the resolve function of the promise
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const showModal = (options: ModalOptions): Promise<boolean> => {
    setOptions(options);
    setIsOpen(true);
    setIsClosing(false);
    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  };

  const closeModal = (value: boolean) => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setOptions(null);
      resolver?.(value);
    }, 150); // Match CSS animation duration
  };

  const handleConfirm = () => closeModal(true);
  const handleCancel = () => closeModal(false);

  return (
    <ModalContext.Provider value={{ showModal }}>
      {children}
      {isOpen && options && (
        <div className={`${styles.overlay} ${isClosing ? styles.closing : ''}`} onClick={handleCancel}>
          <div className={`${styles.dialog} ${isClosing ? styles.closing : ''}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`${styles.title} font-size-lg`}>{options.title}</h3>
            <p className={`${styles.message} font-size-md`}>{options.message}</p>
            <div className={styles.actions}>
              {options.type === 'confirm' && (
                <Button variant="ghost" onClick={handleCancel}>
                  {options.cancelLabel || t('buttons.cancel')}
                </Button>
              )}
              <Button 
                variant={options.isDanger ? 'danger' : 'primary'} 
                onClick={handleConfirm}
              >
                {options.confirmLabel || t('buttons.okay')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
