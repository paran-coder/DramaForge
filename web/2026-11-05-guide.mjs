const index = document.querySelector('.guide-index');
const entries = [...index.querySelectorAll('a')].map(link => ({
  link,
  section: document.getElementById(link.hash.slice(1)),
}));

let active;
let frame = 0;
function updateCurrentSection() {
  frame = 0;
  const mobile = getComputedStyle(index).flexDirection === 'row';
  const readingLine = mobile ? Math.max(0, index.getBoundingClientRect().bottom) + 38 : 110;
  let current = entries[0];
  for (const entry of entries) {
    if (entry.section.getBoundingClientRect().top > readingLine) break;
    current = entry;
  }

  const page = document.scrollingElement;
  if (page.scrollTop > 0 && page.scrollTop + page.clientHeight >= page.scrollHeight - 2) {
    current = entries.at(-1);
  }
  if (current === active) return;
  active?.link.removeAttribute('aria-current');
  current.link.setAttribute('aria-current', 'location');
  active = current;

  if (mobile) {
    const bounds = index.getBoundingClientRect();
    const link = current.link.getBoundingClientRect();
    if (link.left < bounds.left || link.right > bounds.right) {
      index.scrollLeft += link.left - bounds.left - 18;
    }
  }
}

function scheduleUpdate() {
  if (!frame) frame = requestAnimationFrame(updateCurrentSection);
}
window.addEventListener('scroll', scheduleUpdate, { passive: true });
window.addEventListener('resize', scheduleUpdate);
window.addEventListener('hashchange', scheduleUpdate);
window.addEventListener('pageshow', scheduleUpdate);
scheduleUpdate();
