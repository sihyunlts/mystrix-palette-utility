
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { SectionHeader } from '../ui/SectionHeader';
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
 
 const stripJsonComments = (data: string) => {
    // 1. Remove comments
    const noComments = data.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => (g ? "" : m));
    // 2. Remove trailing commas (e.g., [1, 2, 3,] or {a:1,}) which break JSON.parse
    return noComments.replace(/,(\s*[\]}])/g, '$1');
};

export const BackupRestore: React.FC = () => {
    const { t } = useTranslation();
    const [status, setStatus] = useState<string>("Disconnected");
    const [hid, setHid] = useState<HIDConnection | null>(null);
    const [connected, setConnected] = useState(false);
    
    // Selective Restore State
    const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);
    const [restoreLauncher, setRestoreLauncher] = useState(true);
    const [restoreSystem, setRestoreSystem] = useState(true);
    const [restoreDevice, setRestoreDevice] = useState(true);

    // Sync refs/listeners
    useEffect(() => {
        const conn = new HIDConnection();
        setHid(conn);

        conn.onDisconnect(() => {
            setConnected(false);
            setStatus("Disconnected (Device Removed)");
        });
    }, []);

    const verifyApp = async () => {
        if (!hid) return { success: false, version: 0 };
        try {
            const signature = await hid.requestData(BackupCommand.IDENTIFY);
            const version = signature[1]; // Use first byte as single version
            const sigText = new TextDecoder().decode(signature.slice(3, 9)); 
            if (sigText.startsWith("BACKUP")) return { success: true, version };
        } catch (e) { console.warn("Verification failed", e); }
        return { success: false, version: 0 };
    };

    const handleConnect = async () => {
        if (!hid) return;
        try {
            const device = await hid.connect();
            if (device) { setConnected(true); setStatus(`Connected to ${device.productName}`); }
        } catch (e: any) { setStatus("Connection failed: " + e.message); }
    };



    const fetchDeviceBackup = async (): Promise<BackupData> => {
        if (!hid) throw new Error("Device not connected");
        
        setStatus("Reading current device state...");
        const info = await hid.requestData(BackupCommand.INFO);
        const totalSize = (info[1] << 24) | (info[2] << 16) | (info[3] << 8) | info[4];
        
        const fullData = new Uint8Array(totalSize);
        const numSections = Math.ceil(totalSize / MAX_TRANSFER_SIZE);
        
        for (let s = 0; s < numSections; s++) {
            const chunkWithHeader = await hid.requestData(BackupCommand.DATA, [s >> 8, s & 0xFF]);
            const actualSize = chunkWithHeader[3];
            const data = chunkWithHeader.slice(4, 4 + actualSize);
            fullData.set(data, s * MAX_TRANSFER_SIZE);
            if (s % 10 === 0) setStatus(`Reading device (${Math.round((s/numSections)*100)}%)...`);
        }

        // Parse Logic Reused
        let ptr = 0;
        const numFolders = fullData[ptr++];
        const backup: BackupData = { 
            version: 0, // Placeholder
            timestamp: new Date().toISOString(), 
            folders: [], 
            settings: [] 
        };

        for (let i = 0; i < numFolders; i++) {
            const id = fullData[ptr++];
            const color = (fullData[ptr] << 24) | (fullData[ptr+1] << 16) | (fullData[ptr+2] << 8) | fullData[ptr+3];
            ptr += 4;
            const numApps = (fullData[ptr] << 8) | fullData[ptr+1];
            ptr += 2;
            const apps: number[] = [];
            for(let j=0; j<numApps; j++) {
                apps.push((fullData[ptr] << 24) | (fullData[ptr+1] << 16) | (fullData[ptr+2] << 8) | fullData[ptr+3]);
                ptr += 4;
            }
            backup.folders.push({ 
                id, 
                name: FOLDER_NAMES[id] || `Unknown Folder (${id})`,
                color: `#${(color >>> 0).toString(16).padStart(8, '0').toUpperCase()}`,
                apps 
            });
        }

        while (ptr < fullData.length) {
            const header = fullData[ptr++];
            if (header === 0xFF) { // Settings
                const numSettings = fullData[ptr++];
                for (let i = 0; i < numSettings; i++) {
                    const id = ((fullData[ptr] << 24) | (fullData[ptr + 1] << 16) | (fullData[ptr + 2] << 8) | fullData[ptr + 3]) >>> 0;
                    ptr += 4;
                    const len = fullData[ptr++];
                    const dataBuffer = fullData.slice(ptr, ptr + len);
                    const data = Array.from(dataBuffer);
                    const setting = {
                        id,
                        name: SETTING_NAMES[id] || `Unknown Setting (${id})`,
                        value: (data.length === 1) ? data[0] : data
                    };
                    backup.settings?.push(setting);
                    ptr += len;
                }
            } else if (header === 0xFE) { // Dict
                 // Skip dict parsing for restore-merge purposes to save time/complexity, or parse if needed.
                 // Just advancing pointer is enough if we know structure.
                 const numDictApps = fullData[ptr++];
                 for (let i = 0; i < numDictApps; i++) {
                     ptr += 4; // ID
                     const nameLen = fullData[ptr++];
                     ptr += nameLen;
                 }
            } else { break; }
        }
        return backup;
    };

    const handleBackup = async () => {
        if (!hid || !connected) return;
        
        const deviceAuth = await verifyApp();
        if (!deviceAuth.success) {
            setStatus("Error: Please open 'Backup' App on device");
            return;
        }

        try {
            setStatus("Preparing backup...");
            const info = await hid.requestData(BackupCommand.INFO);
            const totalSize = (info[1] << 24) | (info[2] << 16) | (info[3] << 8) | info[4];
            
            const fullData = new Uint8Array(totalSize);
            const numSections = Math.ceil(totalSize / MAX_TRANSFER_SIZE);
            
            for (let s = 0; s < numSections; s++) {
                const chunkWithHeader = await hid.requestData(BackupCommand.DATA, [s >> 8, s & 0xFF]);
                const actualSize = chunkWithHeader[3];
                const data = chunkWithHeader.slice(4, 4 + actualSize);
                fullData.set(data, s * MAX_TRANSFER_SIZE);
                setStatus(`Downloading (${Math.round((s/numSections)*100)}%)...`);
            }
            
            let ptr = 0;
            const numFolders = fullData[ptr++];
            const backup: BackupData = { 
                version: deviceAuth.version,
                timestamp: new Date().toISOString(), 
                folders: [], 
                settings: [] 
            };

            for (let i = 0; i < numFolders; i++) {
                const id = fullData[ptr++];
                const color = (fullData[ptr] << 24) | (fullData[ptr+1] << 16) | (fullData[ptr+2] << 8) | fullData[ptr+3];
                ptr += 4;
                const numApps = (fullData[ptr] << 8) | fullData[ptr+1];
                ptr += 2;
                const apps: number[] = [];
                for(let j=0; j<numApps; j++) {
                    apps.push((fullData[ptr] << 24) | (fullData[ptr+1] << 16) | (fullData[ptr+2] << 8) | fullData[ptr+3]);
                    ptr += 4;
                }
                backup.folders.push({ 
                    id, 
                    name: FOLDER_NAMES[id] || `Unknown Folder (${id})`,
                    color: `#${(color >>> 0).toString(16).padStart(8, '0').toUpperCase()}`,
                    apps 
                });
            }

            const appLookup: Record<number, string> = {};

            while (ptr < fullData.length) {
                const header = fullData[ptr++];
                if (header === 0xFF) {
                    const numSettings = fullData[ptr++];
                    for (let i = 0; i < numSettings; i++) {
                        const id = ((fullData[ptr] << 24) | (fullData[ptr + 1] << 16) | (fullData[ptr + 2] << 8) | fullData[ptr + 3]) >>> 0;
                        ptr += 4;
                        const len = fullData[ptr++];
                        const dataBuffer = fullData.slice(ptr, ptr + len);
                        const data = Array.from(dataBuffer);

                        const setting = {
                            id,
                            name: SETTING_NAMES[id] || `Unknown Setting (${id})`,
                            value: (data.length === 1) ? data[0] : data
                        };

                        backup.settings?.push(setting);
                        ptr += len;
                    }
                } else if (header === 0xFE) {
                    const numDictApps = fullData[ptr++];
                    for (let i = 0; i < numDictApps; i++) {
                        const id = ((fullData[ptr] << 24) | (fullData[ptr + 1] << 16) | (fullData[ptr + 2] << 8) | fullData[ptr + 3]) | 0;
                        ptr += 4;
                        const nameLen = fullData[ptr++];
                        const name = new TextDecoder().decode(fullData.slice(ptr, ptr + nameLen));
                        appLookup[id] = name;
                        ptr += nameLen;
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
            jsonString = jsonString.replace(/(-?\d+),?$/gm, (match, idStr) => {
                const id = parseInt(idStr);
                if (appLookup[id]) return `${idStr}, // ${appLookup[id]}`;
                return match;
            });

            const blob = new Blob([header + jsonString], { type: "application/jsonc" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `matrixos-backup-${new Date().toISOString().split('T')[0]}.jsonc`;
            a.click();
            await hid.sendCommand(BackupCommand.ACK, [], true);
            setStatus("Backup Complete");
        } catch (e: any) { setStatus("Backup Failed: " + e.message); }
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
                setRestoreLauncher(true);
                setRestoreSystem(true);
                setRestoreDevice(true);
                setPendingBackup(backup);
                setStatus(`Loaded backup file. Select items to restore.`);
            } catch (err: any) { setStatus("Load Failed: " + err.message); }
        };
        input.click();
    };

    const executeRestore = async () => {
        if (!hid || !connected || !pendingBackup) return;

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
            currentDeviceData.settings?.forEach(s => finalSettingsMap.set(s.id, s));

            if (pendingBackup.settings) {
                pendingBackup.settings.forEach(s => {
                    const name = s.name || "";
                    let shouldRestore = false;
                    if (name.startsWith('system_') && restoreSystem) shouldRestore = true;
                    else if (name.startsWith('device_') && restoreDevice) shouldRestore = true;
                    else if (!name.startsWith('system_') && !name.startsWith('device_') && restoreSystem) shouldRestore = true;

                    if (shouldRestore) {
                        finalSettingsMap.set(s.id, s);
                    }
                });
            }

            const settingsToRestore = Array.from(finalSettingsMap.values());

            const payload: number[] = [foldersToRestore.length];
            foldersToRestore.forEach(f => {
                let colorInt = 0;
                if(typeof f.color === 'string' && f.color.startsWith('#')){
                     colorInt = parseInt(f.color.replace('#', ''), 16);
                } else {
                     colorInt = Number(f.color) || 0;
                }
                
                payload.push(f.id, (colorInt >> 24) & 0xFF, (colorInt >> 16) & 0xFF, (colorInt >> 8) & 0xFF, colorInt & 0xFF, f.apps.length >> 8, f.apps.length & 0xFF);
                f.apps.forEach(app => payload.push((app >> 24) & 0xFF, (app >> 16) & 0xFF, (app >> 8) & 0xFF, app & 0xFF));
            });

            if (settingsToRestore.length > 0) {
                payload.push(0xFF, settingsToRestore.length);
                settingsToRestore.forEach(s => {
                    const finalData = Array.isArray(s.value) ? s.value : [Number(s.value)];
                    payload.push((s.id >> 24) & 0xFF, (s.id >> 16) & 0xFF, (s.id >> 8) & 0xFF, s.id & 0xFF);
                    payload.push(finalData.length, ...finalData);
                });
            }
            
            const totalSize = payload.length;
            await hid.requestData(BackupCommand.INFO, [(totalSize >> 24) & 0xFF, (totalSize >> 16) & 0xFF, (totalSize >> 8) & 0xFF, totalSize & 0xFF], true);
            
            const numSections = Math.ceil(totalSize / MAX_TRANSFER_SIZE);
            for (let s = 0; s < numSections; s++) {
                const chunk = payload.slice(s * MAX_TRANSFER_SIZE, (s + 1) * MAX_TRANSFER_SIZE);
                await hid.requestData(BackupCommand.DATA, [s >> 8, s & 0xFF, chunk.length, ...chunk], true);
                setStatus(`Uploading (${Math.round((s/numSections)*100)}%)...`);
            }
            
            await hid.requestData(BackupCommand.COMMIT, [], true);
            setStatus("Restore Complete!");
            setPendingBackup(null);
        } catch (err: any) { setStatus("Restore Failed: " + err.message); }
    };
    
    return (
        <div className={backupStyles.container}>
            <SectionHeader title={t('sections.backupRestore') || "Backup & Restore"} />
            <div className={backupStyles.status}>Status: <strong>{status}</strong></div>
            <div className={backupStyles.actions}>
                {!connected ? (
                    <Button variant="primary" onClick={handleConnect}>Connect Device</Button>
                ) : (
                    <>
                        <Button variant="secondary" onClick={handleBackup}>Backup to File</Button>
                        {!pendingBackup && <Button variant="danger" onClick={handleFileSelect}>Restore from File</Button>}
                    </>
                )}
            </div>
            
            {pendingBackup && (
                <div className={backupStyles.selectionContainer}>
                    <div className={backupStyles.selectionHeader}>
                        <h3>Select Data to Restore</h3>
                    </div>

                    <div className={backupStyles.scrollArea}>
                        <div className={backupStyles.group}>
                            <label className={backupStyles.item}>
                                <input 
                                    type="checkbox" 
                                    checked={restoreLauncher}
                                    onChange={(e) => setRestoreLauncher(e.target.checked)}
                                />
                                <div style={{display: 'flex', flexDirection: 'column'}}>
                                    <span style={{fontWeight: 600}}>App Launcher</span>
                                    <span className="font-size-sm color-muted">Folders, App Layout, Folder Colors</span>
                                </div>
                            </label>
                            
                            <label className={backupStyles.item}>
                                <input 
                                    type="checkbox" 
                                    checked={restoreSystem}
                                    onChange={(e) => setRestoreSystem(e.target.checked)}
                                />
                                <div style={{display: 'flex', flexDirection: 'column'}}>
                                    <span style={{fontWeight: 600}}>System Settings</span>
                                    <span className="font-size-sm color-muted">Brightness, Secret Menu, Global configs</span>
                                </div>
                            </label>

                            <label className={backupStyles.item}>
                                <input 
                                    type="checkbox" 
                                    checked={restoreDevice}
                                    onChange={(e) => setRestoreDevice(e.target.checked)}
                                />
                                <div style={{display: 'flex', flexDirection: 'column'}}>
                                    <span style={{fontWeight: 600}}>Device Settings</span>
                                    <span className="font-size-sm color-muted">Touchbar, Bluetooth, Device-specific configs</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className={backupStyles.confirmActions}>
                         <Button variant="ghost" onClick={() => setPendingBackup(null)}>Cancel</Button>
                         <Button variant="primary" onClick={executeRestore}>Restore Selected</Button>
                    </div>
                </div>
            )}

             <div className="font-size-sm color-muted" style={{marginTop: '20px'}}>
                Note: Ensure the "Backup" app is running on the device.
            </div>
        </div>
    );
};
