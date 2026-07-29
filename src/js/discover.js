import { escapeHTML } from './ui.js';
import { store } from './store.js';

/* ──────────────────────────────────────────────────────────
   COMMUNITY DISCOURSE & BOOK CLUBS INTERACTIVE PAGE
   ────────────────────────────────────────────────────────── */

const DISCOURSE_DB_KEY = 'betterreads_discourse';
const CLUBS_DB_KEY = 'betterreads_clubs';
const POLL_VOTES_KEY = 'betterreads_poll_votes';

const defaultThreads = [
  {
    id: 't1',
    user: 'luna.reads',
    avatar: '🌙',
    color: 'var(--lavender)',
    time: '2 hours ago',
    tag: 'Fantasy',
    title: 'The ending of Piranesi had me SOBBING — anyone else?',
    preview: 'Okay so I just finished and the moment he realises who he really is absolutely destroyed me...',
    likes: 142,
    replies: 3,
    repliesList: [
      { user: 'readergirl', avatar: '📚', color: 'var(--blush)', time: '1 hour ago', content: 'Yes! The transition from the labyrinth to the real world was so melancholic.' },
      { user: 'lofi_study', avatar: '☕', color: 'var(--peach)', time: '45 mins ago', content: 'I have read it three times now. The House is beautiful and kind.' },
      { user: 'flora.books', avatar: '🌿', color: 'var(--sage)', time: '10 mins ago', content: 'I wish I could live in that library room honestly.' }
    ]
  },
  {
    id: 't2',
    user: 'bookish.flora',
    avatar: '☀️',
    color: 'var(--peach)',
    time: '5 hours ago',
    tag: 'AMA',
    title: '📅 June Book Club — Voting is OPEN!',
    preview: 'The shortlist for June community pick is here! We have Intermezzo, James, and The Women...',
    likes: 287,
    replies: 2,
    repliesList: [
      { user: 'thrillerfan', avatar: '🕵️', color: 'var(--sage)', time: '4 hours ago', content: 'Voted for Intermezzo! Sally Rooney is amazing.' },
      { user: 'clover_reads', avatar: '☘️', color: 'var(--lavender)', time: '3 hours ago', content: 'Hoping James wins, Everett is such an incredible writer.' }
    ]
  },
  {
    id: 't3',
    user: 'verified ✦ Olivie Blake',
    avatar: '🌿',
    color: 'var(--sage)',
    time: 'Yesterday',
    tag: 'Author',
    title: "I'm Olivie Blake — AMA about The Atlas Six",
    preview: 'Hi everyone! So excited to be here on BetterReads. I\'ll be answering questions for the next 2 hours...',
    likes: 1205,
    replies: 1,
    repliesList: [
      { user: 'atlas_stan', avatar: '🔮', color: 'var(--blush)', time: 'Yesterday', content: 'Is Libby going to get her own spin-off or is the trilogy the absolute end of this world?' }
    ]
  },
  {
    id: 't4',
    user: 'readingwithrose',
    avatar: '🌸',
    color: 'var(--blush)',
    time: '3 days ago',
    tag: 'Challenge',
    title: '✅ Challenge complete! DNF\'d a book guilt-free',
    preview: 'I\'ve been holding onto Moby-Dick for three years out of guilt. This month gave me permission to let it go.',
    likes: 891,
    replies: 2,
    repliesList: [
      { user: 'cozy_nook', avatar: '🍂', color: 'var(--peach)', time: '2 days ago', content: 'Good for you! Life is too short to read books we do not enjoy.' },
      { user: 'ishmael', avatar: '🐳', color: 'var(--sage)', time: '1 day ago', content: 'Haha, as a Moby-Dick lover, I understand! It is a heavy journey.' }
    ]
  }
];

const defaultClubs = [
  { id: 'c1', name: 'The Midnight Readers', desc: 'A cozy club for fantasy lovers. Currently reading: The Atlas Six.', members: 420 },
  { id: 'c2', name: 'Non-Fiction November', desc: 'We read one non-fiction book every month and discuss our learnings.', members: 156 },
  { id: 'c3', name: 'Romance & Roses', desc: 'Swoon-worthy romance books only! Join us for weekly deep dives.', members: 890 }
];

const defaultPollVotes = {
  tea: 84,
  coffee: 112,
  cocoa: 67,
  cider: 38
};

