import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { ConfirmDialog } from '@opsforge/ui'
import { useState } from 'react'
import { BetweenRoundsView } from './components/BetweenRoundsView'
import { DebriefView } from './components/DebriefView'
import { ReplayView } from './components/ReplayView'
import { RoomView } from './components/RoomView'
import { SetupView } from './components/SetupView'
import type { InterviewerRuntime } from './factory'
import { useInterviewer } from './useInterviewer'

type Confirm = 'round' | 'interview' | null

/** Container for ForgeInterview. Wires the interview hook to presentational views. */
export function InterviewerConsole({ runtime }: { runtime: InterviewerRuntime }) {
  const interviewer = useInterviewer({ runtime })
  const { phase, view, completed, replay, busy, error } = interviewer
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [replaying, setReplaying] = useState(false)

  const content = (() => {
    if (phase === 'loading') {
      return (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress size={28} aria-label="Loading" />
        </Box>
      )
    }
    if (phase === 'question' && view) {
      return (
        <RoomView
          key={view.question?.askedAt}
          view={view}
          remainingSeconds={interviewer.remainingSeconds}
          busy={busy}
          error={error}
          onSubmit={(text) => void interviewer.submit(text)}
          onSkip={() => void interviewer.skip()}
          onEndRound={() => setConfirm('round')}
          onEndInterview={() => setConfirm('interview')}
        />
      )
    }
    if (phase === 'between-rounds' && view) {
      return (
        <BetweenRoundsView
          view={view}
          busy={busy}
          error={error}
          onContinue={() => void interviewer.nextRound()}
          onEndInterview={() => setConfirm('interview')}
        />
      )
    }
    if (phase === 'complete' && completed) {
      return replaying && replay ? (
        <ReplayView threads={replay} onBack={() => setReplaying(false)} />
      ) : (
        <DebriefView
          session={completed}
          onReplay={() => setReplaying(true)}
          onNew={() => {
            setReplaying(false)
            interviewer.newInterview()
          }}
        />
      )
    }
    return (
      <SetupView
        disclosure={interviewer.disclosure}
        weakTopics={interviewer.weakTopics}
        history={interviewer.history}
        busy={busy}
        error={error}
        onStart={(input) => void interviewer.start(input)}
        onOpen={(id) => void interviewer.open(id)}
        onFinish={(id) => void interviewer.finishUnfinished(id)}
        onRemove={(id) => void interviewer.remove(id)}
      />
    )
  })()

  return (
    <>
      {content}
      <ConfirmDialog
        open={confirm === 'round'}
        title="End this round?"
        description="The round ends now. Your answers so far are kept and scored, and the interview moves on."
        confirmLabel="End round"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null)
          void interviewer.endRound()
        }}
      />
      <ConfirmDialog
        open={confirm === 'interview'}
        title="End the interview?"
        description="The interview stops here. Your answers so far are kept and you will see your results."
        confirmLabel="End interview"
        destructive
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null)
          void interviewer.endInterview()
        }}
      />
    </>
  )
}
