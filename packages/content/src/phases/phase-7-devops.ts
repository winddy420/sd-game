import type { Concept, Quest } from '../types';

export const PHASE_7_CONCEPTS: Concept[] = [
  {
    id: 'c-7-docker',
    title: 'Docker & Containerization',
    summary: 'Ship your app + everything it needs as one portable image. Layers, caching, and why we containerize.',
    phaseId: 'phase-7',
    body: `# Docker & Containerization

**A container** is a runnable package that bundles your app together with its dependencies, libraries, and OS userland — everything except the kernel, which it shares with the host. **Docker** is the most popular tool for building and running containers.

## Why containers?
- **"Works on my machine" → solved.** The image is the same artifact in dev, CI, and prod.
- **Lightweight**: a container starts in milliseconds and shares the host kernel (no guest OS like a VM).
- **Isolation**: each app gets its own filesystem, network, and process space.
- **Reproducible builds**: a \`Dockerfile\` is a versioned, reviewable recipe.

## Image vs Container
- An **image** is the *blueprint* — a read-only, layered filesystem snapshot.
- A **container** is a *running instance* of an image. One image → many containers.

## The Dockerfile
\`\`\`dockerfile
FROM node:20-alpine           # base image
WORKDIR /app                  # working directory inside the image
COPY package*.json ./         # copy manifest FIRST (cache-friendly)
RUN npm ci --omit=dev         # install deps
COPY . .                      # then copy source
EXPOSE 8080                   # document the port
CMD ["node", "server.js"]     # default process
\`\`\`

## Layer caching (why order matters)
Each line in a Dockerfile produces a **layer**. Docker caches layers and reuses them on the next build **if the inputs haven't changed**.

> 💡 **Rule of thumb:** copy things that change *rarely* (manifests, lockfiles) **before** things that change *often* (source code). That way \`npm ci\` is cached and a one-line code change rebuilds only the cheap final layers — not a 60-second dependency install.

## Build & run
\`\`\`bash
docker build -t app:1.0 .          # build an image, tag it, use . as context
docker run -p 8080:8080 app:1.0    # run it, map host:container port
docker ps                          # list running containers
docker logs -f <container>         # follow stdout
\`\`\`

> ⚠️ A container **does not bundle a kernel**. If your app needs a specific kernel feature, use a VM instead.
`,
  },
  {
    id: 'c-7-kubernetes',
    title: 'Kubernetes Basics',
    summary: 'Orchestrate containers at scale: pods, deployments, services, and replica sets.',
    phaseId: 'phase-7',
    prerequisites: ['c-7-docker'],
    body: `# Kubernetes Basics

Once you have more than a handful of containers, you need an **orchestrator** — something that decides *where* to run them, restarts the dead ones, and scales them up and down. **Kubernetes (K8s)** is the industry standard.

## Core objects
| Object | What it is | Why you use it |
|---|---|---|
| **Pod** | The smallest deployable unit; wraps 1+ containers | K8s doesn't run containers directly — it runs pods |
| **Deployment** | A declarative desired state for your pods | "I want 3 replicas of v2.4" — K8s makes it so |
| **ReplicaSet** | Maintains a stable set of pod replicas | Owned by a Deployment; you rarely touch it directly |
| **Service** | A stable network endpoint for a set of pods | Pods die & get new IPs; a Service gives one stable IP/DNS |

## The reconciliation loop
You declare **desired state**; Kubernetes continuously **reconciles** reality to match it.
\`\`\`
you: "I want 3 replicas of the checkout pod"
   → K8s notices only 2 are running
   → K8s schedules 1 more
   → a node crashes, taking 2 pods with it
   → K8s schedules 2 more elsewhere
\`\`\`
This self-healing is the whole point.

## A minimal Deployment
\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout
spec:
  replicas: 3
  selector:
    matchLabels: { app: checkout }
  template:
    metadata:
      labels: { app: checkout }
    spec:
      containers:
        - name: checkout
          image: registry.example.com/checkout:2.4
          ports: [{ containerPort: 8080 }]
\`\`\`

## Rolling updates & rollbacks
\`\`\`bash
kubectl apply -f deployment.yaml          # deploy / update
kubectl rollout status deployment/checkout
kubectl rollout undo deployment/checkout  # instant rollback to previous version
\`\`\`

> 💡 A **Service** load-balances across the pods behind it. So your app server only needs to talk to one stable address even as pods come and go.
`,
  },
  {
    id: 'c-7-cicd',
    title: 'CI/CD & Deployment Strategies',
    summary: 'Automate the path from commit to production: build → test → deploy, with canary and blue-green.',
    phaseId: 'phase-7',
    prerequisites: ['c-7-docker'],
    body: `# CI/CD & Deployment Strategies

**CI (Continuous Integration)** merges every commit and runs an automated pipeline. **CD (Continuous Delivery/Deployment)** takes the validated artifact and ships it to production — safely, repeatedly, and often many times a day.

## The classic pipeline
\`\`\`
push commit → build → test → package (image) → deploy
\`\`\`
Each stage **gates** the next. If tests fail, nothing reaches prod.

## GitHub Actions example
\`\`\`yaml
name: CI
on: { push: { branches: [main] } }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
      - run: docker build -t app:\${{ github.sha }} .
      - run: docker push registry.example.com/app:\${{ github.sha }}
\`\`\`

## Deployment strategies — *how* the new version takes traffic
| Strategy | How it works | When to use |
|---|---|---|
| **Rolling** | Replace old pods with new ones a few at a time | Default; cheap, good when you trust the build |
| **Blue-green** | Stand up an identical "green" env, flip the router all at once | When you need instant switch + instant rollback |
| **Canary** | Send a small % of traffic to the new version, ramp up if healthy | Risky changes; you want real-user signal before full rollout |
| **Recreate** | Kill all old, then start all new | Only when downtime is acceptable (rare) |

## Blue-green vs Canary
- **Blue-green** = "all at once, but I can flip back in one switch." Zero downtime, instant rollback, but you run 2× capacity during the swap.
- **Canary** = "dip a toe in." Route 5% → 25% → 100% while watching error rate & latency. Slower, but limits blast radius if the new version is broken.

## The golden rule
> 🚨 If a deploy goes bad, **roll back first, debug later.** Every minute you spend "investigating" is a minute users are seeing errors. \`kubectl rollout undo\` is faster than reading logs.
`,
  },
  {
    id: 'c-7-terraform',
    title: 'Infrastructure as Code (Terraform)',
    summary: 'Declare your infrastructure; let the tool figure out the diff. plan → apply → reviewed, reproducible infra.',
    phaseId: 'phase-7',
    prerequisites: ['c-7-docker'],
    body: `# Infrastructure as Code (Terraform)

**Infrastructure as Code (IaC)** means you describe servers, databases, networks, and load balancers in *code* — version-controlled, peer-reviewed, and reproducible — instead of clicking around a cloud console.

**Terraform** is the most popular IaC tool. It is **declarative**: you say *what* you want; Terraform figures out *how* to get there.

## Declarative vs imperative
- **Declarative** ("I want 3 subnets") — Terraform compares desired vs actual state and produces a plan. Idempotent: running it twice does nothing the second time.
- **Imperative** ("create a subnet, then create another…") — scripts, CLI one-liners. Order-dependent and drifts from reality.

## A tiny example
\`\`\`hcl
resource "aws_db_instance" "primary" {
  engine         = "postgres"
  instance_class = "db.t3.medium"
  allocated_storage = 50
  name           = "scaleup"
  username       = var.db_user
  password       = var.db_password   # never hardcode secrets
}
\`\`\`

## The two-command workflow
\`\`\`bash
terraform plan      # show the diff: what will be created/changed/destroyed
terraform apply     # execute the plan (use the reviewed plan file in CI)
\`\`\`

| Stage | What it does | Why it matters |
|---|---|---|
| \`plan\` | Computes the diff between your code and the real cloud | You **review** before anything changes |
| \`apply\` | Performs the change | Only runs what was planned |
| \`destroy\` | Tears everything down | Useful for ephemeral envs; dangerous in prod |

## Why it wins
- 🕵️ **Reviewable**: every infra change is a pull request, not a click.
- 🔄 **Reproducible**: spin up a whole env in minutes; recreate it after a region fails.
- 🧾 **Auditable**: \`git blame\` tells you who changed what and when.

> ⚠️ **State file**: Terraform tracks reality in a \`terraform.tfstate\` file. Store it remotely (S3 + lock table) — never commit it, and never let two people \`apply\` at once.
`,
  },
  {
    id: 'c-7-observability',
    title: 'Observability: Metrics, Logs, Traces',
    summary: 'Know what is happening inside your system. Prometheus metrics, Grafana dashboards, OpenTelemetry traces, and logs.',
    phaseId: 'phase-7',
    prerequisites: ['c-7-cicd'],
    body: `# Observability

**Monitoring** tells you *when* something is wrong. **Observability** lets you figure out *why*. A system is observable when you can answer novel questions about it without shipping new code.

## The three pillars
| Pillar | Answers | Tool |
|---|---|---|
| **Metrics** | "Is p95 latency up? Error rate? CPU?" aggregated numbers | **Prometheus** |
| **Logs** | "What did this one request print?" discrete events | Loki / ELK |
| **Traces** | "Where did the 800 ms go across services?" one request's path | **OpenTelemetry** → Jaeger/Tempo |

## The RED and USE methods
- **RED** (for services): **R**ate, **E**rrors, **D**uration (latency) — the three numbers every endpoint needs.
- **USE** (for resources): **U**tilization, **S**aturation, **E**rrors — for CPU, disk, network.

## Prometheus + Grafana
\`\`\`
your app  --(exposes /metrics)-->  Prometheus  --(queries)-->  Grafana dashboard
\`\`\`
Prometheus **scrapes** your app's \`/metrics\` endpoint every few seconds and stores time series. Grafana **visualizes** them and fires alerts.

A typical metric:
\`\`\`promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
\`\`\`
→ your p95 latency over the last 5 minutes.

## OpenTelemetry tracing
A **trace** follows one request across every service it touches. Each step is a **span**. When checkout is slow, the trace tells you *which* span — auth, DB, payment — ate the time.

\`\`\`
POST /checkout            [span: 820ms]
 ├─ auth.verify()         [span:  12ms]
 ├─ db.query(user)        [span:  18ms]
 ├─ payment.charge()      [span: 760ms]   ← here's the culprit
 └─ db.write(order)       [span:  22ms]
\`\`\`

## Alerts & SLOs
- Set an **SLO** (e.g. "p95 < 200ms for 99.9% of 28-day window").
- Alert on **burn rate** toward that SLO — not on "CPU > 80%", which is just a number.
- Every alert must be **actionable**. A noisy alert that everyone ignores is worse than no alert.

> 💡 Logs are for *debugging*. Metrics are for *alerting*. Traces are for *explaining*. You need all three.
`,
  },
];

