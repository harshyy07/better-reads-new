import { store, cacheBook, updateShelf } from './store.js';
import { getGradientFromString, escapeHTML } from './ui.js';

export async function fetchAndCacheBooks(queries, startIndex = 0, isSubject = false) {
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
          if (!item.cover_i) return; 
          
          const id = item.key.replace('/works/', '');
          newBookIds.push(id);
          if (!store.books[id]) {
            cacheBook({
              id: id,
              title: item.title || 'Unknown Title',
              authors: item.author_name || ['Unknown Author'],
              description: 'No description available.',
              thumbnail: `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`,
              categories: item.subject || [],
              pageCount: item.number_of_pages_median || 0,
              publishedDate: item.first_publish_year || '',
              averageRating: item.ratings_average ? item.ratings_average.toFixed(1) : (Math.random() * 2 + 3).toFixed(1)
            });
          }
        });
      }
    } catch (e) {
      console.error(`Failed to fetch books for query: ${query}`, e);
    }
  }

  return newBookIds;
}

export async function fetchOpenLibraryBook(bookId) {
  try {
    const decodedBookId = decodeURIComponent(bookId);
    
    if (store.books[decodedBookId]) return store.books[decodedBookId];
    if (store.books[bookId]) return store.books[bookId];

    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(decodedBookId)}`);
    const data = await res.json();
    if (data.docs && data.docs.length > 0) {
      const doc = data.docs[0];
      const newBook = {
        id: decodedBookId,
        title: doc.title,
        authors: doc.author_name || ['Unknown'],
        categories: doc.subject || ['Fiction'],
        description: `First published in ${doc.first_publish_year || 'unknown year'}. An intriguing book about ${doc.subject ? doc.subject.slice(0,3).join(', ') : 'various topics'}.`,
        thumbnail: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : `https://covers.openlibrary.org/b/id/${decodedBookId}-L.jpg`
      };
      cacheBook(newBook);
      return newBook;
    }
  } catch(e) {
    console.error(e);
  }
  
  const isCoverId = /^\d+$/.test(bookId);
  return {
    id: bookId,
    title: isCoverId ? "Featured Book" : "Unknown Book",
    authors: ["BetterReads Selection"],
    categories: ["Featured"],
    description: isCoverId ? "A beautiful edition highlighted in our community marquee. Discover your next great adventure." : "No details found.",
    thumbnail: isCoverId ? `https://covers.openlibrary.org/b/id/${bookId}-L.jpg` : ""
  };
}

