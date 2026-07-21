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

// Helper: Get user profile details
export async function getProfile(userId) {
  try {
    const { data, error } = await supabase.from('profiles').select('username, avatar').eq('id', userId).single();
    if (!error && data) return data;
  } catch (e) {}
  return { username: 'cozyreader', avatar: '🍵' };
}

// 1. REVIEWS ADAPTERS
export async function fetchReviews(bookId) {
  if (store.isLoggedIn) {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, profiles(username, avatar)')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        return data.map(item => ({
          id: item.id,
          author: item.profiles ? item.profiles.username : 'Unknown User',
          avatar: item.profiles ? item.profiles.avatar : '🌸',
          content: item.content,
          created_at: item.created_at
        }));
      }
    } catch (err) {
      console.warn("Supabase reviews fetch failed, falling back to local DB.", err);
    }
  }

  // Fallback to local DB
  const local = getLocalDB();
  return local.reviews[bookId] || [];
}

export async function addReview(bookId, content) {
  const newReviewLocal = {
    id: 'rev-' + Date.now(),
    author: store.isLoggedIn && store.currentUser ? store.currentUser.email.split('@')[0] : 'You',
    avatar: '🍵',
    content: content,
    created_at: new Date().toISOString()
  };

  if (store.isLoggedIn && store.currentUser) {
    try {
      // Fetch avatar/username from current profile first
      const { data: profile } = await supabase.from('profiles').select('username, avatar').eq('id', store.currentUser.id).single();
      if (profile) {
        newReviewLocal.author = profile.username || newReviewLocal.author;
        newReviewLocal.avatar = profile.avatar || newReviewLocal.avatar;
      }

      const { data, error } = await supabase.from('reviews').insert({
        book_id: bookId,
        user_id: store.currentUser.id,
        content: content
      }).select('*, profiles(username, avatar)').single();

      if (!error && data) {
        newReviewLocal.id = data.id;
        newReviewLocal.author = data.profiles ? data.profiles.username : newReviewLocal.author;
        newReviewLocal.avatar = data.profiles ? data.profiles.avatar : newReviewLocal.avatar;
        newReviewLocal.created_at = data.created_at;
      }
    } catch (err) {
      console.error("Supabase review insert failed", err);
    }
  }

  // Always keep local cache updated
  const local = getLocalDB();
  if (!local.reviews[bookId]) local.reviews[bookId] = [];
  local.reviews[bookId].unshift(newReviewLocal);
  saveLocalDB(local);

  // Sync back to store state
  store.reviews[bookId] = local.reviews[bookId];

  return newReviewLocal;
}

// 2. RATINGS ADAPTERS
export async function fetchRatings(bookId) {
  let userRating = 0;
  let allRatings = [];

  if (store.isLoggedIn) {
    try {
      const { data, error } = await supabase.from('ratings').select('rating, user_id').eq('book_id', bookId);
      if (!error && data) {
        allRatings = data.map(d => parseFloat(d.rating));
        const userRow = data.find(d => d.user_id === store.currentUser.id);
        if (userRow) userRating = parseFloat(userRow.rating);
      }
    } catch (err) {
      console.warn("Supabase ratings fetch failed", err);
    }
  }

  if (allRatings.length === 0) {
    const local = getLocalDB();
    const localRating = local.userRatings[bookId];
    if (localRating) {
      userRating = localRating;
      allRatings = [localRating];
    }
  }

  // Calculate average
  const count = allRatings.length;
  const avg = count > 0 ? (allRatings.reduce((a, b) => a + b, 0) / count).toFixed(1) : null;

  return { userRating, avg, count };
}

export async function addRating(bookId, rating) {
  if (store.isLoggedIn && store.currentUser) {
    try {
      await supabase.from('ratings').upsert({
        user_id: store.currentUser.id,
        book_id: bookId,
        rating: rating
      }, { onConflict: 'user_id, book_id' });
    } catch (err) {
      console.error("Supabase rating upsert failed", err);
    }
  }

  const local = getLocalDB();
  local.userRatings[bookId] = rating;
  saveLocalDB(local);

  store.userRatings[bookId] = rating;
  document.dispatchEvent(new Event('betterreads-store-updated'));
}

