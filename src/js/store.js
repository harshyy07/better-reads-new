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
  userRatings: {},
  progress: {}, // key: bookId, value: { currentPage: number, totalPages: number }
  following: []  // array of user profiles/IDs
};

const DB_KEY = 'betterreads_local_cache'; // Fallback for unauthenticated users

export function getLocalDB() {
  const dbData = localStorage.getItem(DB_KEY);
  if (dbData) {
    try {
      const parsed = JSON.parse(dbData);
      return {
        books: parsed.books || {},
        shelves: parsed.shelves || { tbr: [], reading: [], completed: [], dnf: [] },
        reviews: parsed.reviews || {},
        userRatings: parsed.userRatings || {},
        progress: parsed.progress || {},
        following: parsed.following || []
      };
    } catch (e) {
      console.error("Error parsing DB", e);
    }
  }
  return {
    books: {},
    shelves: { tbr: [], reading: [], completed: [], dnf: [] },
    reviews: {},
    userRatings: {},
    progress: {},
    following: []
  };
}

export function saveLocalDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// Sync from Supabase if logged in, otherwise from localStorage
export async function syncShelves() {
  if (store.isLoggedIn && store.currentUser) {
    // 1. Sync shelves
    const { data: shelfData, error: shelfError } = await supabase
      .from('shelves')
      .select('type, book_ids')
      .eq('user_id', store.currentUser.id);
      
    if (!shelfError && shelfData) {
      store.shelves = { tbr: [], reading: [], completed: [], dnf: [] };
      shelfData.forEach(row => {
        if (store.shelves[row.type] !== undefined) {
          store.shelves[row.type] = row.book_ids || [];
        }
      });
    }

    // 2. Sync progress
    try {
      const { data: progressData, error: progressError } = await supabase
        .from('progress')
        .select('book_id, current_page, total_pages')
        .eq('user_id', store.currentUser.id);

      if (!progressError && progressData) {
        store.progress = {};
        progressData.forEach(row => {
          store.progress[row.book_id] = {
            currentPage: row.current_page,
            totalPages: row.total_pages
          };
        });
      }
    } catch (err) {
      console.warn("Could not sync progress from Supabase. Falling back to local storage.", err);
      const local = getLocalDB();
      store.progress = local.progress || {};
    }

    // 3. Sync following
    try {
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('user_id', store.currentUser.id);

      if (!followError && followData) {
        store.following = followData.map(row => row.following_id);
      }
    } catch (err) {
      console.warn("Could not sync follows from Supabase. Falling back to local storage.", err);
      const local = getLocalDB();
      store.following = local.following || [];
    }
  } else {
    const local = getLocalDB();
    store.shelves = local.shelves || { tbr: [], reading: [], completed: [], dnf: [] };
    store.books = local.books || {};
    store.reviews = local.reviews || {};
    store.userRatings = local.userRatings || {};
    store.progress = local.progress || {};
    store.following = local.following || [];
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

export async function updateProgress(bookId, currentPage, totalPages) {
  currentPage = parseInt(currentPage) || 0;
  totalPages = parseInt(totalPages) || 0;

  store.progress[bookId] = { currentPage, totalPages };

  if (store.isLoggedIn && store.currentUser) {
    try {
      await supabase.from('progress').upsert({
        user_id: store.currentUser.id,
        book_id: bookId,
        current_page: currentPage,
        total_pages: totalPages,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, book_id' });
    } catch (err) {
      console.error("Supabase progress upsert failed", err);
    }
  } else {
    const local = getLocalDB();
    local.progress = store.progress;
    saveLocalDB(local);
  }

  document.dispatchEvent(new Event('betterreads-store-updated'));
}

export async function toggleFollowUser(friendProfile) {
  const friendId = friendProfile.id || friendProfile.username; // fallback to username for mock users
  const isFollowing = store.following.includes(friendId);

  if (isFollowing) {
    store.following = store.following.filter(id => id !== friendId);
    if (store.isLoggedIn && store.currentUser) {
      try {
        await supabase.from('follows')
          .delete()
          .eq('user_id', store.currentUser.id)
          .eq('following_id', friendId);
      } catch (err) {
        console.error("Supabase follow delete failed", err);
      }
    }
  } else {
    store.following.push(friendId);
    if (store.isLoggedIn && store.currentUser) {
      try {
        await supabase.from('follows').insert({
          user_id: store.currentUser.id,
          following_id: friendId
        });
      } catch (err) {
        console.error("Supabase follow insert failed", err);
      }
    }
  }

  const local = getLocalDB();
  local.following = store.following;
  saveLocalDB(local);

  document.dispatchEvent(new Event('betterreads-store-updated'));
}
