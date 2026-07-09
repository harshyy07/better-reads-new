import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://inxfcwugmhtgptmiygzq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlueGZjd3VnbWh0Z3B0bWl5Z3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTIyMTAsImV4cCI6MjA5NzI4ODIxMH0.0k8hXWe4ZRbKEM5Y3nEthhodljktqbpd545hUCUhfMU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
export const store = {
  isLoggedIn: false,
  currentUser: null,
  books: {}, // local cache of book objects
  shelves: {
    tbr: [],
    reading: [],
    completed: [],
    dnf: []
  },
  reviews: {}, 
  userRatings: {}
};

const DB_KEY = 'betterreads_local_cache'; // Fallback for unauthenticated users

export function getLocalDB() {
  const dbData = localStorage.getItem(DB_KEY);
  if (dbData) {
    try {
      return JSON.parse(dbData);
    } catch (e) {
      console.error("Error parsing DB", e);
    }
  }
  return { books: {}, shelves: { tbr: [], reading: [], completed: [], dnf: [] }, reviews: {}, userRatings: {} };
}

export function saveLocalDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// Sync from Supabase if logged in, otherwise from localStorage
export async function syncShelves() {
  if (store.isLoggedIn && store.currentUser) {
    const { data, error } = await supabase
      .from('shelves')
      .select('type, book_ids')
      .eq('user_id', store.currentUser.id);
      
    if (!error && data) {
      // Reset shelves
      store.shelves = { tbr: [], reading: [], completed: [], dnf: [] };
      data.forEach(row => {
        if (store.shelves[row.type] !== undefined) {
          store.shelves[row.type] = row.book_ids || [];
        }
      });
    }
  } else {
    const local = getLocalDB();
    store.shelves = local.shelves || { tbr: [], reading: [], completed: [], dnf: [] };
    store.books = local.books || {};
    store.reviews = local.reviews || {};
    store.userRatings = local.userRatings || {};
  }
  
  document.dispatchEvent(new Event('betterreads-store-updated'));
}

export async function updateShelf(type, bookIds) {
  store.shelves[type] = bookIds;
  
  if (store.isLoggedIn && store.currentUser) {
    await supabase.from('shelves').upsert({
      user_id: store.currentUser.id,
      type: type,
      book_ids: bookIds
    }, { onConflict: 'user_id, type' });
  } else {
    const local = getLocalDB();
    local.shelves = store.shelves;
    saveLocalDB(local);
  }
  document.dispatchEvent(new Event('betterreads-store-updated'));
}

export function cacheBook(book) {
  if (!book || !book.id) return;
  store.books[book.id] = book;
  const local = getLocalDB();
  local.books[book.id] = book;
  saveLocalDB(local);
}
