#!/usr/bin/env node
// Runs every quality gate the CI runs, in order, and prints a summary.
//   node scripts/check.mjs            all checks
//   node scripts/check.mjs --web      JavaScript and TypeScript only
//   node scripts/check.mjs --api      Python only
//   node scripts/check.mjs --fast     skip tests and the production build
//   node scripts/check.mjs --keep-going   run every step even after a failure
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = new Set(process.argv.slice(2))
const known = new Set(['--web', '--api', '--fast', '--keep-going', '--help'])
const unknown = [...args].filter((a) => !known.has(a))
if (args.has('--help') || unknown.length > 0) {
  if (unknown.length > 0) console.error(`Unknown option: ${unknown.join(', ')}`)
  console.error('Usage: node scripts/check.mjs [--web] [--api] [--fast] [--keep-going]')
  process.exit(unknown.length > 0 ? 2 : 0)
}

const onlyWeb = args.has('--web')
const onlyApi = args.has('--api')
const fast = args.has('--fast')
const keepGoing = args.has('--keep-going')
const runWeb = !onlyApi
const runApi = !onlyWeb
const windows = process.platform === 'win32'

function pythonPath() {
  if (process.env.PYTHON) return process.env.PYTHON
  const venv = join(root, 'apps', 'api', '.venv', windows ? 'Scripts/python.exe' : 'bin/python')
  return existsSync(venv) ? venv : windows ? 'python' : 'python3'
}

const python = pythonPath()
const apiDir = join(root, 'apps', 'api')

const steps = []
if (runWeb) {
  steps.push({
    name: 'format',
    cmd: 'npm',
    args: ['run', 'format:check'],
    cwd: root,
    shell: windows,
  })
  steps.push({ name: 'web lint', cmd: 'npm', args: ['run', 'lint'], cwd: root, shell: windows })
  steps.push({
    name: 'web typecheck',
    cmd: 'npm',
    args: ['run', 'typecheck'],
    cwd: root,
    shell: windows,
  })
  if (!fast) {
    steps.push({ name: 'web test', cmd: 'npm', args: ['test'], cwd: root, shell: windows })
    steps.push({ name: 'web build', cmd: 'npm', args: ['run', 'build'], cwd: root, shell: windows })
  }
}
if (runApi) {
  steps.push({ name: 'api lint', cmd: python, args: ['-m', 'ruff', 'check', '.'], cwd: apiDir })
  steps.push({
    name: 'api format',
    cmd: python,
    args: ['-m', 'ruff', 'format', '--check', '.'],
    cwd: apiDir,
  })
  steps.push({ name: 'api typecheck', cmd: python, args: ['-m', 'mypy'], cwd: apiDir })
  if (!fast)
    steps.push({ name: 'api test', cmd: python, args: ['-m', 'pytest', '-q'], cwd: apiDir })
}

const results = []
for (const step of steps) {
  console.log(`\n=== ${step.name} ===`)
  const started = Date.now()
  const run = spawnSync(step.cmd, step.args, { cwd: step.cwd, stdio: 'inherit', shell: step.shell })
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  const ok = run.status === 0
  results.push({ name: step.name, ok, seconds })
  if (!ok) {
    if (run.error) console.error(`Could not run ${step.cmd}: ${run.error.message}`)
    if (!keepGoing) break
  }
}

console.log('\n=== summary ===')
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name} (${r.seconds}s)`)
const skipped = steps.length - results.length
if (skipped > 0)
  console.log(`SKIP  ${skipped} step(s) after the first failure (use --keep-going to run them)`)

const failed = results.some((r) => !r.ok)
console.log(failed ? '\nChecks failed.' : '\nAll checks passed.')
process.exit(failed ? 1 : 0)
