// Раскладку и IME обрабатывает браузер.
export function shouldFocusTyping(
  event,
  { available, blocked, editable, interactive, selection = false },
) {
  if (!available || blocked || editable || selection || event.defaultPrevented) return false;
  const altGraph = !!event.getModifierState?.('AltGraph');
  if (event.metaKey || (event.ctrlKey && !altGraph) || (event.altKey && !altGraph)) return false;
  if (event.key === ' ' && interactive) return false;
  return (
    event.key.length === 1 ||
    ['Backspace', 'Delete', 'Dead', 'Process', 'Unidentified'].includes(event.key) ||
    event.keyCode === 229
  );
}
