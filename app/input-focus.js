export function shouldFocusTyping(event, { available, blocked, editable }) {
  if (!available || blocked || editable || event.defaultPrevented) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  return event.key.length === 1 || ['Backspace', 'Delete', 'Dead', 'Process'].includes(event.key);
}
