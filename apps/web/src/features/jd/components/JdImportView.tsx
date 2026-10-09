import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { PageHeader, Panel } from '@opsforge/ui'
import { useState } from 'react'

export interface JdImportViewProps {
  hasResume: boolean
  error: string | null
  onAnalyze: (text: string) => void
}

export function JdImportView({ hasResume, error, onAnalyze }: JdImportViewProps) {
  const [text, setText] = useState('')
  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <PageHeader
        eyebrow="ForgeJD"
        title="JD Analyzer"
        description="Paste a job description. See what it really asks for, how your evidence measures up, and what to prepare first."
      />
      {error && <Alert severity="error">{error}</Alert>}
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 3fr) minmax(0, 2fr)' },
          alignItems: 'start',
        }}
      >
        <Panel title="Job description">
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              multiline
              minRows={12}
              maxRows={26}
              label="Paste the posting"
              placeholder={
                'Senior Site Reliability Engineer\n\nRequirements\n- Strong Kubernetes and Terraform experience\n\nNice to have\n- Service mesh'
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Box>
              <Button
                variant="contained"
                disabled={text.trim().length === 0}
                onClick={() => onAnalyze(text)}
              >
                Analyze
              </Button>
            </Box>
          </Box>
        </Panel>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Panel title="What you get">
            <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'grid', gap: 0.75 }}>
              {[
                'Technologies, split into required and preferred',
                'Responsibilities grouped by theme',
                'Seniority signals and the level they add up to',
                'Required and preferred skills beyond tools',
                'A comparison with your scored interview answers and resume drills',
                'A day-by-day preparation plan, most urgent gaps first',
              ].map((line) => (
                <Typography component="li" variant="body2" key={line}>
                  {line}
                </Typography>
              ))}
            </Box>
          </Panel>
          {!hasResume && (
            <Alert severity="info" variant="outlined">
              No resume is saved yet, so the comparison will only use interview answers. Importing a
              resume in Resume Interrogation adds claims and drill results.
            </Alert>
          )}
        </Box>
      </Box>
    </Box>
  )
}
