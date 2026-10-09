import type { IncidentScenario } from '@opsforge/types'
import type { SessionState } from './engine'

export interface Objective {
  id: string
  label: string
  done: boolean
  /** Short, non-revealing nudge shown while the objective is open. */
  hint: string
}

/**
 * Generic mission checklist (OPS-10). It tracks what the candidate has done, never what they should
 * conclude, so it is safe to show at all times and works for every scenario.
 */
export function objectives(scenario: IncidentScenario, state: SessionState): Objective[] {
  const audiences = new Set(state.messages.map((m) => m.message.audience))
  const informed = scenario.communication.requiredAudiences.every((a) => audiences.has(a))
  const investigated = state.commands.some((c) => c.commandId !== null) || state.views.length > 0
  return [
    {
      id: 'obj-triage',
      label: 'Set the severity',
      done: state.severityChanges.length > 0,
      hint: 'Decide how bad this is from the impact you can see, then say so.',
    },
    {
      id: 'obj-investigate',
      label: 'Investigate with telemetry and commands',
      done: investigated,
      hint: 'Open metrics, logs and traces, or run commands in the terminal.',
    },
    {
      id: 'obj-hypothesis',
      label: 'Record a hypothesis',
      done: state.hypotheses.length > 0,
      hint: 'State what you think is wrong and link the evidence for it.',
    },
    {
      id: 'obj-mitigate',
      label: 'Restore service',
      done: state.resolved,
      hint: 'Pick the action your evidence supports. Guessing has a cost.',
    },
    {
      id: 'obj-communicate',
      label: 'Keep every audience informed',
      done: informed,
      hint: 'Engineering, leadership and customers need different updates.',
    },
    {
      id: 'obj-rca',
      label: 'Write the root cause analysis',
      done: state.rca !== null,
      hint: 'Cite the evidence behind your conclusion.',
    },
    {
      id: 'obj-prevention',
      label: 'Propose prevention',
      done: state.prevention !== null,
      hint: 'Detect it sooner, prevent it, or limit the blast radius.',
    },
  ]
}

export function objectiveProgress(list: Objective[]): { done: number; total: number } {
  return { done: list.filter((o) => o.done).length, total: list.length }
}

/** Interviewer questions appear as the interview reaches them, in the order they were triggered. */
export function visiblePrompts(scenario: IncidentScenario, state: SessionState) {
  const open = (when: IncidentScenario['prompts'][number]['when']) => {
    switch (when) {
      case 'start':
        return state.started
      case 'hypothesis':
        return state.hypotheses.length > 0
      case 'mitigated':
        return state.resolved
      case 'rca':
        return state.rca !== null
    }
  }
  return scenario.prompts.filter((p) => open(p.when))
}
