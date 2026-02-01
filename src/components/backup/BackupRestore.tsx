
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { HIDConnection, BackupCommand } from '../../utils/hid';
import backupStyles from './BackupRestore.module.css';

interface BackupData {
    version: number;
    timestamp: string;
    folders: { 
        id: number; 
        name?: string;
        color: string; 
        apps: number[]; 
    }[];
    settings?: { 
        id: number; 
        name?: string; 
        value: any;
    }[];
}

const MAX_TRANSFER_SIZE = 28;

const FOLDER_NAMES: Record<number, string> = {
    0: "Folder 1", 1: "Folder 2", 2: "Folder 3", 3: "Folder 4", 4: "Folder 5", 5: "Folder 6",
    254: "Hidden Folder", 255: "Invisible Folder"
};
 
// MatrixOS Dynamic StringHash (FNV-1a with null terminator)
const stringHash = (str: string): number => {
    const FNV_PRIME = 16777619;
    const FNV_OFFSET_BASIS = 2166136261;
    let hash = FNV_OFFSET_BASIS;
    const fullStr = str + "\0";
    for (let i = 0; i < fullStr.length; i++) {
        hash ^= fullStr.charCodeAt(i);
        hash = Math.imul(hash, FNV_PRIME);
    }
    return hash >>> 0; // Return as unsigned 32-bit
};

// Known Setting Keys
const SETTING_KEYS = [
    "system_brightness",
    "system_secret_menu",
    "device_bluetooth",
    "device_touchbar"
];

// Generate reverse lookup table for names during backup
const SETTING_NAMES: Record<number, string> = Object.fromEntries(
    SETTING_KEYS.map(key => [stringHash(key), key])
);
 
const isSystemSetting = (name: string) => name.startsWith('system_') || (!name.startsWith('system_') && !name.startsWith('device_'));
const isDeviceSetting = (name: string) => name.startsWith('device_');

const stripJsonComments = (data: string) => {
    return data.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (match, group) => (group ? "" : match));
};

interface BackupRestoreProps {
    hidInstance: HIDConnection;
    connected: boolean;
    connectedDevice: any | null;
}

