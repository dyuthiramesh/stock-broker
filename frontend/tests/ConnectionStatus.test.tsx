import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from '../src/components/ConnectionStatus';

describe('ConnectionStatus', () => {
  it('shows Live when connected', () => {
    render(<ConnectionStatus connected={true} />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('shows Reconnecting when disconnected', () => {
    render(<ConnectionStatus connected={false} />);
    expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
  });

  it('has connected class when connected', () => {
    const { container } = render(<ConnectionStatus connected={true} />);
    expect(container.firstChild).toHaveClass('connected');
  });

  it('has disconnected class when not connected', () => {
    const { container } = render(<ConnectionStatus connected={false} />);
    expect(container.firstChild).toHaveClass('disconnected');
  });
});
