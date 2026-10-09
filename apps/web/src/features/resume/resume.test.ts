/// <reference types="node" />
import { deflateRawSync, inflateRawSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { buildResumeRecord, extractResume } from './claims'
import { documentXmlToText, extractDocxText } from './docx'
import { readResumeFile, ResumeFileError } from './fileReader'
import { splitSections } from './sections'

const RESUME = `Asha Verma
Senior DevOps Engineer

SUMMARY
Platform engineer focused on reliability.

EXPERIENCE
Acme Cloud, Senior SRE, 2021 - 2024
- Implemented Kubernetes
- Reduced deploy time by 60% by moving CI to GitHub Actions across 40 services
- Led a team of 4 engineers through the Terraform migration of the AWS estate
- Helped with various monitoring tasks
- Attended weekly planning meetings

SKILLS
Kubernetes, Docker, Terraform, Prometheus, Vault, Ansible
`

const inflate = async (bytes: Uint8Array) => new Uint8Array(inflateRawSync(bytes))

function zipWith(name: string, content: string): ArrayBuffer {
  const data = Buffer.from(content, 'utf8')
  const packed = deflateRawSync(data)
  const nameBytes = Buffer.from(name, 'utf8')

  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0)
  local.writeUInt16LE(8, 8)
  local.writeUInt32LE(packed.length, 18)
  local.writeUInt32LE(data.length, 22)
  local.writeUInt16LE(nameBytes.length, 26)

  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50, 0)
  central.writeUInt16LE(8, 10)
  central.writeUInt32LE(packed.length, 20)
  central.writeUInt32LE(data.length, 24)
  central.writeUInt16LE(nameBytes.length, 28)
  central.writeUInt32LE(0, 42)

  const localPart = Buffer.concat([local, nameBytes, packed])
  const centralPart = Buffer.concat([central, nameBytes])
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(1, 8)
  eocd.writeUInt16LE(1, 10)
  eocd.writeUInt32LE(centralPart.length, 12)
  eocd.writeUInt32LE(localPart.length, 16)
  const all = Buffer.concat([localPart, centralPart, eocd])
  return all.buffer.slice(all.byteOffset, all.byteOffset + all.length)
}

const DOCUMENT_XML = `<?xml version="1.0"?><w:document><w:body>
<w:p><w:r><w:t>EXPERIENCE</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">Implemented Kubernetes &amp; Helm </w:t></w:r><w:r><w:t>for 12 services</w:t></w:r></w:p>
</w:body></w:document>`

describe('splitSections', () => {
  it('recognises headings and keeps the header block', () => {
    const sections = splitSections(RESUME)
    expect(sections.map((s) => s.kind)).toEqual(['other', 'summary', 'experience', 'skills'])
  })

  it('tolerates markdown and colon headings', () => {
    const sections = splitSections(
      '# Experience\n- Built pipelines\n\n**Technical Skills:**\nDocker',
    )
    expect(sections.map((s) => s.kind)).toEqual(['experience', 'skills'])
  })
})

