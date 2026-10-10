# Substrate browser capacity operation record

This record describes the experiment behind the browser capacity report. The published measurements are in `report-data.json`. Original records, logs, and snapshots remain private on the test machine.

## Environment

- Host: Apple M1 Max, 64 GiB RAM.
- Docker context: `desktop-linux`; 10 virtual CPUs and 24 GiB configured RAM. The Linux VM reports about 23.44 GiB of RAM.
- Kubernetes context: `kind-substrate-play`, using the playground's dedicated kubeconfig.
- One ARM64 Kind node. Kubernetes, Docker Engine, source commit, and image digest are recorded in `report-data.json`.
- Substrate source is unchanged. The browser image, MCP version, runtime configuration, viewport, and browser launch flags match the page-state experiment.
- Existing browser, Counter, Sandbox, control-plane, storage, and observation services remained present. Other Docker services also remained running.

## Preparation

Docker Desktop was stopped at the start. I started it, then ran `play.sh start` from the existing playground. Worker pod addresses changed after the node restart. The existing start script replaced those Workers and waited for their registration.

The original browser Actor was marked crashed after the prior Docker shutdown. Its memory snapshot remained in RustFS. After the capacity runs, I used RevertActor to return that crashed Actor to SUSPENDED. I confirmed its external snapshot was unchanged. ResumeActor restored its existing MCP session and three browser pages. I then suspended it again. This recovery was outside the measured workload.

I created one separate WorkerPool, `browser-capacity-20261010`, in `ate-demo-browser`. Its selector prevents the capacity Actors from using the original browser Workers.

| Configuration | CPU limit | Memory limit | Kubernetes request |
| --- | --- | --- | --- |
| Experiment Worker | 8 | 16 GiB | 1 CPU, 4 GiB |
| Original Actor profile | 2 | 2 GiB | Substrate schedules against the declared Actor limits |
| Smaller Actor profile | 0.5 | 1 GiB | Substrate schedules against the declared Actor limits |

Both templates use the same immutable browser image and gVisor configuration. Each Actor has one browser page. Model inference and external website latency are outside the workload.

## Commands and order

The local driver imports the existing playground's `play.py` and MCP client. Every cluster command fixes the kubeconfig and Kubernetes context. Every Docker command fixes `desktop-linux`.

Driver versions from the smaller-profile Actor-count runs onward were archived with content hashes. Setup and original-profile run parameters remain in the operation log and saved configurations.

```sh
python3 <experiment-dir>/experiment.py setup
python3 <experiment-dir>/experiment.py default
python3 <experiment-dir>/experiment.py density
python3 <experiment-dir>/experiment.py rates
python3 <experiment-dir>/experiment.py soak
python3 <experiment-dir>/experiment.py lifecycle
python3 <experiment-dir>/experiment.py bursts
python3 <experiment-dir>/experiment.py cleanup
python3 <experiment-dir>/analyze.py
<local-plot-environment>/bin/python <experiment-dir>/charts.py
```

Plots use Matplotlib 3.10.7 in a local virtual environment. It was not installed globally. The client uses Python's standard library, not a test framework.

The report defines Task once, before the numbered experiments. The Task diagram was drawn with Mermaid 12.1.0 and exported to a static SVG for publication. Experiment 01 uses a short introduction to the measurement purpose, browser Actors, and resource configurations. Experiment 02 separates tests with 30 seconds of submissions from the 5-minute run. Each stage has its procedure before its chart and its conclusion after its chart. The first stage's conclusion explains the rate selected for the second stage. Experiments 03 and 04 describe preparation, parallel operations, page checks, and timing in numbered steps before their charts. Their conclusions follow the charts and tables. These presentation changes did not run new experiments or change measured results.

## Workload and timings

Each measured browser task makes four MCP tool calls:

1. `browser_navigate`: open the Actor's local `/fixture` page.
2. `browser_type`: enter synthetic text into `#note`.
3. `browser_click`: click `#save`.
4. `browser_take_screenshot`: save a full-page PNG at CSS scale with a 1280 × 720 viewport.

The driver overwrites `/tmp/browser-artifacts/capacity-latest.png` after each task. It verifies the PNG signature and reads the page snapshot to check “Note saved”. MCP page snapshots and tool logs can still create files inside the Actor.

