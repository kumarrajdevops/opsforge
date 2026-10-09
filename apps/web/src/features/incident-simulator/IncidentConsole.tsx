import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import type { IncidentScenario, IncidentSession } from '@opsforge/types'
import { ConfirmDialog, SideDrawer, visuallyHidden } from '@opsforge/ui'
import { useMemo, useState } from 'react'
import { BriefingView } from './components/BriefingView'
import { ConsoleHeader } from './components/ConsoleHeader'
import { DebriefView } from './components/DebriefView'
import { EvidencePanel, type EvidenceItem } from './components/EvidencePanel'
import { HypothesesPanel } from './components/HypothesesPanel'
import { LogsView } from './components/LogsView'
import { MetricsView } from './components/MetricsView'
import { NotesPanel } from './components/NotesPanel'
import { ImpactPanel, MissionPanel, ServicesPanel } from './components/OverviewPanels'
import { PanelTabs } from './components/PanelTabs'
import { RemediationPanel } from './components/RemediationPanel'
import { ReportPanel } from './components/ReportPanel'
import { ServiceMap } from './components/ServiceMap'
import { TelemetryPanel, type TelemetryTab } from './components/TelemetryPanel'
import { TerminalPanel } from './components/TerminalPanel'
import { TimelinePanel } from './components/TimelinePanel'
import { TracesView } from './components/TracesView'
import {
  availableCommands,
  buildTimeline,
  impactViews,
  isUnlocked,
  metricPoints,
  serviceViews,
  visibleLogs,
} from './engine'
import { visiblePrompts } from './progress'
import { useIncidentReview } from './useIncidentReview'
import { useIncidentSession } from './useIncidentSession'

const SIDE_WIDTH = 340
const RIGHT_WIDTH = 420
const HOST = 'bastion'

type RightTab = 'evidence' | 'hypotheses' | 'respond' | 'report' | 'notes'
type NarrowTab = 'telemetry' | 'terminal' | RightTab

export interface IncidentConsoleProps {
  scenario: IncidentScenario
  scenarios: IncidentScenario[]
  onScenarioChange: (id: string) => void
}

