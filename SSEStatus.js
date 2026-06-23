import React from 'react';
import styles from './SSEStatus.module.css';

const MAP = {
  connecting:   { color: '#f59e0b', label: 'Connecting…' },
  connected:    { color: '#22c55e', label: 'Live updates' },
  reconnecting: { color: '#ef4444', label: 'Reconnecting…' },
};

export function SSEStatus({ status }) {
  const cfg = MAP[status] ?? MAP.connecting;
  return (
    <div className={styles.wrap}>
      <span className={styles.dot} style={{ background: cfg.color }} />
      <span className={styles.label}>{cfg.label}</span>
    </div>
  );
}
