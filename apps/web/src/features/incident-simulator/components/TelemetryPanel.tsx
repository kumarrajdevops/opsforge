import Box from '@mui/material/Box'
import type { ReactNode } from 'react'
import { PanelTabs } from './PanelTabs'

export type TelemetryTab = 'metrics' | 'logs' | 'traces' | 'timeline'

export interface TelemetryPanelProps {
  tab: TelemetryTab
  onTabChange: (tab: TelemetryTab) => void
  metrics: ReactNode
  logs: ReactNode
  traces: ReactNode
  timeline: ReactNode
  timelineCount: number
}

/** Metrics, logs and traces share one surface so the candidate chooses where to look next. */
export function TelemetryPanel({
  tab,
  onTabChange,
  metrics,
  logs,
  traces,
  timeline,
  timelineCount,
}: TelemetryPanelProps) {
  return (
    <PanelTabs
      fill
      label="Telemetry"
      value={tab}
      onChange={(id) => onTabChange(id as TelemetryTab)}
      items={[
        { id: 'metrics', label: 'Metrics', content: <Box sx={{ p: 2 }}>{metrics}</Box> },
        { id: 'logs', label: 'Logs', content: <Box sx={{ p: 2 }}>{logs}</Box> },
        { id: 'traces', label: 'Traces', content: <Box sx={{ p: 2 }}>{traces}</Box> },
        {
          id: 'timeline',
          label: 'Timeline',
          count: timelineCount,
          content: <Box sx={{ p: 2 }}>{timeline}</Box>,
        },
      ]}
    />
  )
}
