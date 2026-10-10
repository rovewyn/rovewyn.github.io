const number = (v, digits = 2) => Number(v).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;
};
const sec = v => `${number(v)} s`;
const gib = v => `${number(v / 1024)} GiB`;
const set = (id, html) => { document.getElementById(id).innerHTML = html; };
const tr = cells => `<tr>${cells.map((v, i) => `<${i === 0 ? 'th scope="row"' : 'td'}>${v}</${i === 0 ? 'th' : 'td'}>`).join('')}</tr>`;
const value = (r, group, key, quantile = null) => median(r.resources.map(v => quantile ? v.groups[group][key][quantile] : v.groups[group][key]));

fetch('report-data.json').then(response => {
  if (!response.ok) throw new Error(`Dataset request failed (${response.status})`);
  return response.json();
}).then(data => {
  let profile = 'compact';
  let densityMetric = 'throughput';
  const densityCaptions = {
    throughput: 'Two runs at each Actor count. In each run, Actors started new Tasks for 20 seconds, then finished their current Tasks. Actors worked in parallel, with one Task at a time per Actor. Throughput uses the full elapsed time.',
    latency: 'Median and p95 Task times from both tests. The dashed line marks the 5-second target.',
    memory: 'Green shows total Worker memory, including browser memory and file cache. Blue shows Worker execution memory. Orange shows the whole Kubernetes node, including shared services. Values are median memory use during the tests.',
    cpu: 'Average CPU use during each run. The experiment Worker had an 8-core limit.'
  };
  function density() {
    const rows = data.density[profile];
    document.getElementById('density-chart').src = `charts/density-${profile}-${densityMetric}.svg`;
    document.getElementById('density-chart').alt = `${profile} Actor profile: ${densityMetric} by active Actor count`;
    set('density-caption', densityCaptions[densityMetric]);
    set('density-table', rows.map(r => tr([r.actors, number(r.throughput), sec(r.latency.p95), gib(value(r, 'worker', 'memoryMiB', 'median')), `${number(value(r, 'worker', 'cpuCores'))} cores`, `${r.errors} / ${r.submitted}`])).join(''));
    const last = rows.at(-1);
    set('density-result', `With <strong>${last.actors} browsers running</strong>, ${last.success} Tasks finished at ${number(last.throughput)} Tasks/s. p95 Task time was ${sec(last.latency.p95)}.`);
    const admission = data.admission[profile];
    set('admission', `The Worker rejected Actor ${last.actors + 1} with ResourceExhausted. The ${profile === 'compact' ? 'CPU and memory limits' : 'CPU limits'} assigned to the existing Actors left no room for another Actor on this Worker.`);
  }
  density();
  document.querySelectorAll('[data-profile]').forEach(button => button.addEventListener('click', () => {
    profile = button.dataset.profile;
    document.querySelectorAll('[data-profile]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    density();
  }));
  document.querySelectorAll('[data-density]').forEach(button => button.addEventListener('click', () => {
    densityMetric = button.dataset.density;
    document.querySelectorAll('[data-density]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    density();
  }));

  const rateCaptions = {
    throughput: 'Each rate had two tests with 30 seconds of Task submissions. The green line counts Tasks finished within those 30 seconds. The blue line includes Tasks finished later and the extra time needed to finish them.',
    latency: 'Task time includes waiting in the Actor queue. The dashed line marks the 5-second p95 target.',
    queue: 'Time from when a Task was scheduled to arrive until its first MCP call started. Each Actor has its own queue.',
    cpu: 'Average CPU use while submitting Tasks and waiting for the remaining Tasks to finish. The Worker has an 8-core limit; the whole node has 10 CPUs.'
  };
  function rate(metric) {
    document.getElementById('rate-chart').src = `charts/rates-${metric}.svg`;
    document.getElementById('rate-chart').alt = `${metric} by fixed Task arrival rate`;
    set('rate-caption', rateCaptions[metric]);
  }
  rate('throughput');
  document.querySelectorAll('[data-rate]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-rate]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    rate(button.dataset.rate);
  }));
  set('rate-table', data.rates.map(r => tr([r.rate, number(r.throughput), sec(r.latency.p95), sec(r.queue.p95), `${r.overFiveSeconds} / ${r.submitted}`, `${r.errors} / ${r.submitted}`])).join(''));
  const passing = data.soaks.filter(r => r.metTarget).sort((a, b) => b.rate - a.rate)[0];
  const highest = data.rates.at(-1);
  const shortPassing = data.rates.filter(r => r.errors === 0 && r.latency.p95 <= 5 && r.drainSeconds.max <= 5).at(-1);
  set('rate-result', `<strong>${shortPassing.rate} Tasks/s was the highest tested rate that passed both 30-second tests.</strong> At ${highest.rate} Tasks/s, p95 Task time rose to ${sec(highest.latency.p95)}, and p95 queue time was ${sec(highest.queue.p95)}.`);
  set('soak-result', data.soaks.map(r => `At ${r.rate} Tasks/s, the 5-minute test completed ${r.summary.succeeded.toLocaleString('en-US')} of ${r.summary.submitted.toLocaleString('en-US')} Tasks successfully. p95 Task time was ${sec(r.summary.taskSeconds.p95)}. The remaining Tasks finished ${sec(r.summary.drainSeconds)} after submissions stopped. ${r.metTarget ? 'The test passed all three criteria.' : 'The test did not pass all three criteria.'}`).join('<br>'));
  const soakRate = passing?.rate ?? data.soaks.at(-1).rate;
  document.getElementById('soak-chart').src = `charts/soak-${soakRate}.svg`;
  set('soak-controls', data.soaks.map(r => `<button data-soak="${r.rate}" aria-pressed="${r.rate === soakRate}">${r.rate} Tasks/s</button>`).join(''));
  document.querySelectorAll('[data-soak]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-soak]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.getElementById('soak-chart').src = `charts/soak-${button.dataset.soak}.svg`;
  }));
  if (passing?.resources.actors?.periods) {
    const actors = passing.resources.actors;
    const percent = 100 * actors.throttledPeriods / actors.periods;
    set('cpu-budget', `Each Actor had a 0.5-core CPU limit. During the 5-minute test, Actors hit this limit and had to wait for more CPU time in ${number(percent, 1)}% of the measured scheduling periods. The Worker used ${number(passing.resources.groups.worker.cpuCores)} CPU cores on average.`);
  }
  set('finding', `One experiment Worker ran <strong>16 browser Actors</strong>. ${passing ? `A 5-minute run at <strong>${passing.rate} Tasks/s</strong> met the Task time target. ` : ''}SuspendActor and ResumeActor preserved the checked page values in the concurrent and burst runs.`);

  const lifecycleCaptions = {
    latency: 'Green shows the median SuspendActor time for one Actor. Blue shows the median time from ResumeActor until its page state was read. Values combine all Actors across the three cycles at each group size.',
    batch: 'Green shows how long the whole group took to suspend. Blue shows how long it took to resume every Actor and read all pages. Each bar is the median of three cycles; Actors within a group ran these operations in parallel.',
    memory: 'Green shows the experiment Worker, which runs the browser Actors. Orange shows the whole Kubernetes node, including shared services. Bars show the highest memory sample across three cycles, measured about once per second.',
    transfer: 'Green shows snapshot uploads to RustFS; blue shows downloads from RustFS. Bars show the median traffic for the entire group over one cycle, including HTTP traffic and object metadata.',
    io: 'Green shows disk reads; blue shows disk writes at RustFS. Bars show the median bytes for the entire group over one cycle. A snapshot download can use cached data without another disk read.'
  };
  function lifecycle(metric) {
    document.getElementById('lifecycle-chart').src = `charts/lifecycle-${metric}.svg`;
    document.getElementById('lifecycle-chart').alt = `${metric} for concurrent SuspendActor and ResumeActor`;
    set('lifecycle-caption', lifecycleCaptions[metric]);
  }
  lifecycle('latency');
  document.querySelectorAll('[data-lifecycle]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-lifecycle]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    lifecycle(button.dataset.lifecycle);
  }));
  set('lifecycle-table', data.lifecycle.map(r => tr([r.actors, sec(r.suspendSeconds.median), sec(r.resumeReadySeconds.median), `${r.matching} / ${r.checks}`, `${number(r.actorSnapshotMiB.median, 1)} MiB`, `${gib(Math.max(...r.resources.map(v => v.groups.worker.memoryMiB.max)))} / ${gib(Math.max(...r.resources.map(v => v.groups.node.memoryMiB.max)))}`])).join(''));
  const checks = data.lifecycle.reduce((sum, r) => sum + r.checks, 0);
  const matched = data.lifecycle.reduce((sum, r) => sum + r.matching, 0);
  const largest = data.lifecycle.at(-1);
  set('lifecycle-result', `<p><strong>All ${matched} out of ${checks} page-state checks matched the values recorded before suspension.</strong> For the largest group of ${largest.actors} Actors, the whole group took a median of ${sec(largest.suspendWallSeconds.median)} to suspend and ${sec(largest.resumeWallSeconds.median)} to resume and read all pages.</p><p>Pausing larger groups took longer, but every group kept its checked page state through all three cycles.</p>`);

  const burstChecks = data.bursts.reduce((sum, r) => sum + r.actors, 0);
  const burstMatches = data.bursts.reduce((sum, r) => sum + r.matching, 0);
  const burstSubmitted = data.bursts.reduce((sum, r) => sum + r.summary.submitted, 0);
  const burstSucceeded = data.bursts.reduce((sum, r) => sum + r.summary.succeeded, 0);
  function burst(cycle) {
    document.getElementById('burst-chart').src = `charts/burst-${cycle}.svg`;
    document.getElementById('burst-chart').alt = `Memory through idle time, suspension, and Task burst: cycle ${cycle}`;
    const r = data.bursts.find(v => v.cycle === cycle);
    const active = r.activeIdle.groups.worker;
    const idle = r.suspendedIdle.groups.worker;
    const released = active.executionMiB.median - idle.executionMiB.median;
    set('burst-result', `<p><strong>In cycle ${r.cycle}, suspension released ${gib(released)} of execution memory.</strong> Total Worker memory fell from ${gib(active.memoryMiB.median)} to ${gib(idle.memoryMiB.median)}. The next Tasks had a p95 time of ${sec(r.summary.taskSeconds.p95)}, including resuming the group and checking its pages.</p><p>Across all ${data.bursts.length} cycles, ${burstMatches} / ${burstChecks} page-state checks matched and ${burstSucceeded} / ${burstSubmitted} Tasks completed successfully. Suspending the idle browsers saved memory, while the next work waited for the group to resume and finish its page checks.</p>`);
  }
  burst(1);
  document.querySelectorAll('[data-burst]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-burst]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    burst(Number(button.dataset.burst));
  }));
  set('burst-table', data.bursts.map(r => tr([r.cycle, gib(r.activeIdle.groups.worker.memoryMiB.median), gib(r.suspendedIdle.groups.worker.memoryMiB.median), gib(r.activeIdle.groups.worker.executionMiB.median - r.suspendedIdle.groups.worker.executionMiB.median), sec(r.summary.taskSeconds.p95), `${r.matching} / ${r.actors}`])).join(''));

  const env = data.environment;
  const rows = [
    ['Host', 'Apple M1 Max · 64 GiB RAM · ARM64 · local Docker Desktop'],
    ['Docker VM', `${env.docker.NCPU} CPUs · ${number(env.docker.MemTotal / 1024 ** 3)} GiB visible RAM`],
    ['Cluster', `One Kubernetes node in a Kind Docker container · Kubernetes ${env.node.kubeletVersion}`],
    ['Experiment Worker', '1 Worker · 8 CPU / 16 GiB limits · 1 CPU / 4 GiB requests'],
    ['Original browser Workers', '2 Workers retained · 2 CPU / 4 GiB each'],
    ['Actor resource limits', '2 CPU / 2 GiB; 0.5 CPU / 1 GiB'],
    ['Browser', `Chromium ${env.browserVersions.chromium} · Playwright MCP 0.0.83 · Node ${env.browserVersions.node} · 1280 × 720 viewport`],
    ['Runtime', 'gVisor release-20261005.0 · systrap · memory snapshots'],
    ['Substrate source', env.sourceCommit.slice(0, 8)],
    ['Shared services', 'Substrate control plane, PostgreSQL, RustFS, OpenTelemetry, Jaeger, and Prometheus remained running.'],
    ['Concurrent host workload', 'Existing non-experiment Docker services remained running.'],
    ['Measured browser work', `${data.workloadTasks.toLocaleString('en-US')} Tasks · ${data.workloadErrors} failed Tasks. Preparation Tasks and pilot setup are counted separately.`]
  ];
  set('environment-table', rows.map(tr).join(''));
  set('run-counts', `<ul><li>01: 1, 2, 4 Actors with 2 CPU / 2 GiB each; 1, 2, 4, 8, 12, 16 Actors with 0.5 CPU / 1 GiB each. Two runs per count. Each run started new Tasks for 20 seconds, then finished the current Tasks.</li><li>02: 1, 2, 4, 8, 12 Tasks/s. Two tests per rate, each with 30 seconds of submissions. I then waited for remaining Tasks to finish.</li><li>02, 5-minute test: ${data.soaks.map(r => `${r.rate} Tasks/s for 300 seconds`).join('; ')}.</li><li>03: groups of 1, 4, 8, 16 Actors. Three suspend and resume cycles per group, with parallel calls within each group.</li><li>04: 16 Actors and three cycles. Each cycle included 10 seconds of running idle time and 20 seconds of suspended idle time.</li></ul>`);
  set('pilot-note', 'Pilot runs stopped before measurement. I corrected the screenshot path, read the linked page snapshot, and corrected the cgroup lookup. I retained these failures in the operation record. Docker startup also required Worker address registration to be refreshed.');
}).catch(error => {
  set('finding', `The dataset could not load: ${error.message}`);
  console.error(error);
});
