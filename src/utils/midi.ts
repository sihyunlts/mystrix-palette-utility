import { Color } from '../types';
import { COLOR_TRANSITION_MS, lerpColor, normalizeColor } from './previewTransition';

export interface DirectLedPreviewChange {
  target: number;
  color: Color;
}

// MatrixOS SysEx Protocol for Custom Palette
export class MatrixOSMIDI {
  private static readonly SYSEX_HEADER = [0xF0, 0x00, 0x02, 0x03, 0x4D, 0x58];
  private static readonly OFF_COLOR: Color = { r: 0, g: 0, b: 0 };
  private static readonly PREVIEW_WINDOW_SIZE = 64;
  private static readonly MAX_DIRECT_PREVIEW_CHANGES_PER_MESSAGE = 16;
  private static readonly PREVIEW_TRANSITION_SEND_INTERVAL_MS = 10;
  private output: MIDIOutput;
  private lastPreviewStartIndex: number | null = null;
  private lastPreviewColors: Color[] = [];
  private previewAnimationFrame: number | null = null;

  constructor(output: MIDIOutput) {
    this.output = output;
  }

  // 8bit to 6bit color conversion
  private compress8bit(value: number): number {
    const normalized = Number.isFinite(value) ? Math.max(0, Math.min(255, Math.round(value))) : 0;
    return normalized >> 2;
  }

  private previewTargetFromLocalIndex(localIndex: number): number {
    const row = Math.floor(localIndex / 8);
    const column = localIndex % 8;
    return (8 - row) * 10 + column + 1;
  }

  private compressColor(color: Color): [number, number, number] {
    return [
      this.compress8bit(color.r),
      this.compress8bit(color.g),
      this.compress8bit(color.b),
    ];
  }

  private compressedColorsEqual(first: Color, second: Color): boolean {
    const firstCompressed = this.compressColor(first);
    const secondCompressed = this.compressColor(second);
    return (
      firstCompressed[0] === secondCompressed[0] &&
      firstCompressed[1] === secondCompressed[1] &&
      firstCompressed[2] === secondCompressed[2]
    );
  }

  private cancelPreviewTransition(): void {
    if (this.previewAnimationFrame !== null) {
      window.cancelAnimationFrame(this.previewAnimationFrame);
      this.previewAnimationFrame = null;
    }
  }

  private sendDirectLedPreviewFrame(changes: DirectLedPreviewChange[], timestamp?: number): void {
    if (changes.length === 0) {
      return;
    }

    for (let offset = 0; offset < changes.length; offset += MatrixOSMIDI.MAX_DIRECT_PREVIEW_CHANGES_PER_MESSAGE) {
      const payload: number[] = [];
      const chunk = changes.slice(offset, offset + MatrixOSMIDI.MAX_DIRECT_PREVIEW_CHANGES_PER_MESSAGE);

      chunk.forEach(({ target, color }) => {
        if (!Number.isFinite(target) || target < 0 || target > 127) {
          return;
        }

        payload.push(
          Math.round(target),
          this.compress8bit(color.r),
          this.compress8bit(color.g),
          this.compress8bit(color.b)
        );
      });

      if (payload.length === 0) {
        continue;
      }

      this.output.send(new Uint8Array([
        ...MatrixOSMIDI.SYSEX_HEADER,
        0x5E,
        ...payload,
        0xF7,
      ]), timestamp);
    }
  }

  private sendGlobalPreviewClear(): void {
    this.output.send(new Uint8Array([
      ...MatrixOSMIDI.SYSEX_HEADER,
      0x5E,
      0x00, 0x00, 0x00, 0x00,
      0xF7,
    ]));
  }

