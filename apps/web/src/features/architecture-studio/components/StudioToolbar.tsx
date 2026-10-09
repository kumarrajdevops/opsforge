import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined'
import BoltOutlined from '@mui/icons-material/BoltOutlined'
import ChecklistOutlined from '@mui/icons-material/ChecklistOutlined'
import HistoryOutlined from '@mui/icons-material/HistoryOutlined'
import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined'
import SaveOutlined from '@mui/icons-material/SaveOutlined'
import ViewSidebarOutlined from '@mui/icons-material/ViewSidebarOutlined'
import WidgetsOutlined from '@mui/icons-material/WidgetsOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import type { ArchitectureEvaluation, FailureScenario, Scenario } from '@opsforge/types'
import { ScoreBadge, ToneChip } from '@opsforge/ui'
import { useState } from 'react'
import { scoreTone } from '../presentation'
import type { SaveState } from '../useArchitectureEditor'

export interface StudioToolbarProps {
  scenarios: Scenario[]
  scenario: Scenario
  onScenarioChange: (id: string) => void
  evaluation: ArchitectureEvaluation
  saveState: SaveState
  versionNumber: number | null
  /** Label of the selected component, enabling the component-specific failures. */
  selectedNodeLabel: string | null
  hasSimulation: boolean
  hasComponents: boolean
  /** Below the lg breakpoint the palette and side panel are drawers. */
  compact: boolean
  onOpenPalette: () => void
  onOpenPanel: () => void
  onRequirements: () => void
  onSave: () => void
  onHistory: () => void
  onReview: () => void
  onReset: () => void
  onSimulate: (kind: FailureScenario['kind']) => void
  onClearSimulation: () => void
}

const SAVE_LABEL: Record<SaveState, string> = {
  unsaved: 'No version saved',
  dirty: 'Unsaved changes',
  saved: 'Saved',
}

export function StudioToolbar(props: StudioToolbarProps) {
  const {
    scenarios,
    scenario,
    evaluation,
    saveState,
    versionNumber,
    selectedNodeLabel,
    hasSimulation,
    hasComponents,
    compact,
  } = props
  const [simAnchor, setSimAnchor] = useState<HTMLElement | null>(null)
  const closeSim = () => setSimAnchor(null)
  const run = (kind: FailureScenario['kind']) => {
    closeSim()
    props.onSimulate(kind)
  }

  const overall = evaluation.overall

  return (
    <Box
      role="toolbar"
      aria-label="Architecture studio"
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        px: { xs: 1.5, md: 2 },
        py: 1,
        borderBottom: `1px solid ${theme.palette.border.default}`,
        backgroundColor: theme.palette.background.paper,
      })}
    >
      {compact && (
        <Tooltip title="Components">
          <IconButton
            aria-label="Open component palette"
            onClick={props.onOpenPalette}
            size="small"
          >
            <WidgetsOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <TextField
        select
        size="small"
        label="Scenario"
        value={scenario.id}
        onChange={(e) => props.onScenarioChange(e.target.value)}
        sx={{ minWidth: { xs: 180, md: 260 }, maxWidth: 320 }}
      >
        {scenarios.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.title}
          </MenuItem>
        ))}
      </TextField>
      <ToneChip tone="neutral" label="Sample scenario" />

      <Button size="small" startIcon={<ChecklistOutlined />} onClick={props.onRequirements}>
        Requirements
      </Button>

      <Box sx={{ flex: 1 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} aria-live="polite">
        <Typography variant="caption" color="text.secondary">
          Score
        </Typography>
        {overall === null ? (
          <ToneChip label="No evidence" />
        ) : (
          <ScoreBadge
            score={overall}
            suffix="/100"
            tone={scoreTone(overall)}
            label="Architecture score"
          />
        )}
        {evaluation.capped && (
          <Tooltip title="A critical check failed, so the overall score is capped.">
            <span>
              <ToneChip tone="error" label="Capped" />
            </span>
          </Tooltip>
        )}
      </Box>

      <Divider
        orientation="vertical"
        flexItem
        sx={{ mx: 0.5, display: { xs: 'none', md: 'block' } }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant="caption"
          color={saveState === 'dirty' ? 'warning.main' : 'text.secondary'}
        >
          {SAVE_LABEL[saveState]}
          {versionNumber !== null ? ` · v${versionNumber}` : ''}
        </Typography>
        <Button
          size="small"
          variant={saveState === 'saved' ? 'outlined' : 'contained'}
          startIcon={<SaveOutlined />}
          onClick={props.onSave}
          disabled={!hasComponents}
        >
          Save
        </Button>
        <Tooltip title="Version history">
          <IconButton aria-label="Version history" onClick={props.onHistory} size="small">
            <HistoryOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Button
        size="small"
        variant="outlined"
        startIcon={<AutoAwesomeOutlined />}
        onClick={props.onReview}
      >
        Review
      </Button>

      <Button
        size="small"
        variant={hasSimulation ? 'contained' : 'outlined'}
        color={hasSimulation ? 'warning' : 'primary'}
        startIcon={<BoltOutlined />}
        aria-haspopup="menu"
        aria-expanded={Boolean(simAnchor)}
        onClick={(e) => setSimAnchor(e.currentTarget)}
        disabled={!hasComponents}
      >
        Simulate failure
      </Button>
      <Menu anchorEl={simAnchor} open={Boolean(simAnchor)} onClose={closeSim}>
        <MenuItem disabled={!selectedNodeLabel} onClick={() => run('node-loss')}>
          <ListItemText
            primary="Lose selected component"
            secondary={selectedNodeLabel ?? 'Select a component first'}
          />
        </MenuItem>
        <MenuItem disabled={!selectedNodeLabel} onClick={() => run('dependency-slow')}>
          <ListItemText
            primary="Slow selected dependency"
            secondary={selectedNodeLabel ?? 'Select a component first'}
          />
        </MenuItem>
        <MenuItem onClick={() => run('zone-loss')}>
          <ListItemText primary="Lose one availability zone" />
        </MenuItem>
        <MenuItem onClick={() => run('region-loss')}>
          <ListItemText primary="Lose the primary region" />
        </MenuItem>
        {hasSimulation && <Divider />}
        {hasSimulation && (
          <MenuItem
            onClick={() => {
              closeSim()
              props.onClearSimulation()
            }}
          >
            <ListItemText primary="Clear simulation" />
          </MenuItem>
        )}
      </Menu>

      <Tooltip title="Reset to the scenario starter design">
        <IconButton aria-label="Reset design" onClick={props.onReset} size="small">
          <RestartAltOutlined fontSize="small" />
        </IconButton>
      </Tooltip>

      {compact && (
        <Tooltip title="Inspector, evaluation, review">
          <IconButton aria-label="Open side panel" onClick={props.onOpenPanel} size="small">
            <ViewSidebarOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}