// 3. DISCOURSE THREADS ADAPTERS
const DISCOURSE_DB_KEY = 'betterreads_discourse';
const defaultThreads = [
  { id: 't1', user: 'luna.reads', avatar: '🌙', color: 'var(--lavender)', time: '2 hours ago', tag: 'Fantasy', title: 'The ending of Piranesi had me SOBBING — anyone else?', preview: 'Okay so I just finished and the moment he realises who he really is absolutely destroyed me...', likes: 142, replies: 38 },
  { id: 't2', user: 'bookish.flora', avatar: '☀️', color: 'var(--peach)', time: '5 hours ago', tag: 'AMA', title: '📅 June Book Club — Voting is OPEN!', preview: 'The shortlist for June community pick is here! We have Intermezzo, James, and The Women...', likes: 287, replies: 119 },
  { id: 't3', user: 'verified ✦ Olivie Blake', avatar: '🌿', color: 'var(--sage)', time: 'Yesterday', tag: 'Author', title: 'I\'m Olivie Blake — AMA about The Atlas Six', preview: 'Hi everyone! So excited to be here on BetterReads. I\'ll be answering questions for the next 2 hours...', likes: 1205, replies: 243 },
  { id: 't4', user: 'readingwithrose', avatar: '🌸', color: 'var(--blush)', time: '3 days ago', tag: 'Challenge', title: '✅ Challenge complete! DNF\'d a book guilt-free', preview: 'I\'ve been holding onto Moby-Dick for three years out of guilt. This month gave me permission to let it go.', likes: 891, replies: 67 }
];

export async function fetchThreads() {
  if (store.isLoggedIn) {
    try {
      const { data, error } = await supabase
        .from('threads')
        .select('*, profiles(username, avatar)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(t => ({
          id: t.id,
          user: t.profiles ? t.profiles.username : 'Unknown User',
          avatar: t.profiles ? t.profiles.avatar : '🌸',
          color: 'var(--blush)',
          time: new Date(t.created_at).toLocaleDateString(),
          tag: t.tag,
          title: t.title,
          preview: t.content,
          likes: t.likes || 0
        }));
      }
    } catch (err) {
      console.warn("Supabase threads fetch failed", err);
    }
  }

  // Fallback to local
  let threads = JSON.parse(localStorage.getItem(DISCOURSE_DB_KEY));
  if (!threads) {
    localStorage.setItem(DISCOURSE_DB_KEY, JSON.stringify(defaultThreads));
    threads = defaultThreads;
  }
  return threads;
}

export async function addThread(title, content, tag) {
  const newThread = {
    id: 't' + Date.now(),
    user: store.isLoggedIn && store.currentUser ? store.currentUser.email.split('@')[0] : 'you.reading',
    avatar: '🌸',
    color: 'var(--blush)',
    time: 'Just now',
    tag: tag,
    title: title,
    preview: content,
    likes: 0
  };

  if (store.isLoggedIn && store.currentUser) {
    try {
      const { data: profile } = await supabase.from('profiles').select('username, avatar').eq('id', store.currentUser.id).single();
      if (profile) {
        newThread.user = profile.username || newThread.user;
        newThread.avatar = profile.avatar || newThread.avatar;
      }

      const { data, error } = await supabase.from('threads').insert({
        user_id: store.currentUser.id,
        title: title,
        content: content,
        tag: tag
      }).select('*, profiles(username, avatar)').single();

      if (!error && data) {
        newThread.id = data.id;
        newThread.user = data.profiles ? data.profiles.username : newThread.user;
        newThread.avatar = data.profiles ? data.profiles.avatar : newThread.avatar;
      }
    } catch (err) {
      console.error("Supabase thread insert failed", err);
    }
  }

  // Save to local cache anyway
  const localThreads = JSON.parse(localStorage.getItem(DISCOURSE_DB_KEY)) || defaultThreads;
  localThreads.unshift(newThread);
  localStorage.setItem(DISCOURSE_DB_KEY, JSON.stringify(localThreads));

  return newThread;
}

export async function likeThread(threadId) {
  // If thread ID is uuid, it's Supabase-backed
  if (store.isLoggedIn && isNaN(threadId)) {
    try {
      // Best to do direct update. To be simple, we can fetch current likes, then increment
      const { data } = await supabase.from('threads').select('likes').eq('id', threadId).single();
      const currentLikes = data ? (data.likes || 0) : 0;
      await supabase.from('threads').update({ likes: currentLikes + 1 }).eq('id', threadId);
    } catch (err) {
      console.error("Supabase like thread update failed", err);
    }
  }

  // Update local cache
  const localThreads = JSON.parse(localStorage.getItem(DISCOURSE_DB_KEY)) || defaultThreads;
  const thread = localThreads.find(t => t.id === threadId);
  if (thread) {
    thread.likes = (thread.likes || 0) + 1;
    localStorage.setItem(DISCOURSE_DB_KEY, JSON.stringify(localThreads));
  }
}

