# OPSFORGE — Product Requirements

> Status: **Proposed — awaiting approval.** No application code has been written against this document.
> Source of truth: `docs/Neural_Ops_Master_Product_Technical_Specification.pdf` (35 pp.). The visual reference is `docs/prototype/` (v2, light-neutral).
> The product was called "Neural Ops — DevOps Interview Brain" in the spec; it is now **OPSFORGE** (see [ADR-0001](ADR/0001-product-name-and-module-naming.md)).

## 0. Conventions

- **Spec references.** `§P4` = the spec section titled "Phase 4 — Architecture Studio". `§A`, `§B`, `§C` = Appendices A, B, C. The spec also contains an *implementation roadmap* with its own Phase 0–9; those are cited as `RP0`–`RP9` to avoid confusion (see TODO A-03).
- **Requirement IDs** are `<MODULE>-<nn>`. Every bullet of the spec is mapped to at least one ID. Nothing has been dropped or simplified. Where I added a requirement that is *not* in the spec, it is tagged `[ADDED]` and listed again in §9 so you can veto it.
- **Priority** is not assigned here; sequencing lives in [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md).
- Items from the prototype that are not in the spec are tagged `[PROTO]`.

## 1. Product vision (§P0)

OPSFORGE is an AI-powered, **evidence-based** DevOps / DevSecOps / SRE / Cloud / Platform interview-readiness platform. It combines learning, recall, hands-on practice, troubleshooting, production simulation, architecture design, AI interviewing, resume interrogation, JD analysis, behavioral preparation and full interview simulation into one continuous readiness system.

- **Primary user goal:** crack Senior DevOps/DevSecOps/SRE/Cloud/Platform interviews, not merely read documentation.
- **Core product question:** *"If I attend a Senior DevOps interview today, where will I fail, and what should I do today to fix it?"*
- **North-star outcome (§Final):** when asked *"Am I ready for a Senior DevOps interview today?"* the system answers with evidence, identifies exactly where the candidate is likely to fail, and produces the highest-value actions to close the gaps.
- **Core principle:** a user must not be marked proficient because they read documentation; understanding, recall, application, troubleshooting and explanation each require evidence.

### 1.1 Core learning loop (must be representable as a state flow in the product)

READ → UNDERSTAND → RECALL → PRACTICE → APPLY → TROUBLESHOOT → EXPLAIN → INTERVIEW → SCORE → FIND WEAKNESS → TARGETED LEARNING → RE-TEST

### 1.2 Five flagship capabilities

| Capability | Brand module | Purpose |
|---|---|---|
| Architecture Studio | ForgeArchitect | Visually design architectures, validate requirements, deterministic + AI review, iterate, inject failures, compare versions |
| Production Simulator | ForgeOps | Investigate realistic incidents with evidence, terminal and telemetry; mitigate, RCA, prevent |
| AI Interviewer | ForgeInterview | Dynamic technical/architecture/behavioral interviews grounded in resume/JD with adaptive follow-ups |
| Hands-on Labs | ForgeLab | Prove practical ability: Linux, Docker, Kubernetes, Terraform, CI/CD, cloud operational tasks |
| Readiness Engine | ForgeReady | Continuously combine evidence into a Senior DevOps Interview Readiness Score and a targeted daily plan |

## 2. Product principles / non-negotiables (§C, all 20)

These are binding acceptance criteria for every phase.

| ID | Principle |
|---|---|
| PR-01 | Interview readiness is an evidence problem, not a content-consumption problem. |
| PR-02 | Documentation is a knowledge source, not the complete learning experience. |
| PR-03 | Official sources and AI-generated material retain distinct provenance. |
| PR-04 | Deterministic systems remain authoritative for scoring and readiness thresholds. |
| PR-05 | LLMs support reasoning and generation; they never silently define the user's readiness. |
| PR-06 | Every major weakness leads to an actionable next step. |
| PR-07 | Every wrong answer becomes learning data. |
| PR-08 | Hands-on ability is represented separately from theoretical knowledge. |
| PR-09 | Knowledge and confidence are measured separately. |
| PR-10 | Architecture is evaluated against explicit requirements. |
| PR-11 | Troubleshooting rewards evidence-driven investigation and clarifying questions. |
| PR-12 | Senior-level preparation includes communication, leadership and behavioral evidence. |
| PR-13 | The UI is engaging but never undermines professional interview preparation. |
| PR-14 | 3D and animation communicate system state, relationships or progress — never mere decoration. |
| PR-15 | Accessibility and reduced-motion behavior are first-class requirements. |
| PR-16 | The product is a real React + TypeScript + MUI implementation, not a static HTML prototype. |
| PR-17 | Every major feature contributes measurable evidence to the readiness engine. |
| PR-18 | Historical attempts and evaluations are retained for replay and trend analysis. |
| PR-19 | Security and sandbox isolation are mandatory for any real command execution or cloud lab. |
| PR-20 | The ultimate outcome is confidence grounded in demonstrated capability. |

## 3. Module inventory

