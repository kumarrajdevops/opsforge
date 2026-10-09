import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'
import { Panel, ToneChip, toneColors, type Tone } from '@opsforge/ui'

const TONES: Tone[] = ['primary', 'ai', 'success', 'warning', 'error', 'info']
const SPACING = [0.5, 1, 1.5, 2, 3, 4, 6]
const ELEVATIONS = [1, 2, 4, 8, 16, 24]

function Swatch({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box
        sx={(theme: Theme) => ({
          height: 44,
          borderRadius: `${theme.opsforge.radius.md}px`,
          bgcolor: value,
          border: 1,
          borderColor: border ? 'border.strong' : 'border.subtle',
        })}
      />
      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }} noWrap>
        {label}
      </Typography>
      <Typography variant="monoSmall" color="text.secondary" noWrap sx={{ display: 'block' }}>
        {value}
      </Typography>
    </Box>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(116px, 1fr))',
        gap: 2,
      }}
    >
      {children}
    </Box>
  )
}

/** Token reference: colours, spacing, radius, elevation, borders. Reads the live theme, so it follows the colour mode. */
export function Foundations() {
  const theme = useTheme()
  const { palette } = theme

  return (
    <>
      <Panel title="Colour: surfaces, text and borders" sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Neutral blue-grey surfaces carry the interface. Colour is reserved for meaning.
        </Typography>
        <Grid>
          <Swatch label="background.default" value={palette.background.default} border />
          <Swatch label="background.paper" value={palette.background.paper} border />
          <Swatch label="background.raised" value={palette.background.raised} border />
          <Swatch label="background.sunken" value={palette.background.sunken} border />
          <Swatch label="text.primary" value={palette.text.primary} />
          <Swatch label="text.secondary" value={palette.text.secondary} />
          <Swatch label="text.disabled" value={palette.text.disabled} />
          <Swatch label="border.subtle" value={palette.border.subtle} border />
          <Swatch label="border.default" value={palette.border.default} border />
          <Swatch label="border.strong" value={palette.border.strong} border />
        </Grid>
      </Panel>

      <Panel title="Colour: semantic tones" sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Each tone has a solid fill, a text colour with AA contrast, a soft tint and a border. Use
          the tone, not the hex value.
        </Typography>
        <Stack spacing={2}>
          {TONES.map((tone) => {
            const c = toneColors(theme, tone)
            return (
              <Box
                key={tone}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(80px, 100px) repeat(auto-fill, minmax(100px, 1fr))',
                  gap: 2,
                  alignItems: 'center',
                }}
              >
                <ToneChip tone={tone} label={tone} />
                <Swatch label="solid" value={c.solid} />
                <Swatch label="fg" value={c.fg} />
                <Swatch label="bg" value={c.bg} border />
                <Swatch label="border" value={c.border} />
              </Box>
            )
          })}
        </Stack>
      </Panel>

      <Panel title="Spacing" sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          8px unit. Dense technical layouts use halves (0.5 is 4px, 1.5 is 12px).
        </Typography>
        <Stack spacing={1}>
          {SPACING.map((n) => (
            <Stack key={n} direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Typography variant="monoSmall" sx={{ width: 96 }}>
                spacing({n}) · {n * 8}px
              </Typography>
              <Box
                sx={{
                  height: 12,
                  width: theme.spacing(n),
                  bgcolor: alpha(palette.primary.main, 0.6),
                  borderRadius: 0.5,
                }}
              />
            </Stack>
          ))}
        </Stack>
      </Panel>

      <Panel title="Radius" sx={{ mb: 3 }}>
        <Grid>
          {(Object.entries(theme.opsforge.radius) as [string, number][]).map(([name, px]) => (
            <Box key={name}>
              <Box
                sx={{
                  height: 56,
                  bgcolor: 'background.sunken',
                  border: 1,
                  borderColor: 'border.default',
                  borderRadius: `${px}px`,
                }}
              />
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                {name}
              </Typography>
              <Typography variant="monoSmall" color="text.secondary">
                {px === 999 ? 'pill' : `${px}px`}
              </Typography>
            </Box>
          ))}
        </Grid>
      </Panel>

      <Panel title="Elevation" sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Soft, cool, layered shadows. Cards sit at 1, menus at 8, dialogs at 16. Never coloured.
        </Typography>
        <Grid>
          {ELEVATIONS.map((level) => (
            <Box key={level}>
              <Box
                sx={{
                  height: 64,
                  bgcolor: 'background.raised',
                  borderRadius: 2,
                  boxShadow: level,
                }}
              />
              <Typography variant="monoSmall" sx={{ display: 'block', mt: 1 }}>
                shadows[{level}]
              </Typography>
            </Box>
          ))}
        </Grid>
      </Panel>

      <Panel title="Borders" sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Borders do most of the separation work. Subtle for dividers inside a surface, default for
          cards and inputs, strong for emphasis and focus-adjacent edges.
        </Typography>
        <Grid>
          {(['subtle', 'default', 'strong'] as const).map((weight) => (
            <Box key={weight}>
              <Box
                sx={{
                  height: 56,
                  borderRadius: 2,
                  border: 1,
                  borderColor: `border.${weight}`,
                  bgcolor: 'background.paper',
                }}
              />
              <Typography variant="monoSmall" sx={{ display: 'block', mt: 1 }}>
                border.{weight}
              </Typography>
            </Box>
          ))}
        </Grid>
      </Panel>

      <Panel title="Type scale" sx={{ mb: 3 }}>
        <Stack spacing={1}>
          {(
            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'subtitle1', 'body1', 'body2', 'caption'] as const
          ).map((variant) => (
            <Stack
              key={variant}
              direction="row"
              spacing={2}
              sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}
            >
              <Typography variant="monoSmall" color="text.secondary" sx={{ width: 84 }}>
                {variant}
              </Typography>
              <Typography variant={variant}>Reliable systems, measurable readiness</Typography>
            </Stack>
          ))}
          <Stack direction="row" spacing={2} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
            <Typography variant="monoSmall" color="text.secondary" sx={{ width: 84 }}>
              overline
            </Typography>
            <Typography variant="overline">Section label</Typography>
          </Stack>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
            <Typography variant="monoSmall" color="text.secondary" sx={{ width: 84 }}>
              mono
            </Typography>
            <Typography variant="mono">
              kubectl get pods -A --field-selector=status.phase!=Running
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
            <Typography variant="monoSmall" color="text.secondary" sx={{ width: 84 }}>
              metric
            </Typography>
            <Typography variant="metric">1,284</Typography>
          </Stack>
        </Stack>
      </Panel>
    </>
  )
}