// 4. COMMENTS ADAPTERS
export async function fetchComments(threadId) {
  if (store.isLoggedIn && isNaN(threadId)) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(username, avatar)')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data.map(c => ({
          id: c.id,
          author: c.profiles ? c.profiles.username : 'Unknown User',
          avatar: c.profiles ? c.profiles.avatar : '🌸',
          content: c.content,
          created_at: c.created_at
        }));
      }
    } catch (err) {
      console.warn("Supabase comments fetch failed", err);
    }
  }

  // Fallback to local
  const key = 'betterreads_comments_' + threadId;
  return JSON.parse(localStorage.getItem(key)) || [];
}

export async function addComment(threadId, content) {
  const newComment = {
    id: 'c-' + Date.now(),
    author: store.isLoggedIn && store.currentUser ? store.currentUser.email.split('@')[0] : 'you.reading',
    avatar: '🌸',
    content: content,
    created_at: new Date().toISOString()
  };

  if (store.isLoggedIn && store.currentUser) {
    try {
      const { data: profile } = await supabase.from('profiles').select('username, avatar').eq('id', store.currentUser.id).single();
      if (profile) {
        newComment.author = profile.username || newComment.author;
        newComment.avatar = profile.avatar || newComment.avatar;
      }

      if (isNaN(threadId)) {
        const { data, error } = await supabase.from('comments').insert({
          thread_id: threadId,
          user_id: store.currentUser.id,
          content: content
        }).select('*, profiles(username, avatar)').single();

        if (!error && data) {
          newComment.id = data.id;
          newComment.author = data.profiles ? data.profiles.username : newComment.author;
          newComment.avatar = data.profiles ? data.profiles.avatar : newComment.avatar;
        }
      }
    } catch (err) {
      console.error("Supabase comment insert failed", err);
    }
  }

  // Save to local cache anyway
  const key = 'betterreads_comments_' + threadId;
  const localComments = JSON.parse(localStorage.getItem(key)) || [];
  localComments.push(newComment);
  localStorage.setItem(key, JSON.stringify(localComments));

  return newComment;
}

// 5. CLUBS ADAPTERS
const CLUBS_DB_KEY = 'betterreads_clubs';
const defaultClubs = [
  { id: 'c1', name: 'The Midnight Readers', desc: 'A cozy club for fantasy lovers. Currently reading: The Atlas Six.', members: 420 },
  { id: 'c2', name: 'Non-Fiction November', desc: 'We read one non-fiction book every month and discuss our learnings.', members: 156 },
  { id: 'c3', name: 'Romance & Roses', desc: 'Swoon-worthy romance books only! Join us for weekly deep dives.', members: 890 }
];

export async function fetchClubs() {
  if (store.isLoggedIn) {
    try {
      const { data: clubData, error: clubError } = await supabase.from('clubs').select('*');
      const { data: memberData, error: memberError } = await supabase.from('club_members').select('club_id');

      if (!clubError && clubData) {
        return clubData.map(c => {
          const membersCount = memberData ? memberData.filter(m => m.club_id === c.id).length : 0;
          return {
            id: c.id,
            name: c.name,
            desc: c.description,
            members: membersCount + 5 // baseline mock padding for active feel
          };
        });
      }
    } catch (err) {
      console.warn("Supabase clubs fetch failed", err);
    }
  }

  // Fallback to local
  let clubs = JSON.parse(localStorage.getItem(CLUBS_DB_KEY));
  if (!clubs) {
    localStorage.setItem(CLUBS_DB_KEY, JSON.stringify(defaultClubs));
    clubs = defaultClubs;
  }
  return clubs;
}

export async function addClub(name, description) {
  const newClub = {
    id: 'c' + Date.now(),
    name: name,
    desc: description,
    members: 1
  };

  if (store.isLoggedIn && store.currentUser) {
    try {
      const { data, error } = await supabase.from('clubs').insert({
        name: name,
        description: description
      }).select().single();

      if (!error && data) {
        newClub.id = data.id;
        // Join immediately
        await supabase.from('club_members').insert({
          club_id: data.id,
          user_id: store.currentUser.id
        });
      }
    } catch (err) {
      console.error("Supabase club creation failed", err);
    }
  }

  const localClubs = JSON.parse(localStorage.getItem(CLUBS_DB_KEY)) || defaultClubs;
  localClubs.unshift(newClub);
  localStorage.setItem(CLUBS_DB_KEY, JSON.stringify(localClubs));
  localStorage.setItem('joined_club_' + newClub.id, 'true');

  return newClub;
}