| # | Module (brand) | Spec feature | Spec § | In nav (§P15)? | Prototype page |
|---|---|---|---|---|---|
| M01 | **Command Center** | Dashboard | P15 | Yes (COMMAND) | `dashboard` |
| M02 | **ForgeLearn** | Knowledge Hub, reading mode, mind maps, infographics | P1 | Yes (Knowledge) | `knowledge` |
| M03 | **Documents** | Document ingestion & library, provenance | P1, P16 | Yes (Documents) | `documents` |
| M04 | **ForgeCards** | Flashcards + spaced repetition | P1 | Yes (Flashcards) | `flashcards` |
| M05 | **Questions** | Question bank, question & scenario engine | P3 | Yes (Questions) | `questions` |
| M06 | **ForgeOps** | Production Incident Simulator & Chaos | P5 | Yes (Incidents) | `incidents` |
| M07 | **ForgeLab** | Hands-on Labs & Terminal | P6 | Yes (Hands-on Labs) | `labs` |
| M08 | **ForgeArchitect** | Architecture Studio | P4 | Yes (Architecture Studio) | `architecture` |
| M09 | **Patterns** | Architecture pattern library | P4 | Yes (Patterns) | `patterns` |
| M10 | **ForgeInterview** | AI Interviewer, Full Interview Day, Emergency Mode, Replay | P9, P12 | Yes (AI Interviewer) | `interviewer` |
| M11 | **ForgeResume** | Resume Interrogation | P9 | Yes | `resume` |
| M12 | **ForgeJD** | JD Analyzer | P9 | Yes | `jd` |
| M13 | **ForgeReady** | Readiness Engine, adaptive plan, analytics | P11 | Yes (Readiness) | `analytics` |
| M14 | **Observability Studio** | Telemetry design & troubleshooting | P7 | **No** — see TODO A-06 | — |
| M15 | **CI/CD & DevSecOps Studio** | Pipeline design, DevSecOps, security incidents | P8 | **No** — see TODO A-06 | — |
| M16 | **Behavioral & Communication** | Behavioral prep, STAR DB, communication coach | P10 | **No** — see TODO A-06 | — |
| P1 | **AI Platform** (cross-cutting) | Provider abstraction, RAG, evaluation, guardrails | P2 | n/a | — |
| P2 | **Evidence & Data Platform** (cross-cutting) | Evidence model, provenance, replay | P16 | n/a | — |
| P3 | **Design System & Motion** (cross-cutting) | Theme, motion, 3D | P13, P14 | n/a | — |

M14–M16 are specified in detail in the spec but are absent from the navigation structure and from the implementation roadmap. They are retained in full; their placement is an open decision (TODO A-06).

## 4. Functional requirements

### 4.1 M01 Command Center (§P15)

| ID | Requirement |
|---|---|
| CMD-01 | Readiness ring showing the current readiness score. |
| CMD-02 | Skill metrics. |
| CMD-03 | "Focus today" — today's adaptive plan items with durations. |
| CMD-04 | Skill matrix (per technology, evidence-based). |
| CMD-05 | "Continue training" — resume prior work (architecture, incident, interview). |
| CMD-06 | Adaptive recommendations. |
| CMD-07 | Recent evidence feed. |
| CMD-08 `[PROTO]` | "Start today's plan" primary action; trend vs previous week. |

### 4.2 M02 ForgeLearn — Knowledge Hub (§P1)

| ID | Requirement |
|---|---|
| LRN-01 | A Knowledge Hub **per technology** with 13 facets: Learn, Documentation, Mind Maps, Infographics, Flashcards, Questions, Commands, Troubleshooting, Incidents, Architecture, Labs, Interview, Progress. |
| LRN-02 | Learn: structured concepts and progressive learning paths. |
| LRN-03 | Documentation: official and personal source material, each with provenance. |
| LRN-04 | Commands: practical command references. |
| LRN-05 | Troubleshooting: guided diagnostic workflows. |
| LRN-06 | Incidents / Architecture / Labs / Interview facets deep-link to the corresponding module filtered by technology. |
| LRN-07 | Progress facet: evidence, weakness, confidence and mastery tracking per technology. |
| LRN-08 | Technology coverage per §A: Linux, Git, Networking, AWS, Azure, Kubernetes, Docker, Terraform, Helm, ArgoCD, Jenkins, CI/CD, Ansible, Python, PostgreSQL, Kafka, Redis, Prometheus, Grafana, OpenTelemetry, Security/DevSecOps, Cloud architecture, Distributed systems, Observability, Reliability engineering. |
| LRN-09 | Mind maps: Kubernetes → Control Plane / Networking / Storage / Security / Observability. |
| LRN-10 | Infographics/mind maps for: CI/CD architecture & release flow; Terraform workflow; AWS networking; GitOps; zero-downtime deployment; disaster recovery; microservices. |
| LRN-11 `[PROTO]` | Knowledge map visualization showing connected concepts (prototype: "124 connected concepts"). |
| LRN-12 `[PROTO]` | Per-technology mastery score, "Continue learning" and "Target weakness" actions. |

### 4.3 M03 Documents & ingestion (§P1, §P16)

