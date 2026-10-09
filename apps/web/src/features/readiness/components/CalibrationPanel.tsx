import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { CalibrationReport } from '@opsforge/types'
import { Panel, ProgressBar, ToneChip } from '@opsforge/ui'
import { formatScore, formatSigned, patternLabel, patternTone } from '../presentation'
import { ActionCard } from './ActionCard'

/** Knowledge and confidence side by side. They are measured from different signals and never blended. */
export function CalibrationPanel({ calibration }: { calibration: CalibrationReport }) {
  const tone = patternTone[calibration.pattern]
  return (
    <Panel
      title="Knowledge vs confidence"
      subtitle="What you know and how sure you sound are scored separately."
      actions={<ToneChip tone={tone} label={patternLabel[calibration.pattern]} />}
    >
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <ProgressBar
            label="Knowledge"
            value={calibration.knowledge ?? 0}
            valueLabel={formatScore(calibration.knowledge)}
            tone="primary"
          />
          <ProgressBar
            label="Confidence"
            value={calibration.confidence ?? 0}
            valueLabel={formatScore(calibration.confidence)}
            tone="info"
          />
        </Box>
        {calibration.gap !== null && (
          <Typography variant="monoSmall" color="text.secondary">
            Knowledge minus confidence: {formatSigned(calibration.gap)} pts
          </Typography>
        )}
        <Typography variant="body2">{calibration.summary}</Typography>
        <Typography variant="body2" color="text.secondary">
          {calibration.guidance}
        </Typography>
        {calibration.actions.length > 0 && (
          <Box sx={{ display: 'grid', gap: 1 }}>
            {calibration.actions.map((a) => (
              <ActionCard key={a.id} action={a} />
            ))}
          </Box>
        )}
      </Box>
    </Panel>
  )
}