/** Container for ForgeOps. Wires the session hook to presentational panels; holds only view selection state. */
export function IncidentConsole({ scenario, scenarios, onScenarioChange }: IncidentConsoleProps) {
  const theme = useTheme()
  const wide = useMediaQuery(theme.breakpoints.up('xl'))
  const session = useIncidentSession(scenario)
  const { state, status, elapsed } = session
  const live = status === 'running'

  const [telemetryTab, setTelemetryTab] = useState<TelemetryTab>('metrics')
  const [rightTab, setRightTab] = useState<RightTab>('evidence')
  const [narrowTab, setNarrowTab] = useState<NarrowTab>('telemetry')
  const [metricId, setMetricId] = useState<string | null>(null)
  const [logService, setLogService] = useState<string | null>(null)
  const [traceId, setTraceId] = useState<string | null>(null)
  const [overviewOpen, setOverviewOpen] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [restartOpen, setRestartOpen] = useState(false)

  const serviceList = useMemo(
    () => scenario.services.map((s) => ({ id: s.id, name: s.name })),
    [scenario],
  )
  const serviceName = (id: string) => scenario.services.find((s) => s.id === id)?.name ?? id

  const evidenceItems: EvidenceItem[] = useMemo(
    () =>
      state.revealed.flatMap((r) => {
        const node = scenario.evidence.find((n) => n.id === r.id)
        return node
          ? [
              {
                node,
                foundAt: r.at,
                serviceName: node.serviceId ? serviceName(node.serviceId) : null,
              },
            ]
          : []
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.revealed, scenario],
  )
  const evidenceRefs = useMemo(
    () => evidenceItems.map((e) => ({ id: e.node.id, title: e.node.title })),
    [evidenceItems],
  )

  const sessionRecord: IncidentSession = useMemo(
    () => ({
      scenarioId: scenario.id,
      startedAt: session.startedAt ?? '',
      elapsedSeconds: Math.floor(elapsed),
      events: session.events,
    }),
    [scenario.id, session.startedAt, elapsed, session.events],
  )
  const review = useIncidentReview(scenario, sessionRecord, session.evaluation)

  const services = serviceViews(scenario, state)
  const timeline = buildTimeline(scenario, state, session.events)
  const metricSeries = scenario.metrics.find((m) => m.id === metricId)
  const actions = scenario.remediation.filter((a) => isUnlocked(state, a.unlockedBy))
  const prompts = visiblePrompts(scenario, state)
  const appliedMap = new Map(state.applied.map((a) => [a.actionId, { at: a.at }]))
  const severity = state.severity

  function selectMetric(id: string) {
    setMetricId(id)
    session.openView('metrics', id)
  }
  function selectLogService(id: string) {
    setLogService(id)
    session.openView('logs', id)
  }
  function selectTrace(id: string) {
    setTraceId(id)
    session.openView('traces', id)
  }
  function openServiceLogs(id: string) {
    selectLogService(id)
    setTelemetryTab('logs')
    setNarrowTab('telemetry')
    setOverviewOpen(false)
  }

  const overview = (
    <Box sx={{ display: 'grid', gap: 1.5, p: wide ? 1.5 : 0 }}>
      <ImpactPanel scenario={scenario} severity={severity} impact={impactViews(scenario, state)} />
      <ServicesPanel services={services} selectedId={logService ?? ''} onSelect={openServiceLogs} />
      <MissionPanel
        scenario={scenario}
        objectives={session.objectives}
        progress={session.progress}
      />
    </Box>
  )

  const telemetry = (
    <TelemetryPanel
      tab={telemetryTab}
      onTabChange={setTelemetryTab}
      timelineCount={timeline.length}
      metrics={
        <MetricsView
          series={scenario.metrics}
          serviceName={serviceName}
          selectedId={metricId}
          points={metricSeries ? metricPoints(metricSeries, state, elapsed) : null}
          onSelect={selectMetric}
        />
      }
      logs={
        <LogsView
          services={serviceList}
          serviceId={logService}
          entries={logService ? visibleLogs(scenario, state, logService) : []}
          onSelectService={selectLogService}
          onSearch={session.searchLogs}
        />
      }
      traces={
        <TracesView
          traces={scenario.traces}
          serviceName={serviceName}
          selectedId={traceId}
          onSelect={selectTrace}
        />
      }
      map={telemetryTab === 'map' ? <ServiceMap services={services} /> : null}
      timeline={<TimelinePanel entries={timeline} />}
    />
  )

  const terminal = (
    <TerminalPanel
      commands={availableCommands(scenario, state)}
      transcript={session.transcript}
      builtins={session.builtins}
      clearedBefore={session.clearedBefore}
      disabled={!live}
      host={HOST}
      onRun={session.runCommand}
    />
  )

  const rightItems = [
    {
      id: 'evidence',
      label: 'Evidence',
      count: evidenceItems.length,
      content: (
        <EvidencePanel
          items={evidenceItems}
          isNew={(id) => live && elapsed - (state.revealed.find((r) => r.id === id)?.at ?? 0) < 15}
        />
      ),
    },
    {
      id: 'hypotheses',
      label: 'Hypotheses',
      count: state.hypotheses.length,
      content: (
        <HypothesesPanel
          hypotheses={state.hypotheses}
          services={serviceList}
          evidence={evidenceRefs}
          disabled={!live}
          onAdd={session.addHypothesis}
          onLink={session.linkEvidence}
          onUnlink={session.unlinkEvidence}
          onStatus={session.setHypothesisStatus}
          onRemove={session.removeHypothesis}
        />
      ),
    },
    {
      id: 'respond',
      label: 'Respond',
      content: (
        <RemediationPanel
          actions={actions}
          applied={appliedMap}
          resolved={state.resolved}
          disabled={!live}
          onApply={session.applyRemediation}
        />
      ),
    },
    {
      id: 'report',
      label: 'Report',
      content: (
        <ReportPanel
          rca={{
            saved: state.rca?.draft ?? null,
            services: serviceList,
            evidence: evidenceRefs,
            disabled: !live,
            onSave: session.saveRca,
          }}
          prevention={{
            options: scenario.prevention.map((p) => ({ ...p, quality: p.quality })),
            saved: state.prevention,
            disabled: !live,
            onSave: session.savePrevention,
          }}
          messages={{ sent: state.messages, disabled: !live, onSend: session.sendMessage }}
        />
      ),
    },
    {
      id: 'notes',
      label: 'Interviewer',
      count: prompts.length,
      content: (
        <NotesPanel
          prompts={prompts}
          notes={state.notes}
          disabled={!live}
          onSave={session.saveNote}
        />
      ),
    },
  ]

  const border = `1px solid ${theme.palette.border.default}`

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: `calc(100dvh - ${theme.opsforge.layout.topBarHeight + 1}px)`,
        minHeight: 520,
      }}
    >
      <ConsoleHeader
        scenario={scenario}
        scenarios={scenarios}
        onScenarioChange={onScenarioChange}
        status={status}
        resolved={state.resolved}
        severity={severity}
        onSeverityChange={session.setSeverity}
        elapsed={elapsed}
        progress={session.progress}
        compact={!wide}
        onOpenOverview={() => setOverviewOpen(true)}
        onSubmit={() => setSubmitOpen(true)}
        onRestart={() => setRestartOpen(true)}
      />

      <Box role="status" aria-live="polite" sx={visuallyHidden}>
        {session.announcement}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {status === 'loading' && (
          <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
            <CircularProgress size={28} aria-label="Loading session" />
          </Box>
        )}

        {status === 'briefing' && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <BriefingView scenario={scenario} onBegin={session.begin} />
          </Box>
        )}

        {status === 'submitted' && session.evaluation && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <DebriefView
              scenario={scenario}
              state={state}
              evaluation={session.evaluation}
              review={review}
              onRestart={() => setRestartOpen(true)}
            />
          </Box>
        )}

        {status === 'running' && wide && (
          <>
            <Box
              component="aside"
              aria-label="Incident overview"
              sx={{
                width: SIDE_WIDTH,
                flexShrink: 0,
                overflowY: 'auto',
                borderRight: border,
                backgroundColor: theme.palette.background.default,
              }}
            >
              {overview}
            </Box>
            <Box
              component="main"
              sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
            >
              <Box
                component="section"
                aria-label="Telemetry"
                sx={{
                  flex: '1 1 52%',
                  minHeight: 0,
                  overflow: 'hidden',
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                {telemetry}
              </Box>
              <Box
                component="section"
                aria-label="Terminal"
                sx={{
                  flex: '1 1 48%',
                  minHeight: 0,
                  borderTop: border,
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                {terminal}
              </Box>
            </Box>
            <Box
              component="aside"
              aria-label="Investigation workspace"
              sx={{
                width: RIGHT_WIDTH,
                flexShrink: 0,
                borderLeft: border,
                backgroundColor: theme.palette.background.paper,
                minHeight: 0,
              }}
            >
              <PanelTabs
                fill
                label="Investigation workspace"
                value={rightTab}
                onChange={(id) => setRightTab(id as RightTab)}
                items={rightItems}
              />
            </Box>
          </>
        )}

        {status === 'running' && !wide && (
          <Box
            component="main"
            sx={{ flex: 1, minWidth: 0, backgroundColor: theme.palette.background.paper }}
          >
            <PanelTabs
              fill
              label="Console"
              value={narrowTab}
              onChange={(id) => setNarrowTab(id as NarrowTab)}
              items={[
                {
                  id: 'telemetry',
                  label: 'Telemetry',
                  content: <Box sx={{ height: '100%' }}>{telemetry}</Box>,
                },
                {
                  id: 'terminal',
                  label: 'Terminal',
                  content: <Box sx={{ height: '100%', minHeight: 420 }}>{terminal}</Box>,
                },
                ...rightItems,
              ]}
            />
          </Box>
        )}
      </Box>

      {!wide && (
        <SideDrawer
          open={overviewOpen}
          onClose={() => setOverviewOpen(false)}
          title="Incident overview"
          anchor="left"
          width={380}
        >
          {overview}
        </SideDrawer>
      )}

      <ConfirmDialog
        open={submitOpen}
        title="Submit for debrief?"
        description="You will see how the investigation was assessed, along with the evidence you missed. Your answers are locked once you submit."
        confirmLabel="Submit"
        onClose={() => setSubmitOpen(false)}
        onConfirm={() => {
          setSubmitOpen(false)
          session.submit()
        }}
      />
      <ConfirmDialog
        open={restartOpen}
        title="Restart this incident?"
        description="Clears the recorded session for this scenario and returns to the briefing."
        confirmLabel="Restart"
        destructive
        onClose={() => setRestartOpen(false)}
        onConfirm={() => {
          setRestartOpen(false)
          setMetricId(null)
          setLogService(null)
          setTraceId(null)
          setTelemetryTab('metrics')
          setRightTab('evidence')
          setNarrowTab('telemetry')
          session.restart()
        }}
      />
    </Box>
  )
}
