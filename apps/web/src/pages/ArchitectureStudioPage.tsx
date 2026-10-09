import { ReactFlowProvider } from '@xyflow/react'
import { useState } from 'react'
import { ArchitectureStudio } from '../features/architecture-studio/ArchitectureStudio'
import {
  DEFAULT_SCENARIO_ID,
  SCENARIOS,
  getScenario,
} from '../features/architecture-studio/scenarios'

/** ForgeArchitect. The studio is remounted per scenario so each scenario has its own editor state. */
export function ArchitectureStudioPage() {
  const [scenarioId, setScenarioId] = useState(DEFAULT_SCENARIO_ID)
  const scenario = getScenario(scenarioId) ?? SCENARIOS[0]!

  return (
    <ReactFlowProvider key={scenario.id}>
      <ArchitectureStudio scenario={scenario} onScenarioChange={setScenarioId} />
    </ReactFlowProvider>
  )
}
