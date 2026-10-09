import { samples } from './measurements.js';

const stages = [
  { status: 'RUNNING / WORKER A', counter: '43', badge: 'Reference state', workerA: 'Actor running', snapshot: 'Not yet stored', workerB: 'Awaiting resume' },
  { status: 'SUSPENDED / STORED STATE', counter: '43', badge: 'Saved values', workerA: 'Actor suspended', snapshot: 'State stored', workerB: 'Awaiting resume' },
  { status: 'WORKER A DELETED', counter: '43', badge: 'Saved values', workerA: 'Pod deleted', snapshot: 'State retained', workerB: 'Awaiting resume' },
  { status: 'RESUMED / WORKER B', counter: '43', badge: 'State matched', workerA: 'Pod deleted', snapshot: 'Used for resume', workerB: 'Actor resumed' },
  { status: 'RUNNING / WORKER B', counter: '44', badge: 'Input accepted', workerA: 'Pod deleted', snapshot: 'Used for resume', workerB: 'Actor running' },
];

document.querySelectorAll('[data-stage]').forEach(button => {
  button.addEventListener('click', () => {
    const index = Number(button.dataset.stage);
    const stage = stages[index];
    document.querySelectorAll('[data-stage]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.querySelector('.proof-viewer').dataset.selectedStage = index;
    document.querySelector('#proof-status').textContent = stage.status;
    document.querySelector('#proof-counter').textContent = stage.counter;
    document.querySelector('#proof-state-badge').textContent = stage.badge;
    document.querySelector('#worker-a-state').textContent = stage.workerA;
    document.querySelector('#snapshot-state').textContent = stage.snapshot;
    document.querySelector('#worker-b-state').textContent = stage.workerB;
  });
});

const definitions = {
  resumeToFirstToolSeconds: { unit: 's', factor: 1, text: 'Timing starts before the ResumeActor command. It ends after the first successful read of both existing pages. Sample numbers show collection order.' },
  suspendSeconds: { unit: 's', factor: 1, text: 'The host measured the time for the SuspendActor command. The measurement includes snapshot upload. The Actor had two local test tabs.' },
  resumeControlSeconds: { unit: 's', factor: 1, text: 'The host measured the time for the ResumeActor command. The measurement includes the temporary control connection. Browser tool readiness has a separate measurement.' },
  browserLaunchSeconds: { unit: 's', factor: 1, text: 'Timing starts before the first navigation call. It includes Chromium startup and the first page load. The Actor had resumed, and MCP initialization was complete. Image download and template preparation are excluded. These samples came from a separate set of temporary Actors.' },
  warmSnapshotToolSeconds: { unit: 'ms', factor: 1000, text: 'The host measured one browser_snapshot call on the running Actor. This tool reads the accessibility tree. It does not call SuspendActor. These samples came from the separate browser launch test.' },
  runningMemoryBytes: { unit: 'MiB', factor: 1 / (1024 ** 2), text: 'We read memory.current from the Actor cgroup after each ResumeActor call. This value includes gVisor and guest processes. It is not the sum of resident memory used by guest processes.' },
  snapshotDiskBytes: { unit: 'MiB', factor: 1 / (1024 ** 2), text: 'We measured RustFS disk allocation with du -sk. We multiplied this value by 1024 and converted it to MiB. This value includes allocation metadata. It excludes the shared browser image.' },
};

const format = value => value.toFixed(3);
function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return { median: (sorted[4] + sorted[5]) / 2, p95: sorted[Math.ceil(0.95 * sorted.length) - 1], min: sorted[0], max: sorted.at(-1) };
}

function drawPlot(svg, values, options) {
  const width = svg.clientWidth;
  if (width === 0) return;
  const height = options.height;
  const right = width - 12;
  const bottom = height - 50;
  const x = index => 42 + index * ((right - 42) / 9);
  const y = value => bottom - (value / options.top) * (bottom - 30);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.replaceChildren();
  function add(name, attributes, content) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (content !== undefined) node.textContent = content;
    svg.append(node);
    return node;
  }
  add('title', {}, `${options.title}: ten samples`);
  svg.setAttribute('aria-label', `${options.title}. Ten samples. Median ${format(options.median)} ${options.unit}. Use the sample buttons to read each value.`);
  options.ticks.forEach(value => {
    add('line', { x1: 42, x2: right, y1: y(value), y2: y(value), class: 'chart-grid' });
    add('text', { x: 33, y: y(value) + 4, 'text-anchor': 'end', class: 'chart-axis-label' }, value === 0 ? '0' : value.toFixed(options.top < 10 ? 1 : 0));
  });
  add('text', { x: 42, y: 15, class: 'chart-axis-label' }, options.unit);
  add('line', { x1: 42, x2: right, y1: y(options.median), y2: y(options.median), class: 'chart-median' });
  values.forEach((value, index) => {
    const circle = add('circle', { cx: x(index), cy: y(value), r: options.selected === index ? 6 : 5, class: options.selected === index ? 'chart-point selected' : 'chart-point' });
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `Sample ${index + 1}: ${format(value)} ${options.unit}`;
    circle.append(title);
    circle.addEventListener('click', () => options.onSelect(index));
    add('text', { x: x(index), y: bottom + 23, 'text-anchor': 'middle', class: 'chart-axis-label' }, index + 1);
  });
  add('text', { x: (42 + right) / 2, y: height - 5, 'text-anchor': 'middle', class: 'chart-axis-label' }, options.axisLabel);
}