// Discover Logic
export function initDiscover() {
  const discoverSearchInput = document.getElementById('discover-search');
  const discoverGrid = document.getElementById('discover-books-grid');
  
  let searchTimeout = null;
  let discoverStartIndex = 0;
  let currentDiscoverIds = [];
  let discoverSearchQuery = '';
  let activeDiscoverGenre = 'fantasy';
  let activeDiscoverMood = '';
  let isLoading = false;

  const scrollTrigger = document.createElement('div');
  scrollTrigger.id = 'discover-scroll-trigger';
  scrollTrigger.style.height = '1px';
  scrollTrigger.style.width = '100%';
  scrollTrigger.style.marginTop = '2rem';
  if (discoverGrid && discoverGrid.parentNode) {
    discoverGrid.parentNode.insertBefore(scrollTrigger, discoverGrid.nextSibling);
  }

  async function performDiscoverFetch(isLoadMore = false) {
    if (!discoverGrid) return;
    if (isLoading) return;
    isLoading = true;

    try {
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
        newIds = Object.keys(store.books).slice(0, 10);
      }

      let uniqueNewIds = isLoadMore ? newIds.filter(id => !currentDiscoverIds.includes(id)) : newIds;
      currentDiscoverIds = isLoadMore ? currentDiscoverIds.concat(uniqueNewIds) : uniqueNewIds;

      if (currentDiscoverIds.length === 0) {
        discoverGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--ink-light); padding: 2rem;">No books found. Try searching for something else!</div>`;
        scrollTrigger.style.display = 'none';
        return;
      }

      if (!isLoadMore) discoverGrid.innerHTML = '';

      uniqueNewIds.forEach(id => {
        const book = store.books[id];
        if (!book) return;

        const card = document.createElement('div');
        card.className = 'discover-book-card';
        let coverStyle = `background: ${getGradientFromString(book.title)}`;
        let coverContent = book.title.charAt(0);
        if (book.thumbnail) {
          coverStyle = `background: url('${book.thumbnail}') center/cover;`;
          coverContent = '';
        }

        const inTbr = store.shelves.tbr.includes(book.id);
        const btnText = inTbr ? 'In TBR' : '+ TBR';
        const btnStyle = inTbr ? 'background: var(--sage); color: #2d5a2d;' : '';
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
              <span class="dbc-rating">★★★★☆ ${book.averageRating || 4}</span>
              <span class="badge badge-lavender dbc-genre-tag" style="text-transform: capitalize;">${escapeHTML(cat)}</span>
            </div>
          </div>
        `;

        // Slight 3D tilt hover animation on discover cards
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
          if (e.target.closest('.dbc-shelf-btn')) return;
          window.location.hash = `#book-${book.id}`;
        });
        discoverGrid.appendChild(card);
      });

      if (uniqueNewIds.length > 0) {
        scrollTrigger.style.display = 'block';
      } else {
        scrollTrigger.style.display = 'none';
      }
    } catch (err) {
      console.error('Error during discover fetch:', err);
    } finally {
      isLoading = false;
    }
  }

  // Handle + TBR shelf button clicks in Discover Grid via event delegation
  if (discoverGrid) {
    discoverGrid.addEventListener('click', async (e) => {
      const btn = e.target.closest('.dbc-shelf-btn');
      if (!btn) return;
      e.stopPropagation();

      const bookId = btn.dataset.bookId;
      if (!bookId) return;

      const inTbr = store.shelves.tbr.includes(bookId);
      let newTbr = [...store.shelves.tbr];
      if (inTbr) {
        newTbr = newTbr.filter(id => id !== bookId);
        btn.textContent = '+ TBR';
        btn.style.background = '';
        btn.style.color = '';
      } else {
        newTbr.push(bookId);
        btn.textContent = 'In TBR';
        btn.style.background = 'var(--sage)';
        btn.style.color = '#2d5a2d';
      }

      await updateShelf('tbr', newTbr);
    });
  }

  // React to store updates (e.g. if books are removed from TBR in the library modal)
  document.addEventListener('betterreads-store-updated', () => {
    if (!discoverGrid) return;
    discoverGrid.querySelectorAll('.dbc-shelf-btn').forEach(btn => {
      const bookId = btn.dataset.bookId;
      if (!bookId) return;
      const inTbr = store.shelves.tbr.includes(bookId);
      if (inTbr) {
        btn.textContent = 'In TBR';
        btn.style.background = 'var(--sage)';
        btn.style.color = '#2d5a2d';
      } else {
        btn.textContent = '+ TBR';
        btn.style.background = '';
        btn.style.color = '';
      }
    });
  });

  // Handle Home page marquee search input and redirect to Discover page
  const homeSearchInput = document.querySelector('.book-marquee-search input');
  const homeSearchIcon = document.querySelector('.book-marquee-search .search-icon');
  
  const handleHomeSearch = () => {
    if (!homeSearchInput) return;
    const query = homeSearchInput.value.trim();
    if (query) {
      // Clear filters
      document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
      activeDiscoverGenre = '';
      activeDiscoverMood = '';
      
      // Update discover search state
      discoverSearchQuery = query;
      if (discoverSearchInput) discoverSearchInput.value = query;
      
      // Clear home input
      homeSearchInput.value = '';
      
      // Redirect
      window.location.hash = '#discover';
      
      // Perform query fetch
      performDiscoverFetch(false);
    }
  };

  if (homeSearchInput) {
    homeSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleHomeSearch();
    });
  }
  if (homeSearchIcon) {
    homeSearchIcon.addEventListener('click', handleHomeSearch);
  }

  if (discoverSearchInput) {
    discoverSearchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      discoverSearchQuery = e.target.value.trim();

      // Clear filter pills visually and logically if searching
      if (discoverSearchQuery.length > 0) {
        document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
        activeDiscoverGenre = '';
        activeDiscoverMood = '';
      }

      searchTimeout = setTimeout(() => {
        performDiscoverFetch(false);
      }, 500);
    });
  }

  document.querySelectorAll('.genre-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      // Clear search when clicking pills
      discoverSearchQuery = '';
      if (discoverSearchInput) discoverSearchInput.value = '';

      if (pill.dataset.genre) {
        if (activeDiscoverGenre === pill.dataset.genre) {
          activeDiscoverGenre = '';
          pill.classList.remove('active');
        } else {
          document.querySelectorAll('#genre-pills .genre-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          activeDiscoverGenre = pill.dataset.genre;
        }
      }
      if (pill.dataset.mood) {
        if (activeDiscoverMood === pill.dataset.mood) {
          activeDiscoverMood = '';
          pill.classList.remove('active');
        } else {
          document.querySelectorAll('#mood-pills .genre-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          activeDiscoverMood = pill.dataset.mood;
        }
      }
      performDiscoverFetch(false);
    });
  });

  const scrollObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && discoverGrid.innerHTML !== '' && !isLoading) {
      performDiscoverFetch(true);
    }
  }, { threshold: 0.1 });
  scrollObserver.observe(scrollTrigger);

  // Initial load
  performDiscoverFetch(false);
}
