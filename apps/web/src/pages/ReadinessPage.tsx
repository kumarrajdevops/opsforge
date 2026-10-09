import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { PageHeader, Panel } from '@opsforge/ui'
import { ActionCard } from '../features/readiness/components/ActionCard'
import { CalibrationPanel } from '../features/readiness/components/CalibrationPanel'
import { FactorCard } from '../features/readiness/components/FactorCard'
import { LevelGatesPanel } from '../features/readiness/components/LevelGatesPanel'
import { ReadinessHero } from '../features/readiness/components/ReadinessHero'
import { HistoryPanel, SourcesPanel } from '../features/readiness/components/SourcesPanel'
import { useReadiness, type ReadinessRuntime } from '../features/readiness/useReadiness'

function LoadingState() {
  return (
    <Box aria-busy="true" aria-label="Calculating readiness" sx={{ display: 'grid', gap: 3 }}>
      <Skeleton variant="rounded" height={260} />
      <Skeleton variant="rounded" height={200} />
      <Skeleton variant="rounded" height={320} />
    </Box>
  )
}

export function ReadinessPage({ runtime }: { runtime?: ReadinessRuntime }) {
  const state = useReadiness(runtime)

  return (
    <>
      <PageHeader
        eyebrow="ForgeReady"
        title="Readiness"
        description="Calculated from evidence across every module, not from one quiz percentage. Every score shows what produced it. A language model never sets a score or a level."
      />

      {state.status === 'loading' && <LoadingState />}

      {state.status === 'error' && (
        <Alert severity="error" role="alert">
          Could not calculate readiness. {state.message}
        </Alert>
      )}

      {state.status === 'ready' && (
        <Box sx={{ display: 'grid', gap: 3 }}>
          <ReadinessHero report={state.report} />

          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
            <LevelGatesPanel level={state.report.level} />
            <CalibrationPanel calibration={state.report.calibration} />
          </Box>

          <Panel
            title="Do this next"
            subtitle="Ranked by how much each step is expected to move your readiness."
          >
            <Box sx={{ display: 'grid', gap: 1 }}>
              {state.report.nextActions.map((a) => (
                <ActionCard key={a.id} action={a} />
              ))}
            </Box>
          </Panel>

          <Box component="section" aria-label="Readiness factors" sx={{ display: 'grid', gap: 2 }}>
            <Typography variant="h3" component="h2">
              Factors
            </Typography>
            {state.report.factors.map((f) => (
              <FactorCard key={f.id} factor={f} />
            ))}
          </Box>

          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
            <SourcesPanel sources={state.sources} />
            <HistoryPanel history={state.history} />
          </Box>

          <Typography variant="monoSmall" color="text.secondary">
            engine {state.report.engineVersion} · weights {state.report.configVersion} · fingerprint{' '}
            {state.report.fingerprint}
          </Typography>
        </Box>
      )}
    </>
  )
}