  private transitionPreviewWindow(
    startIndex: number,
    fromColors: Color[],
    targetColors: Color[],
    changedLocalIndexes: number[],
    onComplete?: () => void
  ): void {
    this.cancelPreviewTransition();

    const startedAt = performance.now();
    let lastSentAt = 0;
    const changedLocalIndexSet = new Set(changedLocalIndexes);
    const renderFrame = (timestamp: number) => {
      const progress = Math.min((timestamp - startedAt) / COLOR_TRANSITION_MS, 1);
      const frameColors = targetColors.map((targetColor, localIndex) => (
        changedLocalIndexSet.has(localIndex)
          ? lerpColor(fromColors[localIndex] || MatrixOSMIDI.OFF_COLOR, targetColor, progress)
          : targetColor
      ));

      if (
        progress >= 1 ||
        timestamp - lastSentAt >= MatrixOSMIDI.PREVIEW_TRANSITION_SEND_INTERVAL_MS
      ) {
        this.sendDirectLedPreviewFrame(changedLocalIndexes.map(localIndex => ({
          target: this.previewTargetFromLocalIndex(localIndex),
          color: frameColors[localIndex],
        })));
        lastSentAt = timestamp;
      }

      this.lastPreviewStartIndex = startIndex;
      this.lastPreviewColors = frameColors;

      if (progress < 1) {
        this.previewAnimationFrame = window.requestAnimationFrame(renderFrame);
        return;
      }

      this.previewAnimationFrame = null;
      this.lastPreviewColors = targetColors;
      onComplete?.();
    };

    this.previewAnimationFrame = window.requestAnimationFrame(renderFrame);
  }

  sendDirectLedPreview(changes: DirectLedPreviewChange[], timestamp?: number): void {
    this.cancelPreviewTransition();
    this.sendDirectLedPreviewFrame(changes, timestamp);
  }

  clearPreview(animateTransitions = false): void {
    const hasPreviewColors = this.lastPreviewColors.length === MatrixOSMIDI.PREVIEW_WINDOW_SIZE;
    const startIndex = this.lastPreviewStartIndex ?? 0;

    if (!animateTransitions || !hasPreviewColors) {
      this.cancelPreviewTransition();
      this.sendGlobalPreviewClear();
      this.lastPreviewStartIndex = startIndex;
      this.lastPreviewColors = Array.from(
        { length: MatrixOSMIDI.PREVIEW_WINDOW_SIZE },
        () => MatrixOSMIDI.OFF_COLOR
      );
      return;
    }

    const targetColors = Array.from(
      { length: MatrixOSMIDI.PREVIEW_WINDOW_SIZE },
      () => MatrixOSMIDI.OFF_COLOR
    );
    const changedLocalIndexes = this.lastPreviewColors.reduce<number[]>((indexes, color, localIndex) => {
      if (!this.compressedColorsEqual(color, MatrixOSMIDI.OFF_COLOR)) {
        indexes.push(localIndex);
      }
      return indexes;
    }, []);

    if (changedLocalIndexes.length === 0) {
      this.sendGlobalPreviewClear();
      return;
    }

    this.transitionPreviewWindow(
      startIndex,
      this.lastPreviewColors,
      targetColors,
      changedLocalIndexes,
      () => this.sendGlobalPreviewClear()
    );
  }

  previewPaletteColor(index: number, color: Color): void {
    const normalizedStartIndex = index >= MatrixOSMIDI.PREVIEW_WINDOW_SIZE
      ? MatrixOSMIDI.PREVIEW_WINDOW_SIZE
      : 0;
    const localIndex = index - normalizedStartIndex;

    if (localIndex < 0 || localIndex >= MatrixOSMIDI.PREVIEW_WINDOW_SIZE) {
      return;
    }

    if (
      this.lastPreviewStartIndex !== null &&
      this.lastPreviewStartIndex !== normalizedStartIndex
    ) {
      return;
    }

    const nextColor = normalizeColor(color);
    this.cancelPreviewTransition();
    this.sendDirectLedPreviewFrame([{
      target: this.previewTargetFromLocalIndex(localIndex),
      color: nextColor,
    }]);

    this.lastPreviewStartIndex = normalizedStartIndex;
    const nextPreviewColors = this.lastPreviewColors.length === MatrixOSMIDI.PREVIEW_WINDOW_SIZE
      ? [...this.lastPreviewColors]
      : Array.from({ length: MatrixOSMIDI.PREVIEW_WINDOW_SIZE }, () => MatrixOSMIDI.OFF_COLOR);
    nextPreviewColors[localIndex] = nextColor;
    this.lastPreviewColors = nextPreviewColors;
  }

