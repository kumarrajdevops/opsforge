import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { Panel } from '@opsforge/ui'
import { Link as RouterLink } from 'react-router-dom'
import { ToolTable } from '../../technologies/components/ToolTable'
import type { JdTool } from '../tools'

export function ToolsView({ tools }: { tools: JdTool[] }) {
  if (tools.length === 0) {
    return <Alert severity="info">No known tools were recognised in the posting.</Alert>
  }
  const tested = tools.filter((t) => t.testedAnswers > 0).length

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Typography variant="body2" color="text.secondary">
        The tools and technologies the posting names, consolidated: a cloud platform covers its own
        services, a suite such as the Elastic Stack is one entry, and distinct products stay
        separate. Concepts such as CI/CD or reliability are not tools; they are on the Readiness gap
        tab. Each bar is your mean score on scored answers, demonstrated at 70 or more over at least
        two answers. A resume line alone only makes a tool “claimed”.
      </Typography>
      <Panel
        title="Consolidated tools and technologies"
        subtitle={`${tools.length} found · ${tested} tested with scored answers`}
      >
        <ToolTable
          label="Tools in the job description"
          rows={tools}
          claimsLabel="resume claim"
          action={(row) => (
            <Button
              size="small"
              component={RouterLink}
              to="/interviewer"
              aria-label={`Practise ${row.label}`}
            >
              Practise
            </Button>
          )}
        />
      </Panel>
    </Box>
  )
}
