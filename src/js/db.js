     14. LOCAL DATABASE & GOOGLE BOOKS API
     ────────────────────────────────────────────────────────── */
  const DB_KEY = 'betterreads_db';

  function getDB() {
    const dbData = localStorage.getItem(DB_KEY);
    if (dbData) {
      try {
        return JSON.parse(dbData);
      } catch (e) {
        console.error("Error parsing DB", e);
      }
    }
    return {
      books: {}, // key: book id, value: book object
      shelves: {
        tbr: [],
        reading: [],
        completed: []
      },
      reviews: {}, // key: book id, value: array of review objects
      userRatings: {} // key: book id, value: numeric rating
    };
  }

  function saveDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  async function fetchAndCacheBooks(queries, startIndex = 0, isSubject = false) {
    const db = getDB();
    let updated = false;
    let newBookIds = [];

    for (const query of queries) {
      try {
        const page = Math.floor(startIndex / 10) + 1;
        const qParam = isSubject ? `subject=${encodeURIComponent(query)}` : `q=${encodeURIComponent(query)}`;
        const response = await fetch(`https://openlibrary.org/search.json?${qParam}&page=${page}&limit=10`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        if (data.docs) {
          data.docs.forEach(item => {
            if (!item.cover_i) return; // Skip books without a thumbnail
            
            const id = item.key.replace('/works/', '');
            newBookIds.push(id);
            if (!db.books[id]) {
              db.books[id] = {
                id: id,
                title: item.title || 'Unknown Title',
                authors: item.author_name || ['Unknown Author'],
                description: 'No description available.',
                thumbnail: `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`,
                categories: item.subject || [],
                pageCount: item.number_of_pages_median || 0,
                publishedDate: item.first_publish_year || '',
                averageRating: item.ratings_average ? item.ratings_average.toFixed(1) : (Math.random() * 2 + 3).toFixed(1)
              };
              updated = true;
            }
          });
        }
      } catch (e) {
        console.error(`Failed to fetch books for query: ${query}`, e);
      }
    }

    if (updated) {
      saveDB(db);
    }
    return newBookIds;
  }

  async function initDatabase() {
    let db = getDB();

    // Purge any existing books from the local database that don't have a thumbnail
    let purged = false;
    Object.keys(db.books).forEach(id => {
      if (!db.books[id].thumbnail) {
        delete db.books[id];
        // Also remove from any shelves
        ['tbr', 'reading', 'completed'].forEach(shelf => {
          if (db.shelves[shelf]) {
            db.shelves[shelf] = db.shelves[shelf].filter(bid => bid !== id);
          }
        });
        purged = true;
      }
    });

    if (purged) {
      saveDB(db);
    }

    // If we have no books at all, let's fetch some from the API to seed the library
    if (Object.keys(db.books).length === 0) {
      console.log('Initializing BetterReads database with API books...');

      const tbrIds = await fetchAndCacheBooks(['fantasy'], 0, true);
      const readingIds = await fetchAndCacheBooks(['romance'], 0, true);
      const completedIds = await fetchAndCacheBooks(['science fiction'], 0, true);

      db = getDB();
      db.shelves.tbr = tbrIds.slice(0, 3);
      db.shelves.reading = readingIds.slice(0, 3);
      db.shelves.completed = completedIds.slice(0, 3);
      saveDB(db);
    } else {
      console.log('Database already initialized with', Object.keys(db.books).length, 'books.');
    }

    // Once DB is initialized, we can trigger rendering
    renderLibraryBooks();
    renderHeroSlider();
    document.dispatchEvent(new Event('betterreads-db-ready'));
  }

  function getGradientFromString(str) {
    // Generate a consistent but distinct gradient based on the book title
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c1 = `hsl(${hash % 360}, 60%, 85%)`;
    const c2 = `hsl(${(hash + 40) % 360}, 50%, 75%)`;
    return `linear-gradient(135deg, ${c1}, ${c2})`;
  }

  function renderReadingStats() {
    const db = getDB();
    const completedIds = db.shelves.completed || [];
    
    let totalBooks = completedIds.length;
    let totalPages = 0;
    let genres = {};
    
    completedIds.forEach(id => {
      const book = db.books[id];
      if (!book) return;
      
      // Sum pages
      if (book.pageCount) totalPages += parseInt(book.pageCount) || 0;
      
      // Tally genres
      if (book.categories && book.categories.length > 0) {
        book.categories.forEach(cat => {
          const g = cat.trim();
          if (g) {
            genres[g] = (genres[g] || 0) + 1;
          }
        });
      }
    });
    
    // Find top genre
    let topGenre = "N/A";
    let maxCount = 0;
    for (const [g, count] of Object.entries(genres)) {
      if (count > maxCount) {
        maxCount = count;
        topGenre = g;
      }
    }
    
    // Update DOM elements
    const elBooks = document.getElementById('wrap-books-count');
    const elPages = document.getElementById('wrap-pages-count');
    const elGenre = document.getElementById('wrap-top-genre');
    const elStreak = document.getElementById('wrap-streak');
    
    if (elBooks) elBooks.textContent = totalBooks;
    if (elPages) elPages.textContent = totalPages.toLocaleString();
    if (elGenre) {
      elGenre.textContent = topGenre === "N/A" ? "No Data" : topGenre;
      if (elGenre.textContent.length > 20) {
        elGenre.textContent = elGenre.textContent.substring(0, 17) + '...';
      }
    }
    
    // Mock streak for visual flair (e.g. 12 days, or 0 if no books)
    if (elStreak) {
      elStreak.textContent = totalBooks > 0 ? "12 Days" : "0 Days";
    }
  }

  function renderLibraryBooks() {
    const db = getDB();
    const shelfMappings = {
      'tbr': db.shelves.tbr || [],
      'reading': db.shelves.reading || [],
      'read': db.shelves.completed || [],
      'dnf': db.shelves.dnf || [] // Ensure this array exists in db schema if used
    };

    Object.keys(shelfMappings).forEach(shelfId => {
      const shelfContainer = document.getElementById(`shelf-${shelfId}`);
      if (!shelfContainer) return;

      const grid = shelfContainer.querySelector('.book-grid');
      if (!grid) return;

      grid.innerHTML = ''; // Clear existing static cards

      const bookIds = shelfMappings[shelfId];
      if (bookIds.length === 0) {
        grid.innerHTML = `<div style="color:var(--ink-light); padding: 1rem;">No books on this shelf yet.</div>`;
        return;
      }

      bookIds.forEach(id => {
        const book = db.books[id];
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
          // Mock some rating or progress data for demonstration
          const ratingStr = '★'.repeat(Math.round(book.averageRating || 4)) + '☆'.repeat(5 - Math.round(book.averageRating || 4));
          ratingHtml = `<div class="book-rating">${ratingStr}</div>`;
        }

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
          if (e.target.closest('button')) return; // Ignore button clicks
          window.location.hash = `#book-${book.id}`;
        });

        const removeBtn = card.querySelector('.remove-book-btn');
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const dbToUpdate = getDB();
          let shelfArray = [];
          if (shelfId === 'tbr') shelfArray = dbToUpdate.shelves.tbr;
          if (shelfId === 'reading') shelfArray = dbToUpdate.shelves.reading;
          if (shelfId === 'read') shelfArray = dbToUpdate.shelves.completed;
          if (shelfId === 'dnf') shelfArray = dbToUpdate.shelves.dnf;

          if (shelfArray) {
            const idx = shelfArray.indexOf(id);
            if (idx > -1) {
              shelfArray.splice(idx, 1);
              saveDB(dbToUpdate);
              renderLibraryBooks(); // Re-render to reflect changes
            }
          }
        });

        grid.appendChild(card);
      });
    });
  }

  

  /* ──────────────────────────────────────────────────────────
