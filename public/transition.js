document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('page-ready');

  const overlay = document.createElement('div');
  overlay.className = 'page-overlay';
  document.body.appendChild(overlay);

  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const isLocal = href.startsWith('/') || href.startsWith('./') || href.startsWith('../') || href.startsWith('#') === false;

    if (!isLocal || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    link.addEventListener('click', (event) => {
      if (link.getAttribute('target') === '_blank') return;
      if (href.startsWith('#')) return;

      event.preventDefault();
      document.body.classList.add('page-transitioning');
      window.setTimeout(() => {
        window.location.href = link.href;
      }, 280);
    });
  });
});
