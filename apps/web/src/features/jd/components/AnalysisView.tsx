import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { JdAnalysis } from '@opsforge/types'
import { Panel, ToneChip } from '@opsforge/ui'
import { technologyLabel } from '../../technologies/catalog'
import { LEVEL_LABEL, SIGNAL_LABEL, THEME_LABEL } from '../presentation'

export function AnalysisView({ jd }: { jd: JdAnalysis }) {
  const single = jd.technologies.filter((t) => !t.group)
  const required = single.filter((t) => t.priority === 'required')
  const preferred = single.filter((t) => t.priority === 'preferred')
  const alternatives = jd.alternatives ?? []
  const requiredSkills = jd.skills.filter((s) => s.priority === 'required')
  const preferredSkills = jd.skills.filter((s) => s.priority === 'preferred')

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 3,
        gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
        alignItems: 'start',
      }}
    >
      <Panel
        title="Technologies"
        subtitle={`${required.length} required · ${preferred.length} preferred${alternatives.length > 0 ? ` · ${alternatives.length} choice${alternatives.length === 1 ? '' : 's'}` : ''}`}
      >
        {alternatives.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="overline" color="text.secondary">
              Choose any one
            </Typography>
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
              {alternatives.map((g) => (
                <Box
                  component="li"
                  key={g.id}
                  title={g.quote}
                  sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}
                >
                  <ToneChip
                    tone={g.priority === 'required' ? 'primary' : 'neutral'}
                    label="One of"
                  />
                  {g.options.map((id, i) => (
                    <Box key={id} sx={{ display: 'contents' }}>
                      {i > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          or
                        </Typography>
                      )}
                      <ToneChip tone="neutral" label={technologyLabel(id)} />
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        )}
        <ChipGroup
          heading="Required"
          items={required.map((t) => ({ key: t.id, label: t.label, title: t.quote }))}
          tone="primary"
        />
        <ChipGroup
          heading="Preferred"
          items={preferred.map((t) => ({ key: t.id, label: t.label, title: t.quote }))}
          tone="neutral"
        />
        {jd.technologies.length === 0 && alternatives.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            None recognised.
          </Typography>
        )}
      </Panel>

      <Panel
        title="Seniority"
        subtitle={
          jd.seniorityLevel
            ? `Signals point to: ${LEVEL_LABEL[jd.seniorityLevel]}`
            : 'The posting says too little to place a level.'
        }
      >
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
          {jd.seniority.map((s) => (
            <Box
              component="li"
              key={s.id}
              sx={{ display: 'flex', gap: 1, alignItems: 'baseline', flexWrap: 'wrap' }}
            >
              <ToneChip tone="neutral" label={SIGNAL_LABEL[s.kind]} />
              <Typography variant="body2" sx={{ flex: 1, minWidth: 160 }}>
                {s.quote}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {LEVEL_LABEL[s.level]}
              </Typography>
            </Box>
          ))}
        </Box>
      </Panel>

      <Panel title="Required skills" subtitle="Beyond named tools">
        <SkillList skills={requiredSkills} empty="None recognised." />
      </Panel>
      <Panel title="Preferred skills">
        <SkillList skills={preferredSkills} empty="None recognised." />
      </Panel>

      <Box sx={{ gridColumn: { lg: '1 / -1' } }}>
        <Panel title="Responsibilities" subtitle={`${jd.responsibilities.length} found`}>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1.25 }}>
            {jd.responsibilities.map((r) => (
              <Box
                component="li"
                key={r.id}
                sx={{ display: 'flex', gap: 1, alignItems: 'baseline', flexWrap: 'wrap' }}
              >
                <ToneChip tone="neutral" label={THEME_LABEL[r.theme]} />
                <Typography variant="body2" sx={{ flex: 1, minWidth: 200 }}>
                  {r.text}
                </Typography>
              </Box>
            ))}
          </Box>
          {jd.responsibilities.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              None found.
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Responsibilities are listed for context. They are not scored, because nothing here can
            measure whether you have done a given job duty.
          </Typography>
        </Panel>
      </Box>
    </Box>
  )
}

function ChipGroup({
  heading,
  items,
  tone,
}: {
  heading: string
  items: { key: string; label: string; title: string }[]
  tone: 'primary' | 'neutral'
}) {
  if (items.length === 0) return null
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="overline" color="text.secondary">
        {heading}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
        {items.map((item) => (
          <span key={item.key} title={item.title}>
            <ToneChip tone={tone} label={item.label} />
          </span>
        ))}
      </Box>
    </Box>
  )
}

function SkillList({ skills, empty }: { skills: JdAnalysis['skills']; empty: string }) {
  if (skills.length === 0)
    return (
      <Typography variant="body2" color="text.secondary">
        {empty}
      </Typography>
    )
  return (
    <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
      {skills.map((s) => (
        <Box component="li" key={s.id}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {s.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {s.quote}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
