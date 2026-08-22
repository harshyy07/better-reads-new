import { store, updateShelf, saveReadingProgress, getLocalDB, saveLocalDB } from './store.js';
import { fetchOpenLibraryBook } from './api.js';
import { escapeHTML } from './ui.js';

let currentBookIdForDetails = null;

// Seed community rating distribution stably using bookId
function getCommunityRatings(bookId, userRating) {
  let hash = 0;
  const idStr = String(bookId);
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let counts = {
    5: Math.abs((hash * 7) % 150) + 20,
    4: Math.abs((hash * 13) % 120) + 15,
    3: Math.abs((hash * 17) % 60) + 5,
    2: Math.abs((hash * 19) % 30) + 2,
    1: Math.abs((hash * 23) % 15) + 1
  };
  
  if (userRating) {
    const rounded = Math.round(userRating);
    if (counts[rounded] !== undefined) {
      counts[rounded]++;
    }
  }
  
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  let sum = 0;
  for (let r = 1; r <= 5; r++) {
    sum += counts[r] * r;
  }
  const avg = total > 0 ? (sum / total).toFixed(1) : '0.0';
  
  return { counts, total, avg };
}

function renderRatingBreakdown(bookId, userRating) {
  const container = document.querySelector('.bd-rating-container');
  if (!container) return;
  
  let chartWrapper = document.getElementById('bd-community-rating-wrapper');
  if (!chartWrapper) {
    chartWrapper = document.createElement('div');
    chartWrapper.id = 'bd-community-rating-wrapper';
    chartWrapper.style.marginTop = '1.5rem';
    chartWrapper.style.paddingTop = '1.25rem';
    chartWrapper.style.borderTop = '1px dashed var(--blush)';
    container.appendChild(chartWrapper);
  }
  
  const { counts, total, avg } = getCommunityRatings(bookId, userRating);
  
  chartWrapper.innerHTML = `
    <div style="font-size: 0.85rem; font-weight: 600; color: var(--dusty-rose); margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">
      Community Reviews
    </div>
    <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 1rem;">
      <span style="font-size: 2.2rem; font-weight: 700; color: var(--ink); line-height: 1;">${avg}</span>
      <div style="text-align: left; line-height: 1.2;">
        <div style="color: var(--amber); font-size: 1.1rem; letter-spacing: 1px;">
          ${'★'.repeat(Math.round(parseFloat(avg)))}${'☆'.repeat(5 - Math.round(parseFloat(avg)))}
        </div>
        <div style="font-size: 0.75rem; color: var(--ink-light);">${total} ratings</div>
      </div>
    </div>
    <div class="bd-rating-chart">
      ${[5, 4, 3, 2, 1].map(stars => {
        const count = counts[stars];
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return `
          <div class="rating-bar-row">
            <span class="rating-bar-label">${stars}★</span>
            <div class="rating-bar-track">
              <div class="rating-bar-fill" style="width: ${pct}%"></div>
            </div>
            <span class="rating-bar-count">${pct}%</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export async function renderBookDetails(bookId) {
  currentBookIdForDetails = bookId;
  
  document.getElementById('bd-title').textContent = "Loading...";
  document.getElementById('bd-author').textContent = "";
  document.getElementById('bd-description').textContent = "Fetching book details...";
  
  const book = await fetchOpenLibraryBook(bookId);

  const coverEl = document.getElementById('bd-cover');
  if (book.thumbnail) {
    coverEl.style.background = `url('${book.thumbnail}') center/cover`;
    coverEl.innerHTML = '';
  } else {
    coverEl.style.background = 'var(--sage)';
    coverEl.innerHTML = book.title.charAt(0);
  }

  document.getElementById('bd-title').textContent = book.title;
  document.getElementById('bd-author').textContent = book.authors[0] || 'Unknown Author';
  document.getElementById('bd-category').textContent = book.categories && book.categories.length > 0 ? book.categories[0] : 'Fiction';
  document.getElementById('bd-description').textContent = book.description || 'No description available for this book.';

  const userRating = store.userRatings ? store.userRatings[bookId] : null;
  const ratingDisplay = document.getElementById('bd-rating-display');
  let lockedRating = userRating || 0;
  let isLocked = !!userRating;

  const ratingLabels = {
    0.5: '0.5 — Did Not Like It 😬', 1: '1.0 — Did Not Like It 😞',
    1.5: '1.5 — It Was OK 🙁', 2: '2.0 — It Was OK 😐',
    2.5: '2.5 — Liked It 🙂', 3: '3.0 — Liked It 😊',
    3.5: '3.5 — Really Liked It 😄', 4: '4.0 — Really Liked It 😍',
    4.5: '4.5 — Loved It 🤩', 5: '5.0 — It Was Amazing ✨'
  };

  const starWidget = document.getElementById('bd-star-widget');
  let activeWidget = starWidget;
  if (starWidget) {
    const newWidget = starWidget.cloneNode(true);
    starWidget.parentNode.replaceChild(newWidget, starWidget);
    activeWidget = newWidget;
  }
  const activeStars = activeWidget ? activeWidget.querySelectorAll('.star') : [];

  function renderDetailsStars(value) {
    activeStars.forEach((star, i) => {
      const full = i + 1;
      const half = i + 0.5;
      if (value >= full) {
        star.textContent = '★';
        star.style.color = 'var(--amber)';
        star.style.background = 'none';
        star.style.webkitTextFillColor = 'unset';
        star.style.webkitBackgroundClip = 'unset';
        star.style.backgroundClip = 'unset';
      } else if (value >= half) {
        star.textContent = '★';
        star.style.background = `linear-gradient(90deg, var(--amber) 50%, #ddd 50%)`;
        star.style.webkitBackgroundClip = 'text';
        star.style.webkitTextFillColor = 'transparent';
        star.style.backgroundClip = 'text';
      } else {
        star.textContent = '★';
        star.style.color = '#ddd';
        star.style.background = 'none';
        star.style.webkitTextFillColor = 'unset';
        star.style.webkitBackgroundClip = 'unset';
        star.style.backgroundClip = 'unset';
      }
    });
  }

  function getRatingFromEvent(e, star) {
    const rect = star.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const half = x < rect.width / 2;
    const val = parseFloat(star.dataset.value);
    return half ? val - 0.5 : val;
  }

  renderDetailsStars(lockedRating);
  if (lockedRating) {
    ratingDisplay.textContent = `You rated: ${lockedRating} ★`;
    ratingDisplay.style.color = 'var(--dusty-rose)';
  } else {
    ratingDisplay.textContent = 'Hover to rate ✦';
    ratingDisplay.style.color = '';
  }

  activeStars.forEach(star => {
    star.addEventListener('mousemove', e => {
      if (isLocked) return;
      const rating = getRatingFromEvent(e, star);
      renderDetailsStars(rating);
      ratingDisplay.textContent = ratingLabels[rating] || `${rating} stars`;
    });

    star.addEventListener('click', e => {
      const rating = getRatingFromEvent(e, star);
      lockedRating = rating;
      isLocked = true;
      renderDetailsStars(rating);
      ratingDisplay.textContent = `You rated: ${rating} ★`;
      ratingDisplay.style.color = 'var(--dusty-rose)';
      
      store.userRatings[bookId] = rating;
      const local = getLocalDB();
      local.userRatings = store.userRatings;
      saveLocalDB(local);
      
      renderRatingBreakdown(bookId, rating);
      
      star.style.transform = 'scale(1.4)';
      setTimeout(() => { star.style.transform = ''; }, 300);
    });
  });

  if (activeWidget) {
    activeWidget.addEventListener('mouseleave', () => {
      if (!isLocked) {
        renderDetailsStars(0);
        ratingDisplay.textContent = 'Hover to rate ✦';
        ratingDisplay.style.color = '';
      }
    });
  }

  renderRatingBreakdown(bookId, lockedRating);
  updateBdShelfButtons(bookId);
  renderBdReviews(bookId);
  renderBookProgressWidget(book, bookId);
}

function updateBdShelfButtons(bookId) {
  const btnReading = document.getElementById('btn-bd-reading');
  const btnTbr = document.getElementById('btn-bd-tbr');
  const btnDnf = document.getElementById('btn-bd-dnf');
  
  [btnReading, btnTbr, btnDnf].forEach(btn => {
    btn.style.background = 'var(--warm-white)';
    btn.style.color = 'var(--ink)';
    btn.style.borderColor = '#e5e5e5';
  });

  if (store.shelves.reading && store.shelves.reading.includes(bookId)) {
    btnReading.style.background = 'var(--sage)';
    btnReading.style.color = '#2d5a2d';
    btnReading.style.borderColor = 'var(--sage)';
  } else if (store.shelves.tbr && store.shelves.tbr.includes(bookId)) {
    btnTbr.style.background = 'var(--sage)';
    btnTbr.style.color = '#2d5a2d';
    btnTbr.style.borderColor = 'var(--sage)';
  } else if (store.shelves.dnf && store.shelves.dnf.includes(bookId)) {
    btnDnf.style.background = '#ffe5e5';
    btnDnf.style.color = '#a03030';
    btnDnf.style.borderColor = '#ffe5e5';
  }

  const setShelf = (shelfName) => {
    const isAlreadyOnShelf = store.shelves[shelfName] && store.shelves[shelfName].includes(bookId);

    ['reading', 'tbr', 'completed', 'dnf'].forEach(s => {
       const filtered = store.shelves[s].filter(id => id !== bookId);
       if (filtered.length !== store.shelves[s].length) {
         updateShelf(s, filtered);
       }
    });

    if (!isAlreadyOnShelf) {
      const newShelf = [...(store.shelves[shelfName] || []), bookId];
      updateShelf(shelfName, newShelf);
    }
    updateBdShelfButtons(bookId);
    renderBookProgressWidget(store.books[bookId], bookId);
  };

  btnReading.onclick = () => setShelf('reading');
  btnTbr.onclick = () => setShelf('tbr');
  btnDnf.onclick = () => setShelf('dnf');
}

export function initReviews() {
  const btnSubmitReview = document.getElementById('btn-bd-submit-review');
  if (btnSubmitReview) {
    btnSubmitReview.addEventListener('click', () => {
      if (!currentBookIdForDetails) return;
      const input = document.getElementById('bd-new-review');
      const spoilerInput = document.getElementById('bd-new-review-spoiler');
      const val = input.value.trim();
      if (!val) return;
      
      if (!store.reviews[currentBookIdForDetails]) store.reviews[currentBookIdForDetails] = [];
      
      const newReview = {
        id: 'rev-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        author: store.currentUser ? store.currentUser.email : "You",
        avatar: store.currentUser ? (store.currentUser.avatar || '') : '',
        content: val,
        isSpoiler: spoilerInput ? spoilerInput.checked : false,
        likes: 0,
        likedByUser: false,
        replies: []
      };

      store.reviews[currentBookIdForDetails].unshift(newReview);
      
      const local = getLocalDB();
      local.reviews[currentBookIdForDetails] = store.reviews[currentBookIdForDetails];
      saveLocalDB(local);
      
      input.value = '';
      if (spoilerInput) spoilerInput.checked = false;
      renderBdReviews(currentBookIdForDetails);
    });
  }
}

function renderBdReviews(bookId) {
  const reviews = store.reviews[bookId] || [];
  const listEl = document.getElementById('bd-reviews-list');
  listEl.innerHTML = '';

  if (reviews.length === 0) {
    listEl.innerHTML = '<p style="color: var(--ink-light); text-align: left;">No reviews yet. Be the first to share your thoughts!</p>';
    return;
  }

  reviews.forEach((rev, index) => {
    if (!rev.id) {
      rev.id = 'rev-' + Date.now() + '-' + index;
    }
    if (!rev.likes) rev.likes = 0;
    if (!rev.replies) rev.replies = [];
    if (rev.likedByUser === undefined) rev.likedByUser = false;

    const card = document.createElement('div');
    card.className = 'review-card';
    card.style = 'background: white; padding: 1.5rem; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 2px 10px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 1rem;';
    
    const initials = rev.avatar ? rev.avatar : (rev.author ? rev.author.charAt(0).toUpperCase() : 'U');
    const contentHTML = escapeHTML(rev.content).replace(/\n/g, '<br>');
    let reviewBodyHTML = '';
    
    if (rev.isSpoiler) {
      reviewBodyHTML = `
        <div class="spoiler-wrapper" id="spoil-${rev.id}">
          <div class="spoiler-overlay">
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--ink);">Review contains spoilers</span>
            <button class="spoiler-btn">Reveal Review</button>
          </div>
          <div class="spoiler-content">
            ${contentHTML}
          </div>
        </div>
      `;
    } else {
      reviewBodyHTML = `<div>${contentHTML}</div>`;
    }

    card.innerHTML = `
      <div style="display: flex; gap: 1rem; align-items: flex-start;">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--lavender); display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: bold; color: var(--ink); flex-shrink: 0;">${escapeHTML(initials)}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.25rem; display: flex; justify-content: space-between;">
            <span>${escapeHTML(rev.author)}</span>
            ${rev.isSpoiler ? `<span style="font-size: 0.75rem; background: var(--peach); color: var(--ink); padding: 2px 6px; border-radius: 6px; font-weight: 600;">SPOILER</span>` : ''}
          </div>
          <div style="font-size: 0.95rem; line-height: 1.6; color: var(--ink);">${reviewBodyHTML}</div>
          
          <div class="review-actions-bar">
            <button class="review-action-btn btn-like-rev ${rev.likedByUser ? 'liked' : ''}" data-id="${rev.id}">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="${rev.likedByUser ? 'currentColor' : 'none'}"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              <span>${rev.likes} Likes</span>
            </button>
            <button class="review-action-btn btn-reply-toggle" data-id="${rev.id}">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>Reply</span>
            </button>
          </div>
          
          <!-- Nested Replies List -->
          ${rev.replies.length > 0 ? `
            <div class="review-replies-list">
              ${rev.replies.map(rep => `
                <div class="reply-card">
                  <div style="font-weight: 600; font-size: 0.85rem; margin-bottom: 0.2rem; display: flex; gap: 0.5rem; align-items: center;">
                    <span style="width: 18px; height: 18px; border-radius: 50%; background: var(--blush); display: flex; align-items: center; justify-content: center; font-size: 0.65rem;">${escapeHTML(rep.author.charAt(0).toUpperCase())}</span>
                    <span>${escapeHTML(rep.author)}</span>
                  </div>
                  <div style="font-size: 0.85rem; color: var(--ink);">${escapeHTML(rep.content).replace(/\n/g, '<br>')}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <!-- Reply input form -->
          <div class="reply-input-form" id="reply-form-${rev.id}" style="display: none;">
            <textarea placeholder="Write a reply..." rows="2" style="width: 100%; padding: 0.5rem; border: 1px solid #eee; border-radius: 6px; font-family: inherit; font-size: 0.85rem; resize: vertical; outline: none;"></textarea>
            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.25rem;">
              <button class="btn btn-secondary btn-reply-cancel" data-id="${rev.id}" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">Cancel</button>
              <button class="btn btn-primary btn-reply-submit" data-id="${rev.id}" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">Submit</button>
            </div>
          </div>
          
        </div>
      </div>
    `;
    listEl.appendChild(card);
  });

  listEl.querySelectorAll('.spoiler-wrapper').forEach(wrapper => {
    wrapper.addEventListener('click', () => {
      wrapper.classList.add('revealed');
    });
  });

  listEl.querySelectorAll('.btn-like-rev').forEach(btn => {
    btn.onclick = () => {
      const revId = btn.dataset.id;
      const rev = reviews.find(r => r.id === revId);
      if (rev) {
        if (rev.likedByUser) {
          rev.likes--;
          rev.likedByUser = false;
        } else {
          rev.likes++;
          rev.likedByUser = true;
        }
        
        const local = getLocalDB();
        local.reviews[bookId] = reviews;
        saveLocalDB(local);
        
        renderBdReviews(bookId);
      }
    };
  });

  listEl.querySelectorAll('.btn-reply-toggle').forEach(btn => {
    btn.onclick = () => {
      const revId = btn.dataset.id;
      const form = document.getElementById(`reply-form-${revId}`);
      if (form) {
        form.style.display = form.style.display === 'none' ? 'flex' : 'none';
        if (form.style.display === 'flex') {
          form.querySelector('textarea').focus();
        }
      }
    };
  });

  listEl.querySelectorAll('.btn-reply-cancel').forEach(btn => {
    btn.onclick = () => {
      const revId = btn.dataset.id;
      const form = document.getElementById(`reply-form-${revId}`);
      if (form) form.style.display = 'none';
    };
  });

  listEl.querySelectorAll('.btn-reply-submit').forEach(btn => {
    btn.onclick = () => {
      const revId = btn.dataset.id;
      const form = document.getElementById(`reply-form-${revId}`);
      const textarea = form.querySelector('textarea');
      const text = textarea.value.trim();
      if (!text) return;
      
      const rev = reviews.find(r => r.id === revId);
      if (rev) {
        if (!rev.replies) rev.replies = [];
        rev.replies.push({
          author: store.currentUser ? store.currentUser.email : "You",
          content: text,
          timestamp: new Date().toISOString()
        });
        
        const local = getLocalDB();
        local.reviews[bookId] = reviews;
        saveLocalDB(local);
        
        textarea.value = '';
        form.style.display = 'none';
        renderBdReviews(bookId);
      }
    };
  });
}

function renderBookProgressWidget(book, bookId) {
  const container = document.getElementById('bd-progress-container');
  if (!container) return;

  const isReading = store.shelves.reading && store.shelves.reading.includes(bookId);
  if (!isReading) {
    container.innerHTML = '';
    return;
  }

  const totalPages = parseInt(book.pageCount) || 300;
  const progress = store.readingProgress[bookId] || { pagesRead: 0, totalPages: totalPages };
  const pagesRead = Math.min(progress.pagesRead, totalPages);
  const percent = Math.min(Math.round((pagesRead / totalPages) * 100), 100);

  const logs = store.readingLogs[bookId] || [];
  let timelineHTML = '';
  if (logs.length > 0) {
    timelineHTML = `
      <div class="timeline-container">
        <div style="font-size: 0.8rem; font-weight: bold; color: var(--ink-light); margin-bottom: 0.5rem; text-transform: uppercase;">Reading Journey</div>
        <div class="timeline-list">
          ${logs.slice().reverse().map((log, idx) => {
            const dateStr = new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const logPercent = Math.round((log.pagesRead / log.totalPages) * 100);
            
            let badge = '';
            if (log.pagesRead === log.totalPages) badge = '<span class="timeline-badge">Finished 🎉</span>';
            else if (logPercent >= 75 && logPercent < 80) badge = '<span class="timeline-badge">Final Stretch 🚀</span>';
            else if (logPercent >= 50 && logPercent < 55) badge = '<span class="timeline-badge">Halfway 🌓</span>';
            else if (logPercent >= 25 && logPercent < 30) badge = '<span class="timeline-badge">Milestone 🏁</span>';
            else if (log.pagesRead > 0 && idx === logs.length - 1) badge = '<span class="timeline-badge">Started 📖</span>';
            
            return `
              <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-header">
                  <span class="timeline-title">Page ${log.pagesRead} of ${log.totalPages} (${logPercent}%)</span>
                  <span>${dateStr}</span>
                </div>
                ${badge ? `<div style="margin-top: 0.1rem;">${badge}</div>` : ''}
                ${log.note ? `<div class="timeline-note">${escapeHTML(log.note)}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="background: var(--cream); padding: 1.25rem; border-radius: 16px; border: 1px solid var(--blush); text-align: left; margin-bottom: 1.5rem;">
      <div style="font-size: 0.85rem; font-weight: 600; color: var(--dusty-rose); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
        Reading Progress
      </div>
      <div style="font-size: 0.95rem; font-weight: bold; color: var(--ink); margin-bottom: 0.5rem;">
        ${pagesRead} of ${totalPages} pages (${percent}%)
      </div>
      <div style="background: #eee; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 0.75rem;">
        <div style="background: var(--sage); width: ${percent}%; height: 100%; transition: width 0.3s ease;"></div>
      </div>
      
      <div id="bd-prog-actions" style="display: flex; gap: 0.5rem;">
        <button id="btn-bd-update-prog" class="btn btn-secondary" style="padding: 0.3rem 0.75rem; font-size: 0.85rem; width: 100%; justify-content: center;">Update Progress</button>
      </div>

      <div id="bd-prog-form" style="display: none; margin-top: 0.75rem; flex-direction: column; gap: 0.5rem;">
        <label style="font-size: 0.8rem; color: var(--ink-light); font-weight: 600;">Current Page:</label>
        <input type="number" id="input-bd-pages-read" min="0" max="${totalPages}" value="${pagesRead}" 
          style="width: 100%; padding: 0.4rem; border: 1px solid #ccc; border-radius: 6px; outline: none; box-sizing: border-box;" />
        
        <label style="font-size: 0.8rem; color: var(--ink-light); font-weight: 600;">Thoughts / Session Note:</label>
        <textarea id="input-bd-prog-note" placeholder="Optional thoughts on this reading session..." rows="2"
          style="width: 100%; padding: 0.4rem; border: 1px solid #ccc; border-radius: 6px; outline: none; font-family: inherit; font-size: 0.85rem; resize: vertical; box-sizing: border-box;"></textarea>
        
        <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.25rem;">
          <button id="btn-bd-save-prog" class="btn btn-primary" style="padding: 0.4rem 0.75rem; font-size: 0.85rem; flex: 1; justify-content: center;">Save</button>
          <button id="btn-bd-cancel-prog" class="btn btn-secondary" style="padding: 0.4rem 0.75rem; font-size: 0.85rem; border-color: transparent; justify-content: center;">Cancel</button>
        </div>
      </div>
      
      ${timelineHTML}
    </div>
  `;

  const btnUpdate = container.querySelector('#btn-bd-update-prog');
  const form = container.querySelector('#bd-prog-form');
  const actions = container.querySelector('#bd-prog-actions');
  const btnSave = container.querySelector('#btn-bd-save-prog');
  const btnCancel = container.querySelector('#btn-bd-cancel-prog');
  const input = container.querySelector('#input-bd-pages-read');
  const noteInput = container.querySelector('#input-bd-prog-note');

  btnUpdate.onclick = () => {
    form.style.display = 'flex';
    actions.style.display = 'none';
    input.focus();
  };

  btnCancel.onclick = () => {
    form.style.display = 'none';
    actions.style.display = 'flex';
  };

  btnSave.onclick = async () => {
    let val = parseInt(input.value) || 0;
    if (val < 0) val = 0;
    if (val > totalPages) val = totalPages;
    const noteText = noteInput.value.trim();

    await saveReadingProgress(bookId, val, totalPages, noteText);

    if (val >= totalPages) {
      alert(`🎉 Congratulations! You have finished "${book.title}"! Moved to Completed.`);
      
      ['reading', 'tbr', 'completed', 'dnf'].forEach(s => {
         const filtered = store.shelves[s].filter(id => id !== bookId);
         if (filtered.length !== store.shelves[s].length) {
           updateShelf(s, filtered);
         }
      });
      const newCompleted = [...(store.shelves.completed || []), bookId];
      await updateShelf('completed', newCompleted);
      
      updateBdShelfButtons(bookId);
    } else {
      renderBookProgressWidget(book, bookId);
    }
  };
}
