import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { toneColors, type Tone } from '../theme/tones'

export interface LevelLadderStep {
  value: number
  label: string
}

export interface LevelLadderProps {
  steps: LevelLadderStep[]
  current: number
  tone?: Tone
  /** Accessible name for the list. */
  label: string
}

/** Horizontal ladder of ordered levels; steps up to `current` are filled. */
export function LevelLadder({ steps, current, tone = 'primary', label }: LevelLadderProps) {
  return (
    <Box
      component="ol"
      aria-label={label}
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
        gap: 0.5,
        listStyle: 'none',
        m: 0,
        p: 0,
      }}
    >
      {steps.map((step) => {
        const reached = step.value <= current
        const isCurrent = step.value === current
        return (
          <Box
            component="li"
            key={step.value}
            aria-current={isCurrent ? 'step' : undefined}
            sx={{ minWidth: 0 }}
          >
            <Box
              sx={(theme) => ({
                height: 6,
                borderRadius: 999,
                mb: 0.75,
                backgroundColor: reached
                  ? toneColors(theme, tone).solid
                  : theme.palette.border.default,
                opacity: reached && !isCurrent ? 0.5 : 1,
              })}
            />
            <Typography
              variant="caption"
              component="div"
              noWrap
              sx={{
                fontWeight: isCurrent ? 700 : 500,
                color: isCurrent ? 'text.primary' : 'text.secondary',
              }}
            >
              <Typography variant="monoSmall" component="span" sx={{ mr: 0.5 }}>
                L{step.value}
              </Typography>
              {step.label}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}