| ID | Requirement |
|---|---|
| DOC-01 | Ingest **official documentation** for: AWS, Azure, Kubernetes, Docker, Terraform, Jenkins, ArgoCD, Helm, Ansible, Linux, Git, Python, PostgreSQL, Kafka, Redis, Prometheus, Grafana, networking, DevSecOps. |
| DOC-02 | Ingest **personal material**: resume, project documentation, runbooks, architecture diagrams, troubleshooting notes, commands, interview notes, previous interview feedback. |
| DOC-03 | Ingest **job descriptions** and company-specific material. |
| DOC-04 | Source provenance preserved on every document and chunk; official source material is never confused with AI-generated interpretation. |
| DOC-05 | Provenance types: Official documentation, Personal note, Runbook, AI generated, Interview question, Incident, Lab, Architecture, Interview. |
| DOC-06 | Pipeline: upload/import → chunking → indexing (embeddings in pgvector) → availability to RAG; run as background jobs. |
| DOC-07 | Reading mode: full-document reading. |
| DOC-08 | Select text and invoke AI actions: explain, simplify, give examples, explain architecture, generate a question, create a flashcard, add a note, connect related topics. |
| DOC-09 | AI assistance is context-aware and grounded in the selected source. |
| DOC-10 `[PROTO]` | Document library table: name, source (Official/Personal), topics, status (Indexed / Interview-ready). |
| DOC-11 | Document access controls; PII/secret redaction where appropriate; prompt-injection defense for retrieved documents (see NFR-SEC). |

### 4.4 M04 ForgeCards (§P1)

| ID | Requirement |
|---|---|
| CRD-01 | Card types: concepts, commands, differences, architecture, troubleshooting facts. |
| CRD-02 | Track correct/incorrect, confidence, review history; identify weak cards. |
| CRD-03 | Scheduling uses **spaced repetition**, not uniform repetition of all cards. |
| CRD-04 | Cards can be created from Reading Mode selections (DOC-08) and from wrong answers (QST-12). |
| CRD-05 `[PROTO]` | Review session UI: reveal-answer, "Didn't know" / "Knew it", N-card session, weak-concept targeting. |
| CRD-06 | Every review emits evidence (PR-17). |

### 4.5 M05 Questions & Scenario Engine (§P3)

| ID | Requirement |
|---|---|
| QST-01 | Question types: Knowledge, Why, Comparison, Troubleshooting, Architecture, Scenario, Trade-off, Behavioral, Leadership. |
| QST-02 | Question bank with taxonomy, tagged by technology, topic, type, difficulty. |
| QST-03 | Difficulty levels: L1 Basic, L2 Intermediate, L3 Senior, L4 Staff/Architect. |
| QST-04 | Question attempts persisted with evaluation; adaptive difficulty. |
| QST-05 | Scenario types: Production Incident, Architecture, Scaling, Failure, Security, Deployment, Disaster Recovery, Cost, Troubleshooting, Design Decision. |
| QST-06 | Scenario graph: Initial Problem → Expected Investigation → Possible Paths → Evidence → Root Cause → Remediation → Prevention → Follow-up Questions. |
| QST-07 | The candidate's path influences which evidence and follow-ups are revealed (adaptive, not scripted). |
| QST-08 | The system **rewards clarifying questions** and does **not** reward naming a technology or remediation before establishing scope, symptoms, timeline, impact and recent changes. |
| QST-09 | Dynamic interviewer behavior for question follow-ups (e.g. "Logs." → "What specifically would you look for, and what if the current container has no useful logs?"). |
| QST-10 | Scenario library per §A: application architecture patterns (3-tier, monolith, microservices, event-driven, queue-based, serverless, CQRS, event sourcing, real-time, batch, streaming, distributed); business systems (e-commerce, banking/payment, SaaS, social media, food delivery, ride sharing, logistics, healthcare, IoT, media streaming, search, recommendation); infrastructure scenarios (HA, Multi-AZ, multi-region, active-active, active-passive, DR, zero downtime, blue/green, canary, GitOps, IaC); operational failures (database, network, DNS, Kafka, Redis, Kubernetes, cloud outage, certificate expiry, secret expiry, deployment failure, traffic spike, data corruption, security breach). |
| QST-11 | Question scoring dimensions (§B): technical correctness, completeness, depth, reasoning, trade-offs, troubleshooting sequence, communication. |
| QST-12 | Every wrong answer becomes learning data (PR-07): per-topic attempts/correct/accuracy/confidence and a recommended remediation sequence. |
| QST-13 | Remediation sequence for a weak topic: 5-minute explanation → infographic → flashcards → scenarios → hands-on → re-test. |
| QST-14 `[PROTO]` | "I don't know" action, "what this tests" panel, weakness signal, adaptive set generation, answer submission. |

### 4.6 M09 Patterns (§P4)

| ID | Requirement |
|---|---|
| PAT-01 | Pattern library: API Gateway, Circuit Breaker, Retry, Bulkhead, Cache-aside, Queue-based load leveling, Saga, Strangler Fig, CQRS, Event sourcing, Blue/Green, Canary, Active/Passive, Active/Active. |
| PAT-02 | Each pattern documents: problem, pattern, architecture, when to use, when not to use, trade-offs, real-world example, interview questions. |
| PAT-03 | "Learn when to use patterns — and when not to." Patterns link to Questions and to ForgeArchitect components/rules. `[PROTO]` |

### 4.7 M08 ForgeArchitect — Architecture Studio (§P4)

