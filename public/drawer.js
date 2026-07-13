const drawerToggle = document.querySelector('.drawer-toggle');
const drawerClose = document.querySelector('.drawer-close');
const drawerBackdrop = document.querySelector('.drawer-backdrop');

function openDrawer() {
  document.body.classList.add('drawer-open');
  document.body.style.overflow = 'hidden';
  document.querySelector('.drawer')?.setAttribute('aria-hidden', 'false');
  drawerToggle?.setAttribute('aria-expanded', 'true');
}

function closeDrawer() {
  document.body.classList.remove('drawer-open');
  document.body.style.overflow = '';
  document.querySelector('.drawer')?.setAttribute('aria-hidden', 'true');
  drawerToggle?.setAttribute('aria-expanded', 'false');
}

if (drawerToggle) {
  drawerToggle.addEventListener('click', openDrawer);
}
if (drawerClose) {
  drawerClose.addEventListener('click', closeDrawer);
}
if (drawerBackdrop) {
  drawerBackdrop.addEventListener('click', closeDrawer);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.classList.contains('drawer-open')) {
    closeDrawer();
  }
});
