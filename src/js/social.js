import { store, toggleFollowUser } from './store';
import { escapeHTML } from './ui';

// DISCOURSE & CLUBS DATABASES
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

function getDiscourse() { return JSON.parse(localStorage.getItem(DISCOURSE_DB_KEY)) || []; }
function saveDiscourse(data) { localStorage.setItem(DISCOURSE_DB_KEY, JSON.stringify(data)); }

function getClubs() { return JSON.parse(localStorage.getItem(CLUBS_DB_KEY)) || []; }
function saveClubs(data) { localStorage.setItem(CLUBS_DB_KEY, JSON.stringify(data)); }

// MOCK SOCIAL FRIENDS
const MOCK_FRIENDS = {
  'MapleReader': {
    id: 'MapleReader',
    username: 'MapleReader',
    avatar: '🪴',
    streak: '🔥 15 Days',
    stats: { books: 18, pages: 5420, genre: 'Fantasy' },
    currentlyReading: '12845610',
    completed: ['8225261', '10521270']
  },
  'LofiLover': {
    id: 'LofiLover',
    username: 'LofiLover',
    avatar: '🐱',
    streak: '🔥 8 Days',
    stats: { books: 12, pages: 3910, genre: 'Romance' },
    currentlyReading: '10548174',
    completed: ['12555621']
  },
  'TeaTimeReads': {
    id: 'TeaTimeReads',
    username: 'TeaTimeReads',
    avatar: '🍵',
    streak: '🔥 22 Days',
    stats: { books: 31, pages: 9840, genre: 'Mystery' },
    currentlyReading: '8226191',
    completed: ['10419213', '12814881']
  }
};

let activityFeed = [
  { username: 'MapleReader', avatar: '🪴', text: 'marked "The Hobbit" as Completed', time: '2 hours ago' },
  { username: 'LofiLover', avatar: '🐱', text: 'updated progress on "A Court of Thorns and Roses" to 85%', time: '4 hours ago' },
  { username: 'TeaTimeReads', avatar: '🍵', text: 'started reading "The Starless Sea"', time: '1 day ago' }
];