| ID | Requirement |
|---|---|
| ARC-01 | Flow: Scenario → Requirements → Visual Architecture Builder → Your Architecture → Submit for Review → AI + Rules Engine → Architecture Review → Scorecard → Weaknesses + Recommendations → Improve → Re-submit. |
| ARC-02 | Requirements-first design with 12 inputs: users, traffic, peak traffic, availability, latency, data volume, consistency, security, compliance, RPO, RTO, budget; plus deployment frequency. |
| ARC-03 | Visual components: Load Balancer, API Gateway, Compute, Kubernetes, Database, Cache, Queue, Kafka, CDN, Object storage, Firewall/WAF, Monitoring, DNS, IAM; AWS components; Azure components; generic infrastructure components. |
| ARC-04 | Component inspector: database engine, Multi-AZ, read replicas, backups, encryption, private subnet, network configuration, other component-specific operational settings. |
| ARC-05 | Scorecard dimensions (12 + overall): Requirements Coverage, Scalability, Availability, Reliability, Security, Networking, Data Architecture, DR, Observability, CI/CD, Cost Optimization, Operational Complexity. |
| ARC-06 | Review identifies **concrete design problems**, not only a number (e.g. single-AZ database, no cache failure strategy, no backup/restore strategy, no multi-region despite DR requirements). |
| ARC-07 | Deterministic violations are **separated** from semantic AI recommendations. |
| ARC-08 | Findings are shown **directly on the architecture** where possible (pins on nodes/edges). |
| ARC-09 | Architecture versioning with per-version score history and version comparison (V1 62% → V4 91%). |
| ARC-10 | Failure injection: database unavailable, Redis down, Kafka lag, ALB 5xx, AZ failure, region failure. |
| ARC-11 | Trade-off simulator: cost vs availability, performance vs consistency, complexity vs scalability, managed vs self-managed, Kubernetes vs serverless, Kafka vs SQS, SQL vs NoSQL, multi-region vs cost. |
| ARC-12 | Cost estimation; cost-reduction exercises (e.g. ₹14 lakh/month → ₹10 lakh without violating availability). |
| ARC-13 | Security review: internet exposure, network segmentation, IAM, secrets, encryption, TLS, WAF, security groups, private subnets, least privilege, audit logging, container security, supply-chain security. |
| ARC-14 | After design, the candidate can enter a controlled failure simulation (hand-off to ForgeOps chaos, OPS-06). |
| ARC-15 | UI: left component palette, center canvas, right inspector; engineering grid; nodes, connections, minimap, zoom/pan; health/status indicators; surrounding app stays light/neutral. |
| ARC-16 `[PROTO]` | Scenario "challenge" badge (e.g. production e-commerce · 20K RPS · 99.95% SLA); "Run Architecture Review"; live review mini-panel. |

### 4.8 M06 ForgeOps — Incident Simulator & Chaos (§P5, §P8)

| ID | Requirement |
|---|---|
| OPS-01 | Feels like an **operations console**, not a quiz; candidate receives partial evidence and investigates with available tools. |
| OPS-02 | Console shows incident severity, impact, service health, headline metrics (e.g. latency 8.2 s, error rate 18.4%, CPU 42%, DB connections 98%, Redis healthy, Kafka lagging), telemetry and terminal actions. |
| OPS-03 | Candidate workflow: investigate with terminal commands and telemetry; build/test hypotheses; request or discover evidence progressively; identify root cause; mitigate; perform RCA; recommend prevention; communicate status and decisions. |
| OPS-04 | Evaluation criteria: investigation order, commands selected, hypothesis quality, evidence usage, root-cause identification, mitigation quality, prevention, communication. |
| OPS-05 | Troubleshooting scoring (§B): problem clarification, scope identification, timeline/recent-change analysis, hypothesis formation, evidence gathering, isolation, root-cause reasoning, prioritization, mitigation, prevention, communication. |
| OPS-06 | Chaos / failure injection as a timeline (e.g. T+00 normal; T+02 Redis latency; T+04 K8s node failure; T+06 DB connections 90%; T+08 Kafka lag; T+11 deployment; T+12 error rate 15%) in which the candidate responds to changing conditions. |
| OPS-07 | Telemetry views: Metrics, Logs, Traces. |
| OPS-08 | Security incidents: AWS key committed to Git, Kubernetes secret exposed, vulnerable container image, suspicious CloudTrail activity; practiced sequence detect → contain → investigate → eradicate → recover → prevent. |
| OPS-09 | Motion communicates changing system state (status changes, propagation) rather than decoration. |
| OPS-10 `[PROTO]` | Incident timer, mission/objective with progress, "interviewer notes" panel, suggested-command chips. |
| OPS-11 | Incident evidence is stored as raw evidence and replayable (PR-18). |

### 4.9 M07 ForgeLab — Hands-on Labs & Terminal (§P6)

