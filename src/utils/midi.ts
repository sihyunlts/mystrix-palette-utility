import { Color } from '../types';

// MatrixOS SysEx Protocol for Custom Palette
export class MatrixOSMIDI {
  private output: MIDIOutput;

  constructor(output: MIDIOutput) {
    this.output = output;
  }

  // 8bit to 6bit color conversion
  private compress8bit(value: number): number {
    return value >> 2;
  }

  // Upload palette to MatrixOS
  async uploadPalette(paletteId: number, colors: Color[]): Promise<void> {
    // Start upload (according to developer documentation)
    const startSysex = new Uint8Array([
      0xF0, 0x00, 0x02, 0x03, 0x4D, 0x58,
      0x41, 0x7B,
      0xF7,
    ]);
    this.output.send(startSysex);

    // Upload colors in batches of 6 (index + RGB, each 4 bytes)
    for (let i = 0; i < colors.length; i += 6) { // 6 colors per batch
      const payload: number[] = [];
      for (let j = 0; j < 6 && (i + j) < colors.length; j++) {
        const color = colors[i + j];
        payload.push(
          i + j, // index
          this.compress8bit(color.r),
          this.compress8bit(color.g),
          this.compress8bit(color.b)
        );
      }
      // Batch SysEx message with full header and trailing 0xF7
      const batch = [
        0xF0, 0x00, 0x02, 0x03, 0x4D, 0x58,
        0x41, 0x3D,
        paletteId,
        ...payload,
        0xF7,
      ];
      const batchArray = new Uint8Array(batch);
      this.output.send(batchArray);

      // Add delay between batches to prevent buffer overflow
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    // End upload (according to developer documentation)
    const endSysex = new Uint8Array([
      0xF0, 0x00, 0x02, 0x03, 0x4D, 0x58,
      0x41, 0x7D,
      0xF7,
    ]);
    this.output.send(endSysex);
  }
}

// Web MIDI API utilities
export class MIDIManager {
  private static instance: MIDIManager;
  private devices: MIDIOutput[] = [];

  static getInstance(): MIDIManager {
    if (!MIDIManager.instance) {
      MIDIManager.instance = new MIDIManager();
    }
    return MIDIManager.instance;
  }

  async initialize(): Promise<void> {
    if (!navigator.requestMIDIAccess) {
      throw new Error('Web MIDI API not supported');
    }

    const access = await navigator.requestMIDIAccess({ sysex: true });
    
    // Get all MIDI outputs
    this.devices = Array.from(access.outputs.values());
    
    // Listen for device changes
    access.addEventListener('statechange', () => {
      this.devices = Array.from(access.outputs.values());
    });
  }

  getDevices(): MIDIOutput[] {
    return this.devices;
  }

  findMatrixOSDevice(): MIDIOutput | null {
    // Filter devices whose name/manufacturer match
    const matrixDevices = this.devices.filter(device =>
      (device.name?.toLowerCase() ?? '').includes('matrix') ||
      (device.name?.toLowerCase() ?? '').includes('mystrix') ||
      (device.manufacturer?.toLowerCase() ?? '').includes('203')
    );

    // Prioritize the first available port (index 0)
    return matrixDevices.length > 0 ? matrixDevices[0] : null;
  }
}