export async function checkClubJoined(clubId) {
  if (store.isLoggedIn && isNaN(clubId)) {
    try {
      const { data, error } = await supabase
        .from('club_members')
        .select('*')
        .eq('club_id', clubId)
        .eq('user_id', store.currentUser.id);
      
      if (!error && data && data.length > 0) return true;
    } catch (err) {
      console.warn("Supabase check club membership failed", err);
    }
  }
  return localStorage.getItem('joined_club_' + clubId) === 'true';
}

export async function toggleJoinClub(clubId) {
  const alreadyJoined = await checkClubJoined(clubId);

  if (store.isLoggedIn && isNaN(clubId)) {
    try {
      if (alreadyJoined) {
        await supabase.from('club_members').delete().eq('club_id', clubId).eq('user_id', store.currentUser.id);
      } else {
        await supabase.from('club_members').insert({ club_id: clubId, user_id: store.currentUser.id });
      }
    } catch (err) {
      console.error("Supabase join club toggle failed", err);
    }
  }

  // Update local
  if (alreadyJoined) {
    localStorage.removeItem('joined_club_' + clubId);
  } else {
    localStorage.setItem('joined_club_' + clubId, 'true');
  }

  // Update members counts locally
  const localClubs = JSON.parse(localStorage.getItem(CLUBS_DB_KEY)) || defaultClubs;
  const club = localClubs.find(c => c.id === clubId);
  if (club) {
    club.members = Math.max(0, club.members + (alreadyJoined ? -1 : 1));
    localStorage.setItem(CLUBS_DB_KEY, JSON.stringify(localClubs));
  }
}

// 6. CLUB DISCUSSIONS ADAPTERS
export async function fetchClubDiscussions(clubId) {
  if (store.isLoggedIn && isNaN(clubId)) {
    try {
      const { data, error } = await supabase
        .from('club_discussions')
        .select('*, profiles(username, avatar)')
        .eq('club_id', clubId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data.map(d => ({
          id: d.id,
          author: d.profiles ? d.profiles.username : 'Unknown User',
          avatar: d.profiles ? d.profiles.avatar : '🌸',
          content: d.content,
          created_at: d.created_at
        }));
      }
    } catch (err) {
      console.warn("Supabase club discussions fetch failed", err);
    }
  }

  // Fallback to local
  const key = 'betterreads_club_disc_' + clubId;
  return JSON.parse(localStorage.getItem(key)) || [
    { id: 'cd-1', author: 'lofi.lover', avatar: '🐱', content: 'Welcome to the club corner! Share your ideas here 🍵', created_at: new Date().toISOString() }
  ];
}

export async function addClubDiscussion(clubId, content) {
  const newMsg = {
    id: 'cd-' + Date.now(),
    author: store.isLoggedIn && store.currentUser ? store.currentUser.email.split('@')[0] : 'you.reading',
    avatar: '🌸',
    content: content,
    created_at: new Date().toISOString()
  };

  if (store.isLoggedIn && store.currentUser) {
    try {
      const { data: profile } = await supabase.from('profiles').select('username, avatar').eq('id', store.currentUser.id).single();
      if (profile) {
        newMsg.author = profile.username || newMsg.author;
        newMsg.avatar = profile.avatar || newMsg.avatar;
      }

      if (isNaN(clubId)) {
        const { data, error } = await supabase.from('club_discussions').insert({
          club_id: clubId,
          user_id: store.currentUser.id,
          content: content
        }).select('*, profiles(username, avatar)').single();

        if (!error && data) {
          newMsg.id = data.id;
          newMsg.author = data.profiles ? data.profiles.username : newMsg.author;
          newMsg.avatar = data.profiles ? data.profiles.avatar : newMsg.avatar;
        }
      }
    } catch (err) {
      console.error("Supabase club discussion post failed", err);
    }
  }

  const key = 'betterreads_club_disc_' + clubId;
  const localMsgs = JSON.parse(localStorage.getItem(key)) || [];
  localMsgs.push(newMsg);
  localStorage.setItem(key, JSON.stringify(localMsgs));

  return newMsg;
}