| ID | Requirement |
|---|---|
| LAB-01 | Interactive terminal supporting: kubectl, docker, terraform, git, curl, dig, nslookup, ss, netstat, journalctl, top, systemctl, aws, az, helm, argocd. |
| LAB-02 | Example labs: Fix CrashLoopBackOff; Recover Terraform state lock; Investigate Linux memory pressure; Troubleshoot service connectivity; Repair a failed deployment; Diagnose Kubernetes networking; Investigate certificate or secret failures. |
| LAB-03 | Lab domains (RP7): Docker, Kubernetes, Terraform, Linux, CI/CD, Cloud labs. |
| LAB-04 | Sandbox lifecycle: isolate, **reset**, observe; candidate may make real changes without harming production infrastructure. |
| LAB-05 | Lab attempts recorded as hands-on evidence, separate from theory (PR-08). |
| LAB-06 | Safe command execution; cloud credential isolation; sandbox isolation (PR-19). |
| LAB-07 `[PROTO]` | Lab cards with technology tag, duration and level. |

### 4.10 M14 Observability Studio (§P7)

| ID | Requirement |
|---|---|
| OBS-01 | Cover logs, metrics, traces, OpenTelemetry, Prometheus, Grafana, Loki/ELK, Jaeger/Tempo. |
| OBS-02 | Users **design observability coverage**. |
| OBS-03 | Users troubleshoot simulated failures using telemetry. |
| OBS-04 | Teach the operational relationship between symptoms, metrics, logs, traces and root cause. |

### 4.11 M15 CI/CD & DevSecOps Studio (§P8)

| ID | Requirement |
|---|---|
| CIC-01 | Pipeline designer for: Git → Build → Unit Test → SAST → SCA → Docker Build → Image Scan → Registry → Deploy Dev → Integration Test → QA → Approval → Production. |
| CIC-02 | Decide where scans belong; place approvals and production protection; handle secrets securely; design rollback; use canary / progressive delivery; protect production branches/environments; reason about artifact promotion. |
| CIC-03 | DevSecOps coverage integrated throughout the platform (not isolated): IAM, RBAC, secrets, KMS, TLS, network security, WAF, SAST, DAST, SCA, SBOM, container scanning, image signing, supply-chain security, cloud security, audit logging. |
| CIC-04 | Security incidents are delivered through ForgeOps (OPS-08). |

### 4.12 M10 ForgeInterview — AI Interviewer, Interview Day, Emergency Mode (§P9, §P12)

| ID | Requirement |
|---|---|
| INT-01 | Dynamic follow-ups: each response influences the next question. |
| INT-02 | Resume-grounded and JD-grounded questioning. |
| INT-03 | Round types: technical, architecture, troubleshooting, behavioral; eventually voice. |
| INT-04 | **Scores hidden during the interview; revealed afterwards.** No hints during simulated interviews. |
| INT-05 | Full Interview Day: R1 15 min Screening; R2 30 min Technical; R3 20 min Troubleshooting; R4 30 min Architecture; R5 20 min Behavioral; R6 20 min Final interviewer. |
| INT-06 | Emergency interview mode prioritizing high-value readiness: resume interrogation, JD technologies, weak areas, common Senior DevOps questions, architecture, troubleshooting, behavioral, communication. |
| INT-07 | Interview Replay: save Question → Answer → Follow-up → Answer → Evaluation → Score; weak topics can later be retested. |
| INT-08 | Interview scoring (§B): technical accuracy, depth, follow-up handling, architecture thinking, incident response, communication, confidence, structure, conciseness, trade-off reasoning. |
| INT-09 | UI is an interview room, not a chatbot: AI orb, round timer, response area, subtle processing animation, restrained hierarchy; minimal motion. |
| INT-10 `[PROTO]` | "What will be evaluated" rubric panel with scores shown as "—" until the end; Skip / Start recording controls. |
| INT-11 | Voice (future, RP9): speech-to-text, voice interviewer, spoken Q&A, transcription, technical + communication evaluation, filler-word analysis, pace, confidence, answer structure. |

### 4.13 M11 ForgeResume (§P9)

| ID | Requirement |
|---|---|
| RSM-01 | Every resume claim becomes a potential interview path. |
| RSM-02 | Per-claim question expansion, e.g. "Implemented Kubernetes" → why Kubernetes; explain the architecture; which CNI; how ingress works; how it was secured; how it was monitored; hardest production incident; what you would change today; why this design vs an alternative. |
| RSM-03 | Goal: every significant resume claim is technically defensible; track defensibility per claim as evidence. |
| RSM-04 | Resume claims are extracted from the uploaded resume (DOC-02) and stored as Resume Claim entities. |
| RSM-05 `[PROTO]` | Claim list with category tag and question count; "Start interrogation". |

### 4.14 M12 ForgeJD (§P9)

| ID | Requirement |
|---|---|
| JDA-01 | Paste a job description; extract technologies, responsibilities and priorities. |
| JDA-02 | Generate a personalized preparation plan; show weighted technology priorities (e.g. Kubernetes 91%, AWS 88%, Terraform 82%, Security 61%). |
| JDA-03 | Generate JD-specific interview questions. |
| JDA-04 | Prioritize preparation by role relevance. |
| JDA-05 | Compare JD requirements against current readiness; identify missing evidence. |

### 4.15 M16 Behavioral, Communication & Experience (§P10)

