import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { useId, type ReactNode } from 'react'
import { ToneChip } from '@opsforge/ui'

export interface PanelTabItem {
  id: string
  label: string
  count?: number
  content: ReactNode
}

export interface PanelTabsProps {
  items: PanelTabItem[]
  label: string
  value: string
  onChange: (id: string) => void
  /** Panels scroll inside the available height. */
  fill?: boolean
}

/**
 * Tabs that keep every panel mounted. Forms (RCA, hypotheses, answers) hold drafts in local state,
 * so switching tabs mid-investigation must not discard them.
 */
export function PanelTabs({ items, label, value, onChange, fill }: PanelTabsProps) {
  const base = useId()
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: fill ? '100%' : undefined,
      }}
    >
      <Tabs
        value={value}
        onChange={(_, next: string) => onChange(next)}
        aria-label={label}
        variant="scrollable"
        scrollButtons="auto"
        sx={(theme) => ({
          borderBottom: `1px solid ${theme.palette.border.subtle}`,
          flexShrink: 0,
          minHeight: 44,
        })}
      >
        {items.map((item) => (
          <Tab
            key={item.id}
            value={item.id}
            id={`${base}-tab-${item.id}`}
            aria-controls={`${base}-panel-${item.id}`}
            sx={{ minHeight: 44 }}
            label={
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                {item.label}
                {item.count !== undefined && item.count > 0 && (
                  <ToneChip mono size="small" label={item.count} />
                )}
              </Box>
            }
          />
        ))}
      </Tabs>
      {items.map((item) => (
        <Box
          key={item.id}
          role="tabpanel"
          hidden={item.id !== value}
          id={`${base}-panel-${item.id}`}
          aria-labelledby={`${base}-tab-${item.id}`}
          sx={{ flex: fill ? 1 : undefined, minHeight: 0, overflowY: fill ? 'auto' : undefined }}
        >
          {item.content}
        </Box>
      ))}
    </Box>
  )
}
