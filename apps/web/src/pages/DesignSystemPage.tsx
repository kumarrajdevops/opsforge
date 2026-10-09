import TerminalOutlined from '@mui/icons-material/TerminalOutlined'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import {
  CodeBlock,
  CommandCard,
  ConfirmDialog,
  DataTable,
  DialogShell,
  InlineCode,
  MetricStat,
  PageHeader,
  Panel,
  ProgressBar,
  ScoreBadge,
  ScoreRing,
  SectionTabs,
  SideDrawer,
  StatusIndicator,
  ToneChip,
  type DataTableColumn,
  type Tone,
} from '@opsforge/ui'
import { useState } from 'react'

const TONES: Tone[] = ['neutral', 'primary', 'ai', 'success', 'warning', 'error', 'info']

interface DemoRow {
  id: number
  topic: string
  level: string
  command: string
  score: number
}

const ROWS: DemoRow[] = [
  { id: 1, topic: 'Linux', level: 'Senior', command: 'ss -tulpn', score: 82 },
  { id: 2, topic: 'Kubernetes', level: 'Senior', command: 'kubectl describe pod', score: 64 },
  { id: 3, topic: 'Terraform', level: 'Mid', command: 'terraform plan -out=tfplan', score: 71 },
]

const COLUMNS: DataTableColumn<DemoRow>[] = [
  { field: 'topic', headerName: 'Topic', flex: 1, minWidth: 120 },
  { field: 'level', headerName: 'Level', width: 110 },
  { field: 'command', headerName: 'Command', flex: 1.5, minWidth: 200, cellClassName: 'mono' },
  { field: 'score', headerName: 'Score', width: 90, type: 'number', cellClassName: 'mono' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel title={title} sx={{ mb: 3 }}>
      {children}
    </Panel>
  )
}

