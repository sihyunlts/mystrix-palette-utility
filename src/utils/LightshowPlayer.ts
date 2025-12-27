import { Midi } from "@tonejs/midi";

export interface LightshowEvent {
  index: number;
  velocity: number;
  on: boolean;
}

export class LightshowPlayer {
  private midi: Midi | null = null;
  private timer: number | null = null;
  private isPlaying: boolean = false;
  private onEvent: (events: LightshowEvent[]) => void;
  private onFinished?: () => void;
  private events: { time: number; index: number; velocity: number; on: boolean }[] = [];
  private startTime: number = 0;
  private eventIndex: number = 0;

  constructor(onEvent: (events: LightshowEvent[]) => void, onFinished?: () => void) {
    this.onEvent = onEvent;
    this.onFinished = onFinished;
  }

  async load(url: string) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.midi = new Midi(arrayBuffer as any);
  }

  async loadArrayBuffer(arrayBuffer: ArrayBuffer) {
    this.midi = new Midi(arrayBuffer as any);
  }

  play() {
    if (!this.midi || this.isPlaying) return;
    this.isPlaying = true;
    this.startTime = performance.now();
    this.eventIndex = 0;

    const tracks = this.midi.tracks;
    this.events = [];

    // Collect all note events
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

    // Sort events by time
    this.events.sort((a, b) => a.time - b.time);

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

    const batch: LightshowEvent[] = [];

    while (this.eventIndex < this.events.length && this.events[this.eventIndex].time <= now) {
      const event = this.events[this.eventIndex];
      batch.push({
        index: event.index,
        velocity: event.velocity,
        on: event.on
      });
      this.eventIndex++;
    }

    if (batch.length > 0) {
      this.onEvent(batch);
    }

    if (this.eventIndex >= this.events.length) {
      this.stop();
      this.onFinished?.();
    } else {
      this.timer = requestAnimationFrame(this.tick);
    }
  };
}
