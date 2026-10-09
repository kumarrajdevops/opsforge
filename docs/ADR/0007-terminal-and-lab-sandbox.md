# ADR-0007: Terminal and lab sandbox

- Status: Accepted
- Date: 2026-10-09
- Gate: G8

## Context

Phase 28 (terminal engine) and Phases 29 to 33 (labs, Observability, CI/CD and DevSecOps studios, security incidents) let a candidate type commands such as `kubectl`, `docker`, `terraform`, `git`, `curl`, `dig`, `ss`, `journalctl` and `top`, then score what they did (LAB-01, LAB-02). The PRD requires safe command execution and credential isolation (PR-19, NFR-SEC-05 to NFR-SEC-07), a resettable and observed environment, and Hands-on evidence that readiness can trust (PR-08).

The choice is between:

1. **Browser emulation.** A command interpreter in TypeScript that runs against a simulated world (a virtual cluster, filesystem, container runtime, state files). Nothing the candidate types ever leaves the browser tab.
2. **Server-side containers.** A real shell in a short-lived container per attempt (Docker, gVisor or Firecracker), driven over WebSocket.

What exists today: the Incident Simulator (Phase 26) already runs a scripted console against fixtures, with progressive evidence and a deterministic evaluator. There is no code execution anywhere on the server, and the API stores sessions and an AI gateway but runs nothing for users.

What the product needs from a lab is not a real cluster. It needs a repeatable situation, a known right answer, and a deterministic score of what the candidate did. Real infrastructure makes that harder: output differs between runs, a lab can break in ways unrelated to the candidate, and a pass depends on timing and image pulls.

## Decision

**1. Phases 28 to 33 use browser emulation. No user-typed command is executed on the server or on the host in this decision.**

- The terminal engine is a pure module (`parse` then `execute(command, world) -> { output, world, events }`). The world is plain serialisable data owned by the lab definition: files, processes, containers, pods and nodes, Terraform state, a git history, DNS records, listening ports, logs.
- Command output is generated from the world, so `kubectl get pods` after `kubectl delete pod x` is consistent. It is not a list of canned strings per command.
- Every command produces typed events (for example `pod.deleted`, `file.written`, `secret.read`). Scoring reads the events and the final world, never the screen text. This keeps scores deterministic and replayable, and keeps the evaluator independent of output formatting.
- A lab is a definition file validated by a schema: starting world, allowed commands, hints, and checks written as predicates over events and world. Reset means reloading the starting world.
- Unknown or unsupported commands answer as a real shell would (`command not found`, a usage error). They are recorded as events and are never passed anywhere.
- Hands-on evidence records that the environment was emulated. The Readiness Engine already keeps Hands-on separate from theory, and the evidence label must say "emulated lab" so nobody reads a pass as proof of operating a real cluster.

**2. Server-side containers are not part of this decision and are not built.** They need their own ADR before any code, because they change the threat model from "a user can only hurt their own tab" to "a user runs code on our infrastructure". The conditions that ADR must meet are listed under Consequences.

**3. Isolation limits of the emulation.** State them so they are not mistaken for something stronger.

| Property | Guarantee |
| --- | --- |
| Host and network access | None. The interpreter has no `fetch`, `fs`, `child_process`, `eval` or dynamic `import` path from command input. `curl` and `dig` read the simulated world, not the network. |
| Credentials | A lab world holds only fabricated secrets and test tokens. Real credentials, session cookies and provider keys are never placed in a world, a prompt or an event. |
| Resource use | Input length, output length, command count and step count per attempt are capped, and loops (`while`, `yes`, `watch`) are bounded by step budget, so a command cannot freeze the tab. |
| Persistence | A world is saved with the attempt like any other state. It contains no real data. |
| Fidelity | Not guaranteed. Emulated output approximates real tools. A lab must only test behaviour the emulator models, and the docs must say which flags and subcommands are supported. |
| Cheating | The candidate controls the browser, so a determined user can edit state locally. Emulated results are therefore self-assessment-grade evidence for the user's own readiness, not a credential. This matches the product: there is no third party who relies on the score. |

**4. Input handling.** Command text is data. It is tokenised by the interpreter, never interpolated into HTML, a regex built without escaping, a URL or a model prompt. Terminal output is rendered as text, with ANSI colour handled by an allow-list parser, not `dangerouslySetInnerHTML`. If a lab is graded or hinted by a model, the command text goes through the AI gateway under the existing redaction and the rules in `AI_ARCHITECTURE.md`; the model produces evidence only.

**5. Reuse.** Phase 26's console is re-pointed at this engine when Phase 28 ships. Until then it keeps its own scripted fixtures. The terminal engine lives in a feature module with no UI imports, so it can be tested and reused by labs, the incident simulator and AI interview rounds.

## Alternatives considered

- **Server-side containers for every lab.** Highest fidelity, but the largest security surface in the product: sandbox escape, resource abuse, egress to the internet, image supply chain, cost per attempt, and a hosted runtime required for the local-Docker-first setup. Scoring from real output is also non-deterministic. Rejected for now. It stays possible for a later, opt-in lab type.
- **WebAssembly Linux in the browser (for example v86 or a WASI shell).** Real binaries with browser isolation, but no Kubernetes, Terraform provider or cloud API, large downloads, and slow start. It does not cover the lab list, so it does not remove the need for emulation.
- **Hybrid: emulation first, containers later for a few labs.** This is the chosen path in effect, with the container half deferred behind its own ADR.
- **Pure canned transcripts.** Simplest, but inconsistent after state changes and unable to score what the candidate did. Rejected in favour of a world model.

## Consequences

- Phases 28 and 29 are buildable without new server infrastructure. The Docker setup does not change for labs.
- Labs are deterministic, offline-capable and cheap, which fits the offline mode and local-first rules.
- Fidelity is bounded by the emulator. Each lab must list the commands it supports, and unsupported commands must fail visibly rather than pretend to work.
- Hands-on scores are labelled as emulated and are not proof of real-environment skill. The UI and the evidence label must not imply otherwise.
- Adding real containers later requires a new ADR that at least decides: rootless runtime or microVM, no network egress by default, read-only root filesystem and dropped capabilities, CPU, memory, PID and time limits, one ephemeral environment per attempt destroyed afterwards, no host mounts and no Docker socket, a separate network and credentials domain from the API and database, per-user concurrency and rate limits, image provenance, audit logging, and cost caps. Until it exists, no code path may run user input on the server.
- The G10 security baseline treats "no server-side execution of user input" as an invariant to be tested (no API route accepts a command to run).
