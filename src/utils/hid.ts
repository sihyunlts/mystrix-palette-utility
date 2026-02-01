export enum BackupCommand {
    ACK = 0x00,
    INFO = 0x01,
    DATA = 0x02,
    COMMIT = 0x03,
    IDENTIFY = 0x10,
    ERR = 0xFF
}

export interface HIDDevice {
    productName: string;
    opened: boolean;
    sendReport(reportId: number, data: Uint8Array): Promise<void>;
    close(): Promise<void>;
    addEventListener(type: string, listener: (event: any) => void): void;
}

export const HID_VENDOR_ID = 0x0203;
export const HID_REPORT_ID = 0xFF;

export class HIDConnection {
    private device: HIDDevice | null = null;
    private responseResolve: ((value: Uint8Array) => void) | null = null;

    async connect(): Promise<HIDDevice | null> {
        // @ts-ignore
        const devices = await navigator.hid.requestDevice({
            filters: [{ vendorId: HID_VENDOR_ID }]
        });

        if (devices.length > 0) {
            this.device = devices[0];
            if (this.device) {
                await (this.device as any).open();
                this.device.addEventListener('inputreport', this.onInputReport.bind(this));
            }
            return this.device;
        }
        return null;
    }

    private onInputReport(event: any) {
        if (this.responseResolve) {
            const data = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
            this.responseResolve(data);
            this.responseResolve = null;
        }
    }

    async sendCommand(command: number, data: number[] = [], isWrite: boolean = false): Promise<void> {
        if (!this.device) return;
        const fullCommand = isWrite ? (command | 0x80) : (command & 0x7F);
        
        // Mystrix RawHID expects 32 bytes Data payload per report (Total 33 bytes with ID)
        const report = new Uint8Array(32);
        report[0] = fullCommand;
        for (let i = 0; i < data.length && i < 31; i++) {
            report[i + 1] = data[i];
        }
        
        try {
            await this.device.sendReport(HID_REPORT_ID, report);
        } catch (e) {
            console.error("HID Send Error:", e);
            throw e;
        }
    }

    async requestData(command: number, data: number[] = [], isWrite: boolean = false): Promise<Uint8Array> {
        if (!this.device) throw new Error("Device not connected");
        
        const responsePromise = new Promise<Uint8Array>((resolve) => {
            this.responseResolve = resolve;
        });

        await this.sendCommand(command, data, isWrite);
        const response = await responsePromise;

        // Check for device error response (CMD_ERR = 0xFF)
        if (response[0] === BackupCommand.ERR) {
            const failedCmd = response[1];
            const errorCode = response[2];
            throw new Error(`Device Error: Command 0x${failedCmd.toString(16).toUpperCase()} failed with code ${errorCode}`);
        }

        return response;
    }

    async disconnect() {
        if (this.device) {
            await this.device.close();
            this.device = null;
        }
    }

    onDisconnect(callback: () => void) {
        // @ts-ignore
        navigator.hid.addEventListener('disconnect', (event) => {
            if (event.device === this.device) {
                this.device = null;
                callback();
            }
        });
    }
}
