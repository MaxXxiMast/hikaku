import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

crons.interval("expire public links", { minutes: 15 }, internal.reports.expirePublicLinks)
crons.interval("purge old reports", { hours: 1 }, internal.reports.purgeExpiredData)

export default crons
