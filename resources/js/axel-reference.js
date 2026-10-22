(() => {
  const doc = document;
  const body = doc.body;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const openButton = doc.querySelector('[data-axref-menu-open]');
  const closeButton = doc.querySelector('[data-axref-menu-close]');
  const menu = doc.querySelector('[data-axref-menu]');
  let previousFocus = null;

  if (!body || !menu || !openButton) return;

  const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const setMenu = (isOpen) => {
    openButton.setAttribute('aria-expanded', String(isOpen));
    menu.setAttribute('aria-hidden', String(!isOpen));
    menu.inert = !isOpen;
    body.classList.toggle('axref-menu-open', isOpen);
    menu.classList.toggle('is-open', isOpen);
    if (isOpen) {
      previousFocus = doc.activeElement;
      window.setTimeout(() => menu.querySelector('a[href]')?.focus(), reducedMotion ? 0 : 80);
    } else if (previousFocus instanceof HTMLElement) {
      previousFocus.focus();
    }
  };

  openButton.addEventListener('click', () => setMenu(true));
  closeButton?.addEventListener('click', () => setMenu(false));
  menu.addEventListener('click', (event) => {
    if (event.target === menu) setMenu(false);
  });
  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setMenu(false);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...menu.querySelectorAll(focusableSelector)].filter((node) => node.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && doc.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && doc.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false);
  });
  menu.querySelectorAll('a[href]').forEach((link) => link.addEventListener('click', () => setMenu(false)));

  if (reducedMotion) return;
  doc.documentElement.classList.add('axref-js');

  const revealItems = [...doc.querySelectorAll('.axref-reveal')];
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));

    const chapters = [...doc.querySelectorAll('[data-axel-chapter]')];
    const count = doc.querySelector('[data-axref-count]');
    const current = doc.querySelector('[data-axref-current]');
    const steps = [...doc.querySelectorAll('[data-axref-step]')];
    if (chapters.length && count && current) {
      const chapterRatios = new Map();
      const chapterObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => chapterRatios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0));
        const selected = [...chapterRatios.entries()].sort((a, b) => b[1] - a[1])[0];
        if (!selected || selected[1] <= 0) return;
        const index = chapters.indexOf(selected[0]);
        if (index < 0) return;
        count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')}`;
        current.textContent = selected[0].dataset.chapterLabel || '';
        steps.forEach((step, stepIndex) => {
          const active = stepIndex === index;
          step.classList.toggle('is-active', active);
          if (active) step.setAttribute('aria-current', 'step');
          else step.removeAttribute('aria-current');
        });
      }, { threshold: [0.12, 0.25, 0.4, 0.6], rootMargin: '-18% 0px -22% 0px' });
      chapters.forEach((chapter) => chapterObserver.observe(chapter));
    }

    const aboutSections = [...doc.querySelectorAll('.axel-about-hero, .axel-about-body, .axel-contact')];
    const routeCount = doc.querySelector('[data-axref-route-count]');
    if (body.classList.contains('axel-about-shell') && routeCount && aboutSections.length) {
      const aboutObserver = new IntersectionObserver((entries) => {
        const currentEntry = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!currentEntry) return;
        const index = aboutSections.indexOf(currentEntry.target) + 1;
        routeCount.textContent = `${String(index).padStart(2, '0')} / ${String(aboutSections.length).padStart(2, '0')}`;
      }, { threshold: [0.2, 0.45], rootMargin: '-15% 0px -20% 0px' });
      aboutSections.forEach((section) => aboutObserver.observe(section));
    }

    const imageTrack = doc.querySelector('#images-gallery');
    if (imageTrack && routeCount) {
      const images = [...imageTrack.children];
      const total = images.length;
      const updateImageCount = () => {
        if (!total) return;
        const viewportMid = window.innerWidth / 2;
        let closest = 0;
        let distance = Number.POSITIVE_INFINITY;
        images.forEach((image, index) => {
          const box = image.getBoundingClientRect();
          const nextDistance = Math.abs((box.left + box.right) / 2 - viewportMid);
          if (nextDistance < distance) { distance = nextDistance; closest = index; }
        });
        routeCount.textContent = `${String(closest + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
      };
      window.addEventListener('scroll', updateImageCount, { passive: true });
      window.addEventListener('resize', updateImageCount, { passive: true });
      updateImageCount();
    }

    const albumTrack = doc.querySelector('[data-horizontal-track]');
    if (body.classList.contains('axel-works-shell') && albumTrack && routeCount) {
      const cards = [...albumTrack.querySelectorAll('.axel-work-card')];
      const updateWorkCount = () => {
        if (!cards.length) return;
        const center = albumTrack.getBoundingClientRect().left + albumTrack.clientWidth / 2;
        let closest = 0;
        let distance = Number.POSITIVE_INFINITY;
        cards.forEach((card, index) => {
          const box = card.getBoundingClientRect();
          const nextDistance = Math.abs((box.left + box.right) / 2 - center);
          if (nextDistance < distance) { distance = nextDistance; closest = index; }
        });
        routeCount.textContent = `${String(closest + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
      };
      albumTrack.addEventListener('scroll', updateWorkCount, { passive: true });
      window.addEventListener('resize', updateWorkCount, { passive: true });
      updateWorkCount();
    }
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const parallaxPhotos = [...doc.querySelectorAll('.axref-photo img')];
  if (parallaxPhotos.length) {
    let scheduled = false;
    const updateParallax = () => {
      const viewport = window.innerHeight || 1;
      parallaxPhotos.forEach((image, index) => {
        const bounds = image.parentElement.getBoundingClientRect();
        const offset = Math.max(-11, Math.min(11, ((bounds.top + bounds.height / 2 - viewport / 2) / viewport) * (index % 2 ? 8 : -8)));
        image.style.setProperty('--axref-shift', `${offset}px`);
      });
      scheduled = false;
    };
    window.addEventListener('scroll', () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(updateParallax);
    }, { passive: true });
    window.addEventListener('resize', updateParallax, { passive: true });
    updateParallax();
  }
})();