Task time starts at scheduled submission and ends when the screenshot tool returns. Artifact retrieval and result validation are recorded separately. Each Actor queue waits for validation before it runs the next task. Successful throughput includes the full elapsed run time.

The fixed-rate driver submits tasks independently of task completion. It sends tasks to Actor queues in round-robin order. It does not submit simultaneous tasks to one shared browser context. At the end of each arrival window, it stops arrivals and waits for all queued work to finish. Queue delay and that final drain are retained in the data.

The selected target for running browsers is p95 task time at most 5 seconds, with zero failed tasks. Arrival and sustained runs must also drain their queues within 5 seconds. Each short arrival window must pass before its rate is selected for a sustained run.

Burst task time starts at ResumeActor. It includes the group page-state checks and the next four-tool browser task. The warm task target does not apply to this different timer.

## Measurements

- Actor count: two 20-second runs at each count. A task already in progress can finish after the 20-second submission boundary.
- Arrival rate: two 30-second arrival windows per rate, with all queued work retained in the result.
- Sustained rate: 300 seconds at the highest rate that passed both short windows. Any follow-up rate is recorded separately.
- Lifecycle: three cycles per group size, at 1, 4, 8, and 16 Actors. Commands in a group begin together.
- Idle and burst: three cycles with 16 Actors. Each cycle includes 10 seconds of active idle, suspension, 20 seconds of suspended idle, resumption, page-state comparison, and one new task per Actor.

The page checks compare its time origin, JavaScript token, counter, input, and saved note. Burst cycles also compare an unsaved draft and a random DOM marker. The driver checks these before navigating again. It reuses the existing MCP session.

The resource sampler reads Linux cgroup v2 counters for the Kind node, experiment Worker, and RustFS about once per second. Some phases also capture Actor CPU counters. CPU use is a delta over elapsed time. Memory peaks are sampled peaks. The sampler's own elapsed time is recorded.

Actor-count tables use the median of each run's median memory samples and the mean CPU use across the two runs. Task-time percentiles pool all tasks from those runs. The lifecycle table pools per-Actor operation times and snapshot sizes across three cycles. Its memory columns show the highest sampled value across those cycles.

Shared memory must be included in browser execution memory. Linux `memory.stat.file` contains shared memory. Thus:

```text
execution memory = anon + shmem + kernel
file cache        = file - shmem
```

The [Linux cgroup documentation](https://docs.kernel.org/admin-guide/cgroup-v2.html) defines the counters. The [gVisor resource model](https://gvisor.dev/docs/architecture_guide/resources/) explains why application memory is accounted as shared memory.

RustFS `eth0` received/sent bytes measure object-storage traffic during each suspend/resume cycle. These bytes include HTTP overhead and metadata. Its cgroup disk counters record physical I/O; cached reads can produce network traffic without a physical disk read. Latest-snapshot allocated disk blocks are measured with `du -sk`, multiplied by 1024.

## Pilot corrections

Three pilot attempts stopped before measurements:

1. A relative screenshot filename resolved outside MCP's allowed directory. I changed it to the explicit artifact path.
2. The page snapshot was a link. I fetched that snapshot before checking the saved-note result.
3. The cgroup lookup used hyphens in the pod UID. The systemd cgroup name used underscores. I corrected the lookup.

A later version probe also used `process` in the browser tool scope, where it was unavailable. I read Node version from the image diagnostics endpoint instead. A direct ResumeActor call on the original crashed Actor was rejected; recovery required RevertActor first. These were post-run diagnostics.

The local records retain these failed attempts. They are not counted as capacity-task failures. ResourceExhausted on the extra Actor is a measured admission result and is reported separately from browser-task failures.

## Data and privacy

The report dataset omits host paths, account email, MCP session IDs, machine identifiers, and original Actor identifiers. Workload text is synthetic. The local full records retain the evidence needed to inspect the operations. The public experiment repository was not changed.

The report's conclusions apply to the measured simple page, Actor profiles, warm caches, and local machine. The 17th Actor rejection measures the declared scheduling envelope. It does not establish the largest browser count that all possible laptop configurations can support.

## Retained environment

The capacity Actors remain suspended. Their snapshots and templates remain in the local cluster. The experiment WorkerPool has zero replicas. The original WorkerPool specifications remain unchanged. To inspect a capacity Actor again, set the experiment pool to one replica, wait for the Worker to become ACTIVE, then use ResumeActor. The original primary browser remains suspended with a valid memory snapshot.
