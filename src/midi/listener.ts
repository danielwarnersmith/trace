/**
 * MIDI input listener for TRACE Stage 2 (Signal).
 * Receives MIDI CC (Control Change) messages and passes (channel, cc, value) to a callback.
 * No marker writing; that is handled by a later layer (M2 to-do 4).
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const midi = require('midi') as { Input: new () => MidiInputInstance };

interface MidiInputInstance {
  getPortCount(): number;
  getPortName(portIndex: number): string;
  openPort(portIndex: number): void;
  closePort(): void;
  on(event: 'message', handler: (deltaTime: number, message: number[]) => void): void;
  ignoreTypes(sysex: boolean, timing: boolean, activeSensing: boolean): void;
}

/** Control Change status byte range: 0xB0 (176) + channel 0–15 */
const CC_STATUS_MIN = 0xb0;
const CC_STATUS_MAX = 0xbf;

export type CCMessage = {
  channel: number;
  controller: number;
  value: number;
};

export type OnCCCallback = (msg: CCMessage) => void;

/**
 * Returns true if the MIDI status byte is a Control Change message.
 */
export function isControlChange(status: number): boolean {
  return status >= CC_STATUS_MIN && status <= CC_STATUS_MAX;
}

/**
 * Parse a raw MIDI message into a CC message. Returns null if not a CC or malformed.
 */
export function parseCCMessage(message: number[]): CCMessage | null {
  if (message.length < 3) return null;
  const [status, data1, data2] = message;
  if (!isControlChange(status)) return null;
  const channel = status - CC_STATUS_MIN;
  return { channel, controller: data1, value: data2 };
}

/**
 * List available MIDI input port names. Port index corresponds to openPort(index).
 */
export function getInputPortNames(): string[] {
  const input = new midi.Input();
  const count = input.getPortCount();
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    names.push(input.getPortName(i));
  }
  input.closePort();
  return names;
}

export type MidiListenerOptions = {
  /** MIDI input port index (from getInputPortNames()). Default 0. */
  portIndex?: number;
  /** Called for each Control Change message. */
  onCC: OnCCCallback;
  /** If true, also log CC to console (e.g. for debugging). Default false. */
  log?: boolean;
};

/**
 * Start listening for MIDI CC on the given port. Returns a stop function.
 * Only CC messages are passed to onCC; other message types are ignored.
 */
export function createMidiListener(options: MidiListenerOptions): () => void {
  const { portIndex = 0, onCC, log = false } = options;
  const input = new midi.Input() as MidiInputInstance;

  input.on('message', (_deltaTime: number, message: number[]) => {
    const cc = parseCCMessage(message);
    if (!cc) return;
    if (log) {
      console.error(`midi cc channel=${cc.channel} controller=${cc.controller} value=${cc.value}`);
    }
    onCC(cc);
  });

  input.ignoreTypes(true, true, true); // only receive note and CC etc., not sysex/timing/sensing
  input.openPort(portIndex);

  return () => {
    input.closePort();
  };
}
