import React from 'react';
import { useTranslation } from 'react-i18next';
import { HIDConnection as HIDManager } from '../../utils/hid';
import { ConnectionUI, DeviceItem } from '../ui/ConnectionUI';

interface HIDConnectionProps {
  onConnected: (device: any) => void;
  onDisconnected: () => void;
  connectedDevice: any | null;
  hidInstance: HIDManager;
}

export const HIDConnection: React.FC<HIDConnectionProps> = ({
  onConnected,
  onDisconnected,
  connectedDevice,
  hidInstance
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const checkSupport = React.useCallback(() => {
    if (!HIDManager.isSupported()) {
      setError(t('messages.webHidError'));
      return false;
    }
    return true;
  }, [t]);

  React.useEffect(() => {
    checkSupport();
  }, [checkSupport]);

  const handleConnect = async () => {
    if (!checkSupport()) return;

    try {
      setIsLoading(true);
      setError(null);
      const device = await hidInstance.connect();
      if (device) {
        onConnected(device);
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await hidInstance.disconnect();
      onDisconnected();
    } catch (err: any) {
      setError(err.message || 'Disconnection failed');
    }
  };

  return (
    <ConnectionUI
      title={t('sections.device')}
      headerButtonText={connectedDevice ? t('buttons.disconnect') : t('buttons.connect') || 'Connect'}
      onHeaderButtonClick={connectedDevice ? handleDisconnect : handleConnect}
      headerIcon={connectedDevice ? "link-slash" : "link"}
      isLoading={isLoading}
      loadingMessage={t('messages.connecting') || 'Connecting...'}
      error={error}
      emptyMessage={t('messages.noDevices') || 'No device connected'}
    >
      {connectedDevice ? (
        <DeviceItem
          name={connectedDevice.productName || 'Unknown HID Device'}
          isConnected={true}
          onClick={handleDisconnect}
        />
      ) : null}
    </ConnectionUI>
  );
};
