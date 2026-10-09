import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { PageHeader, Reveal, StatusIndicator } from '@opsforge/ui'
import { useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { ArchitectureSection } from '../features/command-center/components/ArchitectureSection'
import { DimensionsSection } from '../features/command-center/components/DimensionsSection'
import {
  EvidenceFeed,
  RecentIncidents,
} from '../features/command-center/components/EvidenceSection'
import { NextActionBand } from '../features/command-center/components/NextActionBand'
import {
  ContinueTraining,
  TodayPlanSection,
} from '../features/command-center/components/PlanSection'
import { ReadinessHero } from '../features/command-center/components/ReadinessHero'
import { SkillMatrix, WeakestSkills } from '../features/command-center/components/SkillsSection'
import { formatClock } from '../features/command-center/presentation'
import { useCommandCenter } from '../features/command-center/useCommandCenter'
import type { ReadinessRuntime } from '../features/readiness/useReadiness'

function LoadingState() {
  return (
    <Box aria-busy="true" aria-label="Loading readiness data" sx={{ display: 'grid', gap: 3 }}>
      <Skeleton variant="rounded" height={380} />
      <Skeleton variant="rounded" height={96} />
      <Skeleton variant="rounded" height={320} />
    </Box>
  )
}

export function CommandCenterPage({ runtime }: { runtime?: ReadinessRuntime }) {
  const state = useCommandCenter(runtime)
  const now = useMemo(
    () => (state.status === 'ready' ? new Date(state.snapshot.generatedAt) : new Date()),
    [state],
  )

  return (
    <>
      <PageHeader
        eyebrow="Command Center"
        title="Where would you fail an interview today?"
        description="Your readiness, built only from evidence: answers scored, labs run, incidents handled."
      />

      {state.status === 'loading' && <LoadingState />}

      {state.status === 'error' && (
        <Alert severity="error" role="alert">
          Could not load readiness data. {state.message}
        </Alert>
      )}

      {state.status === 'ready' && (
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Reveal>
            <Box
              role="status"
              sx={(theme) => ({
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1,
                borderRadius: `${theme.opsforge.radius.md}px`,
                border: `1px solid ${theme.palette.border.default}`,
                backgroundColor: theme.palette.background.sunken,
              })}
            >
              <StatusIndicator
                status={state.snapshot.evidenceTotal > 0 ? 'healthy' : 'info'}
                label={state.snapshot.evidenceTotal > 0 ? 'Live' : 'No evidence yet'}
              />
              <Typography variant="monoSmall" color="text.secondary">
                report {formatClock(state.snapshot.generatedAt)} · {state.snapshot.evidenceTotal}{' '}
                evidence events · same report as{' '}
                <Link component={RouterLink} to="/readiness">
                  Readiness
                </Link>
              </Typography>
            </Box>
          </Reveal>

          <ReadinessHero snapshot={state.snapshot} />
          {state.snapshot.nextAction && <NextActionBand action={state.snapshot.nextAction} />}
          <DimensionsSection dimensions={state.snapshot.dimensions} />

          <Box
            sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1.7fr 1fr' } }}
          >
            <SkillMatrix skills={state.snapshot.skills} modes={state.snapshot.skillModes} />
            <WeakestSkills skills={state.snapshot.weakestSkills} />
          </Box>

          <Box
            sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' } }}
          >
            <TodayPlanSection plan={state.snapshot.plan} />
            <ContinueTraining items={state.snapshot.continueTraining} now={now} />
          </Box>

          <Box
            sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' } }}
          >
            <EvidenceFeed
              events={state.snapshot.recentEvidence}
              dimensions={state.snapshot.dimensions}
              now={now}
            />
            <RecentIncidents incidents={state.snapshot.recentIncidents} now={now} />
          </Box>

          <ArchitectureSection architecture={state.snapshot.architecture} />
        </Box>
      )}
    </>
  )
}