function sampleButtons(container, values, unit, onSelect) {
  container.replaceChildren();
  values.forEach((value, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = index + 1;
    button.setAttribute('aria-label', `Sample ${index + 1}: ${format(value)} ${unit}`);
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => onSelect(index));
    container.append(button);
  });
}

const redraw = new Map();
document.querySelectorAll('.metric-plot').forEach(figure => {
  const values = samples[figure.dataset.metric];
  const summary = stats(values);
  const svg = figure.querySelector('svg');
  const buttons = figure.querySelector('.sample-buttons');
  const detail = figure.querySelector('.sample-detail');
  const title = figure.querySelector('h3').textContent;
  let selected = null;
  function selectSample(index) {
    selected = index;
    render();
    buttons.children[index].focus();
  }
  function render() {
    // Both lifecycle plots use the same 0–2 second scale.
    drawPlot(svg, values, { title, height: 310, top: 2, ticks: [0, 0.5, 1, 1.5, 2], median: summary.median, unit: 's', selected, onSelect: selectSample, axisLabel: 'Sequential cycle' });
    [...buttons.children].forEach((button, index) => button.setAttribute('aria-pressed', String(index === selected)));
    detail.textContent = selected === null ? 'Select a sample. Dashed line: median.' : `Cycle ${selected + 1}: ${format(values[selected])} s. Dashed line: median.`;
  }
  sampleButtons(buttons, values, 's', selectSample);
  render();
  redraw.set(svg, render);
});

const select = document.querySelector('#metric-select');
const svg = document.querySelector('#sample-chart');
const buttons = document.querySelector('#sample-buttons');
let selectedSample = null;
function selectSample(index) {
  selectedSample = index;
  renderExplorer();
  buttons.children[index].focus();
}
function renderExplorer() {
  const definition = definitions[select.value];
  const values = samples[select.value].map(value => value * definition.factor);
  const summary = stats(values);
  document.querySelector('#chart-median').textContent = `${format(summary.median)} ${definition.unit}`;
  document.querySelector('#chart-p95').textContent = `${format(summary.p95)} ${definition.unit}`;
  document.querySelector('#chart-range').textContent = `${format(summary.min)}–${format(summary.max)} ${definition.unit}`;
  document.querySelector('#metric-definition').textContent = definition.text;
  drawPlot(svg, values, { title: select.selectedOptions[0].textContent, height: 280, top: summary.max * 1.15, ticks: [0, summary.max * 0.575, summary.max * 1.15], median: summary.median, unit: definition.unit, selected: selectedSample, onSelect: selectSample, axisLabel: 'Collection order' });
  sampleButtons(buttons, values, definition.unit, selectSample);
  [...buttons.children].forEach((button, index) => button.setAttribute('aria-pressed', String(index === selectedSample)));
  document.querySelector('#sample-detail').textContent = selectedSample === null ? 'Select a sample to read its value. Dashed line: median.' : `Sample ${selectedSample + 1}: ${format(values[selectedSample])} ${definition.unit}. Dashed line: median.`;
}
select.addEventListener('change', () => { selectedSample = null; renderExplorer(); });
renderExplorer();
redraw.set(svg, renderExplorer);

const resizeObserver = new ResizeObserver(entries => {
  entries.forEach(entry => redraw.get(entry.target)?.());
});
redraw.forEach((render, target) => resizeObserver.observe(target));

const tbody = document.querySelector('#lifecycle-samples');
samples.suspendSeconds.forEach((_, index) => {
  const row = document.createElement('tr');
  const values = [index + 1, format(samples.suspendSeconds[index]), format(samples.resumeControlSeconds[index]), format(samples.resumeToFirstToolSeconds[index]), format(samples.runningMemoryBytes[index] / (1024 ** 2)), format(samples.snapshotDiskBytes[index] / (1024 ** 2))];
  values.forEach((value, column) => {
    const cell = document.createElement(column === 0 ? 'th' : 'td');
    if (column === 0) cell.scope = 'row';
    cell.textContent = value;
    row.append(cell);
  });
  tbody.append(row);
});

const links = [...document.querySelectorAll('.contents a')];
const observer = new IntersectionObserver(entries => {
  const entry = entries.filter(item => item.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
  if (!entry) return;
  links.forEach(link => link.hash === `#${entry.target.id}` ? link.setAttribute('aria-current', 'location') : link.removeAttribute('aria-current'));
}, { rootMargin: '-15% 0px -55% 0px' });
document.querySelectorAll('[data-story-section]').forEach(section => observer.observe(section));
