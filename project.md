# BetterReads (Version 1) 📚✨

BetterReads is a beautiful, cozy, and highly interactive Single Page Application (SPA) designed as a modern, aesthetic alternative to Goodreads. It leverages a custom vanilla design system inspired by cottagecore and lofi aesthetics, offering a seamless and gamified reading tracker experience.

## 🛠️ Technology Stack
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+). No heavy frameworks.
- **Database**: `localStorage` (Client-side persistence for library shelves, discourse threads, and book clubs).
- **Data Source**: [OpenLibrary API](https://openlibrary.org/dev/docs/api/search) (Real-time, rate-limit-friendly book fetching).
- **Architecture**: Custom Hash-based SPA Router (`#home`, `#library`, `#discover`, etc.).

## ✨ Core Features

### 1. 🏡 Gamified Library Room
- An interactive, 2D "room" interface with absolute-positioned, clickable hotspots over a sketched background.
- Clicking a specific shelf in the drawing instantly opens up the user's `TBR` (To Be Read), `Currently Reading`, or `Completed` shelves.
- Dynamically renders books saved in `localStorage` into a clean CSS grid.

### 2. 🌌 Infinite Discover & Search
- **Live Search**: Debounced search bar that queries the OpenLibrary API to fetch real book data instantly.
- **Genre Pills**: Quick-filter buttons (Fantasy, Romance, Sci-Fi) that trigger API queries by subject.
- **Infinite Scrolling**: A "Load More Books ↓" button that handles pagination (`page` and `limit`) to infinitely append new books to the grid.
- **One-Click Add**: "+ TBR" buttons on every discovered book that immediately injects the book into the local `betterreads_db` database.

### 3. 💬 Interactive Discourse & Book Clubs
- **Community Threads**: A fully localized forum where users can create new discussion threads, select spoiler tags, and read preview snippets.
- **Interactive Upvotes**: Clicking the ❤️ icon on any thread animates and increments the like counter in the local database.
- **Book Clubs**: A dedicated tab where users can browse, join, and create custom book clubs, with dynamic member counts tracking join status.

### 4. ⭐ Fractional Rating System Component
- A highly polished, custom-built fractional star rating widget.
- Supports hovering over the left half or right half of a star to register half-star ratings (e.g., 4.5 stars).
- Includes an animated breakdown bar chart simulating community rating distributions.

### 5. 🎧 Cozy Spotify/Lofi Player
- An embedded, interactive mini-player widget designed to play ambient reading music.
- Features a simulated tracklist, progress bar, and play/pause toggles to complete the cozy reading nook vibe.

## 📂 File Structure
```text
/
├── index.html       # The main SPA container holding all #page-section elements
├── css/
│   └── style.css    # Design system, variables, animations, and responsive UI logic
├── js/
│   └── main.js      # SPA routing, API fetching, DOM interactions, and database logic
└── project.md       # Project documentation (You are here!)
```

## 🎨 Design System & Palette
The app uses a carefully curated, pastel-heavy color palette defined in `style.css` via CSS Variables to evoke a warm, welcoming feeling:
- `--cream`: `#FFF8F0`
- `--blush`: `#FADADD`
- `--sage`: `#C8DFC8`
- `--lavender`: `#DDD5F3`
- `--peach`: `#FECBA1`
- `--dusty-rose`: `#E8A598`
- `--ink`: `#3B2F2F`

## 🚀 Future Roadmap (v2 Ideas)
- Implement actual user authentication (Firebase/Supabase).
- Migrate `localStorage` database to a cloud database (Firestore/PostgreSQL) for cross-device syncing.
- Add user-to-user replying and nested comment threads in the Discourse tab.
- Integrate the Spotify Web Playback SDK for real, authenticated audio streaming instead of simulated ambient tracks.
