import React, { useEffect } from 'react';
import styles from './Toast.module.css';

export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className={styles.container} aria-live="polite">
      {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 3800);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const icons = { success: '✓', realtime: '⚡', error: '✕' };

  return (
    <div
      className={`${styles.toast} ${styles[toast.type]}`}
      onClick={() => onDismiss(toast.id)}
      role="alert"
    >
      <span className={styles.icon}>{icons[toast.type] ?? '•'}</span>
      <span className={styles.msg}>{toast.message}</span>
    </div>
  );
}
