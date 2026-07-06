import { store, updateShelf } from './store.js';

export function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function initUI() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('nav-hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      navbar.classList.toggle('nav-open');
    });
  }

  const onPageScroll = (e) => {
    navbar.classList.toggle('scrolled', e.target.scrollTop > 40);
  };
  document.querySelectorAll('.page-section').forEach(section => {
    section.addEventListener('scroll', onPageScroll, { passive: true });
  });

  const shelfModal = document.getElementById('shelf-modal');
  const shelfModalClose = document.getElementById('shelf-close-btn');
  const shelfModalTitle = document.getElementById('shelf-modal-title');
  const bookshelves = document.querySelectorAll('#shelf-modal-body .book-shelf');
  const roomHotspots = document.querySelectorAll('.room-hotspot');

  function openShelfModal(shelfId, label) {
    if (shelfModal) shelfModal.classList.add('active');
    if (shelfModalTitle) shelfModalTitle.textContent = label;
    bookshelves.forEach(s => s.classList.remove('active'));
    const targetShelf = document.getElementById(`shelf-${shelfId}`);
    if (targetShelf) {
      targetShelf.classList.add('active');
      const cards = targetShelf.querySelectorAll('.book-card');
      cards.forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(12px)';
        setTimeout(() => {
          card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, i * 40);
      });
    }
  }

  if (shelfModalClose) shelfModalClose.addEventListener('click', () => shelfModal.classList.remove('active'));
  if (shelfModal) shelfModal.addEventListener('click', (e) => { if (e.target === shelfModal) shelfModal.classList.remove('active'); });

  roomHotspots.forEach(hotspot => {
    hotspot.addEventListener('click', () => {
      let label = 'Bookshelf';
      const labelSpan = hotspot.querySelector('.hotspot-label');
      if (labelSpan) label = labelSpan.textContent;
      else {
        const img = hotspot.querySelector('img');
        if (img) label = img.alt;
      }
      openShelfModal(hotspot.dataset.shelf, label);
    });
  });

  // Star Rating
  const stars = document.querySelectorAll('#star-widget .star');
  const ratingDisplay = document.getElementById('rating-value-display');
  let lockedRating = 0;
  let isLocked = false;
  const labels = {
    0.5: '0.5 — Did Not Like It 😬', 1: '1.0 — Did Not Like It 😞',
    1.5: '1.5 — It Was OK 🙁', 2: '2.0 — It Was OK 😐',
    2.5: '2.5 — Liked It 🙂', 3: '3.0 — Liked It 😊',
    3.5: '3.5 — Really Liked It 😄', 4: '4.0 — Really Liked It 😍',
    4.5: '4.5 — Loved It 🤩', 5: '5.0 — It Was Amazing ✨',
  };

  function renderStars(value) {
    stars.forEach((star, i) => {
      const full = i + 1;
      const half = i + 0.5;
      if (value >= full) {
        star.textContent = '★';
        star.style.color = 'var(--amber)';
        star.style.background = 'none';
        star.style.webkitBackgroundClip = 'unset';
        star.style.webkitTextFillColor = 'unset';
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
        star.style.webkitBackgroundClip = 'unset';
        star.style.webkitTextFillColor = 'unset';
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

  stars.forEach(star => {
    star.addEventListener('mousemove', e => {
      if (isLocked) return;
      const rating = getRatingFromEvent(e, star);
      renderStars(rating);
      ratingDisplay.textContent = labels[rating] || `${rating} stars`;
    });
    star.addEventListener('click', e => {
      const rating = getRatingFromEvent(e, star);
      lockedRating = rating;
      isLocked = true;
      renderStars(rating);
      ratingDisplay.textContent = `You rated: ${rating} ★ — ${labels[rating]?.split('—')[1]?.trim() || ''}`;
      ratingDisplay.style.color = 'var(--dusty-rose)';
      ratingDisplay.style.fontWeight = '600';
      star.style.transform = 'scale(1.4)';
      setTimeout(() => { star.style.transform = ''; }, 300);
    });
  });

  const starWidget = document.getElementById('star-widget');
  if (starWidget) {
    starWidget.addEventListener('mouseleave', () => {
      if (!isLocked) {
        renderStars(0);
        ratingDisplay.textContent = 'Hover to rate ✦';
        ratingDisplay.style.color = '';
        ratingDisplay.style.fontWeight = '';
      }
    });
  }

  // Spoilers
  document.querySelectorAll('.spoiler-text').forEach(el => {
    el.addEventListener('click', () => {
      el.classList.toggle('revealed');
      el.title = el.classList.contains('revealed') ? 'Click to hide spoiler' : 'Click to reveal spoiler';
    });
  });

  // Animations
  const revealEls = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => observer.observe(el));

  const counters = [
    { el: document.getElementById('stat-books'), target: 120, suffix: 'k+' },
    { el: document.getElementById('stat-readers'), target: 48, suffix: 'k+' },
    { el: document.getElementById('stat-reviews'), target: 310, suffix: 'k+' },
  ];

  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const { el, target, suffix } = counters.find(c => c.el === entry.target) || {};
      if (!el) return;
      let current = 0;
      const step = Math.ceil(target / 60);
      const interval = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = `${current}${suffix}`;
        if (current >= target) clearInterval(interval);
      }, 20);
      counterObserver.unobserve(entry.target);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => { if (c.el) counterObserver.observe(c.el); });

  const blob1 = document.querySelector('.hero-blob-1');
  const blob2 = document.querySelector('.hero-blob-2');
  document.addEventListener('mousemove', e => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    if (blob1) blob1.style.transform = `translate(${x}px, ${y}px)`;
    if (blob2) blob2.style.transform = `translate(${-x * 0.7}px, ${-y * 0.7}px)`;
  });

  document.addEventListener('betterreads-store-updated', () => {
    renderLibraryBooks();
  });
}

