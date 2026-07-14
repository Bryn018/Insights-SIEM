import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeCutoffs } from '../scripts/retention-worker.mjs'

test('computeCutoffs returns alert/incident cutoffs = now - retentionDays', () => {
  const now = new Date('2026-07-12T00:00:00Z')
  const policy = { alertRetentionDays: 90, incidentRetentionDays: 365, legalHold: false }
  const { alertCutoff, incidentCutoff, legalHold } = computeCutoffs(policy, now)
  assert.equal(legalHold, false)
  // 90 days before
  assert.equal(alertCutoff.toISOString(), '2026-04-13T00:00:00.000Z')
  // 365 days before
  assert.equal(incidentCutoff.toISOString(), '2025-07-12T00:00:00.000Z')
})

test('legalHold flag is surfaced for suppression logic', () => {
  const now = new Date('2026-07-12T00:00:00Z')
  const held = computeCutoffs({ alertRetentionDays: 90, incidentRetentionDays: 365, legalHold: true }, now)
  assert.equal(held.legalHold, true)
  const open = computeCutoffs({ alertRetentionDays: 90, incidentRetentionDays: 365, legalHold: false }, now)
  assert.equal(open.legalHold, false)
})

test('zero retention means cutoff = now (delete everything old)', () => {
  const now = new Date('2026-07-12T00:00:00Z')
  const { alertCutoff } = computeCutoffs({ alertRetentionDays: 0, incidentRetentionDays: 0, legalHold: false }, now)
  assert.equal(alertCutoff.toISOString(), now.toISOString())
})
