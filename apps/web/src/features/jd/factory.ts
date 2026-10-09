import type { InterviewRepository, JdRepository, ResumeRepository } from '@opsforge/types'
import { interviewRepository } from '../interviewer/repository'
import { resumeRepository } from '../resume/repository'
import { jdRepository } from './repository'
import type { JdRuntime } from './useJd'

export function createJdRuntime(
  options: {
    jdRepository?: JdRepository
    resumeRepository?: ResumeRepository
    interviewRepository?: InterviewRepository
  } = {},
): JdRuntime {
  return {
    jdRepository: options.jdRepository ?? jdRepository,
    resumeRepository: options.resumeRepository ?? resumeRepository,
    interviewRepository: options.interviewRepository ?? interviewRepository,
  }
}
