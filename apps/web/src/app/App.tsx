import { Reveal } from '@opsforge/ui'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ModulePlaceholderPage } from '../pages/ModulePlaceholderPage'
import { MODULES } from './modules'
import { ShellLayout } from './ShellLayout'

const DesignSystemPage = import.meta.env.DEV
  ? lazy(() => import('../pages/DesignSystemPage'))
  : null

export function App() {
  return (
    <Routes>
      <Route element={<ShellLayout />}>
        {MODULES.map((module) => (
          <Route
            key={module.id}
            path={module.path}
            element={
              <Reveal>
                <ModulePlaceholderPage module={module} />
              </Reveal>
            }
          />
        ))}
        {DesignSystemPage && (
          <Route
            path="/design-system"
            element={
              <Suspense fallback={null}>
                <DesignSystemPage />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
