import type { Tone } from '@opsforge/ui'
import type { Cue } from '../../visuals/usePlayback'
import { scoreTone } from './presentation'
import type { ReplayThread } from './replay'

export interface TimelineSegment {
  id: string
  threadIndex: number
  kind: 'question' | 'follow-up'
  skipped: boolean
  seconds: number
  /** Share of the track, 0..1. Short answers keep a visible minimum. */
  from: number
  to: number
  tone: Tone
}

export interface TimelineThread {
  index: number
  topic: string
  round: string
  from: number
  to: number
  seconds: number
  exchanges: number
  score: number | null
  tone: Tone
}

export interface InterviewTimelineModel {
  segments: TimelineSegment[]
  threads: TimelineThread[]
  totalSeconds: number
  cues: Cue[]
}

/** An answer shorter than this still gets a visible sliver of the track. */
const MIN_WEIGHT_SECONDS = 8

/**
 * Lays a finished interview out on one track: a segment per answered turn, widths proportional to
 * how long the answer took, coloured by the thread's evaluated score. Only completed sessions have
 * a replay, so the scores shown are already visible in the debrief.
 */
export function buildInterviewTimeline(
  threads: readonly ReplayThread[],
  roundLabel: (round: ReplayThread['round']) => string,
): InterviewTimelineModel {
  const weight = (seconds: number) => Math.max(seconds, MIN_WEIGHT_SECONDS)
  const total = threads.reduce(
    (sum, t) => sum + t.exchanges.reduce((s, e) => s + weight(e.durationSeconds), 0),
    0,
  )
  const share = (seconds: number) => (total === 0 ? 0 : weight(seconds) / total)

  const segments: TimelineSegment[] = []
  const lanes: TimelineThread[] = []
  let cursor = 0

  threads.forEach((thread, index) => {
    const score = thread.evaluation?.score ?? null
    const tone = scoreTone(score)
    const start = cursor
    let seconds = 0
    for (const exchange of thread.exchanges) {
      const width = share(exchange.durationSeconds)
      segments.push({
        id: exchange.turnId,
        threadIndex: index,
        kind: exchange.kind,
        skipped: exchange.skipped,
        seconds: exchange.durationSeconds,
        from: cursor,
        to: cursor + width,
        tone: exchange.skipped ? 'neutral' : tone,
      })
      cursor += width
      seconds += exchange.durationSeconds
    }
    lanes.push({
      index,
      topic: thread.topic,
      round: roundLabel(thread.round),
      from: start,
      to: cursor,
      seconds,
      exchanges: thread.exchanges.length,
      score,
      tone,
    })
  })

  return {
    segments,
    threads: lanes,
    totalSeconds: threads.reduce(
      (sum, t) => sum + t.exchanges.reduce((s, e) => s + e.durationSeconds, 0),
      0,
    ),
    cues: lanes
      .filter((lane) => lane.exchanges > 0)
      .map((lane) => ({
        id: `thread-${lane.index}`,
        label: `${lane.index + 1}. ${lane.topic}`,
        at: lane.from,
      })),
  }
}

/** The thread the playhead is inside, for assistive tech and the caption. */
export function threadAt(
  model: InterviewTimelineModel,
  position: number,
): TimelineThread | undefined {
  const inside = model.threads.find((t) => position >= t.from && position < t.to)
  return inside ?? (position >= 1 ? model.threads[model.threads.length - 1] : undefined)
}

export function describeTimeline(model: InterviewTimelineModel): string {
  const scored = model.threads.filter((t) => t.score !== null)
  return `Interview timeline of ${model.threads.length} questions and ${model.segments.length} answers. ${scored.length} were evaluated. Width is time spent answering.`
}
