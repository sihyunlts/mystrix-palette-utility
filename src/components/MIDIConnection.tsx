import React, { useState, useEffect } from 'react';
import { MIDIManager } from '../utils/midi';
import { Button } from './Button';
import styles from './MIDIConnection.module.css';

interface MIDIConnectionProps {
  onDeviceConnected: (device: MIDIOutput) => void;
  onDeviceDisconnected: () => void;
  selectedDevice: MIDIOutput | null;
  onDeviceSelect: (device: MIDIOutput | null) => void;
}

const DeviceButton: React.FC<{
    device: MIDIOutput, 
    isSelected: boolean, 
    index: number,
    onClick: () => void 
}> = ({ device, isSelected, index, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    const buttonClass = `${styles.deviceButton} ${isSelected ? styles.selected : ''}`;
    const buttonStyle = {
        backgroundColor: isSelected ? 'var(--color-primary)' : (isHovered ? 'rgba(255, 255, 255, 0.1)' : undefined),
        borderColor: isSelected ? 'var(--color-primary)' : undefined
    };

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={buttonClass}
            style={buttonStyle}
        >
            <span>{device.name}</span>
            <span className="text-label">{device.manufacturer} - Port {index + 1}</span>
        </button>
    );
};

const SectionHeader: React.FC<{
    buttonText: string;
    onButtonClick: () => void;
}> = ({ buttonText, onButtonClick }) => {
    return (
        <div className={styles.header}>
            <h3 className={styles.headerTitle}>Select Device</h3>
            <Button onClick={onButtonClick} variant="ghost" style={{ padding: '4px 8px', fontSize: '12px' }}>
                ↻ {buttonText}
            </Button>
        </div>
    );
};



export const MIDIConnection: React.FC<MIDIConnectionProps> = ({
  onDeviceConnected,
  onDeviceDisconnected,
  selectedDevice,
  onDeviceSelect
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MIDIOutput[]>([]);

  const midiManager = MIDIManager.getInstance();

  // Sync ref for the listener to avoid dependency loops
  const selectedDeviceRef = React.useRef(selectedDevice);
  useEffect(() => {
    selectedDeviceRef.current = selectedDevice;
  }, [selectedDevice]);

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
        setError('Device disconnected');
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
  }, []); // Run once on mount

  const initializeMIDI = async (autoConnect: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);
      await midiManager.initialize();
      
      const devices = midiManager.getDevices();
      setAvailableDevices(devices);
      
      if (devices.length === 0) {
        setError('No MIDI devices found.');
      } else if (autoConnect) {
        const targetDevice = devices.find(d => 
          d.name && (d.name.toLowerCase().includes('mystrix') || d.name.toLowerCase().includes('matrix'))
        );
        if (targetDevice) {
           handleDeviceSelect(targetDevice);
        }
      }
    } catch (err) {
      setError('Web MIDI API not supported or access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeviceSelect = (device: MIDIOutput | null) => {
    onDeviceSelect(device);
    if (device) {
      setDeviceName(device.name ?? 'Unknown Device');
      setIsConnected(true);
      onDeviceConnected(device);
    } else {
      setDeviceName('');
      setIsConnected(false);
      onDeviceDisconnected();
    }
  };

  const handleRefresh = () => {
    setIsConnected(false);
    setDeviceName('');
    setError(null);
    setAvailableDevices([]);
    onDeviceSelect(null);
    initializeMIDI(false);
  };

  if (isLoading) {
    return (
      <div className={styles.loadingBox}>
        <div>Initializing MIDI...</div>
      </div>
    );
  }

  if (isConnected) {
    const deviceIndex = availableDevices.findIndex(d => (d as any).id === (selectedDevice as any)?.id);
    const portNumber = deviceIndex !== -1 ? deviceIndex + 1 : '?';
    
    return (
      <div className={styles.container}>
        <SectionHeader buttonText="Disconnect" onButtonClick={handleRefresh} />
        
        <div className={styles.connectedDevice}>
          <span className={styles.deviceName}>{deviceName}</span>
          <span className="text-label">{selectedDevice?.manufacturer} - Port {portNumber}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <SectionHeader buttonText="Refresh" onButtonClick={handleRefresh} />

      {error ? (
        <div className={styles.errorBox}>
          {error}
        </div>
      ) : (
        <div className={styles.deviceList}>
            {availableDevices.length > 0 ? availableDevices.map((device, index) => (
                <DeviceButton
                    key={index}
                    index={index}
                    device={device}
                    isSelected={selectedDevice === device}
                    onClick={() => handleDeviceSelect(device)}
                />
            )) : (
                <div className={styles.emptyState}>
                    No devices detected.
                </div>
            )}
        </div>
      )}
    </div>
  );
};
