import React, { createContext, useContext, useState, useEffect } from 'react';
import { Button } from './Button';

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
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ModalOptions | null>(null);
  
  // Store the resolve function of the promise
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const showModal = (options: ModalOptions): Promise<boolean> => {
    setOptions(options);
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    resolver?.(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    resolver?.(false);
  };

  return (
    <ModalContext.Provider value={{ showModal }}>
      {children}
      {isOpen && options && (
        <div
          onClick={handleCancel}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(2px)',
            cursor: 'default'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
            backgroundColor: 'var(--color-bg-surface)',
            padding: '24px',
            borderRadius: 'var(--radius-main)',
            border: '1px solid var(--color-border)',
            width: '90%',
            maxWidth: '400px',
            boxShadow: 'var(--shadow-intense)',
            transform: 'scale(1)',
            animation: 'modal-pop 0.2s ease-out'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)' }}>
              {options.title}
            </h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--color-text-dim)', fontSize: '14px', lineHeight: '1.5' }}>
              {options.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {options.type === 'confirm' && (
                <Button variant="ghost" onClick={handleCancel}>
                  {options.cancelLabel || 'Cancel'}
                </Button>
              )}
              <Button 
                variant={options.isDanger ? 'danger' : 'primary'} 
                onClick={handleConfirm}
              >
                {options.confirmLabel || 'OK'}
              </Button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes modal-pop {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
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
