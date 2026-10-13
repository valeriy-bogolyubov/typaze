// Списки выбора с управлением с клавиатуры.
export function createDropdowns({ onChoose = () => {} } = {}) {
  const controls = new Map();
  let opened = null,
    active = 0,
    search = '',
    searchTimer;
  const chevron = '<svg viewBox="0 0 12 8" aria-hidden="true"><path d="m2 2 4 4 4-4"/></svg>';
  function enabled(control) {
    return [...control.select.options].filter((option) => !option.disabled);
  }
  function highlight() {
    if (!opened) return;
    const options = enabled(opened);
    opened.list
      .querySelectorAll('[role=option]')
      .forEach((node, index) => node.classList.toggle('is-active', index === active));
    const item = options[active];
    if (item) {
      opened.trigger.setAttribute('aria-activedescendant', `${opened.select.id}-option-${active}`);
      const node = opened.list.children[active],
        list = opened.list;
      if (node.offsetTop < list.scrollTop) list.scrollTop = node.offsetTop;
      else if (node.offsetTop + node.offsetHeight > list.scrollTop + list.clientHeight)
        list.scrollTop = node.offsetTop + node.offsetHeight - list.clientHeight;
    }
  }
  function close({ restore = false } = {}) {
    if (!opened) return;
    const current = opened;
    opened = null;
    search = '';
    clearTimeout(searchTimer);
    current.list.hidden = true;
    current.trigger.setAttribute('aria-expanded', 'false');
    current.trigger.removeAttribute('aria-activedescendant');
    if (restore && current.trigger.isConnected) current.trigger.focus({ preventScroll: true });
  }
  function open(control, edge) {
    if (control.select.disabled) return;
    close();
    opened = control;
    const options = enabled(control);
    active =
      edge === 'last'
        ? options.length - 1
        : Math.max(
            0,
            options.findIndex((option) => option.selected),
          );
    control.wrapper.dataset.side = 'down';
    control.list.hidden = false;
    const rect = control.list.getBoundingClientRect();
    if (
      rect.bottom > window.innerHeight - 16 &&
      control.trigger.getBoundingClientRect().top > rect.height + 16
    )
      control.wrapper.dataset.side = 'up';
    control.trigger.setAttribute('aria-expanded', 'true');
    control.trigger.focus({ preventScroll: true });
    highlight();
  }
  function choose(index) {
    const control = opened,
      option = control && enabled(control)[index];
    if (!option) return;
    close();
    control.select.value = option.value;
    control.select.dispatchEvent(new Event('change', { bubbles: true }));
    refresh();
    onChoose(control.select);
  }
  function refresh() {
    for (const [select, control] of controls)
      if (!select.isConnected) {
        if (opened === control) close();
        controls.delete(select);
      }
    document.querySelectorAll('select').forEach((select) => {
      let control = controls.get(select);
      if (!control) {
        const wrapper = document.createElement('span');
        wrapper.className = 'custom-select';
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.id = `${select.id}-trigger`;
        trigger.className = 'select-trigger';
        trigger.dataset.select = select.id;
        trigger.setAttribute('role', 'combobox');
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-controls', `${select.id}-listbox`);
        const list = document.createElement('span');
        list.id = `${select.id}-listbox`;
        list.className = 'select-list';
        list.role = 'listbox';
        list.hidden = true;
        const label =
          select.getAttribute('aria-label') ||
          [...(select.labels || [])]
            .map((label) => {
              const copy = label.cloneNode(true);
              copy.querySelectorAll('select,.custom-select').forEach((node) => node.remove());
              return copy.textContent.trim();
            })
            .join(' ') ||
          'Выбор';
        trigger.setAttribute('aria-label', label);
        list.setAttribute('aria-label', label);
        select.after(wrapper);
        wrapper.append(trigger, list);
        select.hidden = true;
        select.tabIndex = -1;
        control = { select, wrapper, trigger, list };
        controls.set(select, control);
        trigger.addEventListener('click', () =>
          opened === control ? close({ restore: true }) : open(control),
        );
        trigger.addEventListener('keydown', (event) => {
          if (!opened && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            open(control, event.key === 'ArrowUp' ? 'last' : undefined);
          }
        });
        list.addEventListener('pointerdown', (event) => event.preventDefault());
        list.addEventListener('click', (event) => {
          event.preventDefault();
          const option = event.target.closest('[role=option]');
          if (option) choose(Number(option.dataset.index));
        });
      }
      const { trigger, list } = control;
      const label =
        select.getAttribute('aria-label') ||
        [...(select.labels || [])]
          .map((label) => {
            const copy = label.cloneNode(true);
            copy.querySelectorAll('select,.custom-select').forEach((node) => node.remove());
            return copy.textContent.trim();
          })
          .join(' ') ||
        'Выбор';
      trigger.setAttribute('aria-label', label);
      list.setAttribute('aria-label', label);
      const signature = JSON.stringify([
        select.disabled,
        select.value,
        [...select.options].map((option) => [option.value, option.textContent, option.disabled]),
      ]);
      if (signature === control.signature) return;
      control.signature = signature;
      trigger.disabled = select.disabled;
      trigger.innerHTML = `<span>${select.selectedOptions[0]?.textContent || ''}</span>${chevron}`;
      list.replaceChildren(
        ...enabled(control).map((option, index) => {
          const item = document.createElement('span');
          item.role = 'option';
          item.id = `${select.id}-option-${index}`;
          item.dataset.index = String(index);
          item.setAttribute('aria-selected', String(option.selected));
          const label = document.createElement('span');
          label.textContent = option.textContent;
          item.append(label);
          if (option.selected) {
            const mark = document.createElement('span');
            mark.className = 'option-mark';
            mark.setAttribute('aria-hidden', 'true');
            mark.innerHTML = '<svg viewBox="0 0 16 16"><path d="m3 8 3 3 7-7"/></svg>';
            item.append(mark);
          }
          return item;
        }),
      );
      if (select.disabled && opened === control) close();
    });
  }
  document.addEventListener(
    'keydown',
    (event) => {
      if (!opened) return;
      if (event.key === 'Tab') {
        close();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        close({ restore: true });
        return;
      }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const count = enabled(opened).length;
        if (event.key === 'Enter' || event.key === ' ') {
          choose(active);
          return;
        }
        active =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? count - 1
              : (active + (event.key === 'ArrowDown' ? 1 : -1) + count) % count;
        highlight();
        return;
      }
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        search += event.key.toLocaleLowerCase();
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          search = '';
        }, 600);
        const match = enabled(opened).findIndex((option) =>
          option.textContent.toLocaleLowerCase().startsWith(search),
        );
        if (match >= 0) {
          active = match;
          highlight();
        }
      }
    },
    true,
  );
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (opened && !opened.wrapper.contains(event.target)) close();
    },
    true,
  );
  document.addEventListener('focusin', (event) => {
    if (opened && !opened.wrapper.contains(event.target)) close();
  });
  window.addEventListener('blur', () => close());
  return {
    refresh,
    close,
    get isOpen() {
      return !!opened;
    },
  };
}