const activityTemplates = [
  { text: "<strong>{user}</strong> completed reading <em>{book}</em>!", icon: "✦" },
  { text: "<strong>{user}</strong> added <em>{book}</em> to their TBR shelf.", icon: "✦" },
  { text: "<strong>{user}</strong> rated <em>{book}</em> <strong>{rating}★</strong>.", icon: "✦" },
  { text: "<strong>{user}</strong> joined the book club <strong>{club}</strong>.", icon: "✦" },
  { text: "<strong>{user}</strong> started a discussion on <em>{book}</em>.", icon: "✦" }
];

const mockUsers = [
  "luna.reads", "bookish.flora", "readingwithrose", "lofi_study",
  "cozy_nook", "huckleberry", "alice_in_books", "shelf_helper",
  "pixel_reader", "chrysanthemum", "tea_and_tales", "moss_gatherer"
];

const mockBooks = [
  "Piranesi", "The Atlas Six", "Intermezzo", "Moby-Dick",
  "A Court of Thorns and Roses", "Normal People", "The Hobbit",
  "The Night Circus", "Book Lovers", "Tomorrow, and Tomorrow, and Tomorrow"
];

const mockClubs = [
  "The Midnight Readers", "Non-Fiction November", "Romance & Roses", "Cottagecore Bookworms"
];

let activities = [];

function initDiscourseDB() {
  let threads = localStorage.getItem(DISCOURSE_DB_KEY);
  if (threads) {
    try {
      const parsed = JSON.parse(threads);
      if (parsed.length > 0 && !parsed[0].repliesList) {
        localStorage.removeItem(DISCOURSE_DB_KEY);
      }
    } catch (e) {
      localStorage.removeItem(DISCOURSE_DB_KEY);
    }
  }
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

function getPollVotes() {
  const data = localStorage.getItem(POLL_VOTES_KEY);
  if (data) {
    try { return JSON.parse(data); } catch(e) {}
  }
  return defaultPollVotes;
}
function savePollVotes(votes) { localStorage.setItem(POLL_VOTES_KEY, JSON.stringify(votes)); }

/* ──────────────────────────────────────────────────────────
   FLOATING HEART INTERACTION
   ────────────────────────────────────────────────────────── */
function spawnHeart(e) {
  const heart = document.createElement('div');
  heart.className = 'floating-heart';
  heart.textContent = '❤️';
  const x = e.clientX || e.pageX;
  const y = e.clientY || e.pageY;
  
  heart.style.left = `${x}px`;
  heart.style.top = `${y}px`;
  document.body.appendChild(heart);
  
  setTimeout(() => { heart.remove(); }, 800);
}

/* ──────────────────────────────────────────────────────────
   COMMUNITY RENDERING
   ────────────────────────────────────────────────────────── */
export function renderDiscourse() {
  const grid = document.getElementById('discourse-grid');
  if (!grid) return;
  const threads = getDiscourse();
  grid.innerHTML = '';

  threads.forEach(t => {
    const card = document.createElement('div');
    card.className = 'thread-card reveal';
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
          <div class="thread-stat btn-comment" data-id="${t.id}" style="cursor:pointer;">💬 <span>${t.replies} replies</span></div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // Attach card click triggers to open replies
  grid.querySelectorAll('.thread-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-like')) return;
      const likeBtn = card.querySelector('.btn-like');
      if (likeBtn) openReplyModal(likeBtn.dataset.id);
    });
  });

  // Attach like listeners
  grid.querySelectorAll('.btn-like').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      spawnHeart(e);
      const id = btn.dataset.id;
      const db = getDiscourse();
      const thread = db.find(x => x.id === id);
      if (thread) {
        thread.likes += 1;
        saveDiscourse(db);
        btn.querySelector('span').textContent = thread.likes;
        btn.style.transform = 'scale(1.3)';
        setTimeout(() => btn.style.transform = 'scale(1)', 200);
      }
    });
  });
}

