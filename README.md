# PulseBridge: AWS Event-Driven Pipeline Simulator

**PulseBridge** is an interactive, multi-page client-side simulation web app modeled after an enterprise AWS event-driven pipeline:
```
EventBridge (Bus & Rules) ➔ SNS (Topics & Fan-Out) ➔ SQS (Queues & DLQs) ➔ Consumers (Worker Fleet)
```

Built with **React**, **Vite**, **TypeScript**, **React Router (HashRouter)**, and **Zustand**. No backend required—runs entirely in the browser with memory and `localStorage` persistence, fully deployable to **GitHub Pages**.

---

## Key Highlights & Features

### 1. EventBridge Engine
- **Full Event Pattern Matching**: Evaluates exact values, prefix matches (`{"prefix": "..."}`), suffix matches (`{"suffix": "..."}`), anything-but (`{"anything-but": "..."}`), numeric range comparisons (`{"numeric": [">=", 100, "<=", 500]}`), and existence checks (`{"exists": true|false}`).
- **Interactive Pattern Playground**: Test candidate event payloads in real time with automated failure diff explanations.
- **Rule Targets**: Directly route matching events to SNS topics or SQS queues with optional input transformers.

### 2. SNS Topics & Pub/Sub Fan-Out
- **Subscription Filter Policies**: Filter incoming events based on message attributes or message body parameters before forwarding.
- **Protocols Supported**: SQS queue endpoints, mock HTTP webhook endpoints, and mock email notification endpoints.
- **Fan-Out Visualization**: Visual topology showing subscriber fan-out distribution.

### 3. SQS Engine (Standard & FIFO)
- **State Machine Lifecycle**: Messages transition across `delayed` &rarr; `visible` &rarr; `inflight` &rarr; `deleted` or `dlq`.
- **Visibility Timeout**: Leased messages become invisible to other consumers for a configurable duration. If unacknowledged, they safely return to the visible pool.
- **Dead-Letter Queue (DLQ)**: Configurable `maxReceiveCount` automatically routes poison pills and recurring failures to designated DLQs.
- **FIFO Strict Semantics**:
  - `MessageGroupId` ensures strict sequential in-flight ordering (subsequent messages in the same group wait until earlier ones finish).
  - 5-minute deduplication window via `MessageDeduplicationId` and SHA-256 content-based hashing.
- **Manual Console Ops**: Send custom payloads, lease/receive messages, delete messages, or purge queues directly.

### 4. Consumer Fleet Management
- **Mock Workers**: Customize worker concurrency, processing duration (ms), transient failure rate (%), and poison pill detection patterns.
- **Live Worker Logs**: Real-time log stream tracking message leases, ACK deletions, and failure diagnostics.

### 5. Live Animated Canvas
- **Particle Animation**: Events travel along bezier curves connecting pipeline nodes with real-time status colors (magenta for standard, purple for replayed events, red for DLQ drops, orange for consumer leases).
- **Liquid Fill Indicators**: SQS queue depths visually display volume levels.
- **Interactive Node Drawer**: Click any node on the graph to inspect configuration, active messages, or rules.

### 6. Twist 1: Chaos Lab & Replay Studio
- **Live Fault Injection**:
  - Crash specific consumer workers on the fly.
  - Inject artificial downstream latency (+ms).
  - Throttle SQS queue throughput (% rate limiting).
  - Simulate network drop rates on SNS deliveries.
  - Partition subscribers from topic broadcasts.
- **Chaos Presets**: Instant simulation of *Black Friday Traffic Surges*, *Cascading Outages*, and *Poison Pill Storms*.
- **Archive & Replay**: Historical event archive with time range and pattern filtering. Replayed events are visibly marked with `[REPLAY]` badges and purple particle styling.
- **Exponential Backoff Visualizer**: Visual step ladder showing message retry attempts and backoff phases leading to DLQs.

### 7. Twist 2: Distributed Trace Debugger
- **Hop-by-Hop Audit Trail**: Every ingested event is assigned a trace ID (`trace-xxx`) and tracks every hop from EventBridge through to consumer acknowledgment or DLQ movement.
- **Interactive Timeline Scrubber**: Rewind and step through hops to replay execution progression.
- **"Why Did This Not Fire?" Deep Dives**: Diagnostic breakdown explaining exactly why an EventBridge rule or SNS filter evaluated to false (e.g. `detail.amount: expected numeric >= 100, got 42`).

### 8. CloudWatch Metrics & Learn Center
- **Interactive Telemetry**: Throughput (msg/s), latency distributions, queue depth over time, and DLQ spillover rates.
- **Learn Center**: Architectural breakdowns, comparison table (EventBridge vs SNS vs SQS), and AWS terminology glossary.

---

## Project Structure

```
pulsebridge/
├── src/
│   ├── engine/                  # Pure simulation modules (no UI dependencies)
│   │   ├── types.ts             # Complete AWS domain definitions
│   │   ├── eventPatternMatcher.ts # AWS EventBridge pattern matching algorithm
│   │   ├── snsFilterEngine.ts   # SNS filter policies and fan-out distribution
│   │   ├── sqsEngine.ts         # SQS Standard & FIFO state machine & dedup
│   │   ├── schedulerClock.ts    # Discrete simulation clock & speed controls
│   │   ├── archiveStore.ts      # Event archive & query engine
│   │   └── traceRecorder.ts     # Hop-by-hop distributed trace logger
│   ├── store/
│   │   ├── scenarios.ts         # Preconfigured architectures (E-Commerce, IoT, Fraud)
│   │   └── useSimulationStore.ts# Central Zustand store + simulation ticker
│   ├── components/
│   │   └── layout/              # Persistent Navbar, Sidebar, and AppLayout
│   ├── pages/                   # All 12 application pages
│   │   ├── OverviewPage.tsx
│   │   ├── EventBusPage.tsx
│   │   ├── RulesPage.tsx
│   │   ├── SNSTopicsPage.tsx
│   │   ├── SQSQueuesPage.tsx
│   │   ├── ConsumersPage.tsx
│   │   ├── LiveCanvasPage.tsx
│   │   ├── MetricsPage.tsx
│   │   ├── ChaosLabPage.tsx
│   │   ├── TraceDebuggerPage.tsx
│   │   ├── LearnPage.tsx
│   │   └── SettingsPage.tsx
│   ├── App.tsx                  # HashRouter route configuration
│   └── main.tsx                 # DOM mounting
├── tests/                       # Vitest automated test suite
│   ├── eventPatternMatcher.test.ts
│   ├── snsFilterEngine.test.ts
│   └── sqsEngine.test.ts
├── vite.config.ts               # Vite configuration (base: './')
├── tailwind.config.js           # AWS dark console color palette
└── package.json
```

---

## Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Run Unit Tests (Vitest)**:
   ```bash
   npm test
   ```

4. **Build Static Bundle**:
   ```bash
   npm run build
   ```

---

## Deploying to GitHub Pages

PulseBridge is pre-configured for static deployment on GitHub Pages:
1. `vite.config.ts` sets `base: './'`, enabling assets to load from any repository path.
2. `App.tsx` uses `HashRouter` (`/#/event-bus`, `/#/canvas`), eliminating 404 routing errors on static web hosts.

### Automated GitHub Actions Deployment
Add `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## License
MIT

