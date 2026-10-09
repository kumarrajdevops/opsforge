import type { ResumeSourceFormat } from '@opsforge/types'
import { DocxError, extractDocxText, type Inflate, inflateRaw } from './docx'

export const MAX_RESUME_BYTES = 2 * 1024 * 1024

export interface ReadableFile {
  name: string
  size: number
  text(): Promise<string>
  arrayBuffer(): Promise<ArrayBuffer>
}

export interface ResumeFileContent {
  text: string
  format: ResumeSourceFormat
}

export class ResumeFileError extends Error {}

/**
 * Reads an uploaded resume as plain text. Supports .txt, .md and .docx. PDF is refused with a
 * pointer to pasting, because reliable PDF text extraction needs a parser this app does not ship.
 */
export async function readResumeFile(
  file: ReadableFile,
  inflate: Inflate = inflateRaw,
): Promise<ResumeFileContent> {
  if (file.size > MAX_RESUME_BYTES) {
    throw new ResumeFileError('That file is larger than 2 MB. Paste the text instead.')
  }
  const extension = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase() ?? ''
  try {
    if (extension === 'docx') {
      return { text: await extractDocxText(await file.arrayBuffer(), inflate), format: 'docx' }
    }
    if (extension === 'txt' || extension === 'md' || extension === 'markdown') {
      return { text: await file.text(), format: extension === 'txt' ? 'txt' : 'md' }
    }
  } catch (error) {
    if (error instanceof DocxError) throw new ResumeFileError(error.message)
    throw new ResumeFileError('That file could not be read.')
  }
  if (extension === 'pdf') {
    throw new ResumeFileError(
      'PDF files are not read directly yet. Open the PDF, copy the text and paste it, or export the resume as .docx or .txt.',
    )
  }
  throw new ResumeFileError('Upload a .docx, .txt or .md file, or paste the text.')
}
