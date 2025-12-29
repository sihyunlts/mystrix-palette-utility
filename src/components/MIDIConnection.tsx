import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MIDIManager } from '../utils/midi';
import { SectionHeader } from './SectionHeader';
import styles from './MIDIConnection.module.css';

interface MIDIConnectionProps {
  onDeviceConnected: (device: MIDIOutput) => void;
  onDeviceDisconnected: () => void;
  selectedDevice: MIDIOutput | null;
  onDeviceSelect: (device: MIDIOutput | null) => void;
}

const DeviceButton: React.FC<{
    device: MIDIOutput, 
    index: number,
    isConnected?: boolean,
    onClick: () => void 
}> = ({ device, index, isConnected = false, onClick }) => {
    const className = isConnected ? styles.connectedDevice : styles.deviceButton;
    
    return (
        <button
            onClick={onClick}
            className={className}
        >
            <span className={`font-size-md color-main ${isConnected ? 'color-accent font-weight-bold' : ''}`}>
                {device.name}
            </span>
            <span className="font-size-sm">
                {device.manufacturer}
            </span>
        </button>
    );
};

export const MIDIConnection: React.FC<MIDIConnectionProps> = ({
  onDeviceConnected,
  onDeviceDisconnected,
  selectedDevice,
  onDeviceSelect
}) => {
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MIDIOutput[]>([]);

  const midiManager = MIDIManager.getInstance();

  // Sync refs for listeners to avoid dependency loops
  const onDeviceConnectedRef = React.useRef(onDeviceConnected);
  const onDeviceDisconnectedRef = React.useRef(onDeviceDisconnected);
  
  useEffect(() => {
    onDeviceConnectedRef.current = onDeviceConnected;
    onDeviceDisconnectedRef.current = onDeviceDisconnected;
  }, [onDeviceConnected, onDeviceDisconnected]);

  const selectedDeviceRef = React.useRef(selectedDevice);
  useEffect(() => {
    selectedDeviceRef.current = selectedDevice;
  }, [selectedDevice]);

  const handleDeviceSelect = React.useCallback((device: MIDIOutput | null) => {
    onDeviceSelect(device);
    if (device) {
      setIsConnected(true);
      onDeviceConnectedRef.current(device);
    } else {
      setIsConnected(false);
      onDeviceDisconnectedRef.current();
    }
  }, [onDeviceSelect]);

  const initializeMIDI = React.useCallback(async (autoConnect: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);
      await midiManager.initialize();
      
      const devices = midiManager.getDevices();
      setAvailableDevices(devices);
      
      if (devices.length === 0) {
        setError(t('messages.noDevices'));
      } else if (autoConnect && !selectedDeviceRef.current) {
        const targetDevice = devices.find(d => 
          d.name && (d.name.toLowerCase().includes('mystrix') || d.name.toLowerCase().includes('matrix'))
        );
        if (targetDevice) {
           handleDeviceSelect(targetDevice);
        }
      }
    } catch (err) {
      setError(t('messages.webMidiError'));
    } finally {
      setIsLoading(false);
    }
  }, [handleDeviceSelect, midiManager, t]);

  useEffect(() => {
    // Initial load
    initializeMIDI(true);

    // Subscribe to MIDI state changes (plug/unplug)
    const removeListener = midiManager.addListener(() => {
      const devices = midiManager.getDevices();
      setAvailableDevices(devices);
      
      const currentSelected = selectedDeviceRef.current;
      
      // Auto-disconnect if unplugged
      if (currentSelected && !devices.find(d => (d as any).id === (currentSelected as any).id)) {
        handleDeviceSelect(null);
        setError(t('messages.deviceDisconnected'));
      } 
      // Auto-connect if Mystrix found and no device selected
      else if (!currentSelected) {
        const targetDevice = devices.find(d => 
          d.name && (d.name.toLowerCase().includes('mystrix') || d.name.toLowerCase().includes('matrix'))
        );
        if (targetDevice) {
           handleDeviceSelect(targetDevice);
        }
      }
    });

    return () => removeListener();
  }, [initializeMIDI, handleDeviceSelect, midiManager, t]); // Updated dependencies

  const handleRefresh = React.useCallback(() => {
    setIsConnected(false);
    setError(null);
    setAvailableDevices([]);
    onDeviceSelect(null);
    initializeMIDI(false);
  }, [onDeviceSelect, initializeMIDI]);

  if (isLoading) {
    return (
      <div className={styles.loadingBox}>
        <div>{t('messages.initializing')}</div>
      </div>
    );
  }

  if (isConnected) {
    const deviceIndex = availableDevices.findIndex(d => (d as any).id === (selectedDevice as any)?.id);
    
    return (
      <div className={styles.container}>
        <SectionHeader 
          title={t('sections.device')}
          buttonText={t('buttons.disconnect')}
          onButtonClick={handleRefresh} 
          icon="link-slash"
        />
        
        {selectedDevice && (
          <DeviceButton
            device={selectedDevice}
            index={deviceIndex !== -1 ? deviceIndex : 0}
            isConnected={true}
            onClick={handleRefresh}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <SectionHeader 
        title={t('sections.device')}
        buttonText={t('buttons.refresh')}
        onButtonClick={handleRefresh} 
        icon="rotate"
      />

      {error ? (
        <div className={styles.errorBox}>
          <span className='font-size-md color-danger'>{error}</span>
        </div>
      ) : (
        <div className={styles.deviceList}>
            {availableDevices.length > 0 ? availableDevices.map((device, index) => (
                <DeviceButton
                    key={index}
                    index={index}
                    device={device}
                    onClick={() => handleDeviceSelect(device)}
                />
            )) : (
                <div className={styles.emptyState}>
                    {t('messages.noDevices')}
                </div>
            )}
        </div>
      )}
    </div>
  );
};
