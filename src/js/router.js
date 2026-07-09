import { renderReadingStats } from './ui.js';
import { renderBookDetails } from './details.js';

export function initRouter() {
  const navbar = document.getElementById('navbar');

  const pages = {
    '': 'page-home',
    '#': 'page-home',
    '#home': 'page-home',
    '#hero': 'page-home',
    '#discover': 'page-discover',
    '#library': 'page-library',
    '#rating': 'page-rating',
    '#discourse': 'page-discourse',
    '#stats': 'page-stats',
    '#cta': 'page-home'
  };

  const navLinksMap = {
    'page-home': 'nav-home',
    'page-discover': 'nav-discover',
    'page-library': 'nav-library',
    'page-discourse': 'nav-discourse',
    'page-stats': 'nav-stats'
  };

  window.showPage = function(hash, scrollTargetId = null) {
    let targetPageId = pages[hash] || 'page-home';
    let bookIdToRender = null;

    if (hash && hash.startsWith('#book-')) {
      targetPageId = 'page-book-details';
      bookIdToRender = hash.replace('#book-', '');
    }

    navbar.classList.remove('nav-open');

    document.querySelectorAll('.page-section').forEach(section => {
      section.classList.remove('active');
    });

    const targetPage = document.getElementById(targetPageId);
    if (targetPage) {
      targetPage.classList.add('active');
      targetPage.scrollTop = 0;
      navbar.classList.toggle('scrolled', targetPage.scrollTop > 40);

      if (bookIdToRender) {
        renderBookDetails(bookIdToRender);
      } else if (targetPageId === 'page-stats') {
        if (typeof renderReadingStats === 'function') renderReadingStats();
      }
    }

    document.querySelectorAll('.nav-links a').forEach(a => {
      a.classList.remove('nav-active');
    });
    const activeNavLinkId = navLinksMap[targetPageId];
    if (activeNavLinkId) {
      const activeNavLink = document.getElementById(activeNavLinkId);
      if (activeNavLink) activeNavLink.classList.add('nav-active');
    }

    if (scrollTargetId) {
      const scrollTarget = document.getElementById(scrollTargetId);
      if (scrollTarget) {
        setTimeout(() => scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    } else if (hash === '#cta') {
      const ctaTarget = document.getElementById('cta');
      if (ctaTarget) {
        setTimeout(() => ctaTarget.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    }
  };

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      e.preventDefault();
      window.showPage(href);
      window.location.hash = href;
    });
  });

  window.addEventListener('hashchange', () => {
    window.showPage(window.location.hash || '#');
  });

  window.showPage(window.location.hash || '#');
}
