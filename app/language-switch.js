// Переключаем язык без пересоздания кнопок.
export function createLanguageSwitches({ reducedMotion = () => false }) {
  const controls = new Map(),
    media = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = null;
  function position(control, animate) {
    const { root, marker } = control;
    if (!root.isConnected || !root.getBoundingClientRect().width) return;
    const selected = root.querySelector('[aria-checked=true]');
    if (!selected) return;
    const from = getComputedStyle(marker).transform;
    control.animation?.cancel();
    control.animation = null;
    const rect = selected.getBoundingClientRect(),
      parent = root.getBoundingClientRect();
    const to = `translateX(${rect.left - parent.left}px) scaleX(${rect.width})`;
    marker.style.transform = to;
    root.dataset.languageMotion = 'true';
    control.needsLayout = false;
    if (animate && !media.matches && !reducedMotion() && typeof marker.animate === 'function')
      control.animation = marker.animate([{ transform: from }, { transform: to }], {
        duration: 180,
        easing: 'cubic-bezier(.16,1,.3,1)',
      });
  }
  function mount(host, { language, disabled = false, history = false, label }) {
    let control = controls.get(host.id);
    if (!control) {
      const root = document.createElement('div');
      root.className = `${history ? 'progress-choices' : 'text-languages'} language-switch`;
      root.role = 'radiogroup';
      for (const value of ['ru', 'en']) {
        const button = document.createElement('button');
        button.type = 'button';
        button.role = 'radio';
        button.textContent = value === 'ru' ? 'Русский' : 'English';
        if (history) {
          button.dataset.progressKey = 'language';
          button.dataset.value = value;
        } else button.dataset.textLanguage = value;
        root.append(button);
      }
      const marker = document.createElement('span');
      marker.className = 'language-marker';
      marker.setAttribute('aria-hidden', 'true');
      root.append(marker);
      control = { root, marker, language: null, animation: null, needsLayout: true };
      controls.set(host.id, control);
    }
    const moved = control.root.parentElement !== host,
      previous = control.language;
    if (moved) host.replaceChildren(control.root);
    control.root.setAttribute('aria-label', label);
    control.language = language;
    for (const button of control.root.querySelectorAll('button')) {
      const selected = (button.dataset.textLanguage || button.dataset.value) === language;
      button.setAttribute('aria-checked', String(selected));
      button.tabIndex = selected ? 0 : -1;
      button.disabled = disabled;
    }
    if (moved || previous !== language || control.needsLayout)
      position(control, previous !== null && previous !== language);
  }
  function syncPreferences() {
    for (const control of controls.values()) {
      control.needsLayout = true;
      if (media.matches || reducedMotion()) {
        control.animation?.cancel();
        control.animation = null;
      }
    }
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      for (const control of controls.values()) position(control, false);
    });
  }
  window.addEventListener('resize', syncPreferences);
  media.addEventListener('change', syncPreferences);
  return { mount, syncPreferences };
}