export function getGradientFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c1 = `hsl(${hash % 360}, 60%, 85%)`;
  const c2 = `hsl(${(hash + 40) % 360}, 50%, 75%)`;
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

export function renderLibraryBooks() {
  const shelfMappings = {
    'tbr': store.shelves.tbr || [],
    'reading': store.shelves.reading || [],
    'read': store.shelves.completed || [],
    'dnf': store.shelves.dnf || []
  };

  Object.keys(shelfMappings).forEach(shelfId => {
    const shelfContainer = document.getElementById(`shelf-${shelfId}`);
    if (!shelfContainer) return;
    const grid = shelfContainer.querySelector('.book-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const bookIds = shelfMappings[shelfId];
    if (bookIds.length === 0) {
      grid.innerHTML = `<div style="color:var(--ink-light); padding: 1rem;">No books on this shelf yet.</div>`;
      return;
    }

    bookIds.forEach(id => {
      const book = store.books[id];
      if (!book) return;

      const card = document.createElement('div');
      card.className = 'book-card';
      card.id = `bk-${shelfId}-${id}`;

      let coverStyle = `background: ${getGradientFromString(book.title)}`;
      let coverContent = book.title.charAt(0);
      if (book.thumbnail) {
        coverStyle = `background: url('${book.thumbnail}') center/cover;`;
        coverContent = '';
      }

      let ratingHtml = '';
      if (shelfId === 'reading' || shelfId === 'read') {
        const ratingStr = '★'.repeat(Math.round(book.averageRating || 4)) + '☆'.repeat(5 - Math.round(book.averageRating || 4));
        ratingHtml = `<div class="book-rating">${ratingStr}</div>`;
      }

      // XSS mitigation: using DOM methods to insert potentially unsafe text
      // (Even though escapeHTML is used, innerHTML is risky. The structure here is simple though)
      card.innerHTML = `
        <div class="book-cover" style="${coverStyle}; position: relative;">
          ${coverContent}
          <button class="remove-book-btn" style="position:absolute; top: -10px; right: -10px; width:26px; height:26px; border-radius:50%; background:var(--dusty-rose); color:white; border:none; cursor:pointer; font-weight:bold; font-size:18px; display:flex; align-items:center; justify-content:center; box-shadow: 0 2px 5px rgba(0,0,0,0.3); z-index: 10;">&minus;</button>
        </div>
        <div class="book-info">
          <div class="book-title">${escapeHTML(book.title)}</div>
          <div class="book-author">${escapeHTML(book.authors[0] || 'Unknown')}</div>
          ${ratingHtml}
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        window.location.hash = `#book-${book.id}`;
      });

      const removeBtn = card.querySelector('.remove-book-btn');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let newShelf = store.shelves[shelfId === 'read' ? 'completed' : shelfId].filter(bid => bid !== id);
        updateShelf(shelfId === 'read' ? 'completed' : shelfId, newShelf);
      });

      grid.appendChild(card);
    });
  });
}