export const BackupRestore: React.FC<BackupRestoreProps> = ({ 
    hidInstance, 
    connected, 
    connectedDevice 
}) => {
    const { t } = useTranslation();
    const [status, setStatus] = useState<string>("Disconnected");
    
    // Selective Restore State
    const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);
    const [restoreLauncher, setRestoreLauncher] = useState(true);
    const [restoreSystem, setRestoreSystem] = useState(true);
    const [restoreDevice, setRestoreDevice] = useState(true);
    
    // Existence flags to avoid redundant .some() checks in UI
    const [hasLauncherData, setHasLauncherData] = useState(false);
    const [hasSystemData, setHasSystemData] = useState(false);
    const [hasDeviceData, setHasDeviceData] = useState(false);

    // Sync status with connection state
    useEffect(() => {
        if (connected && connectedDevice) {
            setStatus(`Connected to ${connectedDevice.productName}`);
        } else {
            setStatus("Disconnected");
        }
    }, [connected, connectedDevice]);

    const verifyApp = async () => {
        if (!hidInstance) return { success: false, version: 0 };
        try {
            const signature = await hidInstance.requestData(BackupCommand.IDENTIFY);
            const version = signature[1]; // Use first byte as single version
            const sigText = new TextDecoder().decode(signature.slice(3, 9)); 
            if (sigText.startsWith("BACKUP")) return { success: true, version };
        } catch (e) { console.warn("Verification failed", e); }
        return { success: false, version: 0 };
    };

    const fetchDeviceBackup = async (): Promise<BackupData> => {
        if (!hidInstance) throw new Error("Device not connected");
        
        setStatus("Reading current device state...");
        const info = await hidInstance.requestData(BackupCommand.INFO);
        const totalSize = (info[1] << 24) | (info[2] << 16) | (info[3] << 8) | info[4];
        
        const fullData = new Uint8Array(totalSize);
        const numSections = Math.ceil(totalSize / MAX_TRANSFER_SIZE);
        
        for (let s = 0; s < numSections; s++) {
            const chunkWithHeader = await hidInstance.requestData(BackupCommand.DATA, [s >> 8, s & 0xFF]);
            const actualSize = chunkWithHeader[3];
            const data = chunkWithHeader.slice(4, 4 + actualSize);
            fullData.set(data, s * MAX_TRANSFER_SIZE);
            if (s % 10 === 0) setStatus(`Reading device (${Math.round((s/numSections)*100)}%)...`);
        }

        // Parse Logic Reused
        let offset = 0;
        const numFolders = fullData[offset++];
        const backup: BackupData = { 
            version: 0, // Placeholder
            timestamp: new Date().toISOString(), 
            folders: [], 
            settings: [] 
        };

        for (let i = 0; i < numFolders; i++) {
            const id = fullData[offset++];
            const color = (fullData[offset] << 24) | (fullData[offset+1] << 16) | (fullData[offset+2] << 8) | fullData[offset+3];
            offset += 4;
            const numApps = (fullData[offset] << 8) | fullData[offset+1];
            offset += 2;
            const apps: number[] = [];
            for(let j=0; j<numApps; j++) {
                apps.push((fullData[offset] << 24) | (fullData[offset+1] << 16) | (fullData[offset+2] << 8) | fullData[offset+3]);
                offset += 4;
            }
            backup.folders.push({ 
                id, 
                name: FOLDER_NAMES[id] || `Unknown Folder (${id})`,
                color: `#${(color >>> 0).toString(16).padStart(8, '0').toUpperCase()}`,
                apps 
            });
        }

        while (offset < fullData.length) {
            const header = fullData[offset++];
            if (header === 0xFF) { // Settings
                const numSettings = fullData[offset++];
                for (let i = 0; i < numSettings; i++) {
                    const id = ((fullData[offset] << 24) | (fullData[offset + 1] << 16) | (fullData[offset + 2] << 8) | fullData[offset + 3]) >>> 0;
                    offset += 4;
                    const len = fullData[offset++];
                    const dataBuffer = fullData.slice(offset, offset + len);
                    const data = Array.from(dataBuffer);
                    const setting = {
                        id,
                        name: SETTING_NAMES[id] || `Unknown Setting (${id})`,
                        value: (data.length === 1) ? data[0] : data
                    };
                    backup.settings?.push(setting);
                    offset += len;
                }
            } else if (header === 0xFE) { // Dict
                 const numDictApps = fullData[offset++];
                 for (let i = 0; i < numDictApps; i++) {
                     offset += 4; // ID
                     const nameLen = fullData[offset++];
                     offset += nameLen;
                 }
            } else { break; }
        }
        return backup;
    };

    const handleBackup = async () => {
        if (!hidInstance || !connected) return;
        
        const deviceAuth = await verifyApp();
        if (!deviceAuth.success) {
            setStatus("Error: Please open 'Backup' App on device");
            return;
        }

        try {
            setStatus("Preparing backup...");
            const info = await hidInstance.requestData(BackupCommand.INFO);
            const totalSize = (info[1] << 24) | (info[2] << 16) | (info[3] << 8) | info[4];
            
            const fullData = new Uint8Array(totalSize);
            const numSections = Math.ceil(totalSize / MAX_TRANSFER_SIZE);
            
            for (let s = 0; s < numSections; s++) {
                const chunkWithHeader = await hidInstance.requestData(BackupCommand.DATA, [s >> 8, s & 0xFF]);
                const actualSize = chunkWithHeader[3];
                const data = chunkWithHeader.slice(4, 4 + actualSize);
                fullData.set(data, s * MAX_TRANSFER_SIZE);
                setStatus(`Downloading (${Math.round((s/numSections)*100)}%)...`);
            }
            
            let offset = 0;
            const numFolders = fullData[offset++];
            const backup: BackupData = { 
                version: deviceAuth.version,
                timestamp: new Date().toISOString(), 
                folders: [], 
                settings: [] 
            };

            for (let i = 0; i < numFolders; i++) {
                const id = fullData[offset++];
                const color = (fullData[offset] << 24) | (fullData[offset+1] << 16) | (fullData[offset+2] << 8) | fullData[offset+3];
                offset += 4;
                const numApps = (fullData[offset] << 8) | fullData[offset+1];
                offset += 2;
                const apps: number[] = [];
                for(let j=0; j<numApps; j++) {
                    apps.push((fullData[offset] << 24) | (fullData[offset+1] << 16) | (fullData[offset+2] << 8) | fullData[offset+3]);
                    offset += 4;
                }
                backup.folders.push({ 
                    id, 
                    name: FOLDER_NAMES[id] || `Unknown Folder (${id})`,
                    color: `#${(color & 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase()}`,
                    apps 
                });
            }

            const appLookup: Record<number, string> = {};

            while (offset < fullData.length) {
                const header = fullData[offset++];
                if (header === 0xFF) {
                    const numSettings = fullData[offset++];
                    for (let i = 0; i < numSettings; i++) {
                        const id = ((fullData[offset] << 24) | (fullData[offset + 1] << 16) | (fullData[offset + 2] << 8) | fullData[offset + 3]) >>> 0;
                        offset += 4;
                        const len = fullData[offset++];
                        const dataBuffer = fullData.slice(offset, offset + len);
                        const data = Array.from(dataBuffer);

                        const setting = {
                            id,
                            name: SETTING_NAMES[id] || `Unknown Setting (${id})`,
                            value: (data.length === 1) ? data[0] : data
                        };

                        backup.settings?.push(setting);
                        offset += len;
                    }
                } else if (header === 0xFE) {
                    const numDictApps = fullData[offset++];
                    for (let i = 0; i < numDictApps; i++) {
                        const id = ((fullData[offset] << 24) | (fullData[offset + 1] << 16) | (fullData[offset + 2] << 8) | fullData[offset + 3]) | 0;
                        offset += 4;
                        const nameLen = fullData[offset++];
                        const name = new TextDecoder().decode(fullData.slice(offset, offset + nameLen));
                        appLookup[id] = name;
                        offset += nameLen;
                    }
                } else {
                    break; 
                }
            }

            const header = `// MatrixOS Backup File
// Generated on ${new Date().toLocaleString()}

// --- Quick Guide ---
// 1. Apps: Reorder the IDs in the "apps" array to change their position on the launcher.
// 2. Colors: You can modify "colorHex" (e.g., "#0000FFFF") to change folder colors easily.
// --------------------

`;
            let jsonString = JSON.stringify(backup, null, 4);
            jsonString = jsonString.replace(/(-?\d+)(,)?$/gm, (match, idStr, comma) => {
                const id = parseInt(idStr);
                if (appLookup[id]) return `${idStr}${comma || ""} // ${appLookup[id]}`;
                return match;
            });

            const blob = new Blob([header + jsonString], { type: "application/jsonc" });
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `matrixos-backup-${new Date().toISOString().split('T')[0]}.jsonc`;
            downloadLink.click();
            await hidInstance.sendCommand(BackupCommand.ACK, [], true);
            setStatus("Backup Complete");
        } catch (error: any) { setStatus("Backup Failed: " + error.message); }
    };

    const handleFileSelect = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.jsonc';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const text = await file.text();
            try {
                const cleanJson = stripJsonComments(text);
                const backup: BackupData = JSON.parse(cleanJson);
                const isLauncherAvailable = (backup.folders?.length ?? 0) > 0;
                const isSystemAvailable = backup.settings?.some(setting => isSystemSetting(setting.name || "")) ?? false;
                const isDeviceAvailable = backup.settings?.some(setting => isDeviceSetting(setting.name || "")) ?? false;

                setHasLauncherData(isLauncherAvailable); setRestoreLauncher(isLauncherAvailable);
                setHasSystemData(isSystemAvailable); setRestoreSystem(isSystemAvailable);
                setHasDeviceData(isDeviceAvailable); setRestoreDevice(isDeviceAvailable);
                
                setPendingBackup(backup);
                setStatus(`Loaded backup file. Select items to restore.`);
            } catch (err: any) { setStatus("Load Failed: " + err.message); }
        };
        input.click();
    };

    const executeRestore = async () => {
        if (!hidInstance || !connected || !pendingBackup) return;

        const deviceAuth = await verifyApp();
        if (!deviceAuth.success) {
            setStatus("Error: Please open 'Backup' App on device");
            return;
        }

        if (pendingBackup.version !== deviceAuth.version) {
            setStatus(`Restore Failed: Version mismatch (File V${pendingBackup.version} vs Device V${deviceAuth.version})`);
            return;
        }

        try {
            const currentDeviceData = await fetchDeviceBackup();
            const foldersToRestore = restoreLauncher ? pendingBackup.folders : currentDeviceData.folders;
            const finalSettingsMap = new Map<number, any>();
            currentDeviceData.settings?.forEach(setting => finalSettingsMap.set(setting.id, setting));

            pendingBackup.settings?.forEach(setting => {
                const name = setting.name || "";
                let shouldRestore = false;

                if (isSystemSetting(name)) shouldRestore = restoreSystem;
                else if (isDeviceSetting(name)) shouldRestore = restoreDevice;

                if (shouldRestore) {
                    finalSettingsMap.set(setting.id, setting);
                }
            });

            const settingsToRestore = Array.from(finalSettingsMap.values());

            const payload: number[] = [foldersToRestore.length];
            foldersToRestore.forEach(folder => {
                let colorInt = 0;
                if(typeof folder.color === 'string' && folder.color.startsWith('#')){
                     colorInt = parseInt(folder.color.replace('#', ''), 16);
                } else {
                     colorInt = Number(folder.color) || 0;
                }
                
                payload.push(folder.id, (colorInt >> 24) & 0xFF, (colorInt >> 16) & 0xFF, (colorInt >> 8) & 0xFF, colorInt & 0xFF, folder.apps.length >> 8, folder.apps.length & 0xFF);
                folder.apps.forEach(app => payload.push((app >> 24) & 0xFF, (app >> 16) & 0xFF, (app >> 8) & 0xFF, app & 0xFF));
            });

            if (settingsToRestore.length > 0) {
                payload.push(0xFF, settingsToRestore.length);
                settingsToRestore.forEach(setting => {
                    const finalData = Array.isArray(setting.value) ? setting.value : [Number(setting.value)];
                    payload.push((setting.id >> 24) & 0xFF, (setting.id >> 16) & 0xFF, (setting.id >> 8) & 0xFF, setting.id & 0xFF);
                    payload.push(finalData.length, ...finalData);
                });
            }
            
            const totalSize = payload.length;
            await hidInstance.requestData(BackupCommand.INFO, [(totalSize >> 24) & 0xFF, (totalSize >> 16) & 0xFF, (totalSize >> 8) & 0xFF, totalSize & 0xFF], true);
            
            const numSections = Math.ceil(totalSize / MAX_TRANSFER_SIZE);
            for (let s = 0; s < numSections; s++) {
                const chunk = payload.slice(s * MAX_TRANSFER_SIZE, (s + 1) * MAX_TRANSFER_SIZE);
                await hidInstance.requestData(BackupCommand.DATA, [s >> 8, s & 0xFF, chunk.length, ...chunk], true);
                setStatus(`Uploading (${Math.round((s/numSections)*100)}%)...`);
            }
            
            await hidInstance.requestData(BackupCommand.COMMIT, [], true);
            setStatus("Restore Complete!");
            setPendingBackup(null);
        } catch (err: any) { setStatus("Restore Failed: " + err.message); }
    };
    
    return (
        <div className={backupStyles.container}>
            <div className={backupStyles.status}>Status: <strong>{status}</strong></div>
            <div className={backupStyles.actions}>
                {connected && (
                    <>
                        <Button variant="secondary" onClick={handleBackup}>Backup to File</Button>
                        {!pendingBackup && <Button variant="danger" onClick={handleFileSelect}>Restore from File</Button>}
                    </>
                )}
            </div>
            
            {pendingBackup && (
                <div className={backupStyles.selectionContainer}>
                    <h3>Select Data to Restore</h3>

                    {hasLauncherData && (
                        <label className={backupStyles.item}>
                            <input 
                                type="checkbox" 
                                checked={restoreLauncher}
                                onChange={(e) => setRestoreLauncher(e.target.checked)}
                            />
                            <div className={backupStyles.itemInfo}>
                                <span className='font-size-md color-main'>App Launcher</span>
                                <span className="font-size-sm color-dim">Folders, App Order</span>
                            </div>
                        </label>
                    )}
                    
                    {hasSystemData && (
                        <label className={backupStyles.item}>
                            <input 
                                type="checkbox" 
                                checked={restoreSystem}
                                onChange={(e) => setRestoreSystem(e.target.checked)}
                            />
                            <div className={backupStyles.itemInfo}>
                                <span className='font-size-md color-main'>System Settings</span>
                                <span className="font-size-sm color-dim">Global configs (Brightness)</span>
                            </div>
                        </label>
                    )}

                    {hasDeviceData && (
                        <label className={backupStyles.item}>
                            <input 
                                type="checkbox" 
                                checked={restoreDevice}
                                onChange={(e) => setRestoreDevice(e.target.checked)}
                            />
                            <div className={backupStyles.itemInfo}>
                                <span className='font-size-md color-main'>Device Settings</span>
                                <span className="font-size-sm color-dim">Device-specific configs (Touchbar, Bluetooth)</span>
                            </div>
                        </label>
                    )}

                    <div className={backupStyles.confirmActions}>
                         <Button variant="ghost" onClick={() => setPendingBackup(null)}>Cancel</Button>
                         <Button variant="primary" onClick={executeRestore}>Restore Selected</Button>
                    </div>
                </div>
            )}

             <div className="font-size-md color-dim">
                Note: Ensure the "Backup" app is running on the device.
            </div>
        </div>
    );
};
