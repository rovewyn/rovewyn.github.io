import { createAmbience } from './audio.js';

const body = document.body;
const canvas = document.querySelector('#world-canvas');
const dialog = document.querySelector('#detail-dialog');
const status = document.querySelector('#live-status');
const hint = document.querySelector('#room-hint');
const scanButton = document.querySelector('[data-action="scan"]');
const soundButton = document.querySelector('[data-action="sound"]');
const aboutButton = document.querySelector('.controls [data-action="profile"]');
const workstation = document.querySelector('#workstation-hotspot');
const secret = document.querySelector('#secret-hotspot');
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
  placeHotspot(secret, positions?.secret, visible && scanning);
}
function openDetail(next, trigger = aboutButton) {
  if (next === 'secret' && !scanning) return;
  returnTarget = trigger;
  view = next;
  body.dataset.view = view;
  const isSecret = next === 'secret';
  document.querySelector('#dialog-title').textContent = isSecret ? 'Signal found' : 'rovewyn';
  document.querySelector('#dialog-code').textContent = isSecret ? 'HIDDEN NODE / CONNECTED' : '01 / WORKSTATION';
  document.querySelector('#dialog-eyebrow').textContent = isSecret ? 'Connection established.' : 'Profile';
  document.querySelector('#profile-content').hidden = isSecret;
  document.querySelector('#secret-content').hidden = !isSecret;
  room?.focus(next);
  updateHotspots();
  if (!dialog.open) dialog.showModal();
  status.textContent = isSecret ? 'Hidden signal found.' : 'Workstation opened.';
}
function closeDetail() {
  view = 'room'; body.dataset.view = view;
  dialog.close(); room?.focus('room'); updateHotspots();
  (returnTarget?.hidden ? aboutButton : returnTarget).focus();
  status.textContent = 'Returned to room.';
}
async function act(action, trigger) {
  if (action === 'profile' || action === 'secret') openDetail(action, trigger);
  if (action === 'return') closeDetail();
  if (action === 'scan' && room) {
    scanning = !scanning;
    body.dataset.scan = scanning ? 'on' : 'off';
    scanButton.setAttribute('aria-pressed', String(scanning));
    room.setScan(scanning); updateHotspots();
    hint.textContent = scanning ? 'SIGNAL DETECTED' : '';
    status.textContent = scanning ? 'Scan enabled. An unknown signal is available in the room.' : 'Scan disabled.';
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
      onActivate: action => act(action, action === 'secret' ? secret : workstation),
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