| ID | Requirement |
|---|---|
| BEH-01 | Behavioral topics: conflict, mentoring, production mistakes, stakeholder management, leadership, prioritization, difficult decisions, failure, disagreement, pressure, unrealistic deadlines. |
| BEH-02 | Answer frameworks: Technical (Definition → Architecture → How it works → Example → Trade-offs); Troubleshooting (Symptoms → Hypothesis → Evidence → Isolation → Root cause → Remediation → Prevention); Behavioral (STAR + Lesson); Architecture (Requirements → Constraints → Design → Trade-offs → Failure modes → Security → Observability → DR). |
| BEH-03 | Communication coach evaluates: technical accuracy, structure, clarity, conciseness, confidence, filler words, rambling, examples, trade-off explanation. |
| BEH-04 | Voice (future): spoken Q&A, transcription, filler-word analysis, pace, confidence, answer structure. |
| BEH-05 | Personal experience / STAR database with fields: situation, task, action, result, technology, problem, responsibility, challenges, metrics, lessons. |
| BEH-06 | Generate questions from the user's real experience, not only generic behavioral questions. |

### 4.16 M13 ForgeReady — Readiness Engine (§P11, §B)

Detailed in [READINESS_ENGINE.md](READINESS_ENGINE.md). Requirements:

| ID | Requirement |
|---|---|
| RDY-01 | Evidence dimensions (9): Knowledge, Practice, Hands-on, Troubleshooting, Architecture, Security, Communication, Confidence, Incident response. |
| RDY-02 | Knowledge and confidence are measured separately; interpretation: K86/C61 → knows material but lacks confidence → prioritize verbal practice and interview exposure; K58/C89 → potential overconfidence → require deeper testing and hands-on evidence. |
| RDY-03 | Per-topic wrong-answer analytics (attempts, correct, accuracy, confidence) with a recommended remediation sequence (QST-13). |
| RDY-04 | Readiness levels: 1 Learner, 2 Practitioner, 3 Interview Ready, 4 Senior Interview Ready, 5 Strong Senior, 6 Architect. |
| RDY-05 | Progression requires **evidence thresholds**; no level change from a single strong quiz result. |
| RDY-06 | Daily adaptive plan (e.g. 90 min: 10 weak-topic revision, 15 flashcards, 20 interview questions, 20 troubleshooting, 15 architecture, 10 verbal practice); tomorrow's allocation changes with performance. |
| RDY-07 | Weighted-evidence calculation; strong readiness requires consistent evidence across multiple modes; historical evidence remains available so the system can explain why the score changed. |
| RDY-08 | Senior DevOps Interview Readiness Score, explainable and decomposable to contributing evidence. |
| RDY-09 | Answers the north-star question (§1) and lists the highest-value next actions. |
| RDY-10 `[PROTO]` | Analytics: overall score + trend, questions answered/accuracy, labs completed/pass rate, incidents solved/average, competency matrix vs "Senior DevOps target", export report. |
| RDY-11 | Readiness snapshots are immutable history; trend analysis over time. |

### 4.17 Design system, motion, navigation (§P13–P15)

| ID | Requirement |
|---|---|
| UX-01 | Brand concept: technical intelligence + engineering precision + focused learning + controlled complexity. Taglines (candidates): "Train. Design. Troubleshoot. Interview." / "From knowledge to production thinking." |
| UX-02 | Personality: professional, technical, intelligent, focused, modern, high-performance, engineering-first, slightly futuristic, light and neutral by default. |
| UX-03 | Avoid: cartoon education UI, excessive neon, gaming XP mechanics, generic SaaS purple-gradient look, excessive glassmorphism, hacker aesthetic, over-animation. |
| UX-04 | Light theme default: very light cool neutral/white background; white cards with subtle elevation; soft gray-blue borders; electric blue primary; AI violet secondary; emerald success; amber warning; red critical. |
| UX-05 | Dark theme retained as an alternative: bg `#0B0F14`, surface `#111820`, elevated `#161E28`, border `#26313D`, text `#F1F5F9`, secondary `#94A3B8`, blue `#3B82F6`, violet `#8B5CF6`, emerald `#10B981`, amber `#F59E0B`, red `#EF4444`, cyan `#22D3EE`. |
| UX-06 | Typography: Manrope-class sans for UI; Roboto Mono / JetBrains Mono for commands, code, metrics and technical identifiers **only**. |
| UX-07 | Consistent professional icon system (MUI Icons + Lucide); no text glyphs. |
| UX-08 | Motion: progress animations; architecture connection animations; incident status changes; score transitions; subtle AI-processing states; card entrance/hover depth; smooth navigation/panel transitions; **minimal motion during interviews**; respect `prefers-reduced-motion`. |
| UX-09 | 3D used only for: Neural Core/AI visualization, infrastructure topology, architecture depth, incident propagation, system health, interactive cloud/service relationships. Not used everywhere. |
| UX-10 | Mental-state UX: Learn = calm/readable/info-rich; Practice = focused/compact; Simulate = immersive/high-pressure; Analyze = data-rich/diagnostic. |
| UX-11 | Responsive desktop/tablet/mobile (sidebar → drawer on small screens). `[PROTO]` |
| UX-12 | Global search, command palette hint (⌘K), toast feedback. `[PROTO]` |
| NAV-01 | Navigation groups and items: COMMAND (Command Center); LEARN (Knowledge, Documents, Flashcards); PRACTICE (Questions, Incidents, Hands-on Labs); DESIGN (Architecture Studio, Patterns); INTERVIEW (AI Interviewer, Resume Interrogation, JD Analyzer); ANALYTICS (Readiness). |