export function renderClubs() {
  const grid = document.getElementById('clubs-grid');
  if (!grid) return;
  const clubs = getClubs();
  grid.innerHTML = '';

  clubs.forEach(c => {
    const joined = localStorage.getItem('joined_club_' + c.id);
    const btnText = joined ? '✓ Joined' : 'Join Club';
    const btnStyle = joined ? 'background: var(--sage); color: #2d5a2d; border: none;' : '';

    const card = document.createElement('div');
    card.className = 'thread-card reveal';
    card.innerHTML = `
      <div class="thread-header">
        <div class="thread-avatar" style="background:var(--peach);display:flex;align-items:center;justify-content:center;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--ink)" stroke-width="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        </div>
        <div class="thread-meta">
          <div class="thread-user" style="font-family:'Pixel Operator', monospace; font-size:1.1rem; font-weight:700;">${c.name}</div>
          <div class="thread-time">${c.members} members</div>
        </div>
      </div>
      <div class="thread-preview" style="margin-top: 0.25rem;">${c.desc}</div>
      <div class="thread-footer" style="justify-content: flex-end; margin-top: 0.5rem;">
        <button class="btn btn-secondary btn-join-club" data-id="${c.id}" style="${btnStyle} padding: 0.4rem 1.2rem; font-size: 0.8rem;">${btnText}</button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll('.btn-join-club').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.dataset.id;
      const isJoined = localStorage.getItem('joined_club_' + id);
      const db = getClubs();
      const club = db.find(x => x.id === id);

      if (!isJoined) {
        localStorage.setItem('joined_club_' + id, 'true');
        if (club) { club.members += 1; saveClubs(db); }
      } else {
        localStorage.removeItem('joined_club_' + id);
        if (club) { club.members -= 1; saveClubs(db); }
      }
      renderClubs();
    });
  });
}

/* ──────────────────────────────────────────────────────────
   REPLY MODAL SYSTEM
   ────────────────────────────────────────────────────────── */
const replyModal = document.getElementById('reply-modal');
const replyCloseBtn = document.getElementById('reply-close-btn');
const replyModalBody = document.getElementById('reply-modal-body');

export function openReplyModal(threadId) {
  if (!replyModal || !replyModalBody) return;
  const db = getDiscourse();
  const thread = db.find(x => x.id === threadId);
  if (!thread) return;

  replyModal.classList.add('active');
  renderReplyModalBody(thread);
}

function renderReplyModalBody(thread) {
  if (!replyModalBody) return;
  const replies = thread.repliesList || [];
  
  let repliesHTML = '';
  if (replies.length === 0) {
    repliesHTML = `<p style="text-align: center; color: var(--ink-light); font-size: 0.85rem; margin: 1.5rem 0;">No comments yet. Start the conversation!</p>`;
  } else {
    repliesHTML = replies.map(r => `
      <div class="reply-comment-card">
        <div class="thread-header" style="margin-bottom:0.4rem;">
          <div class="thread-avatar" style="background:${r.color || 'var(--blush)'};display:flex;align-items:center;justify-content:center;font-weight:bold;color:var(--ink);font-size:0.75rem;">
            ${r.avatar || (r.user ? r.user.charAt(0).toUpperCase() : 'U')}
          </div>
          <div class="thread-meta">
            <div class="thread-user" style="font-size:0.8rem; font-weight:600;">${r.user}</div>
            <div class="thread-time" style="font-size:0.65rem; color:var(--ink-light);">${r.time}</div>
          </div>
        </div>
        <div class="reply-comment-content">${escapeHTML(r.content)}</div>
      </div>
    `).join('');
  }

  replyModalBody.innerHTML = `
    <div class="reply-original-thread">
      <div class="thread-header" style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.65rem;">
        <div class="thread-avatar" style="width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.9rem; flex-shrink:0; background:${thread.color}">${thread.avatar}</div>
        <div class="thread-meta" style="flex:1;">
          <div class="thread-user" style="font-size:0.82rem; font-weight:600; color:var(--ink);">${thread.user}</div>
          <div class="thread-time" style="font-size:0.68rem; color:var(--ink-light);">${thread.time}</div>
        </div>
        <div class="badge" style="background: ${thread.color}; color: #333; opacity: 0.9;">${thread.tag}</div>
      </div>
      <div class="thread-title" style="font-family:'Pixel Operator', monospace; font-size: 1.25rem; margin: 0.5rem 0; font-weight:700; color:var(--ink);">${thread.title}</div>
      <div class="thread-preview" style="font-size: 0.88rem; color: var(--ink-light); line-height:1.6; margin-bottom: 0;">${thread.preview}</div>
    </div>

    <div class="reply-section-title">Comments (${thread.replies})</div>
    
    <div class="reply-list">
      ${repliesHTML}
    </div>

    <div class="reply-composer">
      <h4 style="font-size: 0.85rem; margin-bottom: 0.25rem; font-weight:600; color:var(--ink);">Share a thought</h4>
      <textarea id="reply-input-text" placeholder="Write your reply... Be cozy, be kind." rows="2"></textarea>
      <div class="reply-composer-footer">
        <button class="btn btn-primary" id="btn-submit-reply" style="padding: 0.4rem 1.2rem; font-size: 0.8rem; background:var(--dusty-rose); color:white; border-radius:100px;">Post Reply</button>
      </div>
    </div>
  `;

  // Attach post reply listener
  const btnSubmitReply = document.getElementById('btn-submit-reply');
  if (btnSubmitReply) {
    btnSubmitReply.addEventListener('click', () => {
      const textInput = document.getElementById('reply-input-text');
      const text = textInput ? textInput.value.trim() : '';
      if (!text) return;

      // Get current profile
      const userProfileStr = localStorage.getItem('betterreads_user_profile') || '{}';
      let username = 'you.reading';
      let avatar = '🌸';
      let userColor = 'var(--blush)';
      try {
        const profile = JSON.parse(userProfileStr);
        if (profile.username) username = profile.username;
        if (profile.avatar) avatar = profile.avatar;
      } catch (e) {}

      const db = getDiscourse();
      const targetThread = db.find(x => x.id === thread.id);
      if (targetThread) {
        if (!targetThread.repliesList) targetThread.repliesList = [];
        targetThread.repliesList.push({
          user: username,
          avatar: avatar,
          color: userColor,
          time: 'Just now',
          content: text
        });
        targetThread.replies += 1;
        saveDiscourse(db);

        if (textInput) textInput.value = '';

        renderReplyModalBody(targetThread);
        renderDiscourse();
      }
    });
  }
}

/* ──────────────────────────────────────────────────────────
   POLL COMPONENT
   ────────────────────────────────────────────────────────── */
export function initPoll() {
  const container = document.getElementById('poll-options-container');
  if (!container) return;

  const votedVal = localStorage.getItem('betterreads_voted_option');
  const votes = getPollVotes();
  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

  const buttons = container.querySelectorAll('.poll-option-btn');
  buttons.forEach(btn => {
    const val = btn.dataset.val;
    const count = votes[val] || 0;
    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    
    const fill = btn.querySelector('.poll-progress-fill');
    const pctSpan = btn.querySelector('.poll-pct');
    
    if (votedVal) {
      btn.disabled = true;
      if (votedVal === val) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
      if (fill) fill.style.width = `${pct}%`;
      if (pctSpan) pctSpan.textContent = `${pct}%`;
    } else {
      btn.disabled = false;
      btn.classList.remove('selected');
      if (fill) fill.style.width = '0%';
      if (pctSpan) pctSpan.textContent = '';
      
      // Clear old listeners by replacement
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      newBtn.addEventListener('click', () => {
        localStorage.setItem('betterreads_voted_option', val);
        const currentVotes = getPollVotes();
        currentVotes[val] += 1;
        savePollVotes(currentVotes);
        initPoll();
      });
    }
  });
}

/* ──────────────────────────────────────────────────────────
   LIVE ACTIVITY FEED COMPONENT
   ────────────────────────────────────────────────────────── */
function generateRandomActivity() {
  const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
  const template = activityTemplates[Math.floor(Math.random() * activityTemplates.length)];
  
  const text = template.text
    .replace('{user}', user)
    .replace('{book}', mockBooks[Math.floor(Math.random() * mockBooks.length)])
    .replace('{rating}', (Math.floor(Math.random() * 2) + 4) + (Math.random() > 0.5 ? '.5' : ''))
    .replace('{club}', mockClubs[Math.floor(Math.random() * mockClubs.length)]);
    
  return {
    id: 'act-' + Date.now(),
    icon: template.icon,
    text: text,
    time: 'Just now'
  };
}

export function initActivityFeed() {
  const list = document.getElementById('activity-feed-list');
  if (!list) return;

  if (activities.length === 0) {
    for (let i = 0; i < 4; i++) {
      const item = generateRandomActivity();
      const times = ['2m ago', '5m ago', '12m ago', '20m ago'];
      item.time = times[i];
      activities.push(item);
    }
  }

  renderActivityList();
  startLiveActivityInterval();
}

function renderActivityList() {
  const list = document.getElementById('activity-feed-list');
  if (!list) return;

  list.innerHTML = activities.map(act => `
    <div class="activity-item">
      <div class="activity-icon">${act.icon}</div>
      <div class="activity-text">${act.text}</div>
      <div class="activity-time">${act.time}</div>
    </div>
  `).join('');
}

function startLiveActivityInterval() {
  if (window.betterReadsActivityInterval) {
    clearInterval(window.betterReadsActivityInterval);
  }

  window.betterReadsActivityInterval = setInterval(() => {
    const list = document.getElementById('activity-feed-list');
    if (!list) return; // Only update if element is in view

    activities.forEach(act => {
      if (act.time === 'Just now') act.time = '1m ago';
      else if (act.time === '1m ago') act.time = '2m ago';
    });

    const newAct = generateRandomActivity();
    activities.unshift(newAct);

    if (activities.length > 8) {
      activities.pop();
    }

    renderActivityList();
  }, 14000);
}

/* ──────────────────────────────────────────────────────────
   BOOTSTRAP INITIALIZATION
   ────────────────────────────────────────────────────────── */
export function initDiscourse() {
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
      if (viewThreads) viewThreads.style.display = 'block';
      if (viewClubs) viewClubs.style.display = 'none';
    });

    btnTabClubs.addEventListener('click', () => {
      btnTabClubs.className = 'btn btn-primary';
      btnTabThreads.className = 'btn btn-secondary';
      if (viewClubs) viewClubs.style.display = 'block';
      if (viewThreads) viewThreads.style.display = 'none';
    });
  }

  // Create Thread listener
  const btnCreateThread = document.getElementById('btn-create-thread');
  if (btnCreateThread) {
    btnCreateThread.addEventListener('click', () => {
      const titleInput = document.getElementById('new-thread-title');
      const contentInput = document.getElementById('new-thread-content');
      const tagSelect = document.getElementById('new-thread-tag');

      const title = titleInput ? titleInput.value.trim() : '';
      const content = contentInput ? contentInput.value.trim() : '';
      const tag = tagSelect ? tagSelect.value : 'Discussion';

      if (!title || !content) {
        alert('Please fill out both title and content!');
        return;
      }

      // Read current username
      const userProfileStr = localStorage.getItem('betterreads_user_profile') || '{}';
      let username = 'you.reading';
      let avatar = '🌸';
      try {
        const profile = JSON.parse(userProfileStr);
        if (profile.username) username = profile.username;
        if (profile.avatar) avatar = profile.avatar;
      } catch (e) {}

      const db = getDiscourse();
      db.unshift({
        id: 't' + Date.now(),
        user: username,
        avatar: avatar,
        color: 'var(--blush)',
        time: 'Just now',
        tag: tag,
        title: title,
        preview: content,
        likes: 0,
        replies: 0,
        repliesList: []
      });
      saveDiscourse(db);

      if (titleInput) titleInput.value = '';
      if (contentInput) contentInput.value = '';
      
      renderDiscourse();
    });
  }

  // Create Club listener
  const btnCreateClub = document.getElementById('btn-create-club');
  if (btnCreateClub) {
    btnCreateClub.addEventListener('click', () => {
      const nameInput = document.getElementById('new-club-name');
      const descInput = document.getElementById('new-club-desc');

      const name = nameInput ? nameInput.value.trim() : '';
      const desc = descInput ? descInput.value.trim() : '';

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

      if (nameInput) nameInput.value = '';
      if (descInput) descInput.value = '';
      
      renderClubs();
    });
  }

  // Set up listeners for close buttons
  if (replyCloseBtn) {
    replyCloseBtn.addEventListener('click', () => {
      if (replyModal) replyModal.classList.remove('active');
    });
  }

  // Set up refresh on page open event
  document.addEventListener('betterreads-discourse-opened', () => {
    renderDiscourse();
    renderClubs();
    initPoll();
    initActivityFeed();
  });

  // Initial renders
  renderDiscourse();
  renderClubs();
  initPoll();
  initActivityFeed();
}
