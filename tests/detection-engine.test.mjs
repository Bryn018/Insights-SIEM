// Zero-dependency test harness for the detection engine.
// Uses the already-installed `typescript` to transpile src/lib/detection-engine.ts
// (which has only a type-only import) and run it with node:test.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

function loadTs(relPath) {
  const src = fs.readFileSync(path.resolve(relPath), 'utf8')
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  })
  return import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'))
}

const { matchAlert, evaluateAlert } = await loadTs('src/lib/detection-engine.ts')
const { hasPermission, requirePermission } = await loadTs('src/lib/rbac.ts')

function rule(overrides = {}) {
  return {
    id: 'r1',
    name: 'Test Rule',
    enabled: true,
    severity: null,
    category: null,
    mitreTactic: null,
    mitreTechnique: null,
    ...overrides,
  }
}

test('disabled rule never matches', () => {
  const r = rule({ enabled: false, severity: 'critical' })
  assert.equal(matchAlert(r, { severity: 'critical' }), false)
})

test('unset filters match any alert', () => {
  const r = rule()
  assert.equal(matchAlert(r, { severity: 'critical', category: 'malware' }), true)
})

test('severity equality (case-insensitive) match', () => {
  const r = rule({ severity: 'HIGH' })
  assert.equal(matchAlert(r, { severity: 'high' }), true)
  assert.equal(matchAlert(r, { severity: 'critical' }), false)
})

test('category + mitreTactic both must pass', () => {
  const r = rule({ category: 'malware', mitreTactic: 'Execution' })
  assert.equal(matchAlert(r, { category: 'malware', mitreTactic: 'execution' }), true)
  assert.equal(matchAlert(r, { category: 'malware', mitreTactic: 'Initial Access' }), false)
})

test('null alert field vs set rule filter => no match', () => {
  const r = rule({ severity: 'high' })
  assert.equal(matchAlert(r, { severity: null }), false)
})

test('evaluateAlert returns only matched enabled rules', () => {
  const rules = [
    rule({ id: 'a', name: 'Crit', severity: 'critical' }),
    rule({ id: 'b', name: 'Off', enabled: false, severity: 'critical' }),
    rule({ id: 'c', name: 'Low', severity: 'low' }),
  ]
  const matched = evaluateAlert(rules, { severity: 'critical' })
  assert.deepEqual(matched.map((m) => m.id), ['a'])
})

test('RBAC: viewer cannot act as admin', () => {
  assert.equal(hasPermission('viewer', 'admin'), false)
  assert.equal(hasPermission('viewer', 'analyst'), false)
  assert.equal(hasPermission('viewer', 'viewer'), true)
})

test('RBAC: admin can act as any role', () => {
  assert.equal(hasPermission('admin', 'viewer'), true)
  assert.equal(hasPermission('admin', 'analyst'), true)
  assert.equal(hasPermission('admin', 'admin'), true)
})

test('RBAC: analyst can act as analyst/responder/viewer, not admin', () => {
  assert.equal(hasPermission('analyst', 'admin'), false)
  assert.equal(hasPermission('analyst', 'analyst'), true)
  assert.equal(hasPermission('analyst', 'responder'), true)
  assert.equal(hasPermission('analyst', 'viewer'), true)
})

test('RBAC: unknown role has no permissions', () => {
  assert.equal(hasPermission('nobody', 'viewer'), false)
})

test('password hashing round-trips', async () => {
  // Import the password lib via the same in-memory transpile trick.
  const pwSrc = fs.readFileSync(path.resolve('src/lib/password.ts'), 'utf8')
  const pwOut = ts.transpileModule(pwSrc, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const pwUrl = 'data:text/javascript;base64,' + Buffer.from(pwOut).toString('base64')
  const { hashPassword, verifyPassword } = await import(pwUrl)
  const h = hashPassword('s3cret!')
  assert.ok(h.startsWith('scrypt$'))
  assert.equal(verifyPassword('s3cret!', h), true)
  assert.equal(verifyPassword('wrong', h), false)
})
