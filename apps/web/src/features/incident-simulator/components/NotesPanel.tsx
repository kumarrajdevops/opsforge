import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { InterviewerPrompt } from '@opsforge/types'
import { useState } from 'react'

export interface NotesPanelProps {
  prompts: InterviewerPrompt[]
  notes: Record<string, { text: string }>
  disabled: boolean
  onSave: (promptId: string, text: string) => void
}

function PromptCard({
  prompt,
  saved,
  disabled,
  onSave,
}: {
  prompt: InterviewerPrompt
  saved: string
  disabled: boolean
  onSave: (text: string) => void
}) {
  const [text, setText] = useState(saved)
  return (
    <Box
      component="li"
      sx={(theme) => ({
        p: 1.5,
        borderRadius: `${theme.opsforge.radius.md}px`,
        border: `1px solid ${theme.palette.border.subtle}`,
        display: 'grid',
        gap: 1,
      })}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {prompt.text}
      </Typography>
      <TextField
        size="small"
        multiline
        minRows={2}
        label="Your answer"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
      />
      <Box>
        <Button
          size="small"
          variant="outlined"
          disabled={disabled || text.trim() === '' || text === saved}
          onClick={() => onSave(text)}
        >
          {saved ? 'Update answer' : 'Save answer'}
        </Button>
      </Box>
    </Box>
  )
}

/** Questions from the interviewer, released as the interview reaches them. Answers are kept with the session. */
export function NotesPanel({ prompts, notes, disabled, onSave }: NotesPanelProps) {
  if (prompts.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          The interviewer has no questions yet.
        </Typography>
      </Box>
    )
  }
  return (
    <Box
      component="ul"
      aria-label="Interviewer questions"
      sx={{ m: 0, p: 2, listStyle: 'none', display: 'grid', gap: 1.25 }}
    >
      {prompts.map((p) => (
        <PromptCard
          key={p.id}
          prompt={p}
          saved={notes[p.id]?.text ?? ''}
          disabled={disabled}
          onSave={(text) => onSave(p.id, text)}
        />
      ))}
    </Box>
  )
}