### 4.18 AI platform (§P2)

Detailed in [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md).

| ID | Requirement |
|---|---|
| AI-01 | Hybrid architecture: deterministic software is authoritative; local LLMs for cost-effective tutoring/generation; cloud LLMs optional for hard reasoning/high-quality evaluation. |
| AI-02 | `LLMProvider` abstraction with `OllamaProvider`, `OpenAIProvider`, `AnthropicProvider`. |
| AI-03 | Authority split: scoring rules, readiness thresholds, spaced repetition → deterministic; question selection → deterministic + adaptive; RAG retrieval → application + pgvector; tutor/explanation → local LLM default; summaries/flashcards → local LLM; scenario generation → local LLM + validation; basic interviewer → local LLM; complex architecture reasoning → optional cloud LLM; advanced answer evaluation → optional cloud LLM; voice evaluation → cloud/local by capability. |
| AI-04 | LLMs do not assign the final readiness score. Semantic evaluation emits **evidence dimensions** (technical accuracy, completeness, troubleshooting method, communication, architecture reasoning, trade-off quality, evidence use, root-cause reasoning, remediation, prevention); deterministic weighting converts them to the authoritative score. |
| AI-05 | RAG pipeline, evaluation pipeline, prompt/version management, guardrails (RP4). |
| AI-06 | Prompt-injection defenses for retrieved documents; PII and secret redaction. |

### 4.19 Data & evidence (§P16)

| ID | Requirement |
|---|---|
| DAT-01 | Every interaction is stored as structured evidence so the readiness score is explainable. |
| DAT-02 | Core entities (30): User, Technology, Document, Document Chunk, Source/Provenance, Topic, Skill, Question, Question Attempt, Flashcard, Flashcard Review, Scenario, Scenario Node, Scenario Attempt, Incident, Incident Evidence, Lab, Lab Attempt, Architecture Scenario, Architecture Version, Architecture Component, Architecture Finding, Architecture Score, Interview Session, Interview Round, Interview Question, Interview Answer, Evaluation, Resume Claim, JD Requirement, Behavioral Story, Readiness Snapshot, Daily Plan. See [DOMAIN_MODEL.md](DOMAIN_MODEL.md). |
| DAT-03 | Keep raw evidence. |
| DAT-04 | Keep evaluation separate from evidence. |
| DAT-05 | Keep AI reasoning separate from deterministic score calculation. |
| DAT-06 | Preserve timestamps and attempts. |
| DAT-07 | Allow replay and re-evaluation. |
| DAT-08 | Never overwrite historical performance when recalculating readiness. |

### 4.20 Future expansion (§P20) — retained, not scheduled

| ID | Capability |
|---|---|
| FUT-01 | Voice-first interview mode |
| FUT-02 | Live terminal co-pilot with controlled hints |
| FUT-03 | Real cloud sandbox provisioning |
| FUT-04 | Multi-region architecture simulation |
| FUT-05 | Automated Terraform validation |
| FUT-06 | Kubernetes cluster simulation |
| FUT-07 | Incident replay and comparative analysis |
| FUT-08 | Architecture benchmark library |
| FUT-09 | Company-specific interview packs |
| FUT-10 | Role-specific readiness profiles |
| FUT-11 | Staff/Architect assessment tracks |
| FUT-12 | Interview performance trend analysis |
| FUT-13 | Peer or mentor review |
| FUT-14 | Team training and enterprise dashboards |
| FUT-15 | Custom organization question banks |
| FUT-16 | Certification preparation overlays |
| FUT-17 | Career progression tracking |
| FUT-18 | Automated evidence portfolio |
| FUT-19 | AI-generated personalized study curriculum |
| FUT-20 | Cross-topic dependency graphs |
| FUT-21 | Knowledge decay prediction |
| FUT-22 | Interview probability / risk estimation based on evidence |

The data model and APIs must not preclude these (e.g. multi-tenant keys, versioned rubrics, append-only evidence).

## 5. Non-functional requirements

Items marked **(spec)** come directly from the specification; numeric targets are **proposed** and need your sign-off (TODO C-04).

### 5.1 Security (§P17 "Security requirements") — all mandatory

| ID | Requirement |
|---|---|
| NFR-SEC-01 (spec) | Tenant/user isolation. |
| NFR-SEC-02 (spec) | Encrypted secrets. |
| NFR-SEC-03 (spec) | Strict access controls. |
| NFR-SEC-04 (spec) | Audit logging. |
| NFR-SEC-05 (spec) | Sandbox isolation for hands-on labs. |
| NFR-SEC-06 (spec) | Safe command execution. |
| NFR-SEC-07 (spec) | Cloud credential isolation. |
| NFR-SEC-08 (spec) | Document access controls. |
| NFR-SEC-09 (spec) | Prompt-injection defenses for retrieved documents. |
| NFR-SEC-10 (spec) | PII and secret redaction where appropriate. |

### 5.2 Data integrity & explainability

