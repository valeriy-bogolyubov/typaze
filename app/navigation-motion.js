// Анимация переходов между разделами.
export function createNavigationMotion({ nav, views, reducedMotion = () => false }) {
  const order = Object.keys(views),
    media = matchMedia('(prefers-reduced-motion: reduce)');
  const marker = document.createElement('span');
  marker.className = 'navigation-marker';
  marker.setAttribute('aria-hidden', 'true');
  nav.append(marker);
  let active = null,
    current = null,
    markerAnimation = null,
    contentAnimation = null,
    resizeFrame = null;
  const easing = 'cubic-bezier(.16,1,.3,1)';
  const reduced = () => media.matches || reducedMotion();
  function stopContent() {
    contentAnimation?.cancel();
    contentAnimation = null;
  }
  function positionMarker(animate = false) {
    const link = nav.querySelector(`[data-route="${active}"]`);
    if (!link) return;
    const from = getComputedStyle(marker).transform;
    markerAnimation?.cancel();
    markerAnimation = null;
    const offset = link.getBoundingClientRect().left - nav.getBoundingClientRect().left;
    const to = `translateX(${offset}px)`;
    marker.style.transform = to;
    nav.dataset.motionReady = 'true';
    if (animate && !reduced() && typeof marker.animate === 'function') {
      markerAnimation = marker.animate([{ transform: from }, { transform: to }], {
        duration: 220,
        easing,
      });
    }
  }
  function setActive(route) {
    if (route === active) return;
    const previous = active;
    active = route;
    positionMarker(previous !== null);
  }
  function show(route, { resetScroll = false } = {}) {
    const target = views[route];
    if (!target) return;
    const previous = current,
      changed = previous !== route;
    if (changed) stopContent();
    for (const [name, view] of Object.entries(views)) view.hidden = name !== route;
    current = route;
    // Сбрасываем прокрутку при смене раздела.
    if (changed || resetScroll) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (!changed) return;
    if (previous === null || reduced() || typeof target.animate !== 'function') return;
    const direction = Math.sign(order.indexOf(route) - order.indexOf(previous));
    contentAnimation = target.animate(
      [
        { opacity: 0.72, transform: `translateX(${direction * 10}px)` },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 180, easing },
    );
  }
  function syncPreferences() {
    if (reduced()) {
      stopContent();
      markerAnimation?.cancel();
      markerAnimation = null;
    }
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => positionMarker(false));
  }
  window.addEventListener('resize', syncPreferences);
  media.addEventListener('change', syncPreferences);
  return { show, setActive, stopContent, syncPreferences };
}
