import ConstructionOutlined from '@mui/icons-material/ConstructionOutlined'
import Typography from '@mui/material/Typography'
import { AppShell, ColorModeToggle, PageTransition, type NavGroup } from '@opsforge/ui'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AccountMenu } from '../features/account/components/AccountMenu'
import { ApiStatus } from '../features/health/ApiStatus'
import { MODULES, buildNavGroups, findActiveId } from './modules'

const DEV_GROUP: NavGroup[] = import.meta.env.DEV
  ? [
      {
        id: 'developer',
        label: 'Developer',
        items: [
          {
            id: 'design-system',
            label: 'Design System',
            to: '/design-system',
            icon: <ConstructionOutlined fontSize="small" />,
          },
        ],
      },
    ]
  : []

const GROUPS = buildNavGroups(DEV_GROUP)

export function ShellLayout() {
  const { pathname } = useLocation()
  const activeId = findActiveId(
    pathname,
    DEV_GROUP.length ? { 'design-system': '/design-system' } : {},
  )
  const current = MODULES.find((m) => m.id === activeId)

  return (
    <AppShell
      groups={GROUPS}
      activeId={activeId}
      LinkComponent={NavLink}
      fullBleed={activeId === 'architecture' || activeId === 'incidents'}
      topBarStart={
        <Typography variant="subtitle2" component="p" noWrap>
          {current?.label ?? (activeId === 'design-system' ? 'Design System' : 'OPSFORGE')}
        </Typography>
      }
      topBarEnd={
        <>
          <ApiStatus />
          <AccountMenu />
          <ColorModeToggle />
        </>
      }
    >
      <PageTransition routeKey={activeId ?? pathname}>
        <Outlet />
      </PageTransition>
    </AppShell>
  )
}