| ID | Requirement |
|---|---|
| NFR-DATA-01 (spec) | Append-only evidence; historical performance never overwritten (DAT-03..08). |
| NFR-DATA-02 (spec) | Provenance on all knowledge content (PR-03). |
| NFR-DATA-03 (spec) | Readiness score fully explainable down to contributing evidence (RDY-08). |
| NFR-DATA-04 `[ADDED]` | Deterministic reproducibility: given the same evidence set and the same engine/config version, the engine yields the same score. |

### 5.3 Usability, accessibility, performance

| ID | Requirement |
|---|---|
| NFR-UX-01 (spec) | Accessibility is first-class (PR-15). Proposed target: WCAG 2.2 AA, full keyboard operation of every flow including the architecture canvas, screen-reader-announced state changes in ForgeOps. |
| NFR-UX-02 (spec) | `prefers-reduced-motion` honored; an in-app motion toggle; minimal motion in interviews. |
| NFR-UX-03 (spec) | Responsive desktop/mobile. |
| NFR-UX-04 `[ADDED]` | 3D routes lazy-loaded; non-3D fallback for low-power/reduced-motion; 3D never blocks primary workflows. |
| NFR-PERF-01 `[ADDED]` | Proposed: interactive route change < 200 ms after code load; initial JS for the shell < 250 kB gzip (3D, flow, charts split into route chunks). |
| NFR-PERF-02 `[ADDED]` | Proposed: deterministic engines respond < 100 ms p95 for a single evaluation; architecture rules run < 500 ms for a 100-node graph. |
| NFR-PERF-03 `[ADDED]` | LLM calls are asynchronous/streamed; UI shows processing state; no request blocks > 30 s without streaming or a job handle. |

### 5.4 Operability

| ID | Requirement |
|---|---|
| NFR-OPS-01 (spec) | Docker for development and packaging; Kubernetes as the eventual deployment platform; Prometheus + Grafana for observability; object storage for uploaded documents and generated artifacts. |
| NFR-OPS-02 (spec) | Background workers for ingestion, embedding, generation, evaluation and lab orchestration. |
| NFR-OPS-03 `[ADDED]` | Structured logs, OpenTelemetry traces and Prometheus metrics for API, workers and every LLM call (latency, tokens, cost, provider, prompt version). |
| NFR-OPS-04 `[ADDED]` | One-command local environment (`docker compose up`) for Postgres+pgvector, Redis, object storage (S3-compatible), and optionally Ollama. |

### 5.5 AI quality & cost

| ID | Requirement |
|---|---|
| NFR-AI-01 `[ADDED]` | LLM output used for evaluation must be schema-validated; invalid output is retried then marked unevaluated, never scored by guess. |
| NFR-AI-02 `[ADDED]` | Golden-set regression tests for prompts and evaluators before any prompt/model change is promoted. |
| NFR-AI-03 (spec) | Local LLM by default for cost; cloud optional (provider routing is configuration, not code). |
| NFR-AI-04 `[ADDED]` | Per-provider budget caps and an offline mode in which every feature degrades gracefully to deterministic behavior. |

### 5.6 Maintainability & extensibility

| ID | Requirement |
|---|---|
| NFR-MNT-01 `[ADDED]` | Content (questions, scenarios, labs, patterns, rubrics) is authored as versioned, schema-validated files and seeded, not hand-entered in the DB. |
| NFR-MNT-02 `[ADDED]` | Deterministic engines are pure libraries with no I/O (unit-testable in isolation). |
| NFR-MNT-03 (spec) | Evaluators, rubrics and readiness weights are versioned to allow re-evaluation (DAT-07). |
| NFR-MNT-04 `[ADDED]` | Every API contract is described by OpenAPI and the web client is generated from it. |

## 6. Out of scope until explicitly approved

All `FUT-*` items; real cloud sandbox provisioning (FUT-03); multi-user/team features (FUT-13/14); Kubernetes deployment of the platform itself; voice (RP9) — these are retained as requirements but unscheduled or late.

## 7. Prototype-only items not in the spec

| Item | Disposition |
|---|---|
| "12 day streak" badge | Conflicts with UX-03 ("gaming XP mechanics"). Treated as a plain consistency metric, not a game mechanic. TODO A-09. |
| Hard-coded profile "Kumar / Senior track" | Replaced by real user identity (see ADR-0010). |
| ⌘K command palette button | Kept as UX-12; behavior to be defined. |
| Export report (Readiness) | Kept as RDY-10; format undefined (PDF/Markdown/JSON). TODO C-08. |
| Documents status "Interview-ready" | Kept; meaning undefined. TODO C-08. |

## 8. Glossary

- **Evidence** — an immutable record that something happened (an answer, a command, a review, a design submission).
- **Evaluation** — a (versioned) judgment of evidence by a rubric; deterministic or LLM-assisted.
- **Dimension** — one of the evidence dimensions (RDY-01) or evaluation dimensions (AI-04, §B).
- **Readiness snapshot** — an immutable engine output with the exact inputs and engine/config version used.
- **Provenance** — where content came from and whether it is authoritative (DOC-05).

## 9. Requirements added by the architect (not in the spec)

For veto: NFR-DATA-04, NFR-UX-04, NFR-PERF-01..03, NFR-OPS-03/04, NFR-AI-01/02/04, NFR-MNT-01/02/04, and all `[PROTO]` items. None removes or narrows a spec requirement.
