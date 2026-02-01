import { Midi } from "@tonejs/midi";

export interface HardwareLightshowEvent {
  index: number;
  velocity: number;
  timestamp: number; // performance.now() + offset
}

export interface UILightshowEvent {
  index: number;
  velocity: number;
}

export class LightshowPlayer {
  private midi: Midi | null = null;
  private timer: number | null = null;
  private isPlaying: boolean = false;
  private onHardwareEvent: (events: HardwareLightshowEvent[]) => void;
  private onUIEvent: (events: UILightshowEvent[]) => void;
  private onFinished?: () => void;
  private events: { time: number; index: number; velocity: number; on: boolean }[] = [];
  private startTime: number = 0;
  private hardwareEventIndex: number = 0;
  private uiEventIndex: number = 0;
  
  // 50ms look-ahead for hardware to ignore main-thread jitter
  private readonly LOOK_AHEAD_MS = 100;

  constructor(
    onHardwareEvent: (events: HardwareLightshowEvent[]) => void, 
    onUIEvent: (events: UILightshowEvent[]) => void,
    onFinished?: () => void
  ) {
    this.onHardwareEvent = onHardwareEvent;
    this.onUIEvent = onUIEvent;
    this.onFinished = onFinished;
  }

  async load(url: string) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.midi = new Midi(arrayBuffer as any);
    return this.midi;
  }

  async loadArrayBuffer(arrayBuffer: ArrayBuffer) {
    this.midi = new Midi(arrayBuffer as any);
    return this.midi;
  }

  setMidi(midi: Midi) {
    this.midi = midi;
    const tracks = this.midi.tracks;
    this.events = [];

    tracks.forEach(track => {
      track.notes.forEach(note => {
        this.events.push({
          time: note.time * 1000,
          index: note.midi,
          velocity: Math.round(note.velocity * 127),
          on: true
        });
        this.events.push({
          time: (note.time + note.duration) * 1000,
          index: note.midi,
          velocity: 0,
          on: false
        });
      });
    });

    this.events.sort((a, b) => a.time - b.time);
  }

  play() {
    if (!this.midi || this.isPlaying) return;
    this.isPlaying = true;
    this.startTime = performance.now();
    this.hardwareEventIndex = 0;
    this.uiEventIndex = 0;

    this.timer = requestAnimationFrame(this.tick);
  }

  stop() {
    this.isPlaying = false;
    if (this.timer) {
      cancelAnimationFrame(this.timer);
      this.timer = null;
    }
  }

  private tick = () => {
    if (!this.isPlaying) return;
    const now = performance.now() - this.startTime;

    // 1. Hardware Look-ahead scheduling
    const hardwareBatch: HardwareLightshowEvent[] = [];
    while (
      this.hardwareEventIndex < this.events.length && 
      this.events[this.hardwareEventIndex].time <= now + this.LOOK_AHEAD_MS
    ) {
      const event = this.events[this.hardwareEventIndex];
      hardwareBatch.push({
        index: event.index,
        velocity: event.velocity,
        timestamp: this.startTime + event.time
      });
      this.hardwareEventIndex++;
    }

    if (hardwareBatch.length > 0) {
      this.onHardwareEvent(hardwareBatch);
    }

    // 2. UI Frame-sync processing (immediate)
    const uiBatch: UILightshowEvent[] = [];
    while (
      this.uiEventIndex < this.events.length && 
      this.events[this.uiEventIndex].time <= now
    ) {
      const event = this.events[this.uiEventIndex];
      uiBatch.push({
        index: event.index,
        velocity: event.velocity
      });
      this.uiEventIndex++;
    }

    if (uiBatch.length > 0) {
      this.onUIEvent(uiBatch);
    }

    // 3. Loop or Finish
    if (this.uiEventIndex >= this.events.length) {
      // Small buffer to let the final hardware-sent events play out
      setTimeout(() => {
        if (!this.isPlaying) return;
        this.stop();
        this.onFinished?.();
      }, 100);
    } else {
      this.timer = requestAnimationFrame(this.tick);
    }
  };
}
