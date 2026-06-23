import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DishCard }        from './components/DishCard';
import { SSEStatus }       from './components/SSEStatus';
import { ToastContainer }  from './components/Toast';
import { useSSE }          from './hooks/useSSE';
import styles              from './App.module.css';

let nextToastId = 0;

export default function App() {
  const [dishes,    setDishes]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [filter,    setFilter]    = useState('all');   // 'all' | 'live' | 'draft'
  const [sseStatus, setSseStatus] = useState('connecting');
  const [toasts,    setToasts]    = useState([]);
  const [flashIds,  setFlashIds]  = useState(new Set());

  // ── Toast helpers ──────────────────────────────────────────────────────────
  function toast(message, type = 'success') {
    const id = ++nextToastId;
    setToasts(p => [...p, { id, message, type }]);
  }
  const dismissToast = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), []);

  // ── Fetch dishes on mount ──────────────────────────────────────────────────
  useEffect(() => {
    fetch('/dishes')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { setDishes(data); setLoading(false); })
      .catch(e  => { setError(e.message); setLoading(false); });
  }, []);

  // ── Flash a card briefly (SSE-triggered update) ───────────────────────────
  function flashCard(id) {
    setFlashIds(s => new Set([...s, id]));
    setTimeout(() => setFlashIds(s => { const n = new Set(s); n.delete(id); return n; }), 900);
  }

  // ── SSE: merge incoming update ─────────────────────────────────────────────
  const handleDishUpdated = useCallback((updated) => {
    setDishes(prev => prev.map(d => d.dishId === updated.dishId ? updated : d));
    flashCard(updated.dishId);
    toast(
      `${updated.dishName} ${updated.isPublished ? 'published' : 'unpublished'} — backend update`,
      'realtime'
    );
  }, []);

  useSSE({ onDishUpdated: handleDishUpdated, onStatusChange: setSseStatus });

  // ── Toggle from UI ─────────────────────────────────────────────────────────
  async function handleToggle(dishId) {
    try {
      const res = await fetch(`/dishes/${dishId}/toggle`, { method: 'PATCH' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setDishes(prev => prev.map(d => d.dishId === updated.dishId ? updated : d));
      toast(`${updated.dishName} ${updated.isPublished ? 'published ✓' : 'unpublished'}`);
    } catch {
      toast('Could not update dish. Is the server running?', 'error');
    }
  }

  // ── Filter ─────────────────────────────────────────────────────────────────
  const visible = dishes.filter(d => {
    if (filter === 'live')  return  d.isPublished;
    if (filter === 'draft') return !d.isPublished;
    return true;
  });

  const liveCount  = dishes.filter(d =>  d.isPublished).length;
  const draftCount = dishes.filter(d => !d.isPublished).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.app}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>🍽️</span>
          <div>
            <h1 className={styles.title}>Dish Dashboard</h1>
            <p className={styles.subtitle}>Manage what your customers see</p>
          </div>
        </div>
        <SSEStatus status={sseStatus} />
      </header>

      {/* ── Stats ── */}
      <div className={styles.stats}>
        {[
          { label: 'Total',  value: dishes.length, cls: '' },
          { label: 'Live',   value: liveCount,     cls: styles.statLive },
          { label: 'Draft',  value: draftCount,    cls: styles.statDraft },
        ].map(s => (
          <div key={s.label} className={styles.stat}>
            <span className={`${styles.statNum} ${s.cls}`}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className={styles.filters}>
        {[
          { key: 'all',   label: `All (${dishes.length})` },
          { key: 'live',  label: `● Live (${liveCount})` },
          { key: 'draft', label: `○ Draft (${draftCount})` },
        ].map(f => (
          <button
            key={f.key}
            className={`${styles.filterBtn} ${filter === f.key ? styles.filterActive : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Main ── */}
      <main className={styles.main}>
        {loading && (
          <div className={styles.center}>
            <span className={styles.bigSpinner} />
            <p>Loading dishes…</p>
          </div>
        )}

        {!loading && error && (
          <div className={`${styles.center} ${styles.errorBox}`}>
            <span style={{ fontSize: 40 }}>⚠️</span>
            <p>Could not connect to backend.</p>
            <p className={styles.errorDetail}>{error}</p>
            <button className={styles.retryBtn} onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className={styles.center}>
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>No dishes match this filter.</p>
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <div className={styles.grid}>
            {visible.map(dish => (
              <DishCard
                key={dish.dishId}
                dish={dish}
                onToggle={handleToggle}
                flash={flashIds.has(dish.dishId)}
              />
            ))}
          </div>
        )}
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
