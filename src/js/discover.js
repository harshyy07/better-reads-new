     15. DISCOVER SEARCH & RENDERING (Vast Selection)
     ────────────────────────────────────────────────────────── */
  const discoverSearchInput = document.getElementById('discover-search');
  const discoverGrid = document.getElementById('discover-books-grid');

  // Create an invisible scroll trigger at the bottom of the grid
  const scrollTrigger = document.createElement('div');
  scrollTrigger.id = 'discover-scroll-trigger';
  scrollTrigger.style.height = '1px';
  scrollTrigger.style.width = '100%';
  scrollTrigger.style.marginTop = '2rem';
  if (discoverGrid && discoverGrid.parentNode) {
    discoverGrid.parentNode.insertBefore(scrollTrigger, discoverGrid.nextSibling);
  }

  let searchTimeout = null;
  let discoverStartIndex = 0;
  let currentDiscoverIds = [];

  async function performDiscoverFetch(isLoadMore = false) {
    if (!discoverGrid) return;

    if (!isLoadMore) {
      discoverStartIndex = 0;
      currentDiscoverIds = [];
      discoverGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--ink-light); padding: 2rem;">Fetching books from the universe... 🌌</div>';
      scrollTrigger.style.display = 'none';
    } else {
      discoverStartIndex += 10;
    }

    let newIds = [];
    if (discoverSearchQuery) {
      newIds = await fetchAndCacheBooks([discoverSearchQuery], discoverStartIndex, false);
    } else if (activeDiscoverGenre || activeDiscoverMood) {
      const qParts = [];
      if (activeDiscoverGenre) qParts.push(activeDiscoverGenre);
      if (activeDiscoverMood) qParts.push(activeDiscoverMood);
      
      if (activeDiscoverMood) {
        newIds = await fetchAndCacheBooks([qParts.join(' ')], discoverStartIndex, false);
      } else {
        newIds = await fetchAndCacheBooks([activeDiscoverGenre], discoverStartIndex, true);
      }
    } else {
      // Default state: just show some books from DB or fallback
      const db = getDB();
      newIds = Object.keys(db.books).slice(0, 10);
    }

    // Filter out books we already have in the current view to avoid duplicates
    let uniqueNewIds = isLoadMore ? newIds.filter(id => !currentDiscoverIds.includes(id)) : newIds;
    currentDiscoverIds = isLoadMore ? currentDiscoverIds.concat(uniqueNewIds) : uniqueNewIds;

    if (currentDiscoverIds.length === 0) {
      discoverGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--ink-light); padding: 2rem;">No books found. Try searching for something else!</div>`;
      scrollTrigger.style.display = 'none';
      return;
    }

    if (!isLoadMore) {
      discoverGrid.innerHTML = '';
    }

    const db = getDB();
    // Render only the newly fetched unique books to append them
    uniqueNewIds.forEach(id => {
      const book = db.books[id];
      if (!book) return;

      const card = document.createElement('div');
      card.className = 'discover-book-card';

      let coverStyle = `background: ${getGradientFromString(book.title)}`;
      let coverContent = book.title.charAt(0);
      if (book.thumbnail) {
        coverStyle = `background: url('${book.thumbnail}') center/cover;`;
        coverContent = '';
      }

      // Check if already in TBR
      const inTbr = db.shelves.tbr.includes(book.id);
      const btnText = inTbr ? 'In TBR' : '+ TBR';
      const btnStyle = inTbr ? 'background: var(--sage); color: #2d5a2d;' : '';

      // First category badge
      const cat = book.categories && book.categories.length > 0 ? book.categories[0] : (activeDiscoverGenre || 'Fiction');

      card.innerHTML = `
        <div class="dbc-cover" style="${coverStyle}">
          ${coverContent}
          <button class="dbc-shelf-btn" data-book-id="${book.id}" style="${btnStyle}">${btnText}</button>
        </div>
        <div class="dbc-info">
          <div class="dbc-title">${escapeHTML(book.title)}</div>
          <div class="dbc-author">${escapeHTML(book.authors[0] || 'Unknown')}</div>
          <div class="dbc-meta">
            <span class="dbc-rating">★★★★☆ ${book.averageRating}</span>
            <span class="badge badge-lavender dbc-genre-tag" style="text-transform: capitalize;">${escapeHTML(cat)}</span>
          </div>
        </div>
      `;

      // Re-apply 3D tilt
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
        card.style.transform = `translateY(-8px) rotateX(${-y}deg) rotateY(${x}deg)`;
        card.style.transformStyle = 'preserve-3d';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });

      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return; // Ignore button clicks
        window.location.hash = `#book-${book.id}`;
      });

      discoverGrid.appendChild(card);
    });

    attachShelfBtnListeners();
    scrollTrigger.style.display = newIds.length < 10 ? 'none' : 'block';
  }

  // Event Listeners for Discover
  if (discoverSearchInput) {
    discoverSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      discoverSearchQuery = q;
      if (q.length > 0) {
        activeDiscoverGenre = ''; // Clear genre if searching
        activeDiscoverMood = '';
      }

      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        // Deselect genre pills visually
        if (q.length > 0) {
          document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
        }
        performDiscoverFetch();
      }, 800);
    });
  }

  document.querySelectorAll('#genre-pills .genre-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      discoverSearchQuery = '';
      if (discoverSearchInput) discoverSearchInput.value = '';

      if (activeDiscoverGenre === pill.dataset.genre) {
        activeDiscoverGenre = '';
        pill.classList.remove('active');
      } else {
        document.querySelectorAll('#genre-pills .genre-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeDiscoverGenre = pill.dataset.genre;
      }
      performDiscoverFetch();
    });
  });

  document.querySelectorAll('#mood-pills .genre-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      discoverSearchQuery = '';
      if (discoverSearchInput) discoverSearchInput.value = '';

      if (activeDiscoverMood === pill.dataset.mood) {
        activeDiscoverMood = '';
        pill.classList.remove('active');
      } else {
        document.querySelectorAll('#mood-pills .genre-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeDiscoverMood = pill.dataset.mood;
      }
      performDiscoverFetch();
    });
  });

  // Setup infinite scroll observer
  let isLoadingMore = false;
  const discoverObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && scrollTrigger.style.display === 'block' && !isLoadingMore) {
      isLoadingMore = true;
      performDiscoverFetch(true).finally(() => {
        isLoadingMore = false;
      });
    }
  }, { rootMargin: '400px' });

  discoverObserver.observe(scrollTrigger);

  // Render initial set of books
  document.addEventListener('betterreads-db-ready', () => {
    // Initial display will just be local fallbacks
    performDiscoverFetch();
    renderDiscourse();
    renderClubs();
  });

  /* ──────────────────────────────────────────────────────────
     16. INTERACTIVE DISCOURSE & BOOK CLUBS
     ────────────────────────────────────────────────────────── */
  const DISCOURSE_DB_KEY = 'betterreads_discourse';
  const CLUBS_DB_KEY = 'betterreads_clubs';

  const defaultThreads = [
    { id: 't1', user: 'luna.reads', avatar: '🌙', color: 'var(--lavender)', time: '2 hours ago', tag: 'Fantasy', title: 'The ending of Piranesi had me SOBBING — anyone else?', preview: 'Okay so I just finished and the moment he realises who he really is absolutely destroyed me...', likes: 142, replies: 38 },
    { id: 't2', user: 'bookish.flora', avatar: '☀️', color: 'var(--peach)', time: '5 hours ago', tag: 'AMA', title: '📅 June Book Club — Voting is OPEN!', preview: 'The shortlist for June community pick is here! We have Intermezzo, James, and The Women...', likes: 287, replies: 119 },
    { id: 't3', user: 'verified ✦ Olivie Blake', avatar: '🌿', color: 'var(--sage)', time: 'Yesterday', tag: 'Author', title: 'I\'m Olivie Blake — AMA about The Atlas Six', preview: 'Hi everyone! So excited to be here on BetterReads. I\'ll be answering questions for the next 2 hours...', likes: 1205, replies: 243 },
    { id: 't4', user: 'readingwithrose', avatar: '🌸', color: 'var(--blush)', time: '3 days ago', tag: 'Challenge', title: '✅ Challenge complete! DNF\'d a book guilt-free', preview: 'I\'ve been holding onto Moby-Dick for three years out of guilt. This month gave me permission to let it go.', likes: 891, replies: 67 }
  ];

  const defaultClubs = [
    { id: 'c1', name: 'The Midnight Readers', desc: 'A cozy club for fantasy lovers. Currently reading: The Atlas Six.', members: 420 },
    { id: 'c2', name: 'Non-Fiction November', desc: 'We read one non-fiction book every month and discuss our learnings.', members: 156 },
    { id: 'c3', name: 'Romance & Roses', desc: 'Swoon-worthy romance books only! Join us for weekly deep dives.', members: 890 }
  ];

  function initDiscourseDB() {
    if (!localStorage.getItem(DISCOURSE_DB_KEY)) {
      localStorage.setItem(DISCOURSE_DB_KEY, JSON.stringify(defaultThreads));
    }
    if (!localStorage.getItem(CLUBS_DB_KEY)) {
      localStorage.setItem(CLUBS_DB_KEY, JSON.stringify(defaultClubs));
    }
  }

  function getDiscourse() { return JSON.parse(localStorage.getItem(DISCOURSE_DB_KEY)); }
  function saveDiscourse(data) { localStorage.setItem(DISCOURSE_DB_KEY, JSON.stringify(data)); }

  function getClubs() { return JSON.parse(localStorage.getItem(CLUBS_DB_KEY)); }
  function saveClubs(data) { localStorage.setItem(CLUBS_DB_KEY, JSON.stringify(data)); }

  initDiscourseDB();

  // Tab switching logic
  const btnTabThreads = document.getElementById('btn-tab-threads');
  const btnTabClubs = document.getElementById('btn-tab-clubs');
  const viewThreads = document.getElementById('view-threads');
  const viewClubs = document.getElementById('view-clubs');

  if (btnTabThreads && btnTabClubs) {
    btnTabThreads.addEventListener('click', () => {
      btnTabThreads.className = 'btn btn-primary';
      btnTabClubs.className = 'btn btn-secondary';
      viewThreads.style.display = 'block';
      viewClubs.style.display = 'none';
    });
    btnTabClubs.addEventListener('click', () => {
      btnTabClubs.className = 'btn btn-primary';
      btnTabThreads.className = 'btn btn-secondary';
      viewClubs.style.display = 'block';
      viewThreads.style.display = 'none';
    });
  }

  // Render Threads
  function renderDiscourse() {
    const grid = document.getElementById('discourse-grid');
    if (!grid) return;
    const threads = getDiscourse();
    grid.innerHTML = '';

    threads.forEach(t => {
      const card = document.createElement('div');
      card.className = 'thread-card';
      card.innerHTML = `
        <div class="thread-header">
          <div class="thread-avatar" style="background:${t.color}">${t.avatar}</div>
          <div class="thread-meta">
            <div class="thread-user">${t.user}</div>
            <div class="thread-time">${t.time}</div>
          </div>
          <div class="badge" style="background: ${t.color}; color: #333; opacity: 0.9;">${t.tag}</div>
        </div>
        <div class="thread-title">${t.title}</div>
        <div class="thread-preview">${t.preview}</div>
        <div class="thread-footer">
          <div class="thread-stats">
            <div class="thread-stat btn-like" data-id="${t.id}" style="cursor:pointer; transition:transform 0.2s;">❤️ <span>${t.likes}</span></div>
            <div class="thread-stat">💬 <span>${t.replies} replies</span></div>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    // Attach like listeners
    document.querySelectorAll('.btn-like').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const db = getDiscourse();
        const thread = db.find(x => x.id === id);
        if (thread) {
          thread.likes += 1;
          saveDiscourse(db);
          e.currentTarget.querySelector('span').textContent = thread.likes;
          e.currentTarget.style.transform = 'scale(1.2)';
          setTimeout(() => e.currentTarget.style.transform = 'scale(1)', 200);
        }
      });
    });
  }

  // Create Thread
  const btnCreateThread = document.getElementById('btn-create-thread');
  if (btnCreateThread) {
    btnCreateThread.addEventListener('click', () => {
      const title = document.getElementById('new-thread-title').value.trim();
      const content = document.getElementById('new-thread-content').value.trim();
      const tag = document.getElementById('new-thread-tag').value;

      if (!title || !content) {
        alert('Please fill out both title and content!');
        return;
      }

      const db = getDiscourse();
      db.unshift({
        id: 't' + Date.now(),
        user: 'you.reading',
        avatar: '🌸',
        color: 'var(--blush)',
        time: 'Just now',
        tag: tag,
        title: title,
        preview: content,
        likes: 0,
        replies: 0
      });
      saveDiscourse(db);

      document.getElementById('new-thread-title').value = '';
      document.getElementById('new-thread-content').value = '';
      renderDiscourse();
    });
  }

  // Render Clubs
  function renderClubs() {
    const grid = document.getElementById('clubs-grid');
    if (!grid) return;
    const clubs = getClubs();
    grid.innerHTML = '';

    clubs.forEach(c => {
      const joined = localStorage.getItem('joined_club_' + c.id);
      const btnText = joined ? '✓ Joined' : 'Join Club';
      const btnStyle = joined ? 'background: var(--sage); color: #2d5a2d; border: none;' : '';

      const card = document.createElement('div');
      card.className = 'thread-card';
      card.innerHTML = `
        <div class="thread-header">
          <div class="thread-avatar" style="background:var(--peach)">📚</div>
          <div class="thread-meta">
            <div class="thread-user">${c.name}</div>
            <div class="thread-time">${c.members} members</div>
          </div>
        </div>
        <div class="thread-preview">${c.desc}</div>
        <div class="thread-footer" style="justify-content: flex-end;">
          <button class="btn btn-secondary btn-join-club" data-id="${c.id}" style="${btnStyle}">${btnText}</button>
        </div>
      `;
      grid.appendChild(card);
    });

    document.querySelectorAll('.btn-join-club').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const isJoined = localStorage.getItem('joined_club_' + id);
        if (!isJoined) {
          localStorage.setItem('joined_club_' + id, 'true');
          const db = getClubs();
          const club = db.find(x => x.id === id);
          if (club) { club.members += 1; saveClubs(db); }
          renderClubs();
        } else {
          localStorage.removeItem('joined_club_' + id);
          const db = getClubs();
          const club = db.find(x => x.id === id);
          if (club) { club.members -= 1; saveClubs(db); }
          renderClubs();
        }
      });
    });
  }

  // Create Club
  const btnCreateClub = document.getElementById('btn-create-club');
  if (btnCreateClub) {
    btnCreateClub.addEventListener('click', () => {
      const name = document.getElementById('new-club-name').value.trim();
      const desc = document.getElementById('new-club-desc').value.trim();

      if (!name || !desc) {
        alert('Please provide a club name and description.');
        return;
      }

      const db = getClubs();
      const newId = 'c' + Date.now();
      db.unshift({
        id: newId,
        name: name,
        desc: desc,
        members: 1
      });
      saveClubs(db);
      localStorage.setItem('joined_club_' + newId, 'true');

      document.getElementById('new-club-name').value = '';
      document.getElementById('new-club-desc').value = '';
      renderClubs();
    });
  }

  // Start initialization

  async function renderHeroSlider() {
    const track = document.getElementById('hero-slider-track');
    if (!track) return;

    // Fetch a few interesting books for the hero
    const sliderBooks = await fetchAndCacheBooks(['bestsellers', 'classics'], 0, false);
    const db = getDB();

    track.innerHTML = '';
    if (sliderBooks.length === 0) return;

    // Duplicate the books array to allow for a seamless infinite scroll
    const displayIds = [...sliderBooks, ...sliderBooks, ...sliderBooks];

    displayIds.forEach(id => {
      const book = db.books[id];
      if (!book) return;

      const card = document.createElement('div');
      card.className = 'hero-slider-book';

      const coverStyle = book.thumbnail
        ? `background: url('${book.thumbnail}') center/cover;`
        : `background: ${getGradientFromString(book.title)};`;
      const coverContent = book.thumbnail ? '' : `<div style="padding: 1rem; color: white; text-align: center; font-weight: bold; font-size: 0.8rem; line-height: 1.2;">${escapeHTML(book.title)}</div>`;

      card.innerHTML = `
        <div class="dbc-cover" style="${coverStyle}">
          ${coverContent}
        </div>
      `;

      card.addEventListener('click', () => {
        window.location.hash = `#book-${book.id}`;
      });

      track.appendChild(card);
    });
  }

  const heroSearchBtn = document.getElementById('hero-search-btn');
  const heroSearchInput = document.getElementById('hero-search-input');

  if (heroSearchBtn && heroSearchInput) {
    heroSearchBtn.addEventListener('click', () => {
      const q = heroSearchInput.value.trim();
      if (q) {
        discoverSearchQuery = q;
        const discoverInput = document.getElementById('discover-search');
        if (discoverInput) discoverInput.value = q;

        window.location.hash = '#discover';

        // Let the page transition happen, then fetch
        setTimeout(() => {
          performDiscoverFetch();
        }, 300);
      }
    });

    heroSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') heroSearchBtn.click();
    });
  }

  initDatabase();

});