  previewPaletteWindow(startIndex: number, colors: Color[], forceFull = false, animateTransitions = false): void {
    const normalizedStartIndex = startIndex >= MatrixOSMIDI.PREVIEW_WINDOW_SIZE
      ? MatrixOSMIDI.PREVIEW_WINDOW_SIZE
      : 0;
    const previousStartIndex = this.lastPreviewStartIndex;
    const previousColors = this.lastPreviewColors;
    const hasPreviousColors = previousColors.length === MatrixOSMIDI.PREVIEW_WINDOW_SIZE;
    const previousWindowIsOff = hasPreviousColors && previousColors.every(color => (
      this.compressedColorsEqual(color, MatrixOSMIDI.OFF_COLOR)
    ));
    const canAnimateFromPreviousWindow = hasPreviousColors && (
      previousStartIndex === normalizedStartIndex || previousWindowIsOff
    );
    const changedLocalIndexes: number[] = [];
    const nextPreviewColors: Color[] = [];
    const shouldForceFull = forceFull || this.lastPreviewStartIndex !== normalizedStartIndex;

    for (let localIndex = 0; localIndex < MatrixOSMIDI.PREVIEW_WINDOW_SIZE; localIndex++) {
      const color = normalizeColor(colors[normalizedStartIndex + localIndex] || MatrixOSMIDI.OFF_COLOR);
      const previous = this.lastPreviewColors[localIndex];
      nextPreviewColors[localIndex] = color;

      if (
        shouldForceFull ||
        !previous ||
        !this.compressedColorsEqual(previous, color)
      ) {
        changedLocalIndexes.push(localIndex);
      }
    }

    if (changedLocalIndexes.length === 0) {
      this.lastPreviewStartIndex = normalizedStartIndex;
      this.lastPreviewColors = nextPreviewColors;
      return;
    }

    if (animateTransitions && canAnimateFromPreviousWindow) {
      this.transitionPreviewWindow(
        normalizedStartIndex,
        previousColors,
        nextPreviewColors,
        changedLocalIndexes
      );
      return;
    }

    this.cancelPreviewTransition();
    this.sendDirectLedPreviewFrame(changedLocalIndexes.map(localIndex => ({
      target: this.previewTargetFromLocalIndex(localIndex),
      color: nextPreviewColors[localIndex],
    })));

    this.lastPreviewStartIndex = normalizedStartIndex;
    this.lastPreviewColors = nextPreviewColors;
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

  // Delete palette from MatrixOS
  async deletePalette(paletteId: number): Promise<void> {
    const deleteSysex = new Uint8Array([
      0xF0, 0x00, 0x02, 0x03, 0x4D, 0x58,
      0x41, 0x1D,
      paletteId,
      0xF7,
    ]);
    this.output.send(deleteSysex);
  }
}

// Web MIDI API utilities
export class MIDIManager {
  private static instance: MIDIManager;
  private devices: MIDIOutput[] = [];
  private listeners: Set<() => void> = new Set();
  private isInitialized: boolean = false;

  static getInstance(): MIDIManager {
    if (!MIDIManager.instance) {
      MIDIManager.instance = new MIDIManager();
    }
    return MIDIManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (!navigator.requestMIDIAccess) {
      throw new Error('Web MIDI API not supported');
    }

    const access = await navigator.requestMIDIAccess({ sysex: true });
    
    // Get all MIDI outputs
    this.devices = Array.from(access.outputs.values());
    
    // Listen for device changes
    access.addEventListener('statechange', () => {
      this.devices = Array.from(access.outputs.values());
      this.notifyListeners();
    });

    this.isInitialized = true;
  }

  addListener(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
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
