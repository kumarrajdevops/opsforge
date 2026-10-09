import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { SkillRow, SkillModeId, WeakSkill } from '@opsforge/types'
import { Panel, ProgressBar, Reveal, ScoreCell, ToneChip } from '@opsforge/ui'
import { bandLabel, bandTone } from '../presentation'
import { ModuleButton } from './ModuleButton'

interface SkillMatrixProps {
  skills: SkillRow[]
  modes: { id: SkillModeId; label: string }[]
}

export function SkillMatrix({ skills, modes }: SkillMatrixProps) {
  const columns = `minmax(92px, 1.1fr) repeat(${modes.length}, minmax(72px, 1fr)) 36px`
  return (
    <Panel
      title="Skill matrix"
      subtitle="Technology by evidence mode. Dashed cells have no evidence yet."
    >
      <Box sx={{ overflowX: 'auto' }}>
        <Box role="table" aria-label="Skill matrix" sx={{ minWidth: 470 }}>
          <Box
            role="row"
            sx={{ display: 'grid', gridTemplateColumns: columns, gap: 0.75, mb: 0.75 }}
          >
            <Box role="columnheader" />
            {modes.map((m) => (
              <Typography
                key={m.id}
                role="columnheader"
                variant="monoSmall"
                color="text.secondary"
                sx={{
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: 0,
                  fontSize: '0.62rem',
                }}
              >
                {m.label}
              </Typography>
            ))}
            <Typography
              role="columnheader"
              variant="monoSmall"
              color="text.secondary"
              sx={{ textAlign: 'right' }}
            >
              ALL
            </Typography>
          </Box>
          {skills.map((skill, i) => (
            <Reveal key={skill.id} delay={0.03 * i}>
              <Box
                role="row"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: columns,
                  gap: 0.75,
                  alignItems: 'center',
                  mb: 0.75,
                }}
              >
                <Typography role="rowheader" variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {skill.label}
                </Typography>
                {skill.cells.map((cell) => (
                  <Box role="cell" key={cell.mode}>
                    <ScoreCell
                      value={cell.score}
                      tone={cell.band ? bandTone[cell.band] : 'neutral'}
                      label={`${skill.label}, ${modes.find((m) => m.id === cell.mode)?.label ?? cell.mode}`}
                    />
                  </Box>
                ))}
                <Typography
                  role="cell"
                  variant="monoSmall"
                  sx={{ textAlign: 'right', fontWeight: 700 }}
                >
                  {skill.overall}
                </Typography>
              </Box>
            </Reveal>
          ))}
        </Box>
      </Box>
    </Panel>
  )
}

export function WeakestSkills({ skills }: { skills: WeakSkill[] }) {
  return (
    <Panel title="Weakest skills" subtitle="Largest gap to target, ranked.">
      <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 2 }}>
        {skills.map((skill, i) => (
          <Box component="li" key={skill.skillId}>
            <Reveal delay={0.05 * i}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="monoSmall" color="text.secondary">
                  {String(i + 1).padStart(2, '0')}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, flexGrow: 1 }}>
                  {skill.label}
                </Typography>
                <ToneChip tone={bandTone[skill.band]} label={bandLabel[skill.band]} />
              </Box>
              <ProgressBar
                label={`${skill.label} score`}
                value={skill.score}
                tone={bandTone[skill.band]}
                valueLabel={`${skill.score} / ${skill.target}`}
                target={skill.target}
              />
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  mt: 0.75,
                  flexWrap: 'wrap',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {skill.reason}
                </Typography>
                <ModuleButton module={skill.action.module} size="small">
                  {skill.action.label}
                </ModuleButton>
              </Box>
            </Reveal>
          </Box>
        ))}
      </Box>
    </Panel>
  )
}
