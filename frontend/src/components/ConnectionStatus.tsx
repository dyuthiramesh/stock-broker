interface ConnectionStatusProps {
  connected: boolean;
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`} aria-live="polite">
      <span className="status-dot" />
      {connected ? 'Live' : 'Reconnecting…'}
    </div>
  );
}
