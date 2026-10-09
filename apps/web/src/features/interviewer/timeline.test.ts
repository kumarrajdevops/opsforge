import { describe, expect, it } from 'vitest'
import type { ReplayExchange, ReplayThread } from './replay'
import { buildInterviewTimeline, describeTimeline, threadAt } from './timeline'

function exchange(
  id: string,
  seconds: number,
  extra: Partial<ReplayExchange> = {},
): ReplayExchange {
  return {
    turnId: id,
    kind: 'question',
    prompt: 'p',
    answer: 'a',
    skipped: false,
    durationSeconds: seconds,
    ...extra,
  }
}

function thread(id: string, exchanges: ReplayExchange[], score: number | null): ReplayThread {
  return {
    threadId: id,
    round: 'technical',
    topic: `Topic ${id}`,
    intent: 'i',
    origin: 'bank',
    exchanges,
    closeReason: 'covered',
    evaluation: score === null ? null : ({ score } as ReplayThread['evaluation']),
  }
}

const threads = [
  thread('a', [exchange('a1', 60), exchange('a2', 30, { kind: 'follow-up' })], 80),
  thread('b', [exchange('b1', 90, { skipped: true })], 30),
  thread('c', [], null),
]

describe('buildInterviewTimeline', () => {
  const model = buildInterviewTimeline(threads, (r) => r)

  it('fills the track exactly, in order', () => {
    expect(model.segments[0]!.from).toBe(0)
    expect(model.segments[model.segments.length - 1]!.to).toBeCloseTo(1)
    for (let i = 1; i < model.segments.length; i++)
      expect(model.segments[i]!.from).toBeCloseTo(model.segments[i - 1]!.to)
  })

  it('sizes segments by time spent and colours them by the thread score', () => {
    const [a1, a2] = model.segments
    expect(a1!.to - a1!.from).toBeGreaterThan(a2!.to - a2!.from)
    expect(a1!.tone).toBe('success')
    expect(model.segments[2]!.tone).toBe('neutral')
    expect(model.totalSeconds).toBe(180)
  })

  it('gives a very short answer a visible sliver', () => {
    const short = buildInterviewTimeline(
      [thread('s', [exchange('s1', 0), exchange('s2', 60)], 50)],
      (r) => r,
    )
    expect(short.segments[0]!.to - short.segments[0]!.from).toBeGreaterThan(0)
  })

  it('cues only threads that have answers', () => {
    expect(model.cues.map((c) => c.id)).toEqual(['thread-0', 'thread-1'])
    expect(model.cues[0]!.at).toBe(0)
  })

  it('finds the thread under the playhead', () => {
    expect(threadAt(model, 0)!.index).toBe(0)
    expect(threadAt(model, 0.99)!.index).toBe(1)
    expect(describeTimeline(model)).toContain('3 questions')
  })

  it('handles an interview with no answers', () => {
    const empty = buildInterviewTimeline([thread('x', [], null)], (r) => r)
    expect(empty.segments).toEqual([])
    expect(empty.cues).toEqual([])
  })
})
