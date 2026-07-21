import {
  store,
  toggleFollowUser,
  fetchThreads,
  addThread,
  likeThread,
  fetchComments,
  addComment,
  fetchClubs,
  addClub,
  checkClubJoined,
  toggleJoinClub,
  fetchClubDiscussions,
  addClubDiscussion
} from './store.js';
import { escapeHTML } from './ui.js';

// DISCOURSE & CLUBS DATABASES
const DISCOURSE_DB_KEY = 'betterreads_discourse';
const CLUBS_DB_KEY = 'betterreads_clubs';

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
    btnCreateThread.addEventListener('click', async () => {
      const title = document.getElementById('new-thread-title').value.trim();
      const content = document.getElementById('new-thread-content').value.trim();
      const tag = document.getElementById('new-thread-tag').value;

      if (!title || !content) {
        alert('Please fill out both title and content!');
        return;
      }

      await addThread(title, content, tag);

      document.getElementById('new-thread-title').value = '';
      document.getElementById('new-thread-content').value = '';
      renderDiscourse();
    });
  }

  // Create Club listener
  const btnCreateClub = document.getElementById('btn-create-club');
  if (btnCreateClub) {
    btnCreateClub.addEventListener('click', async () => {
      const name = document.getElementById('new-club-name').value.trim();
      const desc = document.getElementById('new-club-desc').value.trim();

      if (!name || !desc) {
        alert('Please provide a club name and description.');
        return;
      }

      await addClub(name, desc);

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

export async function renderDiscourse() {
  const grid = document.getElementById('discourse-grid');
  if (!grid) return;
  
  const threads = await fetchThreads();
  grid.innerHTML = '';

  for (const t of threads) {
    const comments = await fetchComments(t.id);
    const repliesCount = comments.length || t.replies || 0;

    const card = document.createElement('div');
    card.className = 'thread-card';
    card.style.cursor = 'pointer';
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
          <div class="thread-stat">💬 <span>${repliesCount} replies</span></div>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-like')) return;
      window.location.hash = `#thread-${t.id}`;
    });

    // Attach like listener
    const likeBtn = card.querySelector('.btn-like');
    likeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await likeThread(t.id);
      t.likes += 1;
      likeBtn.querySelector('span').textContent = t.likes;
      likeBtn.style.transform = 'scale(1.2)';
      setTimeout(() => likeBtn.style.transform = 'scale(1)', 200);
    });

    grid.appendChild(card);
  }
}