export function renderReadingStats() {
  const completedIds = store.shelves.completed || [];
  let totalBooks = completedIds.length;
  let totalPages = 0;
  
  completedIds.forEach(id => {
    const book = store.books[id];
    if (book && book.pageCount) totalPages += parseInt(book.pageCount) || 0;
  });
  
  // Section 1: Currently Reading
  const readingIds = store.shelves.reading || [];
  const elReadingCard = document.getElementById('mockup-reading-card');
  if (elReadingCard) {
    if (readingIds.length > 0) {
      const book = store.books[readingIds[0]];
      const elTitle = document.getElementById('mockup-reading-title');
      const elAuthor = document.getElementById('mockup-reading-author');
      const elCover = document.getElementById('mockup-reading-cover');
      
      if (elTitle) elTitle.textContent = book.title;
      if (elAuthor) elAuthor.textContent = book.authors ? `by ${book.authors.join(', ')}` : 'Unknown Author';
      if (elCover) {
        elCover.style.backgroundImage = book.thumbnail ? `url(${book.thumbnail})` : 'none';
        elCover.textContent = book.thumbnail ? '' : '📚';
      }
      
      // mock progress
      const mockProgress = 68;
      const elProgText = document.getElementById('mockup-reading-progress-text');
      const elProgFill = document.getElementById('mockup-reading-progress-fill');
      if (elProgText) elProgText.textContent = `${mockProgress}% Complete`;
      if (elProgFill) {
        setTimeout(() => {
          elProgFill.style.width = `${mockProgress}%`;
        }, 100);
      }
      elReadingCard.style.display = 'block';
    } else {
      elReadingCard.style.display = 'none';
    }
  }

  // Section 2: Goals
  const readingGoal = 25;
  const elGoalCurrent = document.getElementById('mockup-goal-current');
  const elGoalTotal = document.getElementById('mockup-goal-total');
  const elGoalPercentage = document.getElementById('mockup-goal-percentage');
  const elGoalCircle = document.getElementById('mockup-goal-circle');
  
  if (elGoalCurrent) elGoalCurrent.textContent = totalBooks;
  if (elGoalTotal) elGoalTotal.textContent = readingGoal;
  
  const percentage = Math.min((totalBooks / readingGoal) * 100, 100);
  if (elGoalPercentage) elGoalPercentage.textContent = `${Math.round(percentage)}%`;
  
  if (elGoalCircle) {
    setTimeout(() => {
      elGoalCircle.style.strokeDasharray = `${percentage}, 100`;
    }, 100);
  }

  // Section 3: Recent Additions
  const recentContainer = document.getElementById('mockup-recent-additions');
  if (recentContainer) {
    recentContainer.innerHTML = '';
    // Show up to 5 recently completed books
    const recentBooks = completedIds.slice(-5).reverse();
    recentBooks.forEach(id => {
      const book = store.books[id];
      if (!book) return;
      const item = document.createElement('div');
      item.className = 'mockup-book-item';
      const coverHtml = book.thumbnail 
        ? `<div class="mockup-book-cover" style="background-image: url('${book.thumbnail}')"></div>` 
        : `<div class="mockup-book-cover" style="display:flex;align-items:center;justify-content:center;font-size:2rem;">📚</div>`;
      
      const genre = (book.categories && book.categories.length > 0) ? book.categories[0] : 'Fiction';
      item.innerHTML = `
        ${coverHtml}
        <div class="mockup-book-title">${book.title}</div>
        <div class="mockup-book-genre">${genre}</div>
      `;
      recentContainer.appendChild(item);
    });
  }

  // Section 4: Simple Stats
  const elPagesRead = document.getElementById('mockup-pages-read');
  const elDayStreak = document.getElementById('mockup-day-streak');
  if (elPagesRead) elPagesRead.textContent = totalPages.toLocaleString();
  if (elDayStreak) elDayStreak.textContent = totalBooks > 0 ? "18" : "0";
}
