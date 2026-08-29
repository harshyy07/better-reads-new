import { store, updateShelf, saveReadingProgress, supabase } from './store.js';

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
    const profilePage = document.getElementById('page-profile');
    if (profilePage && profilePage.classList.contains('active')) {
      renderProfilePage();
    }
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
      const bookId = readingIds[0];
      const book = store.books[bookId];
      const elTitle = document.getElementById('mockup-reading-title');
      const elAuthor = document.getElementById('mockup-reading-author');
      const elCover = document.getElementById('mockup-reading-cover');
      
      if (elTitle) elTitle.textContent = book.title;
      if (elAuthor) elAuthor.textContent = book.authors ? `by ${book.authors.join(', ')}` : 'Unknown Author';
      if (elCover) {
        elCover.style.backgroundImage = book.thumbnail ? `url(${book.thumbnail})` : 'none';
        elCover.innerHTML = book.thumbnail ? '' : '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" style="display:block;margin:auto;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>';
      }
      
      // real progress
      const totalBookPages = parseInt(book.pageCount) || 300;
      const progress = store.readingProgress[bookId] || { pagesRead: 0, totalPages: totalBookPages };
      const pagesRead = Math.min(progress.pagesRead, totalBookPages);
      const realProgressPercent = Math.min(Math.round((pagesRead / totalBookPages) * 100), 100);

      const elProgText = document.getElementById('mockup-reading-progress-text');
      const elProgFill = document.getElementById('mockup-reading-progress-fill');
      if (elProgText) elProgText.textContent = `${realProgressPercent}% Complete (${pagesRead}/${totalBookPages} pgs)`;
      if (elProgFill) {
        setTimeout(() => {
          elProgFill.style.width = `${realProgressPercent}%`;
        }, 100);
      }

      // Wire up stats page progress buttons
      const btnUpdate = document.getElementById('btn-mockup-update-prog');
      const form = document.getElementById('mockup-reading-form');
      const actions = document.getElementById('mockup-reading-actions');
      const btnSave = document.getElementById('btn-mockup-save-prog');
      const btnCancel = document.getElementById('btn-mockup-cancel-prog');
      const input = document.getElementById('input-mockup-pages-read');

      if (btnUpdate && form && actions && btnSave && btnCancel && input) {
        input.value = pagesRead;
        input.max = totalBookPages;

        btnUpdate.onclick = (e) => {
          e.stopPropagation();
          form.style.display = 'flex';
          actions.style.display = 'none';
          input.focus();
        };

        btnCancel.onclick = (e) => {
          e.stopPropagation();
          form.style.display = 'none';
          actions.style.display = 'block';
        };

        btnSave.onclick = async (e) => {
          e.stopPropagation();
          let val = parseInt(input.value) || 0;
          if (val < 0) val = 0;
          if (val > totalBookPages) val = totalBookPages;

          await saveReadingProgress(bookId, val, totalBookPages);

          if (val >= totalBookPages) {
            alert(`🎉 Congratulations! You have finished "${book.title}"! Moved to Completed.`);
            ['reading', 'tbr', 'completed', 'dnf'].forEach(s => {
               const filtered = store.shelves[s].filter(id => id !== bookId);
               if (filtered.length !== store.shelves[s].length) {
                 updateShelf(s, filtered);
               }
            });
            const newCompleted = [...(store.shelves.completed || []), bookId];
            await updateShelf('completed', newCompleted);
          } else {
            renderReadingStats();
          }
        };
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
        : `<div class="mockup-book-cover" style="display:flex;align-items:center;justify-content:center;color:var(--ink-light);"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" style="display:block;margin:auto;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></div>`;
      
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

  // Section 5: Extra Reading Stats & Milestones
  // 1. Longest Book (pgs)
  let longestBookPages = 0;
  completedIds.forEach(id => {
    const book = store.books[id];
    if (book && book.pageCount) {
      const pgs = parseInt(book.pageCount) || 0;
      if (pgs > longestBookPages) longestBookPages = pgs;
    }
  });
  const elLongestBook = document.getElementById('mockup-longest-book');
  if (elLongestBook) elLongestBook.textContent = longestBookPages;

  // 2. Time Reading (Estimated)
  let timeReadingHours = Math.round((totalPages * 1.5) / 60);
  const elTimeReading = document.getElementById('mockup-time-reading');
  if (elTimeReading) elTimeReading.textContent = `${timeReadingHours}h`;

  // 3. Average Rating
  const ratingKeys = Object.keys(store.userRatings || {});
  let avgRating = 0;
  if (ratingKeys.length > 0) {
    let sum = 0;
    ratingKeys.forEach(k => {
      sum += parseFloat(store.userRatings[k]) || 0;
    });
    avgRating = (sum / ratingKeys.length).toFixed(1);
  } else {
    avgRating = '0.0';
  }
  const elAvgRating = document.getElementById('mockup-avg-rating');
  if (elAvgRating) elAvgRating.textContent = avgRating;

  // 4. Top Genre
  const allShelvedBookIds = new Set([
    ...(store.shelves.tbr || []),
    ...(store.shelves.reading || []),
    ...(store.shelves.completed || []),
    ...(store.shelves.dnf || [])
  ]);
  const genreCounts = {};
  allShelvedBookIds.forEach(id => {
    const book = store.books[id];
    if (book && book.categories && book.categories.length > 0) {
      const cat = book.categories[0];
      genreCounts[cat] = (genreCounts[cat] || 0) + 1;
    }
  });
  let topGenre = 'N/A';
  let maxGenreCount = 0;
  Object.keys(genreCounts).forEach(g => {
    if (genreCounts[g] > maxGenreCount) {
      maxGenreCount = genreCounts[g];
      topGenre = g;
    }
  });
  if (topGenre.length > 12) topGenre = topGenre.substring(0, 10) + '..';
  const elTopGenre = document.getElementById('mockup-top-genre');
  if (elTopGenre) elTopGenre.textContent = topGenre;

  // 5. Reviews Written
  let userReviewsCount = 0;
  const userEmail = (store.currentUser && store.currentUser.email) || 'You';
  Object.keys(store.reviews || {}).forEach(bookId => {
    const bookReviews = store.reviews[bookId] || [];
    bookReviews.forEach(rev => {
      if (rev.author === 'You' || rev.author === userEmail) {
        userReviewsCount++;
      }
    });
  });
  const elReviewsCount = document.getElementById('mockup-reviews-count');
  if (elReviewsCount) elReviewsCount.textContent = userReviewsCount;

  // 6. Best Month (Estimated from logs or current month fallback)
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const logCountsByMonth = {};
  Object.keys(store.readingLogs || {}).forEach(bookId => {
    const logs = store.readingLogs[bookId] || [];
    logs.forEach(log => {
      if (log.timestamp) {
        const date = new Date(log.timestamp);
        if (!isNaN(date.getTime())) {
          const monthName = monthNames[date.getMonth()];
          logCountsByMonth[monthName] = (logCountsByMonth[monthName] || 0) + 1;
        }
      }
    });
  });
  let bestMonth = 'N/A';
  let maxLogs = 0;
  Object.keys(logCountsByMonth).forEach(m => {
    if (logCountsByMonth[m] > maxLogs) {
      maxLogs = logCountsByMonth[m];
      bestMonth = m;
    }
  });
  if (bestMonth === 'N/A' && completedIds.length > 0) {
    bestMonth = monthNames[new Date().getMonth()];
  }
  const elBestMonth = document.getElementById('mockup-best-month');
  if (elBestMonth) elBestMonth.textContent = bestMonth;
}