export const PHASE_7_QUESTS: Quest[] = [
  /* ---- 1. Lesson: Docker ---- */
  {
    id: 'q-7-lesson-docker',
    type: 'lesson',
    title: 'Docker Fundamentals',
    phaseId: 'phase-7',
    order: 1,
    xpReward: 100,
    conceptId: 'c-7-docker',
    questions: [
      {
        id: 'q1',
        prompt:
          'Your container image is 50MB but the equivalent VM image is 2GB. What does the container image leave out that makes it so much smaller?',
        options: [
          'Your application source code',
          'The kernel — containers share the host kernel instead of bundling a full guest OS',
          'Your runtime dependencies (Node, pip packages)',
          'The OS userland (shell, coreutils)',
        ],
        correctIndex: 1,
        explanation:
          'A container image bundles app + deps + userland but shares the host kernel; a VM bundles a whole guest OS. That is why the container is far smaller and starts in milliseconds.',
      },
      {
        id: 'q2',
        prompt: 'Why does Dockerfile layer caching matter?',
        options: [
          'It makes the final image smaller',
          'It speeds up rebuilds by reusing unchanged layers instead of redoing them',
          'It is required for Kubernetes to schedule the pod',
          'It improves runtime performance of the container',
        ],
        correctIndex: 1,
        explanation: 'Layers above a changed line are reused (cached); the changed line and everything below it are rebuilt. Putting rarely-changing steps (like `npm ci`) first means code edits rebuild only the cheap layers below.',
      },
      {
        id: 'q3',
        prompt:
          "A teammate's Dockerfile has `RUN cp ./app /srv/app` and it fails — `./app` is not found. What is wrong, and how do they fix it?",
        options: [
          '`RUN` runs inside the container where the build context does not exist — use `COPY ./app /srv/app` to bring files in from the build context',
          'Nothing is wrong — just rerun the build',
          'Replace `RUN` with `FROM`',
          'Replace `RUN` with `CMD`',
        ],
        correctIndex: 0,
        explanation:
          '`RUN` executes a process *inside* the container filesystem, which has no access to your build context. `COPY <src> <dest>` is the directive that pulls files from the build context into the image. FROM picks the base image; CMD sets the default process.',
      },
      {
        id: 'q4',
        prompt: 'You want to maximize cache reuse for a Node app. Where should `COPY package*.json ./` go?',
        options: [
          'At the very end of the Dockerfile',
          'Right after `COPY . .`',
          'Before `COPY . .`, so dependency install is cached and only reruns when manifests change',
          'Order does not matter — Docker caches everything regardless',
        ],
        correctIndex: 2,
        explanation: 'Copy manifests first, run `npm ci`, then copy source. Code edits change only the final layers; deps stay cached until package.json itself changes.',
      },
    ],
  },

  /* ---- 2. Command Lab: Docker CLI ---- */
  {
    id: 'q-7-command-docker',
    type: 'command',
    title: 'Docker CLI Lab',
    phaseId: 'phase-7',
    order: 2,
    xpReward: 150,
    intro: 'Containerize the new checkout service. Build the image, run it, and verify it is up.',
    prerequisites: ['q-7-lesson-docker'],
    steps: [
      {
        prompt: 'Build a Docker image from the Dockerfile in the current directory, tagged `app`.',
        acceptedPatterns: [
          '^docker\\s+build\\s+(-t|--tag)\\s+\\S+\\s+\\.\\s*$',
          '^docker\\s+build\\s+.*\\s(-t|--tag)\\s+\\S+\\s+\\.\\s*$',
        ],
        sampleAnswer: 'docker build -t app .',
        hint: '`docker build -t <name> <context>` — `-t` tags the image; `.` means use the current directory as the build context.',
      },
      {
        prompt: 'Run the image, publishing host port 8080 to container port 8080.',
        acceptedPatterns: [
          '^docker\\s+run\\s+.*(-p|--publish)\\s+\\d+:\\d+.*$',
        ],
        sampleAnswer: 'docker run -p 8080:8080 app',
        hint: '`docker run -p <host>:<container> <image>` maps a host port to a container port.',
      },
      {
        prompt: 'List your running containers (or follow the logs of the one you just started).',
        acceptedPatterns: [
          '^docker\\s+ps\\b.*$',
          '^docker\\s+container\\s+ls\\b.*$',
          '^docker\\s+logs\\s+.*\\S.*$',
        ],
        sampleAnswer: 'docker ps',
        hint: '`docker ps` lists running containers; `docker logs -f <container>` follows its output.',
      },
    ],
  },

  /* ---- 3. Lesson: Kubernetes ---- */
  {
    id: 'q-7-lesson-kubernetes',
    type: 'lesson',
    title: 'Kubernetes Fundamentals',
    phaseId: 'phase-7',
    order: 3,
    xpReward: 100,
    conceptId: 'c-7-kubernetes',
    prerequisites: [],
    questions: [
      {
        id: 'q1',
        prompt:
          'You tell a junior "just deploy the container to Kubernetes" and they cannot — Kubernetes rejects a bare container. What must they wrap it in, and why?',
        options: [
          'A Node — containers must be assigned to a physical machine first',
          'A Pod — Kubernetes schedules Pods (which hold one or more containers), not raw containers; the Pod is the smallest deployable unit',
          'A Deployment — you cannot run anything without declaring a replica count',
          'A container is fine, they just need to retry the command',
        ],
        correctIndex: 1,
        explanation:
          'Kubernetes does not run containers directly — it wraps them in Pods. A Pod is the smallest deployable unit and can hold one or more tightly-coupled containers that share network and storage.',
      },
      {
        id: 'q2',
        prompt: 'What does a Kubernetes Service provide?',
        options: [
          'Persistent storage for pods',
          'A stable network endpoint (IP/DNS) for a set of pods, even as those pods come and go',
          'The blueprint for a container image',
          'A way to build Docker images',
        ],
        correctIndex: 1,
        explanation:
          'Pods are ephemeral — they get new IPs whenever they are recreated. A Service sits in front and exposes one stable IP/DNS name, load-balancing across whatever pods currently match its selector.',
      },
      {
        id: 'q3',
        prompt:
          'How does Kubernetes react when a node crashes and kills pods that a Deployment expects to be running?',
        options: [
          'It requires manual intervention to recover',
          'Its reconciliation loop notices the drift and reschedules replacement pods on healthy nodes',
          'It restarts the crashed node first',
          'It reverts the Deployment spec to zero replicas',
        ],
        correctIndex: 1,
        explanation:
          'You declare desired state (for example, 3 replicas). Kubernetes continuously reconciles reality to match. If a node dies and takes pods with it, K8s schedules replacements elsewhere — this self-healing is the whole point.',
      },
      {
        id: 'q4',
        prompt:
          'Which object do you typically author to declaratively manage a set of replicated pods with rolling updates?',
        options: ['A ReplicaSet, directly', 'A Pod', 'A Deployment', 'A Service'],
        correctIndex: 2,
        explanation:
          'A Deployment wraps a ReplicaSet and adds declarative rolling updates and rollbacks. The ReplicaSet is owned and managed by the Deployment, so you rarely touch it directly.',
      },
    ],
  },

  /* ---- 4. Command Lab: Kubernetes CLI ---- */
  {
    id: 'q-7-command-k8s',
    type: 'command',
    title: 'kubectl Lab',
    phaseId: 'phase-7',
    order: 4,
    xpReward: 150,
    intro: 'You deployed the checkout service to Kubernetes. Verify it is healthy and roll out an update.',
    prerequisites: ['q-7-command-docker'],
    steps: [
      {
        prompt: 'List all pods in the current namespace.',
        acceptedPatterns: [
          '^kubectl\\s+get\\s+pods?\\b.*$',
          '^kubectl\\s+get\\s+po\\b.*$',
          '^kubectl\\s+get\\s+all\\b.*$',
        ],
        sampleAnswer: 'kubectl get pods',
        hint: '`kubectl get pods` (or `po` for short) shows every pod and its status.',
      },
      {
        prompt: 'Inspect details of a specific pod (use any pod name, e.g. `checkout-abc123`).',
        acceptedPatterns: [
          '^kubectl\\s+describe\\s+pod\\s+\\S+.*$',
          '^kubectl\\s+describe\\s+po\\s+\\S+.*$',
          '^kubectl\\s+describe\\s+\\S+\\s+\\S+.*$',
        ],
        sampleAnswer: 'kubectl describe pod checkout-abc123',
        hint: '`kubectl describe pod <name>` shows events, resource requests, and why a pod might be stuck.',
      },
      {
        prompt: 'Watch the rollout of the `checkout` deployment — or apply a manifest to update it.',
        acceptedPatterns: [
          '^kubectl\\s+rollout\\s+status\\s+deployment/\\S+.*$',
          '^kubectl\\s+rollout\\s+status\\s+deployment\\s+\\S+.*$',
          '^kubectl\\s+apply\\s+(-f|--filename)\\s+\\S+.*$',
        ],
        sampleAnswer: 'kubectl rollout status deployment/checkout',
        hint: '`kubectl rollout status deployment/<name>` blocks until the rollout finishes; `kubectl apply -f <file.yaml>` ships a new manifest.',
      },
    ],
  },

  /* ---- 5. Lesson: Terraform ---- */
  {
    id: 'q-7-lesson-terraform',
    type: 'lesson',
    title: 'Infrastructure as Code with Terraform',
    phaseId: 'phase-7',
    order: 5,
    xpReward: 100,
    conceptId: 'c-7-terraform',
    prerequisites: [],
    questions: [
      {
        id: 'q1',
        prompt: 'Terraform is described as declarative. What does that mean in practice?',
        options: [
          'You write step-by-step commands telling the tool exactly how to create each resource',
          'You describe the desired end state and Terraform computes the diff and figures out how to reach it',
          'It can only manage infrastructure through long-lived shell scripts',
          'It only works inside containers',
        ],
        correctIndex: 1,
        explanation:
          'Declarative means you write what you want (for example, 3 subnets), and Terraform compares desired vs actual state to produce a plan. Running it twice is idempotent — nothing happens the second time.',
      },
      {
        id: 'q2',
        prompt: 'What is the purpose of `terraform plan`?',
        options: [
          'It applies changes to the real cloud',
          'It previews the diff — what will be created, changed, or destroyed — without modifying anything',
          'It deletes every resource tracked in state',
          'It initializes the working directory and downloads providers',
        ],
        correctIndex: 1,
        explanation:
          '`terraform plan` computes the diff between your code and the real cloud and prints it, so you can review what would change before anything is touched. The change is executed separately by `terraform apply`.',
      },
      {
        id: 'q3',
        prompt:
          'Why should Terraform state files be stored remotely (for example, in S3 with a lock table) and never committed to git?',
        options: [
          'Because they are too large for git to store',
          'To prevent concurrent runs from corrupting state and to keep secrets out of version control',
          'Because Terraform refuses to read local state files',
          'So that resources are recreated automatically on every run',
        ],
        correctIndex: 1,
        explanation:
          'State tracks reality and may contain secrets. Remote state with locking prevents two operators from running `apply` at once and corrupting it, and keeping it out of git avoids leaking sensitive values.',
      },
      {
        id: 'q4',
        prompt: 'What makes Terraform idempotent?',
        options: [
          'Each run re-creates every resource from scratch',
          'Running it twice produces the same end state — the second run finds nothing to change',
          'It can only be run once per project',
          'It randomizes resource names on each apply',
        ],
        correctIndex: 1,
        explanation:
          'Because Terraform reconciles declared desired state against real state, applying the same config a second time finds them already matching and does nothing.',
      },
    ],
  },

  /* ---- 6. Command Lab: Terraform CLI ---- */
  {
    id: 'q-7-command-terraform',
    type: 'command',
    title: 'Terraform Lab',
    phaseId: 'phase-7',
    order: 6,
    xpReward: 150,
    intro: 'Provision a new Postgres instance with Terraform. Review the change before applying it.',
    prerequisites: ['q-7-command-k8s'],
    steps: [
      {
        prompt: 'Preview the changes Terraform will make (the diff between your code and the real cloud).',
        acceptedPatterns: ['^terraform\\s+plan\\b.*$'],
        sampleAnswer: 'terraform plan',
        hint: '`terraform plan` computes the diff and shows what will be created, changed, or destroyed — without touching anything yet.',
      },
      {
        prompt: 'Apply the change to actually provision the resources.',
        acceptedPatterns: [
          '^terraform\\s+apply\\b.*$',
        ],
        sampleAnswer: 'terraform apply',
        hint: '`terraform apply` executes the plan. In CI you would run `terraform apply -auto-approve` on a reviewed plan file.',
      },
    ],
  },

  /* ---- 7. Lesson: CI/CD & deployment strategies ---- */
  {
    id: 'q-7-lesson-cicd',
    type: 'lesson',
    title: 'CI/CD & Deployment Strategies',
    phaseId: 'phase-7',
    order: 7,
    xpReward: 100,
    conceptId: 'c-7-cicd',
    prerequisites: ['q-7-command-terraform'],
    questions: [
      {
        id: 'q1',
        prompt: 'What is the correct order of a typical CI/CD pipeline?',
        options: [
          'Deploy → Test → Build',
          'Build → Test → Deploy',
          'Test → Deploy → Build',
          'Deploy → Build → Test',
        ],
        correctIndex: 1,
        explanation: 'You build once, test the artifact, then deploy the exact same artifact that passed tests. Never build separately for prod.',
      },
      {
        id: 'q2',
        prompt: 'Which strategy routes a small percentage of traffic to the new version, ramping up if it is healthy?',
        options: ['Rolling', 'Canary', 'Blue-green', 'Recreate'],
        correctIndex: 1,
        explanation: 'Canary exposes the new version to a small slice of real traffic first (5% → 25% → 100%), limiting blast radius if it is broken.',
      },
      {
        id: 'q3',
        prompt: 'What is the main benefit of blue-green deployment?',
        options: [
          'It reduces image size',
          'Zero downtime switch and instant rollback by flipping traffic back to the old environment',
          'It costs less because you run only one environment',
          'It skips the testing stage',
        ],
        correctIndex: 1,
        explanation: 'Blue-green runs two full environments and flips the router between them. Rollback is one switch — but you pay for 2× capacity during the swap.',
      },
      {
        id: 'q4',
        prompt: 'During a canary rollout, the new version shows an elevated 5xx error rate. What is the correct action?',
        options: [
          'Wait a few minutes and see if it self-resolves',
          'Roll the canary back immediately, then debug',
          'Roll forward — push another new version on top to overwrite the bug',
          'Route 100% of traffic to the new version to get more signal',
        ],
        correctIndex: 1,
        explanation: 'Roll back first, debug later. Every second users hit errors is real harm. `kubectl rollout undo` is faster than reading logs.',
      },
    ],
  },

  /* ---- 8. Lesson: Observability ---- */
  {
    id: 'q-7-lesson-observability',
    type: 'lesson',
    title: 'Observability: Metrics, Logs, Traces',
    phaseId: 'phase-7',
    order: 8,
    xpReward: 100,
    conceptId: 'c-7-observability',
    prerequisites: [],
    questions: [
      {
        id: 'q1',
        prompt:
          'Which pillar of observability tells you where the 800ms went across services for a single request?',
        options: ['Metrics', 'Logs', 'Traces', 'Alerts'],
        correctIndex: 2,
        explanation:
          'A trace follows one request across every service it touches, broken into spans. When latency spikes, the trace shows which span — auth, DB, payment — ate the time.',
      },
      {
        id: 'q2',
        prompt: 'Under the RED method, which three numbers should you track for every service endpoint?',
        options: [
          'Requests, Events, Deadlocks',
          'Rate, Errors, Duration',
          'RAM, Egress, Disks',
          'Replicas, Environments, Deployments',
        ],
        correctIndex: 1,
        explanation:
          'RED = Rate (requests/s), Errors (error rate), Duration (latency). Together they capture the health of any service endpoint.',
      },
      {
        id: 'q3',
        prompt: 'In the Prometheus + Grafana stack, what does Prometheus do?',
        options: [
          'It renders dashboards in the browser',
          'It scrapes the /metrics endpoint of each app on a schedule and stores the resulting time series',
          'It tails your application logs',
          'It distributes traffic across pods',
        ],
        correctIndex: 1,
        explanation:
          'Prometheus pulls (scrapes) metrics from the `/metrics` endpoint of each app every few seconds and stores them as time series. Grafana queries Prometheus to render dashboards and fire alerts.',
      },
      {
        id: 'q4',
        prompt: 'According to the lesson, which is the most actionable way to alert?',
        options: [
          'Fire whenever CPU usage exceeds 80%',
          'Alert on burn rate toward an SLO (e.g. p95 under 200ms for 99.9% of requests) so pages reflect user-visible harm',
          'Page on every warning log line',
          'Send one alert per minute regardless of severity',
        ],
        correctIndex: 1,
        explanation:
          'CPU at 80% is just a number — it may be fine. Alerting on burn rate against an SLO ties pages to real user impact, and every page is actionable. A noisy alert everyone ignores is worse than no alert.',
      },
    ],
  },

  /* ---- 9. Incident: bad deploy ---- */
  {
    id: 'q-7-incident-deploy',
    type: 'incident',
    title: 'Incident: Bad Deploy',
    phaseId: 'phase-7',
    order: 9,
    xpReward: 200,
    failureDescription:
      "03:12 — right after the v2.4 deploy of the checkout service went to 100%, the error rate jumped from 0.1% to 18% and p95 latency on /checkout spiked from 200ms to 2s. The on-call pager is on fire.",
    symptoms: [
      'Error rate spiked to 18% immediately after the v2.4 rollout completed',
      '97% of the errors are HTTP 500 from the /checkout endpoint',
      'v2.4 bumped the payment-client library to a new major version',
      'DB CPU, network, and pod counts are all normal — only /checkout is affected',
      'The previous version (v2.3) had a 0.1% error rate for the past two weeks',
    ],
    prerequisites: ['q-7-lesson-cicd'],
    steps: [
      [
        {
          id: 'a',
          label: 'Restart all checkout pods to clear bad state',
          isCorrect: false,
          feedback:
            'Wrong — the pods are not in a bad state, the code is. Restarting them just spins up more broken pods. You would burn time and the error rate would not drop.',
        },
        {
          id: 'b',
          label: 'Roll back to v2.3 immediately, then debug v2.4 offline',
          isCorrect: true,
          feedback:
            'Correct. Roll back first, debug later. `kubectl rollout undo deployment/checkout` restores the known-good version in seconds, users stop seeing errors, and you can investigate the payment-client library bump without a live fire.',
        },
        {
          id: 'c',
          label: 'Scale checkout from 3 to 15 replicas to handle the errors',
          isCorrect: false,
          feedback:
            'Wrong — this is a software defect, not a capacity problem. CPU and pod counts are normal. More replicas means more pods returning 500s, faster.',
        },
        {
          id: 'd',
          label: 'Add a canary stage to the pipeline and redeploy v2.4',
          isCorrect: false,
          feedback:
            'Wrong direction for right now. A canary stage is a great *future* improvement, but it does not stop the current bleeding. Roll back now; add the canary guardrail afterward.',
        },
      ],
      [
        {
          id: 'a',
          label:
            'Add an automated canary rollout with SLO-based auto-rollback, so a bad build never reaches 100% of traffic again',
          isCorrect: true,
          feedback:
            'Correct. Ship to a small slice first, watch error-rate/latency SLOs, and auto-roll back on breach. The bad build would have been caught at 5% instead of 100%.',
        },
        {
          id: 'b',
          label: 'Schedule all deploys for 3am so fewer users notice the errors',
          isCorrect: false,
          feedback:
            'Wrong — this hides the symptom, it does not prevent the defect from shipping. Off-hours deploys also mean the on-call is alone and groggy when it breaks.',
        },
        {
          id: 'c',
          label: 'Pin every dependency forever and never bump a library again',
          isCorrect: false,
          feedback:
            'Wrong. Never updating means you accumulate known CVEs and fall behind. The fix is a controlled rollout + dependency tests, not freezing.',
        },
        {
          id: 'd',
          label: 'Remove the staging environment so deploys are faster',
          isCorrect: false,
          feedback:
            'Wrong — removing a pre-prod stage removes your last chance to catch the bug before users. You want *more* validation gates, not fewer.',
        },
      ],
    ],
  },

  /* ---- 9b. Architecture: zero-downtime rollout runtime ---- */
  {
    id: 'q-7-arch-rollout',
    type: 'architecture',
    title: 'Design a Zero-Downtime Rollout Runtime',
    phaseId: 'phase-7',
    order: 10,
    xpReward: 300,
    brief:
      'The payments API must keep serving while you roll out new versions. Design a runtime that stays available during a deploy at 4,000 rps, p95 under 90 ms, 99.9% availability, under $2,000/month. The lesson from the bad-deploy incident: a safe rollout needs **spare capacity** — multiple app replicas behind a load balancer so you can drain and replace one at a time without dropping users. Single points of failure are not allowed.',
    allowedComponents: ['lb-l7-nginx', 'app-node', 'db-postgres', 'redis'],
    requiredComponentTypes: ['loadBalancer', 'appServer', 'dbSQL'],
    target: {
      minRps: 4_000,
      maxLatencyP95: 90,
      maxCostPerMonth: 1_850,
      minAvailability: 0.999,
    },
    traffic: { rps: 4_000, readRatio: 0.85 },
    prerequisites: ['q-7-incident-deploy'],
  },

  /* ---- 11. Capstone: Resilient deployment pipeline runtime ---- */
  {
    id: 'q-7-capstone',
    type: 'architecture',
    title: 'Capstone: Resilient Production Runtime',
    phaseId: 'phase-7',
    order: 11,
    xpReward: 500,
    brief:
      "You are now the platform lead. Design the production runtime for ScaleUp's checkout service — the path requests take at runtime — that can survive 10,000 rps with p95 under 100ms, four-9s (99.99%) availability, under $4,500/month. This is the DevOps phase: think about how you ship code safely and observe it. Front it with a load balancer, run multiple app replicas for self-healing, back it with durable SQL storage, and put a queue in front to absorb bursts so a bad deploy or a downstream hiccup does not take the whole system down.",
    allowedComponents: ['lb-l7-nginx', 'app-node', 'db-postgres', 'redis', 'kafka'],
    requiredComponentTypes: ['loadBalancer', 'appServer', 'dbSQL', 'queue'],
    target: {
      maxLatencyP95: 100,
      minRps: 10_000,
      minAvailability: 0.9999,
      maxCostPerMonth: 2_400,
    },
    traffic: { rps: 10_000, readRatio: 0.85 },
    prerequisites: ['q-7-incident-deploy'],
  },
];
