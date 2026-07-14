#!/usr/bin/env node
/**
 * retention-worker.mjs — enforce RetentionPolicy for Insights SIEM.
 *
 * Deletes Alerts older than `alertRetentionDays` and Incidents older than
 * `incidentRetentionDays`, UNLESS `legalHold` is true (suspends all deletion).
 *
 * Run manually:  node scripts/retention-worker.mjs
 * Or scheduled:  cron job / systemd timer calling `npm run retain`
 *
 * Safe by design:
 *  - Never deletes anything while legalHold is on.
 *  - Dry-run mode (`--dry`) reports what WOULD be deleted without touching data.
 *  - Respects the single global RetentionPolicy row.
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const DRY = process.argv.includes('--dry')

function daysAgo(n, now = new Date()) {
  const d = new Date(now)
  d.setDate(d.getDate() - n)
  return d
}

// Pure: given a policy + current time, return the cutoff Dates for purge.
// Exported for unit testing.
export function computeCutoffs(policy, now = new Date()) {
  return {
    alertCutoff: daysAgo(policy.alertRetentionDays, now),
    incidentCutoff: daysAgo(policy.incidentRetentionDays, now),
    legalHold: !!policy.legalHold,
  }
}

async function main() {
  const policy = await db.retentionPolicy.findUnique({ where: { id: 'global' } })
  if (!policy) {
    console.log('No RetentionPolicy row found — run `npm run retain:init` first. Aborting.')
    return
  }

  if (policy.legalHold) {
    console.log('[retention] LEGAL HOLD ACTIVE — no data will be purged.')
    return
  }

  const alertCutoff = daysAgo(policy.alertRetentionDays)
  const incidentCutoff = daysAgo(policy.incidentRetentionDays)

  const staleAlerts = await db.alert.count({ where: { createdAt: { lt: alertCutoff } } })
  const staleIncidents = await db.incident.count({ where: { createdAt: { lt: incidentCutoff } } })

  console.log(
    `[retention] alerts older than ${policy.alertRetentionDays}d (before ${alertCutoff.toISOString()}): ${staleAlerts}`
  )
  console.log(
    `[retention] incidents older than ${policy.incidentRetentionDays}d (before ${incidentCutoff.toISOString()}): ${staleIncidents}`
  )

  if (DRY) {
    console.log('[retention] DRY RUN — no data deleted.')
    return
  }

  if (staleAlerts > 0) {
    const r = await db.alert.deleteMany({ where: { createdAt: { lt: alertCutoff } } })
    console.log(`[retention] deleted ${r.count} stale alerts`)
  }
  if (staleIncidents > 0) {
    const r = await db.incident.deleteMany({ where: { createdAt: { lt: incidentCutoff } } })
    console.log(`[retention] deleted ${r.count} stale incidents`)
  }
  console.log('[retention] done.')
}

main()
  .catch((e) => {
    console.error('[retention] FAILED:', e.message)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
