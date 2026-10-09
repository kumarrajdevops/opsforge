import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { useId, useState, type ReactNode } from 'react'
import { ToneChip } from './ToneChip'

export interface SectionTabItem {
  id: string
  label: string
  icon?: ReactNode
  /** Small count rendered after the label. */
  count?: number
  content: ReactNode
}

export interface SectionTabsProps {
  items: SectionTabItem[]
  /** Accessible name for the tab list. */
  label: string
  value?: string
  defaultValue?: string
  onChange?: (id: string) => void
}

/** Accessible tab set with its panels (controlled or uncontrolled). */
export function SectionTabs({ items, label, value, defaultValue, onChange }: SectionTabsProps) {
  const base = useId()
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.id ?? '')
  const current = value ?? internal
  const active = items.find((item) => item.id === current)

  function select(next: string) {
    if (value === undefined) setInternal(next)
    onChange?.(next)
  }

  return (
    <Box>
      <Tabs
        value={current}
        onChange={(_, next: string) => select(next)}
        aria-label={label}
        variant="scrollable"
        scrollButtons="auto"
      >
        {items.map((item) => (
          <Tab
            key={item.id}
            value={item.id}
            id={`${base}-tab-${item.id}`}
            aria-controls={`${base}-panel-${item.id}`}
            icon={item.icon as never}
            iconPosition="start"
            label={
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                {item.label}
                {item.count !== undefined && <ToneChip mono size="small" label={item.count} />}
              </Box>
            }
          />
        ))}
      </Tabs>
      {active && (
        <Box
          role="tabpanel"
          id={`${base}-panel-${active.id}`}
          aria-labelledby={`${base}-tab-${active.id}`}
          sx={{ pt: 2.5 }}
        >
          {active.content}
        </Box>
      )}
    </Box>
  )
}
