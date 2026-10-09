import { useState } from 'react'
import { IncidentConsole } from '../features/incident-simulator/IncidentConsole'
import {
  DEFAULT_SCENARIO_ID,
  getScenario,
  scenarios,
} from '../features/incident-simulator/scenarios'

/** ForgeOps. The console is remounted per scenario so each incident has its own session. */
export function IncidentSimulatorPage() {
  const [scenarioId, setScenarioId] = useState(DEFAULT_SCENARIO_ID)
  const scenario = getScenario(scenarioId) ?? scenarios[0]!

  return (
    <IncidentConsole
      key={scenario.id}
      scenario={scenario}
      scenarios={scenarios}
      onScenarioChange={setScenarioId}
    />
  )
}
