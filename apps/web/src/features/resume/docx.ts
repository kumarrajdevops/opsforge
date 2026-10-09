/**
 * Minimal .docx text extraction with no dependencies. A .docx is a ZIP archive; the body lives in
 * `word/document.xml`. Only what is needed to read paragraphs is implemented.
 */

export type Inflate = (compressed: Uint8Array) => Promise<Uint8Array>

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_SIGNATURE = 0x02014b50
const LOCAL_SIGNATURE = 0x04034b50
const MAX_UNCOMPRESSED_BYTES = 8 * 1024 * 1024

export class DocxError extends Error {}

export async function inflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new DocxError(
      'This browser cannot read .docx files. Save the resume as .txt or paste it.',
    )
  }
  const stream = new Blob([compressed as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

interface ZipEntry {
  name: string
  method: number
  compressedSize: number
  localOffset: number
}

function centralDirectory(view: DataView, bytes: Uint8Array): ZipEntry[] {
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65_535); i -= 1) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new DocxError('This file is not a valid .docx document.')
  const count = view.getUint16(eocd + 10, true)
  let offset = view.getUint32(eocd + 16, true)
  const decoder = new TextDecoder()
  const entries: ZipEntry[] = []
  for (let i = 0; i < count; i += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== CENTRAL_SIGNATURE) break
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    entries.push({
      name: decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength)),
      method: view.getUint16(offset + 10, true),
      compressedSize: view.getUint32(offset + 20, true),
      localOffset: view.getUint32(offset + 42, true),
    })
    offset += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

async function entryBytes(
  view: DataView,
  bytes: Uint8Array,
  entry: ZipEntry,
  inflate: Inflate,
): Promise<Uint8Array> {
  const at = entry.localOffset
  if (at + 30 > bytes.length || view.getUint32(at, true) !== LOCAL_SIGNATURE) {
    throw new DocxError('This .docx file is damaged.')
  }
  const start = at + 30 + view.getUint16(at + 26, true) + view.getUint16(at + 28, true)
  const data = bytes.subarray(start, start + entry.compressedSize)
  if (entry.method === 0) return data
  if (entry.method !== 8) throw new DocxError('This .docx uses an unsupported compression method.')
  const out = await inflate(data)
  if (out.length > MAX_UNCOMPRESSED_BYTES) throw new DocxError('This .docx is too large to read.')
  return out
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) {
      return String.fromCodePoint(parseInt(code.slice(2), 16))
    }
    if (code.startsWith('#')) return String.fromCodePoint(parseInt(code.slice(1), 10))
    return ENTITIES[code.toLowerCase()] ?? match
  })
}

/** Paragraph breaks become newlines; runs, tabs and line breaks are joined in order. */
export function documentXmlToText(xml: string): string {
  const paragraphs = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []
  return paragraphs
    .map((paragraph) => {
      let line = ''
      const tokens = paragraph.matchAll(
        /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>/g,
      )
      for (const token of tokens) {
        if (token[1] !== undefined) line += decodeEntities(token[1])
        else line += token[0].startsWith('<w:tab') ? ' ' : '\n'
      }
      return line.trimEnd()
    })
    .join('\n')
}

export async function extractDocxText(
  buffer: ArrayBuffer,
  inflate: Inflate = inflateRaw,
): Promise<string> {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  const entry = centralDirectory(view, bytes).find((e) => e.name === 'word/document.xml')
  if (!entry) throw new DocxError('No document body found in this .docx file.')
  const xml = new TextDecoder().decode(await entryBytes(view, bytes, entry, inflate))
  return documentXmlToText(xml)
}
