import type { InterviewerVoice, LlmProvider, VoiceRequest } from '@opsforge/types'
import { LlmOutputError, withTimeout } from '../ai/structured'
import { compileTerm, countWords } from './analysis/text'

export const VOICE_PROMPT_VERSION = 'interview.voice.v1'

const SYSTEM_PROMPT = [
  'You are a senior DevOps engineer interviewing a candidate. Rephrase the given interview question',
  'in your own natural, direct voice. Keep its meaning and scope exactly. Do not add hints, do not',
  'explain the answer, do not praise or criticise, do not mention scores or evaluation.',
  'If an anchor quote from the candidate is given, refer to it naturally. Maximum 45 words, one',
  'question or request, plain text only. Output the question and nothing else.',
].join(' ')

const MAX_WORDS = 60

const EVALUATIVE =
  /\b(?:score|scored|rating|rated|out of \d+|correct(?:ly)?|incorrect(?:ly)?|wrong|great answer|good answer|well done|nice job|excellent|that'?s right)\b/i

/** Returns the cleaned wording, or throws `LlmOutputError` when it breaks an interviewer rule. */
export function validateVoice(raw: string, request: VoiceRequest): string {
  const cleaned = raw
    .trim()
    .replace(/^["'“‘]+|["'”’]+$/g, '')
    .split(/\n{2,}/)[0]!
    .trim()
  if (cleaned === '') throw new LlmOutputError('The interviewer wording was empty.')
  if (countWords(cleaned) > MAX_WORDS)
    throw new LlmOutputError('The interviewer wording was too long.')
  if (
    request.kind === 'follow-up' &&
    !cleaned.includes('?') &&
    !/^(?:walk|tell|describe|explain|talk|show|take)/i.test(cleaned)
  ) {
    throw new LlmOutputError('A follow-up must ask something.')
  }
  if (EVALUATIVE.test(cleaned)) throw new LlmOutputError('The wording evaluates the candidate.')
  const leaked = request.forbiddenTerms.find((t) => compileTerm(t).test(cleaned))
  if (leaked !== undefined) {
    throw new LlmOutputError(`The wording introduced "${leaked}", which gives away the answer.`)
  }
  return cleaned
}

/** Natural-language layer over any `LlmProvider`. Output is validated before it can be shown. */
export class LlmInterviewerVoice implements InterviewerVoice {
  readonly id: string

  private readonly provider: LlmProvider

  constructor(provider: LlmProvider) {
    this.provider = provider
    this.id = `llm:${provider.id}`
  }

  async phrase(request: VoiceRequest, signal?: AbortSignal): Promise<string> {
    const recent = request.transcript.slice(-2)
    const user = JSON.stringify({
      kind: request.kind,
      topic: request.spec.topic,
      wording: request.authored,
      anchor: request.anchor ?? null,
      recentExchange: recent,
    })
    const completion = await this.provider.complete(
      {
        purpose: 'interview.phrase',
        promptVersion: VOICE_PROMPT_VERSION,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: user },
        ],
        responseFormat: 'text',
        temperature: 0.4,
        maxOutputTokens: 160,
      },
      signal,
    )
    return validateVoice(completion.text, request)
  }
}

/**
 * Applies a voice if there is one. Any failure or rule violation returns the authored wording, so
 * the interview never stalls on a model.
 */
export async function phraseWith(
  voice: InterviewerVoice | null,
  request: VoiceRequest,
  timeoutMs = 8_000,
  signal?: AbortSignal,
): Promise<{ text: string; phrasedBy?: string }> {
  if (!voice) return { text: request.authored }
  try {
    const text = await withTimeout((s) => voice.phrase(request, s), timeoutMs, signal)
    return { text, phrasedBy: voice.id }
  } catch {
    return { text: request.authored }
  }
}
