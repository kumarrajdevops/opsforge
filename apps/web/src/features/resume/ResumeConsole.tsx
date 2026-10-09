import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { ConfirmDialog, PageHeader, Panel } from '@opsforge/ui'
import { useState } from 'react'
import { ClaimDrill } from './components/ClaimDrill'
import { ClaimList } from './components/ClaimList'
import { ResumeImportView } from './components/ResumeImportView'
import { ToolsPanel } from './components/ToolsPanel'
import { useResume, type ResumeRuntime } from './useResume'

/** Container for ForgeResume. Wires the resume hook to presentational views. */
export function ResumeConsole({ runtime }: { runtime: ResumeRuntime }) {
  const resume = useResume(runtime)
  const [selected, setSelected] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  if (resume.loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress size={28} aria-label="Loading" />
      </Box>
    )
  }

  if (!resume.record) {
    return (
      <ResumeImportView
        disclosure={runtime.disclosure}
        busy={resume.busy}
        error={resume.error}
        onFile={(file) => void resume.importFile(file)}
        onText={(text) => void resume.importText(text)}
      />
    )
  }

  const record = resume.record
  const claim = resume.claims.find((c) => c.id === selected) ?? resume.claims[0]
  const defended = Object.values(resume.defensibility).filter(
    (d) => d.level === 'defensible' || d.level === 'strong',
  ).length
  const probed = resume.claims.filter((c) => !c.flags.includes('listed-only')).length

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <PageHeader
        eyebrow="ForgeResume"
        title="Resume Interrogation"
        description={`${resume.claims.length} claims extracted${record.fileName ? ` from ${record.fileName}` : ''}. Defend each one from several angles before an interviewer does.`}
        actions={
          <Button color="inherit" onClick={() => setConfirming(true)}>
            Replace resume
          </Button>
        }
      />
      {resume.error && <Alert severity="error">{resume.error}</Alert>}

      <ToolsPanel
        tools={resume.tools}
        onPractise={(tool) => setSelected(tool.workClaimIds[0] ?? tool.claimIds[0] ?? null)}
      />

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 3fr)' },
          alignItems: 'start',
        }}
      >
        <Panel
          title="Claims"
          subtitle={`${defended} of ${resume.claims.length} defensible · ${probed} describe work`}
        >
          <ClaimList
            claims={resume.claims}
            defensibility={resume.defensibility}
            selectedId={claim?.id ?? null}
            onSelect={setSelected}
          />
        </Panel>

        {claim ? (
          <ClaimDrill
            key={claim.id}
            claim={claim}
            questions={resume.questionsFor(claim.id)}
            attempts={resume.attemptsFor(claim.id)}
            defensibility={resume.defensibility[claim.id]!}
            disclosure={runtime.disclosure}
            busy={resume.busy}
            onAnswer={resume.answer}
          />
        ) : (
          <Typography color="text.secondary">No claims.</Typography>
        )}
      </Box>

      <ConfirmDialog
        open={confirming}
        title="Replace this resume?"
        destructive
        description="The current claims and every drill answer attached to them will be removed from this browser."
        confirmLabel="Replace"
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          setSelected(null)
          void resume.clear()
        }}
      />
    </Box>
  )
}
