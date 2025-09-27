import React, { useState, useEffect } from 'react';
import { MIDIManager } from '../utils/midi';

interface MIDIConnectionProps {
  onDeviceConnected: (device: MIDIOutput) => void;
  onDeviceDisconnected: () => void;
  selectedDevice: MIDIOutput | null;
  onDeviceSelect: (device: MIDIOutput | null) => void;
}

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

  useEffect(() => {
    initializeMIDI();
  }, []);

  const initializeMIDI = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await midiManager.initialize();
      
      const devices = midiManager.getDevices();
      setAvailableDevices(devices);
      
      if (devices.length === 0) {
        setError('No MIDI devices found. Please connect your device and refresh.');
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
    initializeMIDI();
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Initializing MIDI...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#ff6b6b', marginBottom: '10px' }}>
          {error}
        </div>
        <button
          onClick={handleRefresh}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>
    );
  }

  if (availableDevices.length > 0 && !isConnected) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ marginBottom: '15px' }}>
          <h3>Select MIDI Device</h3>
        </div>
        <div style={{ marginBottom: '15px' }}>
          {availableDevices.map((device, index) => (
            <button
              key={index}
              onClick={() => handleDeviceSelect(device)}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px',
                margin: '5px 0',
                backgroundColor: selectedDevice === device ? '#007acc' : '#333',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{device.name}</div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>
                {device.manufacturer} - Port {index + 1}
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          style={{
            padding: '8px 16px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh Devices
        </button>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#4caf50', marginBottom: '10px' }}>
          ✓ Connected to: {deviceName}
        </div>
        <button
          onClick={handleRefresh}
          style={{
            padding: '8px 16px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reconnect
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ marginBottom: '10px' }}>
        No Mystrix(Matrix) detected
      </div>
      <button
        onClick={handleRefresh}
        style={{
          padding: '8px 16px',
          backgroundColor: '#007acc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Search for Device
      </button>
    </div>
  );
};
