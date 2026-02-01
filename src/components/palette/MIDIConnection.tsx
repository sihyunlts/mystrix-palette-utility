import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MIDIManager } from '../../utils/midi';
import { ConnectionUI, DeviceItem } from '../ui/ConnectionUI';

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
  }, [initializeMIDI, handleDeviceSelect, midiManager, t]);

  const handleRefresh = React.useCallback(() => {
    setIsConnected(false);
    setError(null);
    setAvailableDevices([]);
    onDeviceSelect(null);
    initializeMIDI(false);
  }, [onDeviceSelect, initializeMIDI]);

  return (
    <ConnectionUI
      title={t('sections.device')}
      headerButtonText={isConnected ? t('buttons.disconnect') : t('buttons.refresh')}
      onHeaderButtonClick={handleRefresh}
      headerIcon={isConnected ? "link-slash" : "rotate"}
      isLoading={isLoading}
      loadingMessage={t('messages.initializing')}
      error={error}
      emptyMessage={t('messages.noDevices')}
    >
      {isConnected && selectedDevice ? (
        <DeviceItem
          name={selectedDevice.name || 'Unknown Device'}
          manufacturer={selectedDevice.manufacturer}
          isConnected={true}
          onClick={handleRefresh}
        />
      ) : (
        availableDevices.map((device, index) => (
          <DeviceItem
            key={(device as any).id || index}
            name={device.name || 'Unknown Device'}
            manufacturer={device.manufacturer}
            onClick={() => handleDeviceSelect(device)}
          />
        ))
      )}
    </ConnectionUI>
  );
};

