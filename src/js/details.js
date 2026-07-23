import { store, updateShelf, updateProgress, fetchReviews, addReview, fetchRatings, addRating } from './store.js';
import { fetchOpenLibraryBook } from './api.js';
import { escapeHTML } from './ui.js';

let currentBookIdForDetails = null;

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

  const { userRating, avg } = await fetchRatings(bookId);
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

  // Clone the rating widget container once to strip previous event listeners
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

    star.addEventListener('click', async e => {
      const rating = getRatingFromEvent(e, star);
      lockedRating = rating;
      isLocked = true;
      renderDetailsStars(rating);
      ratingDisplay.textContent = `You rated: ${rating} ★`;
      ratingDisplay.style.color = 'var(--dusty-rose)';
      
      await addRating(bookId, rating);
      
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

  const btnRecommend = document.getElementById('btn-bd-recommend');
  if (btnRecommend) {
    btnRecommend.onclick = () => {
      const friendSelect = document.getElementById('recommend-friend-select');
      const mockFriendsDb = {
        'MapleReader': { username: 'MapleReader', avatar: '🪴' },
        'LofiLover': { username: 'LofiLover', avatar: '🐱' },
        'TeaTimeReads': { username: 'TeaTimeReads', avatar: '🍵' }
      };

      if (friendSelect) {
        friendSelect.innerHTML = '';
        const followedIds = store.following || [];
        if (followedIds.length === 0) {
          friendSelect.innerHTML = '<option value="">No friends followed yet (go to Friends Corner!)</option>';
        } else {
          followedIds.forEach(id => {
            const friend = mockFriendsDb[id] || { username: id, avatar: '🌸' };
            friendSelect.innerHTML += `<option value="${friend.username}">${friend.avatar} ${friend.username}</option>`;
          });
        }
      }

      const recommendModal = document.getElementById('recommend-book-modal');
      if (recommendModal) {
        recommendModal.dataset.bookId = bookId;
        document.getElementById('recommend-book-subtitle').innerHTML = `Recommend <strong>${escapeHTML(book.title)}</strong> to a fellow reader.`;
        recommendModal.classList.add('active');
      }
    };
  }

  updateBdShelfButtons(bookId);
  renderBdReviews(bookId);
  renderBdProgress(bookId);
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
    renderBdProgress(bookId);
  };

  btnReading.onclick = () => setShelf('reading');
  btnTbr.onclick = () => setShelf('tbr');
  btnDnf.onclick = () => setShelf('dnf');
}

export function initReviews() {
  const btnSubmitReview = document.getElementById('btn-bd-submit-review');
  if (btnSubmitReview) {
    btnSubmitReview.addEventListener('click', async () => {
      if (!currentBookIdForDetails) return;
      const input = document.getElementById('bd-new-review');
      const val = input.value.trim();
      if (!val) return;
      
      await addReview(currentBookIdForDetails, val);
      
      input.value = '';
      renderBdReviews(currentBookIdForDetails);
    });
  }
}

async function renderBdReviews(bookId) {
  const reviews = await fetchReviews(bookId);
  const listEl = document.getElementById('bd-reviews-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (reviews.length === 0) {
    listEl.innerHTML = '<p style="color: var(--ink-light); text-align: left;">No reviews yet. Be the first to share your thoughts!</p>';
    return;
  }

  reviews.forEach(rev => {
    const card = document.createElement('div');
    card.className = 'review-card';
    card.style = 'background: white; padding: 1.5rem; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 2px 10px rgba(0,0,0,0.02); margin-bottom: 1rem;';
    card.innerHTML = `
      <div style="display: flex; gap: 1rem; align-items: flex-start;">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--lavender); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">${escapeHTML(rev.avatar || '🌸')}</div>
        <div>
          <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.25rem;">${escapeHTML(rev.author)}</div>
          <div style="font-size: 0.95rem; line-height: 1.6; color: var(--ink);">${escapeHTML(rev.content).replace(/\n/g, '<br>')}</div>
        </div>
      </div>
    `;
    listEl.appendChild(card);
  });
}

function renderBdProgress(bookId) {
  const container = document.getElementById('bd-progress-container');
  if (!container) return;

  const isReading = store.shelves.reading && store.shelves.reading.includes(bookId);
  if (!isReading) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';

  const book = store.books[bookId] || {};
  const prog = store.progress[bookId] || { currentPage: 0, totalPages: parseInt(book.pageCount) || 300 };
  const percent = prog.totalPages > 0 ? Math.min(100, Math.round((prog.currentPage / prog.totalPages) * 100)) : 0;

  const textEl = document.getElementById('bd-progress-text');
  const fillEl = document.getElementById('bd-progress-fill');
  const updateBtn = document.getElementById('btn-bd-update-progress');
  const formDiv = document.getElementById('bd-progress-form');
  const saveBtn = document.getElementById('bd-btn-save-progress');
  const cancelBtn = document.getElementById('bd-btn-cancel-progress');
  const currInput = document.getElementById('bd-prog-curr');
  const totalInput = document.getElementById('bd-prog-total');

  if (textEl) textEl.textContent = `Page ${prog.currentPage} of ${prog.totalPages} (${percent}%)`;
  if (fillEl) fillEl.style.width = `${percent}%`;

  if (currInput) currInput.value = prog.currentPage;
  if (totalInput) totalInput.value = prog.totalPages;

  if (updateBtn && formDiv) {
    updateBtn.onclick = (e) => {
      e.stopPropagation();
      updateBtn.style.display = 'none';
      formDiv.style.display = 'flex';
    };
  }

  if (cancelBtn && updateBtn && formDiv) {
    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      formDiv.style.display = 'none';
      updateBtn.style.display = 'block';
    };
  }

  if (saveBtn && formDiv && updateBtn) {
    saveBtn.onclick = async (e) => {
      e.stopPropagation();
      const currVal = parseInt(currInput.value) || 0;
      const totalVal = parseInt(totalInput.value) || 0;
      await updateProgress(bookId, currVal, totalVal);
      formDiv.style.display = 'none';
      updateBtn.style.display = 'block';
      renderBdProgress(bookId);
    };
  }
}