/** Dev-only gallery. Every example uses library components only — no page-level styling. */
export default function DesignSystemPage() {
  const [dialog, setDialog] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [drawer, setDrawer] = useState(false)

  return (
    <>
      <PageHeader
        eyebrow="Developer"
        title="Design System"
        description="Living reference for the OPSFORGE component library. Toggle light and dark from the top bar."
      />

      <Section title="Typography">
        <Stack spacing={1}>
          <Typography variant="h1">Heading 1: Manrope</Typography>
          <Typography variant="h3">Heading 3</Typography>
          <Typography variant="body1">
            Body copy is set in Manrope for readable, neutral technical prose.
          </Typography>
          <Typography variant="mono">kubectl rollout status deploy/api -n prod</Typography>
          <Typography variant="metric">99.95%</Typography>
        </Stack>
      </Section>

      <Section title="Buttons">
        <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button variant="contained">Primary</Button>
          <Button variant="contained" color="ai">
            AI action
          </Button>
          <Button variant="outlined">Outlined</Button>
          <Button variant="text">Text</Button>
          <Button variant="contained" color="error">
            Destructive
          </Button>
          <Button variant="contained" disabled>
            Disabled
          </Button>
        </Stack>
      </Section>

      <Section title="Chips, badges, status">
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {TONES.map((tone) => (
              <ToneChip key={tone} tone={tone} label={tone} />
            ))}
            <ToneChip tone="info" mono label="kubernetes 1.31" />
          </Stack>
          <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>
            <Badge badgeContent={4} color="primary">
              <TerminalOutlined />
            </Badge>
            <Badge badgeContent="AI" color="ai">
              <TerminalOutlined />
            </Badge>
          </Stack>
          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <StatusIndicator status="healthy" />
            <StatusIndicator status="degraded" />
            <StatusIndicator status="critical" pulse />
            <StatusIndicator status="info" variant="pill" />
            <StatusIndicator status="unknown" variant="pill" />
          </Stack>
        </Stack>
      </Section>

      <Section title="Scores and progress">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={4}
          sx={{ alignItems: 'flex-start' }}
        >
          <Stack direction="row" spacing={3}>
            <ScoreRing value={78} label="Readiness" tone="primary" />
            <ScoreRing value={42} label="Weak area" tone="warning" size={96} />
          </Stack>
          <Stack spacing={2} sx={{ flex: 1, width: '100%' }}>
            <ProgressBar label="Kubernetes" value={72} target={85} targetLabel="Senior target" />
            <ProgressBar label="Incident response" value={45} tone="warning" />
            <ProgressBar label="Terraform" value={91} tone="success" />
            <Stack direction="row" spacing={1}>
              <ScoreBadge score={8.5} suffix="/10" tone="success" label="Architecture score" />
              <ScoreBadge score={3} suffix="/10" tone="error" label="Security score" />
            </Stack>
          </Stack>
        </Stack>
        <Box
          sx={{
            mt: 3,
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          }}
        >
          <MetricStat
            label="MTTR (drills)"
            value="14"
            unit="min"
            delta={{ text: '-3 min', tone: 'success' }}
          />
          <MetricStat
            label="Answers scored"
            value="128"
            delta={{ text: '+12 this week', tone: 'info' }}
          />
          <MetricStat label="Evidence quality" value="0.81" helper="Weighted by recency" />
        </Box>
      </Section>

      <Section title="Command cards">
        <Box
          sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}
        >
          <CommandCard
            title="Start incident drill"
            description="Investigate a failing rollout under time pressure."
            icon={<TerminalOutlined />}
            tone="error"
            meta={<ToneChip tone="neutral" size="small" label="20 min" />}
            onClick={() => undefined}
          />
          <CommandCard
            title="Review architecture"
            description="Rules plus AI critique of your design."
            icon={<TerminalOutlined />}
            tone="ai"
            onClick={() => undefined}
          />
          <CommandCard
            title="Locked"
            description="Disabled state."
            icon={<TerminalOutlined />}
            disabled
          />
        </Box>
      </Section>

      <Section title="Code">
        <Stack spacing={2}>
          <Typography variant="body2">
            Inline: run <InlineCode>terraform validate</InlineCode> before every plan.
          </Typography>
          <CodeBlock
            language="bash"
            title="Check pod restarts"
            prompt="$"
            code={'kubectl get pods -n prod\nkubectl logs deploy/api -n prod --previous'}
          />
        </Stack>
      </Section>

      <Section title="Tabs">
        <SectionTabs
          label="Example sections"
          items={[
            {
              id: 'overview',
              label: 'Overview',
              content: <Typography>Overview content</Typography>,
            },
            {
              id: 'commands',
              label: 'Commands',
              count: 12,
              content: <Typography>Command list</Typography>,
            },
            { id: 'notes', label: 'Notes', content: <Typography>Notes</Typography> },
          ]}
        />
      </Section>

      <Section title="Data table">
        <DataTable<DemoRow> label="Example topics" rows={ROWS} columns={COLUMNS} hideFooter />
      </Section>

      <Section title="Dialogs and drawers">
        <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={() => setDialog(true)}>
            Open dialog
          </Button>
          <Button variant="outlined" color="error" onClick={() => setConfirm(true)}>
            Open confirm
          </Button>
          <Button variant="outlined" onClick={() => setDrawer(true)}>
            Open drawer
          </Button>
        </Stack>
        <DialogShell
          open={dialog}
          onClose={() => setDialog(false)}
          title="Dialog title"
          description="Dialogs trap focus, label themselves and close on Escape."
          actions={<Button onClick={() => setDialog(false)}>Close</Button>}
        >
          <Typography>Dialog content.</Typography>
        </DialogShell>
        <ConfirmDialog
          open={confirm}
          destructive
          title="Reset sandbox?"
          description="All lab state will be discarded."
          confirmLabel="Reset"
          onConfirm={() => setConfirm(false)}
          onClose={() => setConfirm(false)}
        />
        <SideDrawer
          open={drawer}
          onClose={() => setDrawer(false)}
          title="Filters"
          subtitle="Narrow the list"
          footer={<Button onClick={() => setDrawer(false)}>Apply</Button>}
        >
          <Typography>Drawer content.</Typography>
        </SideDrawer>
      </Section>
    </>
  )
}
