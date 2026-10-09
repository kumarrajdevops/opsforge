import type { InterviewSession } from '@opsforge/types'

/** Weak topics from completed sessions, lowest score first, to focus the next interview. */
export function weakTopicsFrom(sessions: InterviewSession[], limit = 4): string[] {
  const latest = new Map<string, number>()
  const ordered = sessions
    .filter((s) => s.status === 'completed' && s.evaluation)
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''))
  for (const session of ordered) {
    for (const topic of session.evaluation!.topics)
      latest.set(topic.topic, topic.weak ? topic.score : 100)
  }
  return [...latest.entries()]
    .filter(([, score]) => score < 100)
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([topic]) => topic)
}
