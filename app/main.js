import { Attempt } from './engine.js';
import { makeText } from './content.js';
const $ = (id) => document.getElementById(id);
let attempt;
function start() {
  const language = $('practice-language').value;
  attempt = new Attempt({ ...makeText(language), language, duration: Number($('practice-duration').value) });
  $('reference').textContent = attempt.text.slice(0, 500);
  $('typing-input').value = '';
  $('typing-input').disabled = false;
  $('result').textContent = '';
  $('clock').textContent = `${attempt.duration} с`;
  $('typing-input').focus();
}
function renderResult() {
  const result = attempt.savedResult;
  if (!result) return;
  $('typing-input').disabled = true;
  $('result').textContent = `${result.metrics.wpm.toFixed(1)} WPM / ${(result.metrics.accuracy || 0).toFixed(1)}%`;
}
$('typing-input').addEventListener('input', () => {
  attempt.commit($('typing-input').value);
  renderResult();
});
$('restart').addEventListener('click', start);
for (const id of ['practice-language', 'practice-duration']) $(id).addEventListener('change', start);
setInterval(() => {
  if (attempt.state !== 'running') return;
  attempt.advance();
  $('clock').textContent = `${Math.max(0, Math.ceil(attempt.duration - attempt.elapsed()))} с`;
  renderResult();
}, 100);
start();
