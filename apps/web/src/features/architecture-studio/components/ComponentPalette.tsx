import SearchOutlined from '@mui/icons-material/SearchOutlined'
import Box from '@mui/material/Box'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import type { CloudProvider, ComponentCategory, ComponentDefinition } from '@opsforge/types'
import { toneColors } from '@opsforge/ui'
import { useMemo, useState, type DragEvent } from 'react'
import { CATEGORY_LABELS, CATEGORY_ORDER, searchCatalog } from '../catalog'
import { categoryIcon, providerShort, providerTone } from '../presentation'
import { PALETTE_DRAG_TYPE } from './ArchitectureCanvas'

type Filter = CloudProvider | 'all'

export interface ComponentPaletteProps {
  onAdd: (componentId: string) => void
}

function PaletteItem({ def, onAdd }: { def: ComponentDefinition; onAdd: (id: string) => void }) {
  function handleDragStart(event: DragEvent) {
    event.dataTransfer.setData(PALETTE_DRAG_TYPE, def.id)
    event.dataTransfer.effectAllowed = 'copy'
  }
  return (
    <Box
      component="button"
      type="button"
      draggable
      onDragStart={handleDragStart}
      onClick={() => onAdd(def.id)}
      aria-label={`Add ${def.name} (${providerShort[def.provider]})`}
      title={def.summary}
      sx={(theme) => ({
        all: 'unset',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        width: '100%',
        px: 1,
        py: 0.75,
        cursor: 'grab',
        borderRadius: `${theme.opsforge.radius.sm}px`,
        border: '1px solid transparent',
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
          borderColor: theme.palette.border.subtle,
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: -2,
        },
        '&:active': { cursor: 'grabbing' },
      })}
    >
      <Box
        aria-hidden
        sx={(theme) => ({
          width: 26,
          height: 26,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          fontSize: 17,
          borderRadius: `${theme.opsforge.radius.sm}px`,
          backgroundColor: toneColors(theme, providerTone[def.provider]).bg,
          color: toneColors(theme, providerTone[def.provider]).fg,
        })}
      >
        {categoryIcon[def.category]}
      </Box>
      <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0, fontWeight: 500 }}>
        {def.name}
      </Typography>
      <Typography variant="monoSmall" color="text.secondary">
        {providerShort[def.provider]}
      </Typography>
    </Box>
  )
}

/** Searchable, provider-filtered catalog. Drag onto the canvas or click to add. */
export function ComponentPalette({ onAdd }: ComponentPaletteProps) {
  const [query, setQuery] = useState('')
  const [provider, setProvider] = useState<Filter>('all')

  const groups = useMemo(() => {
    const found = searchCatalog(query, provider)
    return CATEGORY_ORDER.map((category: ComponentCategory) => ({
      category,
      items: found.filter((c) => c.category === category),
    })).filter((g) => g.items.length > 0)
  }, [query, provider])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ p: 1.5, display: 'grid', gap: 1 }}>
        <TextField
          size="small"
          type="search"
          placeholder="Search components"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': 'Search components' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={provider}
          onChange={(_, next: Filter | null) => next && setProvider(next)}
          aria-label="Provider filter"
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="aws">AWS</ToggleButton>
          <ToggleButton value="azure">Azure</ToggleButton>
          <ToggleButton value="generic">Generic</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1, pb: 2 }}>
        {groups.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
            No components match “{query}”.
          </Typography>
        )}
        {groups.map((group) => (
          <Box
            key={group.category}
            component="section"
            aria-label={CATEGORY_LABELS[group.category]}
            sx={{ mb: 1.5 }}
          >
            <Typography variant="overline" color="text.secondary" sx={{ px: 1, display: 'block' }}>
              {CATEGORY_LABELS[group.category]}
            </Typography>
            {group.items.map((def) => (
              <PaletteItem key={def.id} def={def} onAdd={onAdd} />
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