export function initSocial() {
  initDiscourseDB();

  const btnTabThreads = document.getElementById('btn-tab-threads');
  const btnTabClubs = document.getElementById('btn-tab-clubs');
  const btnTabFriends = document.getElementById('btn-tab-friends');

  const viewThreads = document.getElementById('view-threads');
  const viewClubs = document.getElementById('view-clubs');
  const viewFriends = document.getElementById('view-friends');

  // Tab switching
  if (btnTabThreads && btnTabClubs && btnTabFriends) {
    btnTabThreads.addEventListener('click', () => {
      btnTabThreads.className = 'btn btn-primary';
      btnTabClubs.className = 'btn btn-secondary';
      btnTabFriends.className = 'btn btn-secondary';
      
      viewThreads.style.display = 'block';
      viewClubs.style.display = 'none';
      viewFriends.style.display = 'none';
      
      renderDiscourse();
    });

    btnTabClubs.addEventListener('click', () => {
      btnTabClubs.className = 'btn btn-primary';
      btnTabThreads.className = 'btn btn-secondary';
      btnTabFriends.className = 'btn btn-secondary';
      
      viewClubs.style.display = 'block';
      viewThreads.style.display = 'none';
      viewFriends.style.display = 'none';
      
      renderClubs();
    });

    btnTabFriends.addEventListener('click', () => {
      btnTabFriends.className = 'btn btn-primary';
      btnTabThreads.className = 'btn btn-secondary';
      btnTabClubs.className = 'btn btn-secondary';
      
      viewFriends.style.display = 'block';
      viewThreads.style.display = 'none';
      viewClubs.style.display = 'none';
      
      renderFriendsCorner();
    });
  }

  // Create Thread listener
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
        user: store.currentUser ? store.currentUser.email.split('@')[0] : 'you.reading',
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

  // Create Club listener
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

  // Friends search
  const searchInput = document.getElementById('friend-search-input');
  const searchBtn = document.getElementById('btn-search-friend');
  const searchResultDiv = document.getElementById('search-friend-result');

  if (searchBtn && searchInput && searchResultDiv) {
    searchBtn.addEventListener('click', () => {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) return;

      const foundKey = Object.keys(MOCK_FRIENDS).find(key => key.toLowerCase() === q);
      if (foundKey) {
        const friend = MOCK_FRIENDS[foundKey];
        const isFollowing = store.following.includes(friend.id);
        searchResultDiv.style.display = 'block';
        searchResultDiv.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; background:#f9f9f9; padding: 1rem; border-radius: 8px; border: 1px dashed var(--lavender);">
            <div style="display:flex; gap:0.5rem; align-items:center;">
              <span style="font-size:1.5rem;">${friend.avatar}</span>
              <span style="font-weight:bold; color:var(--ink);">${friend.username}</span>
            </div>
            <button class="btn btn-secondary follow-toggle-btn" data-id="${friend.id}" style="padding:0.25rem 0.75rem; border-radius:6px; font-size:0.8rem; background:${isFollowing ? 'var(--sage)' : ''}">
              ${isFollowing ? '✓ Following' : 'Follow'}
            </button>
          </div>
        `;

        const followBtn = searchResultDiv.querySelector('.follow-toggle-btn');
        followBtn.onclick = async () => {
          await toggleFollowUser(friend);
          searchBtn.click(); // reload search result UI state
          renderFriendsCorner();
        };
      } else {
        searchResultDiv.style.display = 'block';
        searchResultDiv.innerHTML = `<div style="color:var(--dusty-rose); font-weight:bold;">User "${escapeHTML(searchInput.value)}" not found. Try searching "MapleReader"!</div>`;
      }
    });
  }

  // Modals close button
  const friendCloseBtn = document.getElementById('friend-profile-close-btn');
  const friendModal = document.getElementById('friend-profile-modal');
  if (friendCloseBtn && friendModal) {
    friendCloseBtn.onclick = () => friendModal.classList.remove('active');
    friendModal.onclick = (e) => { if (e.target === friendModal) friendModal.classList.remove('active'); };
  }

  const shareCloseBtn = document.getElementById('share-stats-close-btn');
  const shareModal = document.getElementById('share-stats-modal');
  if (shareCloseBtn && shareModal) {
    shareCloseBtn.onclick = () => shareModal.classList.remove('active');
    shareModal.onclick = (e) => { if (e.target === shareModal) shareModal.classList.remove('active'); };
  }

  // Stat sharing click triggers
  const shareBtn = document.querySelector('.fixed-share-btn');
  if (shareBtn) {
    shareBtn.removeAttribute('onclick');
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openShareModal();
    });
  }

  // Render initial tab content
  renderDiscourse();

  // Listen to store updates
  document.addEventListener('betterreads-store-updated', () => {
    if (viewFriends && viewFriends.style.display === 'block') {
      renderFriendsCorner();
    }
    if (viewThreads && viewThreads.style.display === 'block') {
      renderDiscourse();
    }
    if (viewClubs && viewClubs.style.display === 'block') {
      renderClubs();
    }
  });
}

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
        <div class="thread-avatar" style="background:${t.color || 'var(--lavender)'}">${t.avatar || '🌸'}</div>
        <div class="thread-meta">
          <div class="thread-user">${escapeHTML(t.user)}</div>
          <div class="thread-time">${escapeHTML(t.time)}</div>
        </div>
        <div class="badge" style="background: ${t.color || 'var(--blush)'}; color: #333; opacity: 0.9;">${escapeHTML(t.tag)}</div>
      </div>
      <div class="thread-title">${escapeHTML(t.title)}</div>
      <div class="thread-preview">${escapeHTML(t.preview)}</div>
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
  grid.querySelectorAll('.btn-like').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
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
          <div class="thread-user">${escapeHTML(c.name)}</div>
          <div class="thread-time">${c.members} members</div>
        </div>
      </div>
      <div class="thread-preview">${escapeHTML(c.desc)}</div>
      <div class="thread-footer" style="justify-content: flex-end;">
        <button class="btn btn-secondary btn-join-club" data-id="${c.id}" style="${btnStyle}">${btnText}</button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll('.btn-join-club').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.id;
      const isJoined = localStorage.getItem('joined_club_' + id);
      const db = getClubs();
      const club = db.find(x => x.id === id);

      if (!isJoined) {
        localStorage.setItem('joined_club_' + id, 'true');
        if (club) { club.members += 1; saveClubs(db); }
      } else {
        localStorage.removeItem('joined_club_' + id);
        if (club) { club.members = Math.max(0, club.members - 1); saveClubs(db); }
      }
      renderClubs();
    });
  });
}

function renderFriendsCorner() {
  // 1. Render following list
  const followingContainer = document.getElementById('following-list');
  if (followingContainer) {
    followingContainer.innerHTML = '';
    const followedIds = store.following || [];
    
    if (followedIds.length === 0) {
      followingContainer.innerHTML = `<div style="color:var(--ink-light); font-size:0.85rem;">You aren't following anyone yet. Search "LofiLover" or "MapleReader" to begin!</div>`;
    } else {
      followedIds.forEach(id => {
        const friend = MOCK_FRIENDS[id];
        if (!friend) return;

        const el = document.createElement('div');
        el.style = 'display:flex; justify-content:space-between; align-items:center; background:var(--cream); padding:0.75rem; border-radius:10px; cursor:pointer; margin-bottom: 0.25rem;';
        el.innerHTML = `
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <span style="font-size:1.2rem;">${friend.avatar}</span>
            <span style="font-weight:600; font-size:0.9rem; color:var(--ink);">${friend.username}</span>
          </div>
          <span style="font-size:0.75rem; color:var(--ink-light);">${friend.streak}</span>
        `;
        el.onclick = () => openFriendProfile(friend);
        followingContainer.appendChild(el);
      });
    }
  }

  // 2. Render activity feed
  const feedContainer = document.getElementById('friends-activity-feed');
  if (feedContainer) {
    feedContainer.innerHTML = '';
    
    // Add dynamically followed updates if any
    let displayFeed = [...activityFeed];
    const followedIds = store.following || [];
    followedIds.forEach(id => {
      const friend = MOCK_FRIENDS[id];
      if (friend && friend.currentlyReading) {
        const book = store.books[friend.currentlyReading] || { title: 'a book' };
        displayFeed.unshift({
          username: friend.username,
          avatar: friend.avatar,
          text: `is currently reading "${book.title || 'a book'}"`,
          time: 'Just now'
        });
      }
    });

    displayFeed.forEach(item => {
      const card = document.createElement('div');
      card.className = 'thread-card';
      card.style = 'padding: 1rem; border-radius: 12px; margin-bottom: 0.5rem; background:white; display:flex; gap:0.75rem; align-items:center;';
      card.innerHTML = `
        <div style="width:36px; height:36px; border-radius:50%; background:var(--lavender); display:flex; align-items:center; justify-content:center; font-size:1rem;">${item.avatar}</div>
        <div style="flex:1;">
          <div style="font-size:0.85rem; color:var(--ink-light);"><strong style="color:var(--ink);">${item.username}</strong> ${item.text}</div>
          <div style="font-size:0.7rem; color:#aaa; margin-top:0.1rem;">${item.time}</div>
        </div>
      `;
      feedContainer.appendChild(card);
    });
  }
}

function openFriendProfile(friend) {
  const modal = document.getElementById('friend-profile-modal');
  if (!modal) return;

  document.getElementById('friend-profile-avatar').textContent = friend.avatar;
  document.getElementById('friend-profile-username').textContent = friend.username;
  document.getElementById('friend-profile-streak').textContent = friend.streak;

  document.getElementById('friend-stats-books').textContent = friend.stats.books;
  document.getElementById('friend-stats-pages').textContent = friend.stats.pages.toLocaleString();
  document.getElementById('friend-stats-genre').textContent = friend.stats.genre;

  const currentReadDiv = document.getElementById('friend-currently-reading');
  if (currentReadDiv) {
    const book = store.books[friend.currentlyReading] || { title: 'Cozy Stories', authors: ['Lofi Chill'] };
    const coverUrl = book.thumbnail ? `background-image: url(${book.thumbnail})` : 'background: var(--sage)';
    currentReadDiv.innerHTML = `
      <div style="display:flex; gap:1rem; align-items:center; background: var(--cream); padding: 1rem; border-radius: 12px; border: 1px solid var(--blush);">
        <div style="width: 50px; height: 75px; ${coverUrl}; background-size: cover; border-radius: 4px; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:white;">
          ${book.thumbnail ? '' : '📚'}
        </div>
        <div>
          <div style="font-weight:bold; font-size:0.95rem; color:var(--ink);">${book.title}</div>
          <div style="font-size:0.8rem; color:var(--ink-light);">${book.authors.join(', ')}</div>
        </div>
      </div>
    `;
  }

  const completedGrid = document.getElementById('friend-completed-books');
  if (completedGrid) {
    completedGrid.innerHTML = '';
    friend.completed.forEach(id => {
      const book = store.books[id];
      if (!book) return;

      const card = document.createElement('div');
      card.className = 'book-card';
      card.style = 'cursor:default;';
      const coverUrl = book.thumbnail ? `background-image: url(${book.thumbnail})` : `background: ${getGradientFromString(book.title)}`;
      card.innerHTML = `
        <div class="book-cover" style="${coverUrl}; background-size: cover; width:100%; aspect-ratio:2/3;">
          ${book.thumbnail ? '' : book.title.charAt(0)}
        </div>
        <div class="book-info" style="padding:0.4rem;">
          <div class="book-title" style="font-size:0.75rem; line-height:1.2; max-height:2.4rem; overflow:hidden;">${book.title}</div>
        </div>
      `;
      completedGrid.appendChild(card);
    });
  }

  modal.classList.add('active');
}

function getGradientFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c1 = `hsl(${hash % 360}, 60%, 85%)`;
  const c2 = `hsl(${(hash + 40) % 360}, 50%, 75%)`;
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

function openShareModal() {
  const modal = document.getElementById('share-stats-modal');
  if (!modal) return;

  // Calculate current user stats
  const completedIds = store.shelves.completed || [];
  let totalBooks = completedIds.length;
  let totalPages = 0;
  let genres = {};

  completedIds.forEach(id => {
    const book = store.books[id];
    if (book && book.pageCount) totalPages += parseInt(book.pageCount) || 0;
    if (book && book.categories) {
      book.categories.forEach(cat => {
        if (cat) genres[cat] = (genres[cat] || 0) + 1;
      });
    }
  });

  let topGenre = "Fantasy";
  let maxGenreVal = 0;
  Object.keys(genres).forEach(g => {
    if (genres[g] > maxGenreVal) {
      maxGenreVal = genres[g];
      topGenre = g;
    }
  });

  const streak = totalBooks > 0 ? "12 Days" : "0 Days";

  document.getElementById('share-books-count').textContent = totalBooks;
  document.getElementById('share-pages-count').textContent = totalPages.toLocaleString();
  document.getElementById('share-genre').textContent = topGenre;
  document.getElementById('share-streak').textContent = streak;

  // Post stats to community feed logic
  const postBtn = document.getElementById('btn-share-to-feed');
  postBtn.onclick = () => {
    const db = getDiscourse();
    db.unshift({
      id: 't' + Date.now(),
      user: store.currentUser ? store.currentUser.email.split('@')[0] : 'you.reading',
      avatar: '🌸',
      color: 'var(--blush)',
      time: 'Just now',
      tag: 'Wrapped 📸',
      title: 'My Reading Stats Wrapped! ✨',
      preview: `I've devoured ${totalBooks} books this year! That's ${totalPages.toLocaleString()} pages turned, a ${streak} streak, and my top vibe is ${topGenre}! Come join my reading corner. 🍵`,
      likes: 0,
      replies: 0
    });

    saveDiscourse(db);
    alert("Stats shared to Community Threads feed!");
    modal.classList.remove('active');

    // Trigger update in discourse grid
    renderDiscourse();
  };

  // Copy link logic
  const copyBtn = document.getElementById('btn-copy-share-link');
  copyBtn.onclick = () => {
    const url = window.location.origin + '/#nook/' + (store.currentUser ? store.currentUser.email.split('@')[0] : 'guest');
    navigator.clipboard.writeText(url).then(() => {
      alert("Simulated profile link copied to clipboard:\n" + url);
      modal.classList.remove('active');
    });
  };

  modal.classList.add('active');
}
