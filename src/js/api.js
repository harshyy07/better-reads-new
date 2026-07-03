import { store, cacheBook } from './store.js';
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
      card.addEventListener('click', (e) => {
        if (e.target.closest('.dbc-shelf-btn')) return;
        window.location.hash = `#book-${book.id}`;
      });
      discoverGrid.appendChild(card);
    });

    if (uniqueNewIds.length > 0) scrollTrigger.style.display = 'block';
  }

  if (discoverSearchInput) {
    discoverSearchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      discoverSearchQuery = e.target.value.trim();
      searchTimeout = setTimeout(() => {
        performDiscoverFetch(false);
      }, 500);
    });
  }

  document.querySelectorAll('.genre-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      if (pill.dataset.genre) {
        document.querySelectorAll('#genre-pills .genre-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeDiscoverGenre = pill.dataset.genre;
      }
      if (pill.dataset.mood) {
        document.querySelectorAll('#mood-pills .genre-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeDiscoverMood = pill.dataset.mood;
      }
      performDiscoverFetch(false);
    });
  });

  const scrollObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && discoverGrid.innerHTML !== '') {
      performDiscoverFetch(true);
    }
  }, { threshold: 0.1 });
  scrollObserver.observe(scrollTrigger);

  // Initial load
  performDiscoverFetch(false);
}
