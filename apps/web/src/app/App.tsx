import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ArchitectureStudioPage } from '../pages/ArchitectureStudioPage'
import { IncidentSimulatorPage } from '../pages/IncidentSimulatorPage'
import { InterviewerPage } from '../pages/InterviewerPage'
import { JdPage } from '../pages/JdPage'
import { ReadinessPage } from '../pages/ReadinessPage'
import { ResumePage } from '../pages/ResumePage'
import { CommandCenterPage } from '../pages/CommandCenterPage'
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
              <>
                {module.id === 'command-center' ? (
                  <CommandCenterPage />
                ) : module.id === 'architecture' ? (
                  <ArchitectureStudioPage />
                ) : module.id === 'incidents' ? (
                  <IncidentSimulatorPage />
                ) : module.id === 'interviewer' ? (
                  <InterviewerPage />
                ) : module.id === 'resume' ? (
                  <ResumePage />
                ) : module.id === 'jd' ? (
                  <JdPage />
                ) : module.id === 'readiness' ? (
                  <ReadinessPage />
                ) : (
                  <ModulePlaceholderPage module={module} />
                )}
              </>
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
