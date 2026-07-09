     10. SCROLL REVEAL (IntersectionObserver)
     ────────────────────────────────────────────────────────── */
  const revealEls = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => observer.observe(el));


  /* ──────────────────────────────────────────────────────────
     11. ANIMATED COUNTER (Hero stats)
     ────────────────────────────────────────────────────────── */
  const counters = [
    { el: document.getElementById('stat-books'), target: 120, suffix: 'k+' },
    { el: document.getElementById('stat-readers'), target: 48, suffix: 'k+' },
    { el: document.getElementById('stat-reviews'), target: 310, suffix: 'k+' },
  ];

  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const { el, target, suffix } = counters.find(c => c.el === entry.target) || {};
      if (!el) return;
      let current = 0;
      const step = Math.ceil(target / 60);
      const interval = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = `${current}${suffix}`;
        if (current >= target) clearInterval(interval);
      }, 20);
      counterObserver.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => { if (c.el) counterObserver.observe(c.el); });


  /* ──────────────────────────────────────────────────────────
     12. PARALLAX — hero blobs gentle mouse tracking
     ────────────────────────────────────────────────────────── */
  const blob1 = document.querySelector('.hero-blob-1');
  const blob2 = document.querySelector('.hero-blob-2');
  document.addEventListener('mousemove', e => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    if (blob1) blob1.style.transform = `translate(${x}px, ${y}px)`;
    if (blob2) blob2.style.transform = `translate(${-x * 0.7}px, ${-y * 0.7}px)`;
  });


  /* ──────────────────────────────────────────────────────────
     13. BOOK CARD hover — slight 3D tilt
     ────────────────────────────────────────────────────────── */
  document.querySelectorAll('.discover-book-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
      card.style.transform = `translateY(-8px) rotateX(${-y}deg) rotateY(${x}deg)`;
      card.style.transformStyle = 'preserve-3d';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  /* ──────────────────────────────────────────────────────────
