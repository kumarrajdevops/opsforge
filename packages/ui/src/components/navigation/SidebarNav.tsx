import Box from '@mui/material/Box'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import type { ElementType } from 'react'
import { ToneChip } from '../ToneChip'
import { linkProps } from '../linkTypes'
import type { NavGroup } from './types'

export interface SidebarNavProps {
  groups: NavGroup[]
  activeId?: string
  LinkComponent?: ElementType
  /** Called after a link is chosen (closes the mobile drawer). */
  onNavigate?: () => void
}

/** Grouped primary navigation. Router-agnostic; marks the active item with aria-current. */
export function SidebarNav({ groups, activeId, LinkComponent, onNavigate }: SidebarNavProps) {
  return (
    <Box component="nav" aria-label="Primary" sx={{ px: 1.5, pb: 2 }}>
      {groups.map((group) => (
        <Box
          key={group.id}
          component="section"
          aria-labelledby={`nav-group-${group.id}`}
          sx={{ mt: 2 }}
        >
          <Typography
            id={`nav-group-${group.id}`}
            variant="overline"
            color="text.secondary"
            component="h2"
            sx={{ px: 1.5, mb: 0.5, display: 'block' }}
          >
            {group.label}
          </Typography>
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 0.25 }}>
            {group.items.map((item) => {
              const selected = item.id === activeId
              return (
                <li key={item.id}>
                  <ListItemButton
                    {...linkProps({ to: item.to, LinkComponent })}
                    selected={selected}
                    aria-current={selected ? 'page' : undefined}
                    onClick={onNavigate}
                    sx={(theme) => ({
                      py: 0.75,
                      px: 1.5,
                      color: theme.palette.text.secondary,
                      '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 32 },
                      '&:hover': { color: theme.palette.text.primary },
                      '&.Mui-selected': {
                        color:
                          theme.palette.mode === 'light'
                            ? theme.palette.primary.dark
                            : theme.palette.primary.light,
                        backgroundColor: theme.palette.action.selected,
                        '&:hover': { backgroundColor: theme.palette.action.selected },
                      },
                    })}
                  >
                    {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
                    <ListItemText
                      primary={item.label}
                      slotProps={{
                        primary: { variant: 'body2', sx: { fontWeight: selected ? 700 : 600 } },
                      }}
                    />
                    {item.badge !== undefined && <ToneChip mono size="small" label={item.badge} />}
                  </ListItemButton>
                </li>
              )
            })}
          </Box>
        </Box>
      ))}
    </Box>
  )
}