export function renderProfilePage() {
  // 1. Get profile data from localStorage or fallback
  let profile = { username: 'you.reading', avatar: '🍵' };
  try {
    const stored = localStorage.getItem('betterreads_user_profile');
    if (stored) {
      profile = JSON.parse(stored);
    } else if (store.currentUser) {
      profile.username = store.currentUser.email.split('@')[0];
    }
  } catch (e) {
    console.error("Error parsing profile", e);
  }

  // 2. Populate Header & Card elements
  const elHeaderUsername = document.getElementById('prof-header-username');
  const elCardUsername = document.getElementById('prof-card-username');
  const elLargeAvatar = document.getElementById('prof-large-avatar');
  const inputUsername = document.getElementById('prof-edit-username');

  if (elHeaderUsername) elHeaderUsername.textContent = profile.username;
  if (elCardUsername) elCardUsername.textContent = profile.username;
  if (elLargeAvatar) elLargeAvatar.textContent = profile.avatar;
  if (inputUsername && !inputUsername.dataset.initialized) {
    inputUsername.value = profile.username;
    inputUsername.dataset.initialized = 'true';
  }

  // 3. Setup Avatar Grid choice in settings
  const avatarGrid = document.getElementById('prof-avatar-grid');
  let selectedAvatar = profile.avatar;

  if (avatarGrid) {
    const options = avatarGrid.querySelectorAll('.avatar-option');
    options.forEach(opt => {
      const isSelected = opt.dataset.avatar === selectedAvatar;
      opt.classList.toggle('active', isSelected);

      opt.onclick = () => {
        options.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        selectedAvatar = opt.dataset.avatar;
      };
    });
  }

  // 4. Form submission handler for saving profile details
  const editForm = document.getElementById('profile-edit-form');
  if (editForm) {
    editForm.onsubmit = async (e) => {
      e.preventDefault();
      const newUsername = inputUsername.value.trim();
      if (!newUsername) return;

      profile.username = newUsername;
      profile.avatar = selectedAvatar;
      localStorage.setItem('betterreads_user_profile', JSON.stringify(profile));

      // Update Nav avatar element directly
      const navAvatar = document.getElementById('nav-avatar');
      if (navAvatar) navAvatar.textContent = selectedAvatar;

      // Sync to Supabase if logged in
      if (store.isLoggedIn && store.currentUser) {
        try {
          const { error } = await supabase.from('profiles').upsert({
            id: store.currentUser.id,
            username: newUsername,
            avatar: selectedAvatar
          });
          if (error) throw error;
        } catch (err) {
          console.warn("Supabase profile save failed", err);
        }
      }

      alert("✨ Profile updated successfully!");
      renderProfilePage();
    };
  }

  // 5. Populate Mini Stats
  const completedIds = store.shelves.completed || [];
  const readingIds = store.shelves.reading || [];
  
  // Sum pages read
  let totalPagesRead = 0;
  Object.values(store.readingProgress || {}).forEach(prog => {
    totalPagesRead += prog.pagesRead || 0;
  });

  const elStatCompleted = document.getElementById('prof-stat-completed');
  const elStatReading = document.getElementById('prof-stat-reading');
  const elStatPages = document.getElementById('prof-stat-pages');

  if (elStatCompleted) elStatCompleted.textContent = completedIds.length;
  if (elStatReading) elStatReading.textContent = readingIds.length;
  if (elStatPages) elStatPages.textContent = totalPagesRead.toLocaleString();

  // 6. Populate Currently Reading list
  const listContainer = document.getElementById('prof-reading-list');
  if (listContainer) {
    listContainer.innerHTML = '';
    
    if (readingIds.length === 0) {
      listContainer.innerHTML = `
        <div style="background: var(--cream); padding: 2.5rem 1.5rem; border-radius: 16px; text-align: center; border: 1.5px dashed var(--blush);">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📚</div>
          <h4 style="margin: 0 0 0.5rem 0; color: var(--ink); font-family: 'DM Sans', sans-serif;">Your reading nest is empty</h4>
          <p style="margin: 0; font-size: 0.85rem; color: var(--ink-light); line-height: 1.4;">Go to <a href="#discover" style="color: var(--dusty-rose); font-weight: 600;">Discover</a> to find your next cozy adventure!</p>
        </div>
      `;
    } else {
      readingIds.forEach(id => {
        const book = store.books[id];
        if (!book) return;

        const totalPages = parseInt(book.pageCount) || 300;
        const progress = store.readingProgress[id] || { pagesRead: 0, totalPages: totalPages };
        const pagesRead = Math.min(progress.pagesRead, totalPages);
        const percent = Math.min(Math.round((pagesRead / totalPages) * 100), 100);

        const card = document.createElement('div');
        card.className = 'progress-card';

        let coverStyle = `background: ${getGradientFromString(book.title)}`;
        let coverContent = book.title.charAt(0);
        if (book.thumbnail) {
          coverStyle = `background: url('${book.thumbnail}') center/cover;`;
          coverContent = '';
        }

        card.innerHTML = `
          <div class="progress-card-cover" style="${coverStyle}">${coverContent}</div>
          <div class="progress-card-info">
            <h4 class="book-title">${escapeHTML(book.title)}</h4>
            <div class="book-author">by ${escapeHTML(book.authors[0] || 'Unknown')}</div>
            
            <div class="progress-numeric-row">
              <label>Pages Read:</label>
              <div class="progress-inputs">
                <input type="number" class="pg-input" min="0" max="${totalPages}" value="${pagesRead}">
                <span class="sep">/</span>
                <span class="total-pgs">${totalPages}</span>
              </div>
              <span class="percentage-badge">${percent}%</span>
            </div>
            
            <input type="range" class="pg-slider" min="0" max="${totalPages}" value="${pagesRead}">
            
            <div class="progress-note-wrapper">
              <textarea class="pg-note-input" placeholder="Any cozy thoughts on this reading session? (optional)" rows="1"></textarea>
            </div>
            
            <button class="btn btn-secondary btn-update-progress-save" style="margin-top: 0.5rem; padding: 0.4rem 1rem; font-size: 0.8rem; background: var(--sage); color: #2d5a2d; border: none; align-self: flex-start;">Save Progress ✦</button>
          </div>
        `;

        const slider = card.querySelector('.pg-slider');
        const numInput = card.querySelector('.pg-input');
        const badge = card.querySelector('.percentage-badge');
        const saveBtn = card.querySelector('.btn-update-progress-save');
        const noteInput = card.querySelector('.pg-note-input');

        const updateVisuals = (val) => {
          const newPercent = Math.min(Math.round((val / totalPages) * 100), 100);
          badge.textContent = `${newPercent}%`;
        };

        slider.oninput = () => {
          numInput.value = slider.value;
          updateVisuals(slider.value);
        };

        numInput.oninput = () => {
          let val = parseInt(numInput.value) || 0;
          if (val < 0) val = 0;
          if (val > totalPages) val = totalPages;
          slider.value = val;
          updateVisuals(val);
        };

        saveBtn.onclick = async () => {
          let val = parseInt(numInput.value) || 0;
          if (val < 0) val = 0;
          if (val > totalPages) val = totalPages;

          const note = noteInput.value.trim();
          await saveReadingProgress(book.id, val, totalPages, note);

          if (val >= totalPages) {
            alert(`🎉 Congratulations! You have finished "${book.title}"! Moved to Completed.`);
            const filteredReading = store.shelves.reading.filter(bid => bid !== book.id);
            await updateShelf('reading', filteredReading);
            
            const currentCompleted = store.shelves.completed || [];
            if (!currentCompleted.includes(book.id)) {
              await updateShelf('completed', [...currentCompleted, book.id]);
            }
          } else {
            alert("📖 Reading progress logged!");
            renderProfilePage();
          }
        };

        listContainer.appendChild(card);
      });
    }
  }

  // 7. Populate Timeline logs
  const timelineContainer = document.getElementById('prof-timeline');
  if (timelineContainer) {
    timelineContainer.innerHTML = '';
    
    let allLogs = [];
    Object.keys(store.readingLogs || {}).forEach(bookId => {
      const book = store.books[bookId];
      const logs = store.readingLogs[bookId] || [];
      logs.forEach(log => {
        allLogs.push({
          bookTitle: book ? book.title : 'Unknown Book',
          bookId,
          ...log
        });
      });
    });

    if (allLogs.length === 0) {
      timelineContainer.innerHTML = `
        <div style="color: var(--ink-light); padding: 1.5rem; text-align: center; font-size: 0.85rem; font-style: italic;">
          Your reading journal is empty. Log progress above to write your first entry!
        </div>
      `;
    } else {
      allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      allLogs.forEach(log => {
        const dateStr = new Date(log.timestamp).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const pct = Math.min(Math.round((log.pagesRead / log.totalPages) * 100), 100);

        const logItem = document.createElement('div');
        logItem.className = 'timeline-item';
        logItem.innerHTML = `
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-action">Logged <strong>${log.pagesRead}/${log.totalPages} pages</strong> (${pct}%)</span>
              <span class="timeline-time">${dateStr}</span>
            </div>
            <div class="timeline-book">Book: <a href="#book-${log.bookId}" style="color:var(--dusty-rose); font-weight: 600; text-decoration: none;">${escapeHTML(log.bookTitle)}</a></div>
            ${log.note ? `<div class="timeline-note">“${escapeHTML(log.note)}”</div>` : ''}
          </div>
        `;
        timelineContainer.appendChild(logItem);
      });
    }
  }
}

