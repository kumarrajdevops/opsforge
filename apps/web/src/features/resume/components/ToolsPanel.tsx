import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { Panel } from '@opsforge/ui'
import { ToolTable } from '../../technologies/components/ToolTable'
import type { ResumeTool } from '../tools'

export interface ToolsPanelProps {
  tools: ResumeTool[]
  onPractise: (tool: ResumeTool) => void
}

export function ToolsPanel({ tools, onPractise }: ToolsPanelProps) {
  const tested = tools.filter((t) => t.testedAnswers > 0).length
  return (
    <Panel
      title="Tools on your resume"
      subtitle={`${tools.length} found · ${tested} tested with scored answers`}
    >
      {tools.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No known tools were recognised in the resume text.
        </Typography>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Consolidated: a cloud platform covers its own services, a suite such as the Elastic
            Stack is one entry, and distinct products stay separate. Only tools named on the resume
            are listed.
          </Typography>
          <ToolTable
            label="Tools on your resume"
            rows={tools.map((t) => ({ ...t, claims: t.claimIds.length }))}
            claimsLabel="claim"
            action={(row) => {
              const tool = tools.find((t) => t.id === row.id)
              return tool ? (
                <Button
                  size="small"
                  onClick={() => onPractise(tool)}
                  aria-label={`Practise ${tool.label}`}
                >
                  Practise
                </Button>
              ) : null
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Readiness counts only scored answers, from resume drills and AI Interviewer sessions. A
            tool that is only on the resume stays “claimed”. Demonstrated needs at least two scored
            answers averaging 70.
          </Typography>
        </>
      )}
    </Panel>
  )
}
