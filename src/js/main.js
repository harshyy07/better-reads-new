import '../../css/style.css';
import { initAuth } from './auth.js';
import { initRouter } from './router.js';
import { initUI } from './ui.js';
import { initDiscover } from './api.js';
import { initSpotify } from './spotify.js';
import { initReviews } from './details.js';

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initRouter();
  initUI();
  initDiscover();
  initSpotify();
  initReviews();
});
