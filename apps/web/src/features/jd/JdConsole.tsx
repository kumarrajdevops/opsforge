import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { ConfirmDialog, PageHeader, SectionTabs } from '@opsforge/ui'
import { useState } from 'react'
import { AnalysisView } from './components/AnalysisView'
import { ComparisonView } from './components/ComparisonView'
import { JdImportView } from './components/JdImportView'
import { LearningPathView } from './components/LearningPathView'
import { PlanView } from './components/PlanView'
import { ToolsView } from './components/ToolsView'
import { LEVEL_LABEL } from './presentation'
import { useJd, type JdRuntime } from './useJd'

/** Container for ForgeJD. Wires the JD hook to presentational views. */
export function JdConsole({ runtime }: { runtime: JdRuntime }) {
  const state = useJd(runtime)
  const [confirming, setConfirming] = useState(false)

  if (state.loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress size={28} aria-label="Loading" />
      </Box>
    )
  }

  const { jd, comparison, plan } = state
  if (!jd || !comparison || !plan) {
    return (
      <JdImportView
        hasResume={state.resume !== null}
        error={state.error}
        onAnalyze={(t) => void state.analyze(t)}
      />
    )
  }

  const title = jd.title ?? 'Job description'
  const level = jd.seniorityLevel ? ` · ${LEVEL_LABEL[jd.seniorityLevel]}` : ''

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <PageHeader
        eyebrow="ForgeJD"
        title={title}
        description={`${jd.technologies.length} technologies, ${jd.responsibilities.length} responsibilities${level}.`}
        actions={
          <Button color="inherit" onClick={() => setConfirming(true)}>
            Analyze another
          </Button>
        }
      />
      {state.error && <Alert severity="error">{state.error}</Alert>}
      <SectionTabs
        label="Job description sections"
        defaultValue="gap"
        items={[
          { id: 'analysis', label: 'Analysis', content: <AnalysisView jd={jd} /> },
          {
            id: 'gap',
            label: 'Readiness gap',
            content: <ComparisonView comparison={comparison} />,
          },
          {
            id: 'tools',
            label: 'Tools',
            count: state.tools.length,
            content: <ToolsView tools={state.tools} />,
          },
          {
            id: 'path',
            label: 'Learning path',
            count: state.path.reduce((n, p) => n + p.items.length, 0),
            content: <LearningPathView phases={state.path} />,
          },
          {
            id: 'plan',
            label: 'Preparation plan',
            count: plan.items.length,
            content: (
              <PlanView plan={plan} settings={state.settings} onSettings={state.setSettings} />
            ),
          },
        ]}
      />
      <ConfirmDialog
        open={confirming}
        title="Analyze another posting?"
        description="The current analysis and plan are removed from this browser. Your interviews and resume are not affected."
        confirmLabel="Continue"
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          void state.clear()
        }}
      />
    </Box>
  )
}
