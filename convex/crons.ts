import { cronJobs } from "convex/server"

const crons = cronJobs()

// Expire public report links (runs every 15 minutes)
// Implementation added when internal mutations are ready
// crons.interval("expire public links", { minutes: 15 }, internal.reports.expirePublicLinks)

// Purge anonymous report data (runs every hour)
// crons.interval("purge old reports", { hours: 1 }, internal.reports.purgeExpiredData)

export default crons
