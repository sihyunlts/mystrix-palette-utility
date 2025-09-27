interface MIDIOutput {
    name?: string;
    manufacturer?: string;
    send(data: Uint8Array, timestamp?: number): void;
  }
  
  interface MIDIAccess {
    outputs: Map<string, MIDIOutput>;
    addEventListener(
      type: 'statechange',
      listener: (this: MIDIAccess, ev: Event) => any,
      options?: boolean | AddEventListenerOptions
    ): void;
  }
  
  interface Navigator {
    requestMIDIAccess(options?: { sysex: boolean }): Promise<MIDIAccess>;
  }