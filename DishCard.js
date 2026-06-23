import React, { useState } from 'react';
import styles from './DishCard.module.css';

export function DishCard({ dish, onToggle, flash }) {
  const [busy,     setBusy]     = useState(false);
  const [imgError, setImgError] = useState(false);

  async function handleClick() {
    setBusy(true);
    try { await onToggle(dish.dishId); }
    finally { setBusy(false); }
  }

  const cardClass = [
    styles.card,
    dish.isPublished ? styles.published : styles.draft,
    flash ? styles.flash : '',
  ].join(' ');

  return (
    <article className={cardClass}>
      {/* Image */}
      <div className={styles.imgWrap}>
        {imgError
          ? <div className={styles.imgFallback}>🍽️</div>
          : <img
              src={dish.imageUrl}
              alt={dish.dishName}
              className={styles.img}
              onError={() => setImgError(true)}
            />
        }
        <span className={`${styles.badge} ${dish.isPublished ? styles.badgeLive : styles.badgeDraft}`}>
          {dish.isPublished ? '● Live' : '○ Draft'}
        </span>
      </div>

      {/* Body */}
      <div className={styles.body}>
        <p className={styles.id}>{dish.dishId}</p>
        <h3 className={styles.name}>{dish.dishName}</h3>

        <button
          className={`${styles.btn} ${dish.isPublished ? styles.btnUnpublish : styles.btnPublish}`}
          onClick={handleClick}
          disabled={busy}
          aria-label={`${dish.isPublished ? 'Unpublish' : 'Publish'} ${dish.dishName}`}
        >
          {busy
            ? <span className={styles.spinner} />
            : dish.isPublished ? 'Unpublish' : 'Publish'
          }
        </button>
      </div>
    </article>
  );
}
