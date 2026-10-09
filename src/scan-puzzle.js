const alphabet = 'abcdefghjkmnpqrs';

export function createDailyChallenge(day = new Date().toISOString().slice(0, 10)) {
  let state = 2166136261;
  for (const character of `terminal-v1/${day}`) state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  function random() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  }
  function shuffle(values) {
    for (let index = values.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [values[index], values[other]] = [values[other], values[index]];
    }
    return values;
  }
  const order = shuffle(Array.from('ABCDEFGH'));
  const direction = random() < 0.5 ? -1 : 1;
  const offset = Math.floor(random() * 16);
  const letters = shuffle(Array.from(alphabet)).slice(0, 8);
  const encode = letter => (direction * alphabet.indexOf(letter) + offset + 16) % 16;
  const fragments = shuffle(order.map((id, index) => ({ id, payload: encode(letters[index]) })));
  const rules = {
    monitor: [
      `${order[7]} is first or last.`,
      `There are exactly three fragments between ${order[3]} and ${order[7]}.`,
    ],
    mini: [
      `${order[6]} is directly before ${order[7]}.`,
      `There are exactly three fragments between ${order[1]} and ${order[5]}.`,
    ],
    laptop: [
      `${order[2]} is directly after ${order[1]}.`,
      `${order[4]} is after ${order[3]} and before ${order[5]}.`,
    ],
  };
  return { day, fragments, rules, samples: ['e', 'k'].map(letter => ({ letter, payload: encode(letter) })), password: letters.join('') };
}

export function createScanPuzzle(root, { onUnlock }) {
  // A visit keeps its UTC session across midnight. Reloading starts the new day's session.
  const challenge = createDailyChallenge();
  const records = new Map(Array.from(root.querySelectorAll('[data-scan-panel]'), element => [
    element.dataset.scanPanel,
    { element, name: element.dataset.scanName, index: element.dataset.scanIndex },
  ]));
  const recovered = new Set();
  const progress = root.querySelector('#scan-record-progress');
  const help = root.querySelector('#scan-record-help');
  const summary = root.querySelector('#terminal-records-content');
  const form = root.querySelector('#terminal-login');
  const loginStatus = root.querySelector('#terminal-login-status');
  const reward = root.querySelector('#terminal-reward');
  const retry = root.querySelector('#terminal-retry');
  let unlocked = false;

  root.querySelector('#scan-session-date').textContent = `${challenge.day} UTC`;
  function appendList(parent, items) {
    for (const text of items) {
      const element = document.createElement('li');
      element.textContent = text;
      parent.append(element);
    }
  }
  records.forEach((record, id) => appendList(record.element.querySelector('.route-records'), challenge.rules[id]));
  for (const fragment of challenge.fragments) {
    const row = document.createElement('tr');
    for (const value of [fragment.id, String(fragment.payload).padStart(2, '0')]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    root.querySelector('#captured-fragments tbody').append(row);
  }
  for (const sample of challenge.samples) {
    const row = document.createElement('tr');
    for (const value of [sample.letter, String(sample.payload).padStart(2, '0')]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    root.querySelector('#calibration-records tbody').append(row);
  }
  Array.from(alphabet).forEach((letter, position) => {
    const item = document.createElement('li');
    const symbol = document.createElement('strong');
    symbol.textContent = letter;
    const index = document.createElement('span');
    index.textContent = String(position).padStart(2, '0');
    item.append(symbol, index);
    root.querySelector('#decoder-ring').append(item);
  });

  function updateSummary() {
    summary.replaceChildren();
    records.forEach((record, id) => {
      if (!recovered.has(id)) return;
      const heading = document.createElement('h4');
      heading.textContent = record.name;
      summary.append(heading);
      if (id === 'monitor') copyRecord('#captured-fragments');
      if (id === 'mini') {
        copyRecord('#encoder-protocol');
        copyRecord('#decoder-ring');
        copyRecord('#calibration-records');
      }
      const list = document.createElement('ol');
      list.className = 'route-records';
      appendList(list, challenge.rules[id]);
      summary.append(list);
    });
  }
  function copyRecord(selector) {
    const copy = root.querySelector(selector).cloneNode(true);
    copy.removeAttribute('id');
    summary.append(copy);
  }
  function inspect(id) {
    const record = records.get(id);
    recovered.add(id);
    records.forEach((value, key) => { value.element.hidden = key !== id; });
    progress.textContent = progressText();
    help.textContent = id === 'laptop'
      ? 'Read the device records below.'
      : 'Find the fragment order. Change each code to a letter.';
    updateSummary();
    return record;
  }
  function progressText() { return `NODE RECORDS · ${recovered.size}/${records.size}`; }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const accepted = form.elements.username.value.trim() === 'rovewyn' && form.elements.password.value === challenge.password;
    loginStatus.textContent = accepted ? 'ACCESS GRANTED' : 'ACCESS DENIED';
    if (!accepted) return;
    unlocked = true;
    form.hidden = true;
    reward.hidden = false;
    retry.hidden = false;
    onUnlock(true);
  });
  retry.addEventListener('click', () => {
    unlocked = false;
    form.reset();
    form.hidden = false;
    reward.hidden = true;
    retry.hidden = true;
    loginStatus.textContent = 'SESSION LOCKED';
    onUnlock(false);
    form.elements.username.focus();
  });

  return { inspect, progressText, hasRecord: id => recovered.has(id), isUnlocked: () => unlocked };
}
