import React, { useState, useEffect } from 'react';
import { MIDIManager } from '../utils/midi';
import { Button } from './Button';

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
    
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '12px',
                backgroundColor: isSelected ? 'var(--color-primary)' : (isHovered ? 'rgba(255, 255, 255, 0.1)' : 'var(--color-bg-subtle)'),
                border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-subtle)',
                cursor: 'pointer',
                color: 'var(--color-text-main)',
                transition: 'all 0.2s',
                textAlign: 'left',
                width: '100%'
            }}
        >
            <span style={{ fontWeight: 600, fontSize: '14px' }}>{device.name}</span>
            <span style={{ fontSize: '11px', opacity: 0.6, marginTop: '2px' }}>{device.manufacturer} - Port {index + 1}</span>
        </button>
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
      <div style={{ textAlign: 'center', color: 'var(--color-text-dim)' }}>
        <div>Initializing MIDI...</div>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div>
        <div style={{ 
            color: 'var(--color-accent)', 
            marginBottom: '16px', 
            fontWeight: 600,
            fontSize: '14px' 
        }}>
          ● Connected to <br /> {deviceName}
        </div>
        <Button onClick={handleRefresh} variant="secondary">
          Disconnect & Change
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-main)', opacity: 0.8 }}>Select Device</h3>
        <Button onClick={handleRefresh} variant="ghost" style={{ padding: '4px 8px', fontSize: '12px' }}>
            ↻ Refresh
        </Button>
      </div>

      {error ? (
        <div style={{ 
            padding: '16px', 
            backgroundColor: 'rgba(244, 67, 54, 0.1)', 
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-subtle)',
            color: 'var(--color-danger)',
            fontSize: '13px',
            textAlign: 'center'
        }}>
          {error}
        </div>
      ) : (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            maxHeight: '200px',
            overflowY: 'auto'
        }}>
            {availableDevices.length > 0 ? availableDevices.map((device, index) => (
                <DeviceButton
                    key={index}
                    index={index}
                    device={device}
                    isSelected={selectedDevice === device}
                    onClick={() => handleDeviceSelect(device)}
                />
            )) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-dim)', fontSize: '13px' }}>
                    No devices detected.
                </div>
            )}
        </div>
      )}
    </div>
  );
};
