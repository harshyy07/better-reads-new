# BetterReads (Version 1) 📚✨

BetterReads is a beautiful, cozy, and highly interactive Single Page Application (SPA) designed as a modern, aesthetic alternative to Goodreads. It leverages a custom vanilla design system inspired by cottagecore and lofi aesthetics, offering a seamless and gamified reading tracker experience.

## 🛠️ Technology Stack
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+) bundled with **Vite**. No heavy UI frameworks.
- **Backend & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Google OAuth, Magic Links / OTP) with `localStorage` as a fallback cache for unauthenticated users.
- **Data Source**: [OpenLibrary API](https://openlibrary.org/dev/docs/api/search) (Real-time, rate-limit-friendly book fetching).
- **Architecture**: Custom Hash-based SPA Router (`#home`, `#library`, `#discover`, `#stats`, `#discourse`, `#rating`, `#book-<id>`).
- **Typography**: Custom `Pixel Operator` bitmap font via `@font-face` for the Stats/Wrapped page.

## 📂 File Structure
```text
/
├── index.html              # Main SPA container holding all #page-section elements
├── vite.config.js          # Vite build configuration
├── supabase_schema.sql     # Supabase DB schema (profiles + shelves tables)
├── assets/
│   └── fonts/
│       └── PixelOperator.ttf  # Custom pixel font for the Stats page
├── css/
│   └── style.css           # Design system, variables, animations, and responsive UI
└── src/js/
    ├── main.js             # Entry point — bootstraps auth, router, discover & UI
    ├── store.js            # Global state, Supabase client, shelf sync (cloud + local)
    ├── auth.js             # Supabase Auth: Google OAuth, Magic Link OTP, profile setup
    ├── router.js           # Hash-based SPA router and page navigation
    ├── api.js              # OpenLibrary API fetching and book caching
    ├── db.js               # Legacy local DB helpers and library/stats rendering
    ├── ui.js               # Core UI rendering: library, stats, discourse, book clubs
    ├── ui2.js              # Additional UI helpers and misc interactions
    ├── spotify.js          # Simulated lofi/ambient music player logic
    └── details.js          # Book details page rendering
```

## ✨ Core Features

### 1. 🏡 Gamified Library Room
- An interactive, 2D "room" interface with absolute-positioned, clickable hotspots over a sketched background.
- Clicking a specific shelf instantly opens the user's `TBR`, `Currently Reading`, `Completed`, or `DNF` shelves.
- Dynamically renders books fetched from OpenLibrary and synced per-user from Supabase.
- Remove books from any shelf via the inline `−` button on each book card.

### 2. 🌌 Infinite Discover & Search
- **Live Search**: Debounced search bar that queries the OpenLibrary API to fetch real book data instantly.
- **Mood & Genre Filters**: Quick-filter pill buttons for traditional genres (Fantasy, Sci-Fi, Romance) and aesthetic moods (Cozy, Dark Academia, Heartbreaking, Ethereal).
- **Infinite Scrolling**: Automatically loads more books as you scroll down the page.
- **One-Click Add**: "+ TBR" buttons on every discovered book that immediately injects the book into your library.
- **Fixed Initial Load**: The Discover page now correctly pre-loads a curated list of books on first visit.

### 3. 💬 Interactive Discourse & Book Clubs
- **Community Threads**: A fully localized forum where users can create new discussion threads, select spoiler tags, and read preview snippets.
- **Interactive Upvotes**: Clicking the ❤️ icon on any thread animates and increments the like counter in the local database.
- **Book Clubs**: A dedicated tab where users can browse, join, and create custom book clubs, with dynamic member counts tracking join status.

### 4. ⭐ Fractional Rating System Component
- A highly polished, custom-built fractional star rating widget.
- Supports hovering over the left half or right half of a star to register half-star ratings (e.g., 4.5 stars).
- Includes an animated breakdown bar chart simulating community rating distributions.

### 5. 🎧 Cozy Lofi Player
- An embedded, interactive mini-player widget designed to play ambient reading music.
- Features a simulated tracklist, progress bar, and play/pause toggles to complete the cozy reading nook vibe.

### 6. 📊 Reading Stats (Wrapped)
- A highly shareable, Spotify Wrapped-inspired aesthetic page (`#stats`).
- Automatically calculates and dynamically updates "Books Devoured," "Pages Turned," "Top Vibe (Genre)," and "Reading Streak" from your Completed shelf.
- Redesigned layout uses a responsive `stats-mockup-grid` with floating, hover-animated stat cards.
- Stats cards use the `Pixel Operator` pixel font for a retro-chic Wrapped aesthetic.

### 7. 🔐 Authentication (Supabase)
- **Google OAuth**: One-click sign-in via Google with automatic profile completion for new users.
- **Magic Link / OTP**: Email-based passwordless login via Supabase `signInWithOtp` + `verifyOtp`.
- **Profile Setup**: New users choose a username and emoji avatar (🍵, 📚, 🌙, etc.) on first sign-in.
- Shelf data syncs to Supabase when logged in; falls back to `localStorage` for guests.

### 8. 📖 Book Details Page
- Dedicated `#book-<id>` route rendering a full details view for any book.
- Shows cover art, title, author, description, page count, publish year, and categories.
- Includes the fractional star rating component and Add-to-Shelf action.

## 🎨 Design System & Palette
The app uses a carefully curated, pastel-heavy color palette defined in `style.css` via CSS Variables:

| Variable | Value | Use |
|---|---|---|
| `--cream` | `#fbf3f8` | Page backgrounds |
| `--blush` | `#ffb8d6` | Accent highlights |
| `--sage` | `#a5cfb2` | Positive actions |
| `--lavender` | `#d1a5e1` | Primary brand color |
| `--peach` | `#ffe8d1` | Warm accents |
| `--dusty-rose` | `#e69ab8` | Destructive / remove actions |
| `--ink` | `#5b4165` | Primary text |
| `--ink-light` | `#897092` | Secondary text |
| `--amber` | `#ffedb3` | Warm glows / highlights |

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run the dev server
npm run dev

# Build for production
npm run build
```

## 📈 Recent Updates & Changelog
- **UX Enhancements & Bug Fixes (Latest)**: 
  - **Home & Discover Search Routing**: Integrated the Home page marquee search bar with the Discover page, enabling instant routing, auto-filling the search query, and clearing active filters.
  - **Discover Shelf Operations & Sync**: Implemented toggleable `+ TBR` shelf additions directly on Discover book cards. Custom event listeners synchronize button states in real-time if a book is added or removed elsewhere.
  - **3D Card Hover Effects**: Added a dynamic, smooth 3D tilt hover animation to book cards in the Discover grid.
  - **Filter Pill Toggling**: Enabled deselecting genre and mood filters by clicking active pills again, and automatically clear filters during a text search.
  - **Star Rating Widget Polish**: Fixed event listener accumulation (memory leaks) on book details and main rating components by cloning elements before rebinding. Reset CSS gradient properties properly to resolve fractional star render glitches.
- **Stats Page Overhaul**: Redesigned the Reading Stats page with a responsive `stats-mockup-grid`, floating animated stat cards, and the `Pixel Operator` custom bitmap font for a retro Wrapped aesthetic. Fixed an initial load bug on the Discover page that caused a blank state on first visit.
- **Stats & Discover Refinements**: Updated Stats page layout to match mobile mockup, applied the global color palette, and fixed broken genre tags on the Discover page.
- **Vite Migration & Modularization**: Refactored the entire codebase to use Vite. Split the monolithic script into focused ES modules: `store.js`, `auth.js`, `router.js`, `api.js`, `ui.js`, `ui2.js`, `spotify.js`, `details.js`.
- **Supabase Integration**: Replaced localStorage-only persistence with a full Supabase backend. Shelf data syncs to the cloud for authenticated users and falls back to localStorage for guests.
- **Security Audit & XSS Patch**: Sanitized and escaped all API/user-generated content interpolations to prevent Cross-Site Scripting attacks.
- **Google OAuth & Magic Links**: Integrated Supabase auth with Google OAuth and email OTP login, plus seamless new-profile creation flow.
- **Reading Stats (Wrapped)**: Built a dynamic Reading Stats page calculating real metrics from the user's completed shelf.
- **Mood Filters**: Added aesthetic mood filters (Cozy, Dark Academia, Ethereal, Heartbreaking) alongside genre filters on the Discover page.
- **Lofi Player**: Restored footer styling and added a cozy integrated lofi ambient player.
- **Aesthetic Overhaul**: Implemented a pastel pink/purple palette with custom pixel font support and hand-drawn library buttons.

## 🚀 Future Roadmap (v2 Ideas)
- Add user-to-user replying and nested comment threads in the Discourse tab.
- Integrate the Spotify Web Playback SDK for real, authenticated audio streaming instead of simulated ambient tracks.
- Add reading progress tracking (pages read, percentage complete) per book.
- Social features: follow friends, see their shelves, and share Wrapped stats cards as images.
- PWA support for offline access and home screen installation.
