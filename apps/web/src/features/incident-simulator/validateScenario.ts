import type { IncidentScenario } from '@opsforge/types'

/**
 * Structural check of scenario content: every reference resolves, every evidence node can actually
 * be reached, and nothing depends on itself. Returns a list of problems (empty when sound).
 */
export function validateScenario(scenario: IncidentScenario): string[] {
  const problems: string[] = []
  const fail = (message: string) => problems.push(`${scenario.id}: ${message}`)

  const unique = (label: string, ids: string[]) => {
    const seen = new Set<string>()
    for (const id of ids) {
      if (seen.has(id)) fail(`duplicate ${label} id "${id}"`)
      seen.add(id)
    }
    return seen
  }

  const serviceIds = unique(
    'service',
    scenario.services.map((s) => s.id),
  )
  const evidenceIds = unique(
    'evidence',
    scenario.evidence.map((e) => e.id),
  )
  const commandIds = unique(
    'command',
    scenario.commands.map((c) => c.id),
  )
  const metricIds = unique(
    'metric',
    scenario.metrics.map((m) => m.id),
  )
  const traceIds = unique(
    'trace',
    scenario.traces.map((t) => t.id),
  )
  const hypothesisIds = unique(
    'hypothesis',
    scenario.hypotheses.map((h) => h.id),
  )
  const actionIds = unique(
    'remediation',
    scenario.remediation.map((a) => a.id),
  )
  unique(
    'prevention',
    scenario.prevention.map((p) => p.id),
  )
  unique(
    'log',
    scenario.logs.map((l) => l.id),
  )

  const requireEvidence = (where: string, id: string) => {
    if (!evidenceIds.has(id)) fail(`${where} references unknown evidence "${id}"`)
  }
  const requireService = (where: string, id: string) => {
    if (!serviceIds.has(id)) fail(`${where} references unknown service "${id}"`)
  }

  for (const service of scenario.services) {
    for (const dep of service.dependsOn) requireService(`service ${service.id}`, dep)
  }

  for (const fact of scenario.impact)
    if (fact.gatedBy) requireEvidence(`impact ${fact.id}`, fact.gatedBy)

  const hasStart = scenario.evidence.some((e) => e.trigger.kind === 'start')
  if (!hasStart) fail('no evidence is visible on arrival')

  for (const node of scenario.evidence) {
    const where = `evidence ${node.id}`
    if (node.serviceId) requireService(where, node.serviceId)
    for (const id of node.requires) requireEvidence(where, id)
    for (const id of node.bearsOn?.supports ?? [])
      if (!hypothesisIds.has(id)) fail(`${where} supports unknown hypothesis "${id}"`)
    for (const id of node.bearsOn?.refutes ?? [])
      if (!hypothesisIds.has(id)) fail(`${where} refutes unknown hypothesis "${id}"`)

    const trigger = node.trigger
    switch (trigger.kind) {
      case 'command':
        for (const id of trigger.commandIds)
          if (!commandIds.has(id)) fail(`${where} trigger uses unknown command "${id}"`)
        break
      case 'view':
        if (trigger.channel === 'metrics' && !metricIds.has(trigger.target))
          fail(`${where} trigger views unknown metric "${trigger.target}"`)
        if (trigger.channel === 'traces' && !traceIds.has(trigger.target))
          fail(`${where} trigger views unknown trace "${trigger.target}"`)
        if (trigger.channel === 'logs') requireService(where, trigger.target)
        break
      case 'search':
        requireService(where, trigger.serviceId)
        if (trigger.terms.length === 0) fail(`${where} search trigger has no terms`)
        break
      case 'action':
        if (!actionIds.has(trigger.actionId))
          fail(`${where} trigger uses unknown action "${trigger.actionId}"`)
        break
      case 'start':
        break
    }
  }

  // requires must be acyclic
  const byId = new Map(scenario.evidence.map((e) => [e.id, e]))
  const visiting = new Set<string>()
  const done = new Set<string>()
  const visit = (id: string): boolean => {
    if (done.has(id)) return true
    if (visiting.has(id)) return false
    visiting.add(id)
    const ok = (byId.get(id)?.requires ?? []).every(visit)
    visiting.delete(id)
    done.add(id)
    return ok
  }
  for (const node of scenario.evidence)
    if (!visit(node.id)) fail(`evidence ${node.id} is part of a requires cycle`)

  for (const command of scenario.commands) {
    for (const id of command.unlockedBy ?? []) requireEvidence(`command ${command.id}`, id)
    if (command.remediationId && !actionIds.has(command.remediationId)) {
      fail(`command ${command.id} references unknown remediation "${command.remediationId}"`)
    }
    if (command.mutating && !command.remediationId)
      fail(`mutating command ${command.id} has no remediation`)
  }

  for (const metric of scenario.metrics) requireService(`metric ${metric.id}`, metric.serviceId)
  for (const entry of scenario.logs) {
    requireService(`log ${entry.id}`, entry.serviceId)
    if (entry.gatedBy) requireEvidence(`log ${entry.id}`, entry.gatedBy)
  }
  for (const trace of scenario.traces) {
    requireService(`trace ${trace.id}`, trace.serviceId)
    const spanIds = new Set(trace.spans.map((s) => s.id))
    for (const span of trace.spans) {
      requireService(`trace ${trace.id} span ${span.id}`, span.serviceId)
      if (span.parentId && !spanIds.has(span.parentId))
        fail(`trace ${trace.id} span ${span.id} has unknown parent`)
    }
  }

  const pairs = new Set<string>()
  for (const hypothesis of scenario.hypotheses) {
    requireService(`hypothesis ${hypothesis.id}`, hypothesis.serviceId)
    const pair = `${hypothesis.category}:${hypothesis.serviceId}`
    if (pairs.has(pair)) fail(`hypotheses share the category/service pair ${pair}`)
    pairs.add(pair)
  }
  if (!scenario.hypotheses.some((h) => h.verdict === 'root-cause'))
    fail('no hypothesis has the root-cause verdict')

  for (const action of scenario.remediation) {
    for (const id of action.unlockedBy ?? []) requireEvidence(`action ${action.id}`, id)
    for (const id of action.evidenceBasis) requireEvidence(`action ${action.id}`, id)
    for (const effect of action.effects ?? []) {
      const service = scenario.services.find((s) => s.id === effect.serviceId)
      if (!service) fail(`action ${action.id} effect targets unknown service "${effect.serviceId}"`)
      else if (!service.headline.some((h) => h.id === effect.metricId)) {
        fail(
          `action ${action.id} effect targets unknown metric "${effect.serviceId}/${effect.metricId}"`,
        )
      }
    }
  }
  if (!scenario.remediation.some((a) => a.outcome === 'resolves'))
    fail('no remediation resolves the incident')

  for (const group of scenario.rootCause.requiredEvidence) {
    if (group.length === 0) fail('rootCause has an empty required-evidence group')
    for (const id of group) requireEvidence('rootCause', id)
  }

  return problems
}