describe('extractResume', () => {
  const { claims } = extractResume(RESUME)

  it('turns a bare statement into a claim, even a two-word one', () => {
    const claim = claims.find((c) => c.text === 'Implemented Kubernetes')
    expect(claim).toBeDefined()
    expect(claim?.technologies).toEqual(['kubernetes'])
    expect(claim?.kind).toBe('implementation')
    expect(claim?.flags).toContain('no-metric')
    expect(claim?.context).toMatch(/Acme Cloud/)
  })

  it('detects metrics and classifies by leading verb', () => {
    const deploy = claims.find((c) => c.text.startsWith('Reduced deploy time'))
    expect(deploy?.hasMetric).toBe(true)
    expect(deploy?.kind).toBe('improvement')
    expect(deploy?.technologies).toEqual(['github-actions'])
    const lead = claims.find((c) => c.text.startsWith('Led a team'))
    expect(lead?.kind).toBe('leadership')
  })

  it('flags vague and team-only wording', () => {
    const vague = claims.find((c) => c.text.startsWith('Helped with'))
    expect(vague?.flags).toEqual(expect.arrayContaining(['team-language', 'vague-scope']))
  })

  it('ignores lines that evidence nothing', () => {
    expect(claims.some((c) => c.text.includes('weekly planning'))).toBe(false)
  })

  it('adds a listed-only claim for skills never used in experience', () => {
    const listed = claims
      .filter((c) => c.flags.includes('listed-only'))
      .map((c) => c.technologies[0])
    expect(listed).toEqual(expect.arrayContaining(['docker', 'prometheus', 'vault', 'ansible']))
    expect(listed).not.toContain('kubernetes')
    expect(listed).not.toContain('terraform')
  })

  it('is deterministic with stable ids', () => {
    expect(extractResume(RESUME).claims).toEqual(claims)
    expect(new Set(claims.map((c) => c.id)).size).toBe(claims.length)
  })

  it('works on a resume with no headings', () => {
    const plain = extractResume(
      'Implemented Terraform modules for 30 AWS accounts.\nBuilt Jenkins pipelines.',
    )
    expect(plain.claims.length).toBe(2)
  })

  it('builds a record with no attempts', () => {
    const record = buildResumeRecord({
      id: 'r1',
      text: RESUME,
      format: 'paste',
      now: '2026-01-01T00:00:00.000Z',
    })
    expect(record.attempts).toEqual([])
    expect(record.claims.length).toBe(claims.length)
  })
})

describe('docx reading', () => {
  it('joins runs and decodes entities per paragraph', () => {
    expect(documentXmlToText(DOCUMENT_XML)).toBe(
      'EXPERIENCE\nImplemented Kubernetes & Helm for 12 services',
    )
  })

  it('extracts word/document.xml from the archive', async () => {
    const text = await extractDocxText(zipWith('word/document.xml', DOCUMENT_XML), inflate)
    expect(text).toContain('Implemented Kubernetes & Helm')
  })

  it('rejects an archive without a document body', async () => {
    await expect(extractDocxText(zipWith('other.xml', '<x/>'), inflate)).rejects.toThrow(
      /document body/,
    )
  })

  it('rejects data that is not a zip', async () => {
    await expect(
      extractDocxText(
        new TextEncoder().encode('hello world, not a zip file at all').buffer as ArrayBuffer,
        inflate,
      ),
    ).rejects.toThrow(/valid/)
  })
})

describe('readResumeFile', () => {
  const file = (name: string, content: string | ArrayBuffer, size?: number) => ({
    name,
    size: size ?? (typeof content === 'string' ? content.length : content.byteLength),
    text: async () => (typeof content === 'string' ? content : ''),
    arrayBuffer: async () => (typeof content === 'string' ? new ArrayBuffer(0) : content),
  })

  it('reads text and markdown', async () => {
    expect(await readResumeFile(file('cv.txt', 'hello'))).toEqual({ text: 'hello', format: 'txt' })
    expect((await readResumeFile(file('cv.md', '# hi'))).format).toBe('md')
  })

  it('reads docx', async () => {
    const result = await readResumeFile(
      file('cv.docx', zipWith('word/document.xml', DOCUMENT_XML)),
      inflate,
    )
    expect(result.format).toBe('docx')
    expect(result.text).toContain('Kubernetes')
  })

  it('explains what to do for PDF, oversize and unknown files', async () => {
    await expect(readResumeFile(file('cv.pdf', 'x'))).rejects.toThrow(/paste/i)
    await expect(readResumeFile(file('cv.txt', 'x', 3 * 1024 * 1024))).rejects.toThrow(/2 MB/)
    await expect(readResumeFile(file('cv.exe', 'x'))).rejects.toBeInstanceOf(ResumeFileError)
  })
})

describe('extractResume hard-wrapped lines', () => {
  it('joins a line that continues in lower case instead of making a fragment claim', () => {
    const { claims } = extractResume(`EXPERIENCE
- Implemented Kubernetes for 40 services across three regions and
  migrated the legacy workloads to AWS with Terraform
- Reduced deploy time by 60% using GitHub Actions
`)
    const texts = claims.map((c) => c.text)
    expect(texts.some((t) => /across three regions and migrated the legacy/.test(t))).toBe(true)
    expect(texts.some((t) => /^migrated the legacy/.test(t))).toBe(false)
  })
})
