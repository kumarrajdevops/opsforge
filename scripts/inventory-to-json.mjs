// Converts the tools inventory workbook (.xlsx) to the JSON the app loads.
// Usage: node scripts/inventory-to-json.mjs <path-to.xlsx> [sheet name]
// No dependencies: an .xlsx file is a zip of XML, read here with node:zlib.
import { readFileSync, writeFileSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'

const OUTPUT = new URL('../apps/web/src/features/technologies/inventory.json', import.meta.url)
const [, , source, sheetName = 'Master Inventory'] = process.argv
if (!source) {
  console.error('Usage: node scripts/inventory-to-json.mjs <path-to.xlsx> [sheet name]')
  process.exit(1)
}

function readZip(buffer) {
  let eocd = buffer.length - 22
  while (eocd >= 0 && buffer.readUInt32LE(eocd) !== 0x06054b50) eocd--
  if (eocd < 0) throw new Error('Not a zip file')
  const count = buffer.readUInt16LE(eocd + 10)
  let pos = buffer.readUInt32LE(eocd + 16)
  const files = new Map()
  for (let i = 0; i < count; i++) {
    const method = buffer.readUInt16LE(pos + 10)
    const size = buffer.readUInt32LE(pos + 20)
    const nameLength = buffer.readUInt16LE(pos + 28)
    const extraLength = buffer.readUInt16LE(pos + 30)
    const commentLength = buffer.readUInt16LE(pos + 32)
    const offset = buffer.readUInt32LE(pos + 42)
    const name = buffer.toString('utf8', pos + 46, pos + 46 + nameLength)
    const dataStart =
      offset + 30 + buffer.readUInt16LE(offset + 26) + buffer.readUInt16LE(offset + 28)
    const raw = buffer.subarray(dataStart, dataStart + size)
    files.set(name, method === 8 ? inflateRawSync(raw) : raw)
    pos += 46 + nameLength + extraLength + commentLength
  }
  return files
}

const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')

const column = (ref) =>
  [...ref.match(/[A-Z]+/)[0]].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1

const files = readZip(readFileSync(source))
const text = (name) => files.get(name)?.toString('utf8') ?? ''

const shared = [...text('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
  decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')),
)

const sheet = [...text('xl/workbook.xml').matchAll(/<sheet [^>]*>/g)]
  .map((m) => m[0])
  .find((tag) => decode(tag.match(/name="([^"]*)"/)[1]) === sheetName)
if (!sheet) throw new Error(`Sheet "${sheetName}" not found`)
const rid = sheet.match(/r:id="([^"]*)"/)[1]
const rels = text('xl/_rels/workbook.xml.rels')
const target = [...rels.matchAll(/<Relationship [^>]*>/g)]
  .map((m) => m[0])
  .find((tag) => tag.includes(`Id="${rid}"`))
  .match(/Target="([^"]*)"/)[1]
const xml = text(`xl/${target.replace(/^\/?(xl\/)?/, '')}`)

const rows = []
for (const row of xml.matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)) {
  const cells = []
  for (const c of row[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const body = c[2] ?? ''
    const inline = body.match(/<t[^>]*>([\s\S]*?)<\/t>/)
    const value = body.match(/<v>([\s\S]*?)<\/v>/)
    const isShared = /t="s"/.test(c[1])
    cells[column(c[1].match(/r="([A-Z]+\d+)"/)[1])] = inline
      ? decode(inline[1])
      : value
        ? isShared
          ? (shared[Number(value[1])] ?? '')
          : decode(value[1])
        : ''
  }
  rows.push(cells)
}

const header = (rows.shift() ?? []).map((h) => h.trim())
const col = (name) => header.indexOf(name)
const cell = (r, name) => (r[col(name)] ?? '').trim()

const inventory = rows
  .map((r) => ({
    id: Number(cell(r, 'Original ID')),
    discipline: cell(r, 'Discipline'),
    name: cell(r, 'Tool / Technology'),
    category: cell(r, 'Category'),
    website: cell(r, 'Official website'),
    docs: cell(r, 'Official documentation'),
  }))
  .filter((r) => r.name)

writeFileSync(OUTPUT, JSON.stringify(inventory, null, 1) + '\n')
console.log(`Wrote ${inventory.length} rows from "${sheetName}" to ${OUTPUT.pathname}`)
