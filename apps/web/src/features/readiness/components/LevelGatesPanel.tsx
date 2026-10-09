import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ReadinessLevelResult } from '@opsforge/types'
import { Panel } from '@opsforge/ui'

/** Exactly what the next level asks for, and what the evidence shows today. */
export function LevelGatesPanel({ level }: { level: ReadinessLevelResult }) {
  const next = level.next
  if (!next) {
    return (
      <Panel title="Level requirements">
        <Typography variant="body2">
          The top level is reached. Keep evidence fresh to hold it.
        </Typography>
      </Panel>
    )
  }
  const met = next.checks.filter((c) => c.passed).length
  return (
    <Panel
      title={`To reach Level ${next.level}, ${next.label}`}
      subtitle={`${met} of ${next.checks.length} requirements met. The level comes only from these rules, never from one score or from a language model.`}
    >
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1 }}>
        {next.checks.map((check) => (
          <Box
            component="li"
            key={check.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: 1.25,
              alignItems: 'start',
            }}
          >
            {check.passed ? (
              <CheckCircleOutlinedIcon fontSize="small" color="success" aria-label="Met" />
            ) : (
              <RadioButtonUncheckedIcon fontSize="small" color="disabled" aria-label="Not met" />
            )}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {check.label}
              </Typography>
              <Typography variant="monoSmall" color="text.secondary">
                Now {check.current} · needs {check.required}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Panel>
  )
}
