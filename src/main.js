import { createAmbience } from './audio.js';
import { createScanPuzzle } from './scan-puzzle.js';

const body = document.body;
const canvas = document.querySelector('#world-canvas');
const dialog = document.querySelector('#detail-dialog');
const status = document.querySelector('#live-status');
const hint = document.querySelector('#room-hint');
const scanButton = document.querySelector('[data-action="scan"]');
const soundButton = document.querySelector('[data-action="sound"]');
const aboutButton = document.querySelector('.controls [data-action="profile"]');
const workstation = document.querySelector('#workstation-hotspot');
const scanNodes = document.querySelector('#scan-nodes');
const scanHotspots = Array.from(scanNodes.querySelectorAll('[data-scan-node]'));
const scanContent = document.querySelector('#scan-content');
const scanPuzzle = createScanPuzzle(scanContent, { onUnlock: value => room?.setTerminalUnlocked(value) });
const scanMobileQuery = matchMedia('(max-width: 760px)');
const introduction = document.querySelector('#introduction');
let room;
let view = 'room';
let scanning = false;
let soundEnabled = false;
let returnTarget = aboutButton;
let positions;
let soundPending = false;
let active = true;

const audio = createAmbience(state => {
  body.dataset.audio = state;
  if (state === 'unavailable') {
    soundEnabled = false;
    updateSound();
    status.textContent = 'Sound could not start. Use Sound off to try again.';
  }
});
function updateSound() {
  body.dataset.sound = soundEnabled ? 'on' : 'off';
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  document.querySelector('#sound-label').textContent = soundEnabled ? 'Sound on' : 'Sound off';
}
function placeHotspot(element, point, visible) {
  element.hidden = !visible || !point?.visible;
  if (element.hidden) return;
  const padding = 18;
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const x = Math.max(padding, Math.min(innerWidth - width - padding, point.x));
  const intro = introduction.getBoundingClientRect();
  let maxY = innerHeight * 0.54 - height / 2;
  if (x < intro.right && x + width > intro.left) maxY = Math.min(maxY, intro.top - height / 2 - 16);
  element.style.left = `${x}px`;
  element.style.top = `${Math.max(110, Math.min(maxY, point.y))}px`;
}
function updateHotspots() {
  const visible = body.dataset.scene === 'ready' && view === 'room';
  placeHotspot(workstation, positions?.monitor, visible && !scanning);
  scanNodes.hidden = !visible || !scanning;
  if (scanNodes.hidden) return;
  scanHotspots.forEach(button => {
    const point = positions?.[button.dataset.scanNode];
    button.hidden = !scanMobileQuery.matches && !point?.visible;
    if (button.hidden || scanMobileQuery.matches) return;
    const padding = 18;
    button.style.left = `${Math.max(padding + button.offsetWidth / 2, Math.min(innerWidth - padding - button.offsetWidth / 2, point.x))}px`;
    button.style.top = `${Math.max(110 + button.offsetHeight / 2, Math.min(innerHeight - padding - button.offsetHeight / 2, point.y))}px`;
  });
}
function updateScanProgress() {
  document.querySelector('#scan-progress').textContent = scanPuzzle.progressText();
  hint.textContent = scanning ? 'SIGNAL DETECTED' : '';
  scanHotspots.forEach(button => {
    const recorded = scanPuzzle.hasRecord(button.dataset.scanNode);
    button.dataset.recorded = String(recorded);
    button.querySelector('.scan-node-state').textContent = recorded ? 'Recorded' : 'Unread';
    const name = button.querySelector('.scan-node-name').textContent;
    button.setAttribute('aria-label', `Inspect ${name}${recorded ? ', record recovered' : ''}`);
  });
}
function openDetail(next, trigger = aboutButton) {
  const nodeId = next.startsWith('inspect-') ? next.slice('inspect-'.length) : null;
  if (nodeId && !scanning) return;
  const record = nodeId ? scanPuzzle.inspect(nodeId) : null;
  const isScan = Boolean(record);
  const isTerminal = nodeId === 'laptop';
  returnTarget = trigger;
  view = isScan ? (isTerminal ? 'terminal' : 'scan-clue') : next;
  body.dataset.view = view;
  document.querySelector('#dialog-title').textContent = isScan ? record.name : 'rovewyn';
  document.querySelector('#dialog-code').textContent = isScan ? `${record.index} / ${record.name.toUpperCase()}` : '01 / WORKSTATION';
  document.querySelector('#dialog-eyebrow').textContent = isTerminal ? 'Local session' : isScan ? 'Device record' : 'Profile';
  document.querySelector('#profile-content').hidden = isScan;
  scanContent.hidden = !isScan;
  updateScanProgress();
  room?.focus(isScan ? nodeId : view);
  updateHotspots();
  if (!dialog.open) dialog.showModal();
  if (isTerminal && !scanPuzzle.isUnlocked()) document.querySelector('#terminal-username').focus();
  status.textContent = isScan ? `${record.name} record recovered. ${scanPuzzle.progressText()}.` : 'Workstation opened.';
}
function closeDetail() {
  view = 'room'; body.dataset.view = view;
  dialog.close(); room?.focus('room'); updateHotspots();
  (returnTarget?.getClientRects().length ? returnTarget : aboutButton).focus();
  status.textContent = 'Returned to room.';
}
async function act(action, trigger) {
  if (action === 'profile' || action.startsWith('inspect-')) openDetail(action, trigger);
  if (action === 'return') closeDetail();
  if (action === 'scan' && room) {
    scanning = !scanning;
    body.dataset.scan = scanning ? 'on' : 'off';
    scanButton.setAttribute('aria-pressed', String(scanning));
    room.setScan(scanning); updateHotspots();
    updateScanProgress();
    status.textContent = scanning ? `Scan enabled. Inspect the three desk devices. ${scanPuzzle.progressText()}.` : 'Scan disabled.';
  }
  if (action === 'sound' && !soundPending) {
    soundPending = true;
    const requested = !soundEnabled;
    soundEnabled = await audio.setEnabled(requested);
    soundPending = false; updateSound();
    if (soundEnabled || !requested) status.textContent = soundEnabled ? 'Environment sound enabled.' : 'Environment sound disabled.';
  }
}
document.querySelectorAll('[data-action]').forEach(button => {
  button.addEventListener('click', () => act(button.dataset.action, button));
});
dialog.addEventListener('cancel', event => { event.preventDefault(); closeDetail(); });
dialog.addEventListener('click', event => { if (event.target === dialog) {
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDetail();
} });
function fallback() {
  room?.dispose(); room = undefined;
  body.dataset.scene = 'fallback'; body.dataset.scan = 'off'; scanning = false;
  scanButton.disabled = true; scanButton.setAttribute('aria-pressed', 'false');
  soundButton.disabled = true; soundEnabled = false; audio.setEnabled(false); updateSound();
  document.querySelector('#fallback-status').hidden = false;
  hint.textContent = '';
  updateHotspots();
  if (view === 'terminal' || view === 'scan-clue') closeDetail();
  status.textContent = 'The 3D room is unavailable. The introduction and GitHub link are still available.';
}
async function initialize() {
  if (matchMedia('(forced-colors: active)').matches) { fallback(); return; }
  try {
    const { createRoom } = await import('./scene.js');
    if (!active) return;
    const initializedRoom = await createRoom({
      canvas,
      onProject: value => { positions = value; updateHotspots(); },
      onActivate: action => act(action, scanHotspots.find(button => button.dataset.action === action) || workstation),
      onFailure: fallback,
    });
    if (!active) { initializedRoom.dispose(); return; }
    room = initializedRoom;
    body.dataset.scene = 'ready';
    scanButton.disabled = false;
    soundButton.disabled = typeof AudioContext === 'undefined';
    updateHotspots();
    if (view !== 'room') room.focus(view);
  } catch (error) {
    console.warn('The room could not initialize.', error);
    fallback();
  }
}
document.addEventListener('visibilitychange', () => audio.setVisible(!document.hidden));
window.addEventListener('pagehide', event => {
  if (event.persisted) audio.setVisible(false);
  else { active = false; room?.dispose(); audio.dispose(); }
});
window.addEventListener('pageshow', event => { if (event.persisted) audio.setVisible(!document.hidden); });
initialize();