export async function renderClubs() {
  const grid = document.getElementById('clubs-grid');
  if (!grid) return;
  
  const clubs = await fetchClubs();
  grid.innerHTML = '';

  for (const c of clubs) {
    const joined = await checkClubJoined(c.id);
    const btnText = joined ? '✓ Joined' : 'Join Club';
    const btnStyle = joined ? 'background: var(--sage); color: #2d5a2d; border: none;' : '';

    const card = document.createElement('div');
    card.className = 'thread-card';
    card.style.cursor = 'pointer';
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

    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-join-club')) return;
      window.location.hash = `#club-${c.id}`;
    });

    const joinBtn = card.querySelector('.btn-join-club');
    joinBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await toggleJoinClub(c.id);
      renderClubs();
    });

    grid.appendChild(card);
  }
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
  postBtn.onclick = async () => {
    await addThread(
      'My Reading Stats Wrapped! ✨',
      `I've devoured ${totalBooks} books this year! That's ${totalPages.toLocaleString()} pages turned, a ${streak} streak, and my top vibe is ${topGenre}! Come join my reading corner. 🍵`,
      'Wrapped 📸'
    );

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

export async function renderThreadDetails(threadId) {
  const threads = await fetchThreads();
  const t = threads.find(x => x.id === threadId);
  if (!t) return;

  const tdAvatar = document.getElementById('td-avatar');
  const tdUser = document.getElementById('td-user');
  const tdTime = document.getElementById('td-time');
  const tdTag = document.getElementById('td-tag');
  const tdTitle = document.getElementById('td-title');
  const tdContent = document.getElementById('td-content');
  const tdLikesCount = document.getElementById('td-likes-count');
  const tdLikeBtn = document.getElementById('td-like-btn');
  const tdRepliesHeader = document.getElementById('td-replies-header');
  const tdCommentsList = document.getElementById('td-comments-list');
  const submitCommentBtn = document.getElementById('btn-td-submit-comment');
  const commentInput = document.getElementById('td-new-comment');

  if (tdAvatar) tdAvatar.textContent = t.avatar || '🌸';
  if (tdUser) tdUser.textContent = t.user || 'Unknown User';
  if (tdTime) tdTime.textContent = t.time || '';
  if (tdTag) {
    tdTag.textContent = t.tag || 'Discussion';
    tdTag.style.background = t.color || 'var(--blush)';
  }
  if (tdTitle) tdTitle.textContent = t.title || '';
  if (tdContent) tdContent.textContent = t.preview || '';
  if (tdLikesCount) tdLikesCount.textContent = t.likes || 0;

  // Like button inside detail view
  if (tdLikeBtn) {
    // Clone to remove previous listeners
    const newLikeBtn = tdLikeBtn.cloneNode(true);
    tdLikeBtn.parentNode.replaceChild(newLikeBtn, tdLikeBtn);
    newLikeBtn.addEventListener('click', async () => {
      await likeThread(t.id);
      t.likes += 1;
      const countSpan = newLikeBtn.querySelector('span');
      if (countSpan) countSpan.textContent = t.likes;
      newLikeBtn.style.transform = 'scale(1.2)';
      setTimeout(() => newLikeBtn.style.transform = 'scale(1)', 200);
      
      // Update count element if it was separately matched
      const likesEl = document.getElementById('td-likes-count');
      if (likesEl) likesEl.textContent = t.likes;
    });
  }

  // Render comments
  async function refreshComments() {
    const comments = await fetchComments(threadId);
    if (tdRepliesHeader) tdRepliesHeader.textContent = `Comments (${comments.length})`;
    if (tdCommentsList) {
      tdCommentsList.innerHTML = '';
      if (comments.length === 0) {
        tdCommentsList.innerHTML = `<div style="color:var(--ink-light); padding:1rem; text-align:center;">No comments yet. Start the conversation!</div>`;
      } else {
        comments.forEach(c => {
          const card = document.createElement('div');
          card.className = 'review-card';
          card.style = 'background: white; padding: 1.25rem; border-radius: 12px; border: 1px solid rgba(0,0,0,0.05); margin-bottom: 0.5rem;';
          card.innerHTML = `
            <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--lavender); display: flex; align-items: center; justify-content: center; font-size: 1rem;">${escapeHTML(c.avatar || '🌸')}</div>
              <div>
                <div style="font-weight: 600; font-size: 0.85rem; margin-bottom: 0.15rem; display: flex; gap: 0.5rem; align-items: center;">
                  <span>${escapeHTML(c.author)}</span>
                  <span style="font-size:0.7rem; color:var(--ink-light); font-weight:normal;">${c.created_at ? new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                </div>
                <div style="font-size: 0.9rem; line-height: 1.5; color: var(--ink);">${escapeHTML(c.content)}</div>
              </div>
            </div>
          `;
          tdCommentsList.appendChild(card);
        });
      }
    }
  }

  await refreshComments();

  // Submit comment
  if (submitCommentBtn && commentInput) {
    const newSubmitBtn = submitCommentBtn.cloneNode(true);
    submitCommentBtn.parentNode.replaceChild(newSubmitBtn, submitCommentBtn);
    newSubmitBtn.addEventListener('click', async () => {
      const val = commentInput.value.trim();
      if (!val) return;
      await addComment(threadId, val);
      commentInput.value = '';
      await refreshComments();
    });
  }
}

export async function renderClubDetails(clubId) {
  const clubs = await fetchClubs();
  const c = clubs.find(x => x.id === clubId);
  if (!c) return;

  const cdName = document.getElementById('cd-club-name');
  const cdMembers = document.getElementById('cd-club-members');
  const cdDesc = document.getElementById('cd-club-desc');
  const cdJoinBtn = document.getElementById('cd-join-btn');
  const chatContainer = document.getElementById('cd-chat-container');
  const chatInput = document.getElementById('cd-chat-input');
  const sendChatBtn = document.getElementById('btn-cd-send-chat');

  if (cdName) cdName.textContent = c.name || '';
  if (cdDesc) cdDesc.textContent = c.desc || '';
  if (cdMembers) cdMembers.textContent = `${c.members} members`;

  // Join button toggle
  if (cdJoinBtn) {
    async function updateJoinBtnState() {
      const joined = await checkClubJoined(clubId);
      if (joined) {
        cdJoinBtn.textContent = '✓ Joined';
        cdJoinBtn.style.background = 'var(--sage)';
        cdJoinBtn.style.color = '#2d5a2d';
        cdJoinBtn.style.border = 'none';
      } else {
        cdJoinBtn.textContent = 'Join Club';
        cdJoinBtn.style.background = '';
        cdJoinBtn.style.color = '';
        cdJoinBtn.style.border = '';
      }
    }

    await updateJoinBtnState();

    const newJoinBtn = cdJoinBtn.cloneNode(true);
    cdJoinBtn.parentNode.replaceChild(newJoinBtn, cdJoinBtn);
    newJoinBtn.addEventListener('click', async () => {
      await toggleJoinClub(clubId);
      const joined = await checkClubJoined(clubId);
      c.members += joined ? 1 : -1;
      if (cdMembers) cdMembers.textContent = `${c.members} members`;
      await updateJoinBtnState();
      
      // Also update clubs tab if they switch back
      renderClubs();
    });
  }

  // Poll rendering
  function renderPoll() {
    const pollKey = `club_poll_votes_${clubId}`;
    const votedKey = `club_poll_voted_${clubId}`;
    
    let votes = JSON.parse(localStorage.getItem(pollKey)) || [45, 35, 20];
    const hasVoted = localStorage.getItem(votedKey) === 'true';
    const totalVotes = votes.reduce((a, b) => a + b, 0);

    const pollWidget = document.getElementById('cd-poll-widget');
    if (pollWidget) {
      pollWidget.innerHTML = '';
      const options = ["The Starless Sea", "Piranesi", "A Psalm for the Wild-Built"];
      const colors = ["var(--blush)", "var(--lavender)", "var(--sage)"];

      options.forEach((opt, idx) => {
        const pct = totalVotes > 0 ? Math.round((votes[idx] / totalVotes) * 100) : 0;
        
        const row = document.createElement('div');
        row.className = 'poll-option-row';
        row.style = `cursor: ${hasVoted ? 'default' : 'pointer'}; position: relative; border: 1px solid #eee; border-radius: 10px; padding: 1rem; overflow: hidden; display: flex; justify-content: space-between; align-items: center; background: white; transition: background 0.2s;`;
        
        row.innerHTML = `
          <div class="poll-fill" style="position: absolute; left: 0; top: 0; bottom: 0; background: ${colors[idx]}; width: ${pct}%; opacity: 0.4; transition: width 0.3s; pointer-events: none;"></div>
          <span class="poll-text" style="font-weight: 600; font-size: 0.95rem; z-index: 2; pointer-events: none;">${opt}</span>
          <span class="poll-percentage" style="font-weight: bold; font-size: 0.95rem; z-index: 2; pointer-events: none;">${pct}%</span>
        `;

        if (!hasVoted) {
          row.addEventListener('click', () => {
            votes[idx] += 1;
            localStorage.setItem(pollKey, JSON.stringify(votes));
            localStorage.setItem(votedKey, 'true');
            renderPoll();
          });
        }
        
        pollWidget.appendChild(row);
      });
    }
  }

  renderPoll();

  // Chat Board
  async function refreshChat() {
    const discussions = await fetchClubDiscussions(clubId);
    if (chatContainer) {
      chatContainer.innerHTML = '';
      discussions.forEach(d => {
        const msg = document.createElement('div');
        msg.style = 'display:flex; gap:0.5rem; align-items:flex-start; margin-bottom:0.5rem;';
        msg.innerHTML = `
          <div style="width: 24px; height: 24px; border-radius: 50%; background: var(--lavender); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; flex-shrink:0;">${escapeHTML(d.avatar || '🌸')}</div>
          <div style="background:var(--cream); padding:0.5rem 0.75rem; border-radius:10px; max-width:85%;">
            <div style="font-weight:600; font-size:0.75rem; color:var(--ink); margin-bottom:0.1rem;">${escapeHTML(d.author)}</div>
            <div style="font-size:0.8rem; color:var(--ink); line-height:1.4;">${escapeHTML(d.content)}</div>
          </div>
        `;
        chatContainer.appendChild(msg);
      });
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  await refreshChat();

  // Send message
  if (sendChatBtn && chatInput) {
    const newSendBtn = sendChatBtn.cloneNode(true);
    sendChatBtn.parentNode.replaceChild(newSendBtn, sendChatBtn);
    newSendBtn.addEventListener('click', async () => {
      const val = chatInput.value.trim();
      if (!val) return;
      await addClubDiscussion(clubId, val);
      chatInput.value = '';
      await refreshChat();
    });
  }
}

