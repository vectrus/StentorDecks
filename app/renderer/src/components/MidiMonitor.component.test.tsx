import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../stores/root', () => ({
  midiStore: {
    connected: true,
    portName: 'DJConsole RMX2',
    unknownCount: 2,
    monitor: [
      {
        t: 1,
        annotation: 'noteOn 21 → deckA.play',
        controlId: 'deckA.play',
        unknown: false,
      },
    ],
  },
}));

import { MidiMonitor } from './MidiMonitor';

describe('MidiMonitor', () => {
  it('shows connection, unknown count, and annotations', () => {
    render(<MidiMonitor />);
    expect(screen.getByLabelText('MIDI monitor')).toBeInTheDocument();
    expect(screen.getByText(/DJConsole RMX2/)).toBeInTheDocument();
    expect(screen.getByText(/unknown 2/)).toBeInTheDocument();
    expect(screen.getByText(/deckA\.play/)).toBeInTheDocument();
  });
});
