import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Typography from '@mui/material/Typography'
import type { Defensibility, ResumeClaimItem } from '@opsforge/types'
import { ToneChip } from '@opsforge/ui'
import { technologyLabel } from '../../technologies/catalog'
import { DEFENSIBILITY_LABEL } from '../../drills/defensibility'
import { defensibilityTone, FLAG_LABEL } from '../presentation'

export interface ClaimListProps {
  claims: ResumeClaimItem[]
  defensibility: Record<string, Defensibility>
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ClaimList({ claims, defensibility, selectedId, onSelect }: ClaimListProps) {
  return (
    <Box
      component="ul"
      aria-label="Resume claims"
      sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}
    >
      {claims.map((claim) => {
        const d = defensibility[claim.id]
        const selected = claim.id === selectedId
        return (
          <li key={claim.id}>
            <ButtonBase
              onClick={() => onSelect(claim.id)}
              aria-current={selected ? 'true' : undefined}
              sx={{
                width: '100%',
                textAlign: 'left',
                display: 'grid',
                gap: 0.75,
                p: 1.5,
                borderRadius: 1.5,
                border: 1,
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: selected ? 'action.selected' : 'background.paper',
                alignContent: 'start',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {claim.text}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {d && (
                  <ToneChip
                    tone={defensibilityTone(d.level)}
                    label={`${DEFENSIBILITY_LABEL[d.level]}${d.score === null ? '' : ` · ${d.score}`}`}
                  />
                )}
                {claim.technologies.map((id) => (
                  <ToneChip key={id} tone="primary" label={technologyLabel(id)} />
                ))}
                {claim.flags.map((flag) => (
                  <ToneChip key={flag} tone="neutral" label={FLAG_LABEL[flag]} />
                ))}
              </Box>
            </ButtonBase>
          </li>
        )
      })}
    </Box>
  )
}
