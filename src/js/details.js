import { store, updateShelf, saveReadingProgress } from './store.js';
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

    star.addEventListener('click', e => {
      const rating = getRatingFromEvent(e, star);
      lockedRating = rating;
      isLocked = true;
      renderDetailsStars(rating);
      ratingDisplay.textContent = `You rated: ${rating} ★`;
      ratingDisplay.style.color = 'var(--dusty-rose)';
      
      store.userRatings[bookId] = rating;
      
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
      const val = input.value.trim();
      if (!val) return;
      
      if (!store.reviews[currentBookIdForDetails]) store.reviews[currentBookIdForDetails] = [];
      
      store.reviews[currentBookIdForDetails].unshift({
        author: store.currentUser ? store.currentUser.email : "You",
        avatar: store.currentUser ? (store.currentUser.avatar || '') : '',
        content: val,
        replies: []
      });
      // In a real app we would sync reviews to DB
      
      input.value = '';
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

  reviews.forEach(rev => {
    const card = document.createElement('div');
    card.className = 'review-card';
    card.style = 'background: white; padding: 1.5rem; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 2px 10px rgba(0,0,0,0.02);';
    const initials = rev.avatar ? rev.avatar : (rev.author ? rev.author.charAt(0).toUpperCase() : 'U');
    card.innerHTML = `
      <div style="display: flex; gap: 1rem; align-items: flex-start;">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--lavender); display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: bold; color: var(--ink);">${escapeHTML(initials)}</div>
        <div>
          <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.25rem;">${escapeHTML(rev.author)}</div>
          <div style="font-size: 0.95rem; line-height: 1.6; color: var(--ink);">${escapeHTML(rev.content).replace(/\\n/g, '<br>')}</div>
        </div>
      </div>
    `;
    listEl.appendChild(card);
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
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <input type="number" id="input-bd-pages-read" min="0" max="${totalPages}" value="${pagesRead}" 
            style="width: 80px; padding: 0.3rem; border: 1px solid #ccc; border-radius: 6px; outline: none; text-align: center;" />
          <button id="btn-bd-save-prog" class="btn btn-primary" style="padding: 0.3rem 0.75rem; font-size: 0.85rem; flex: 1; justify-content: center;">Save</button>
          <button id="btn-bd-cancel-prog" class="btn btn-secondary" style="padding: 0.3rem 0.75rem; font-size: 0.85rem; border-color: transparent; justify-content: center;">Cancel</button>
        </div>
      </div>
    </div>
  `;

  const btnUpdate = container.querySelector('#btn-bd-update-prog');
  const form = container.querySelector('#bd-prog-form');
  const actions = container.querySelector('#bd-prog-actions');
  const btnSave = container.querySelector('#btn-bd-save-prog');
  const btnCancel = container.querySelector('#btn-bd-cancel-prog');
  const input = container.querySelector('#input-bd-pages-read');

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

    await saveReadingProgress(bookId, val, totalPages);

    if (val >= totalPages) {
      alert(`🎉 Congratulations! You have finished "${book.title}"! Moved to Completed.`);
      
      // Auto move to completed
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
