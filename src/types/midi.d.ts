import { MIDIManager } from "../midiManager";

export class MatrixOSMIDI {
  private output: WebMidi.MIDIOutput;

  constructor(output: WebMidi.MIDIOutput) {
    this.output = output;
  }

  async uploadPalette(palette: number[][]): Promise<void> {
    const batchSize = 6;
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    for (let i = 0; i < palette.length; i += batchSize) {
      const batch = palette.slice(i, i + batchSize);
      const sysexMessage = this.buildSysExMessage(batch);
      this.output.send(sysexMessage);
      await delay(30);
    }
  }

  private buildSysExMessage(colors: number[][]): number[] {
    const header = [0xF0, 0x00, 0x20, 0x3C, 0x01, 0x00];
    const footer = [0xF7];
    const data: number[] = [];

    for (const color of colors) {
      // Assuming color is [r, g, b] with 0-255 range
      // Convert each color component to 7-bit value by shifting right 1 bit
      data.push(color[0] >> 1, color[1] >> 1, color[2] >> 1);
    }

    return [...header, ...data, ...footer];
  }
}
