import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea, { type CardActionAreaProps } from '@mui/material/CardActionArea'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import { toneColors, type Tone } from '../theme/tones'
import { linkProps, type LinkTarget } from './linkTypes'

export interface CommandCardProps extends LinkTarget {
  title: string
  description?: string
  icon?: ReactNode
  tone?: Tone
  /** Footer row: tags, duration, level, shortcut. */
  meta?: ReactNode
  onClick?: () => void
  disabled?: boolean
}

/** Actionable launcher card: a single, whole-card target that starts a task or opens a module. */
export function CommandCard({
  title,
  description,
  icon,
  tone = 'primary',
  meta,
  onClick,
  disabled,
  ...target
}: CommandCardProps) {
  return (
    <Card
      sx={(theme) => ({
        height: '100%',
        transition: `border-color ${theme.opsforge.motion.duration.fast}ms, box-shadow ${theme.opsforge.motion.duration.fast}ms`,
        '&:hover': { borderColor: theme.palette.border.strong, boxShadow: theme.shadows[3] },
        opacity: disabled ? 0.6 : 1,
      })}
    >
      <CardActionArea
        {...(linkProps(target) as CardActionAreaProps)}
        onClick={onClick}
        disabled={disabled}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          p: 2.5,
          gap: 1.5,
          '&:hover .command-card-arrow': { transform: 'translateX(2px)' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {icon && (
            <Box
              aria-hidden
              sx={(theme) => {
                const c = toneColors(theme, tone)
                return {
                  display: 'grid',
                  placeItems: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: `${theme.opsforge.radius.md}px`,
                  backgroundColor: c.bg,
                  color: c.fg,
                  border: `1px solid ${c.border}`,
                }
              }}
            >
              {icon}
            </Box>
          )}
          <ArrowForwardIcon
            className="command-card-arrow"
            fontSize="small"
            aria-hidden
            sx={(theme) => ({
              color: theme.palette.text.disabled,
              transition: `transform ${theme.opsforge.motion.duration.fast}ms`,
            })}
          />
        </Box>
        <Box>
          <Typography variant="h4" component="h3">
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
        {meta && (
          <Box sx={{ mt: 'auto', display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>{meta}</Box>
        )}
      </CardActionArea>
    </Card>
  )
}
