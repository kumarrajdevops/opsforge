import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { PageHeader, Panel } from '@opsforge/ui'
import { useRef, useState } from 'react'

export interface ResumeImportViewProps {
  disclosure: string
  busy: boolean
  error: string | null
  onFile: (file: File) => void
  onText: (text: string) => void
}

export function ResumeImportView({
  disclosure,
  busy,
  error,
  onFile,
  onText,
}: ResumeImportViewProps) {
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <PageHeader
        eyebrow="ForgeResume"
        title="Resume Interrogation"
        description="Every line on your resume is something an interviewer can probe. Import it, and each claim becomes a set of questions you can practise defending."
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
        <Panel
          title="Import your resume"
          subtitle="Upload a .docx, .txt or .md file, or paste the text."
        >
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Box>
              <input
                ref={input}
                hidden
                type="file"
                accept=".docx,.txt,.md,.markdown,.pdf"
                aria-label="Upload resume file"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onFile(file)
                  e.target.value = ''
                }}
              />
              <Button
                variant="outlined"
                startIcon={<UploadFileOutlined />}
                disabled={busy}
                onClick={() => input.current?.click()}
              >
                Upload file
              </Button>
            </Box>
            <TextField
              multiline
              minRows={10}
              maxRows={22}
              label="Or paste resume text"
              placeholder={
                'EXPERIENCE\nAcme Corp, Senior DevOps Engineer\n- Implemented Kubernetes for 40 services across 3 regions\n- Reduced deploy time from 45 to 8 minutes by moving CI to GitHub Actions'
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Box>
              <Button
                variant="contained"
                disabled={busy || text.trim().length === 0}
                onClick={() => onText(text)}
              >
                {busy ? 'Reading…' : 'Extract claims'}
              </Button>
            </Box>
          </Box>
        </Panel>

        <Box sx={{ display: 'grid', gap: 2 }}>
          <Panel title="What happens next">
            <Box component="ol" sx={{ m: 0, pl: 2.5, display: 'grid', gap: 1 }}>
              <Typography component="li" variant="body2">
                Achievements and skills are extracted as claims, with weak wording flagged.
              </Typography>
              <Typography component="li" variant="body2">
                Each claim gets eight questions: architecture, networking, security, observability,
                troubleshooting, trade-offs, incidents and leadership.
              </Typography>
              <Typography component="li" variant="body2">
                You answer them; scoring is by fixed rules. A claim is only called defensible after
                you have defended it from several angles.
              </Typography>
            </Box>
          </Panel>
          <Alert severity="info" variant="outlined">
            <strong>Privacy and analysis.</strong> The resume stays in this browser. {disclosure}{' '}
            PDF files are not read directly yet; copy the text out of the PDF and paste it.
          </Alert>
        </Box>
      </Box>
    </Box>
  )
}
