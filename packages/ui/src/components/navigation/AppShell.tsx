import MenuIcon from '@mui/icons-material/Menu'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { useState, type ElementType, type ReactNode } from 'react'
import { Brand } from './Brand'
import { SidebarNav } from './SidebarNav'
import type { NavGroup } from './types'

export interface AppShellProps {
  groups: NavGroup[]
  activeId?: string
  LinkComponent?: ElementType
  /** Route for the brand link. */
  homeTo?: string
  /** Left side of the top bar after the menu button (page context, breadcrumbs, search). */
  topBarStart?: ReactNode
  /** Right side of the top bar (status, theme toggle, user menu). */
  topBarEnd?: ReactNode
  /** Main region fills the viewport width with no padding or max width (editors, canvases). */
  fullBleed?: boolean
  children: ReactNode
}

/**
 * Application frame: skip link, persistent sidebar (md+) / drawer (below md), top bar, main region.
 * Contains layout only; no feature knowledge.
 */
export function AppShell({
  groups,
  activeId,
  LinkComponent,
  homeTo = '/',
  topBarStart,
  topBarEnd,
  fullBleed = false,
  children,
}: AppShellProps) {
  const theme = useTheme()
  const { sidebarWidth, topBarHeight, contentMaxWidth } = theme.opsforge.layout
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)

  const brandLink = LinkComponent
    ? { component: LinkComponent, to: homeTo }
    : { component: 'a', href: homeTo }

  const sidebar = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{ height: topBarHeight, display: 'flex', alignItems: 'center', px: 2.5, flexShrink: 0 }}
      >
        <Box
          {...brandLink}
          aria-label="OPSFORGE home"
          sx={{ color: 'text.primary', textDecoration: 'none', display: 'inline-flex' }}
        >
          <Brand />
        </Box>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <SidebarNav
          groups={groups}
          activeId={activeId}
          LinkComponent={LinkComponent}
          onNavigate={() => setMobileOpen(false)}
        />
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box
        component="a"
        href="#main-content"
        sx={(t) => ({
          position: 'absolute',
          left: 8,
          top: -48,
          zIndex: t.zIndex.tooltip + 1,
          px: 2,
          py: 1,
          borderRadius: `${t.opsforge.radius.md}px`,
          backgroundColor: t.palette.primary.main,
          color: t.palette.primary.contrastText,
          fontWeight: 700,
          textDecoration: 'none',
          '&:focus': { top: 8 },
        })}
      >
        Skip to main content
      </Box>

      {isDesktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: sidebarWidth,
              boxSizing: 'border-box',
              borderRight: `1px solid ${theme.palette.border.subtle}`,
            },
          }}
        >
          {sidebar}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: sidebarWidth, boxSizing: 'border-box' } }}
        >
          {sidebar}
        </Drawer>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={(t) => ({
            backgroundColor: t.palette.background.paper,
            borderBottom: `1px solid ${t.palette.border.subtle}`,
          })}
        >
          <Toolbar sx={{ minHeight: `${topBarHeight}px !important`, gap: 1.5 }}>
            {!isDesktop && (
              <IconButton
                edge="start"
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {topBarStart}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{topBarEnd}</Box>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          id="main-content"
          tabIndex={-1}
          sx={{
            flex: 1,
            width: '100%',
            ...(fullBleed
              ? { display: 'flex', flexDirection: 'column' }
              : {
                  maxWidth: contentMaxWidth,
                  mx: 'auto',
                  px: { xs: 2, sm: 3, lg: 4 },
                  py: { xs: 3, md: 4 },
                }),
            outline: 'none',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}
