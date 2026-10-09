import type { IncidentScenario } from '@opsforge/types'
import { leakedAwsKeyScenario } from './leakedAwsKey'
import { paymentApiScenario } from './paymentApi'

export const scenarios: IncidentScenario[] = [paymentApiScenario, leakedAwsKeyScenario]

export const DEFAULT_SCENARIO_ID = paymentApiScenario.id

export function getScenario(id: string): IncidentScenario | undefined {
  return scenarios.find((scenario) => scenario.id === id)
}
