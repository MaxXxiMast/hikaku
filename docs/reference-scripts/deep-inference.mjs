#!/usr/bin/env node

/**
 * Deep inference analysis across two YouTube channels.
 * Covers: posting patterns, content lifecycle, viral distribution,
 * title analysis, consistency, subscriber efficiency, and strategic gaps.
 */

const API_KEY = process.argv[2];
const HANDLES = [process.argv[3] || "@WintWealthYT", process.argv[4] || "@FixedReturnsAcademy"];
const BASE_URL = "https://www.googleapis.com/youtube/v3";

async function ytFetch(endpoint, params) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("key", API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error (${res.status})`);
  return res.json();
}

async function getChannel(handle) {
  const clean = handle.startsWith("@") ? handle : `@${handle}`;
  const data = await ytFetch("search", { part: "snippet", q: clean, type: "channel", maxResults: "1" });
  if (!data.items?.length) throw new Error(`Not found: ${handle}`);
  const id = data.items[0].snippet.channelId;
  const ch = await ytFetch("channels", { part: "statistics,snippet,contentDetails", id });
  const item = ch.items[0];
  return {
    id, title: item.snippet.title,
    subs: Number(item.statistics.subscriberCount),
    totalViews: Number(item.statistics.viewCount),
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
    joinedDate: item.snippet.publishedAt,
  };
}

async function getAllVideos(playlistId) {
  const ids = [];
  let next = null;
  do {
    const p = { part: "contentDetails", playlistId, maxResults: "50" };
    if (next) p.pageToken = next;
    const d = await ytFetch("playlistItems", p);
    for (const i of d.items || []) ids.push(i.contentDetails.videoId);
    next = d.nextPageToken;
  } while (next);

  const videos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const d = await ytFetch("videos", { part: "snippet,statistics,contentDetails", id: batch.join(",") });
    for (const v of d.items || []) {
      const dur = v.contentDetails.duration;
      const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const sec = (parseInt(m?.[1]||0)*3600) + (parseInt(m?.[2]||0)*60) + parseInt(m?.[3]||0);
      videos.push({
        title: v.snippet.title,
        publishedAt: v.snippet.publishedAt,
        views: Number(v.statistics.viewCount || 0),
        likes: Number(v.statistics.likeCount || 0),
        comments: Number(v.statistics.commentCount || 0),
        durationSec: sec,
        tags: v.snippet.tags || [],
      });
    }
  }
  return videos;
}

function fmt(n) {
  if (n >= 1e6) return `${(n/1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n/1e3).toFixed(1)}K`;
  return String(n);
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a,b) => a-b);
  return s[Math.floor(s.length/2)];
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a,b) => a-b);
  const idx = Math.floor(s.length * p / 100);
  return s[Math.min(idx, s.length-1)];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function analyze(ch, videos) {
  const totalViews = videos.reduce((s,v) => s + v.views, 0);
  const totalLikes = videos.reduce((s,v) => s + v.likes, 0);
  const totalComments = videos.reduce((s,v) => s + v.comments, 0);
  const viewsArr = videos.map(v => v.views);

  // 1. Distribution analysis
  const p10 = percentile(viewsArr, 10);
  const p25 = percentile(viewsArr, 25);
  const p50 = percentile(viewsArr, 50);
  const p75 = percentile(viewsArr, 75);
  const p90 = percentile(viewsArr, 90);
  const p95 = percentile(viewsArr, 95);
  const mean = Math.round(totalViews / videos.length);
  const top10pct = videos.filter(v => v.views >= p90);
  const top10views = top10pct.reduce((s,v) => s + v.views, 0);
  const gini = computeGini(viewsArr);

  // 2. Day of week
  const dayStats = {};
  for (const v of videos) {
    const day = DAYS[new Date(v.publishedAt).getUTCDay()];
    if (!dayStats[day]) dayStats[day] = { count: 0, views: 0 };
    dayStats[day].count++;
    dayStats[day].views += v.views;
  }

  // 3. Hour of day
  const hourStats = {};
  for (const v of videos) {
    const hour = new Date(v.publishedAt).getUTCHours();
    const ist = (hour + 5) % 24; // approximate IST
    const bucket = `${String(ist).padStart(2,"0")}:00`;
    if (!hourStats[bucket]) hourStats[bucket] = { count: 0, views: 0 };
    hourStats[bucket].count++;
    hourStats[bucket].views += v.views;
  }

  // 4. Upload consistency (gaps between uploads)
  const sorted = [...videos].sort((a,b) => new Date(a.publishedAt) - new Date(b.publishedAt));
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i].publishedAt) - new Date(sorted[i-1].publishedAt)) / (1000*60*60*24);
    gaps.push(diff);
  }
  const avgGap = gaps.length > 0 ? gaps.reduce((s,g) => s+g, 0) / gaps.length : 0;
  const maxGap = gaps.length > 0 ? Math.max(...gaps) : 0;
  const minGap = gaps.length > 0 ? Math.min(...gaps) : 0;
  const medianGap = median(gaps);

  // 5. Title analysis
  const titles = videos.map(v => v.title);
  const avgTitleLen = Math.round(titles.reduce((s,t) => s + t.length, 0) / titles.length);
  const emojiVids = videos.filter(v => /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/u.test(v.title));
  const numberVids = videos.filter(v => /₹[\d,]+|[\d]+(K|M|L|Cr|Lakh|Crore)/i.test(v.title));
  const howToVids = videos.filter(v => /^(how|why|what|when|where|which|is |are |can |do |does |should )/i.test(v.title));

  // 6. Duration sweet spot
  const durationBuckets = [
    { label: "0-30s", min: 0, max: 30, vids: [] },
    { label: "30-60s", min: 30, max: 60, vids: [] },
    { label: "1-2min", min: 60, max: 120, vids: [] },
    { label: "2-5min", min: 120, max: 300, vids: [] },
    { label: "5-10min", min: 300, max: 600, vids: [] },
    { label: "10-20min", min: 600, max: 1200, vids: [] },
    { label: "20min+", min: 1200, max: Infinity, vids: [] },
  ];
  for (const v of videos) {
    const b = durationBuckets.find(b => v.durationSec >= b.min && v.durationSec < b.max);
    if (b) b.vids.push(v);
  }

  // 7. Viral coefficient
  const viral1k = videos.filter(v => v.views >= 1000).length;
  const viral10k = videos.filter(v => v.views >= 10000).length;
  const viral100k = videos.filter(v => v.views >= 100000).length;
  const viral1m = videos.filter(v => v.views >= 1000000).length;

  // 8. Subscriber efficiency
  const viewsPerSub = ch.subs > 0 ? (totalViews / ch.subs) : 0;
  const viewsPerSubPerVideo = ch.subs > 0 ? (totalViews / ch.subs / videos.length) : 0;

  // 9. Monthly upload frequency
  const monthlyUploads = {};
  for (const v of videos) {
    const key = v.publishedAt.slice(0, 7);
    monthlyUploads[key] = (monthlyUploads[key] || 0) + 1;
  }
  const uploadCounts = Object.values(monthlyUploads);
  const avgMonthlyUploads = uploadCounts.reduce((s,c) => s+c, 0) / uploadCounts.length;

  // 10. Content freshness — recent 30 days vs all time
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30*24*60*60*1000);
  const recent = videos.filter(v => new Date(v.publishedAt) >= thirtyDaysAgo);
  const recentViews = recent.reduce((s,v) => s+v.views, 0);
  const recentAvg = recent.length > 0 ? Math.round(recentViews / recent.length) : 0;

  // 11. Tags analysis
  const tagFreq = {};
  for (const v of videos) {
    for (const t of v.tags) {
      const lower = t.toLowerCase();
      tagFreq[lower] = (tagFreq[lower] || 0) + 1;
    }
  }
  const topTags = Object.entries(tagFreq).sort((a,b) => b[1]-a[1]).slice(0, 15);

  return {
    distribution: { p10, p25, p50, p75, p90, p95, mean, gini, top10pctShare: totalViews > 0 ? (top10views/totalViews*100) : 0 },
    dayStats, hourStats,
    consistency: { avgGap, maxGap, minGap, medianGap, avgMonthlyUploads },
    titleAnalysis: { avgTitleLen, emojiPct: (emojiVids.length/videos.length*100), numberPct: (numberVids.length/videos.length*100), howToPct: (howToVids.length/videos.length*100),
      emojiAvgViews: emojiVids.length > 0 ? Math.round(emojiVids.reduce((s,v)=>s+v.views,0)/emojiVids.length) : 0,
      numberAvgViews: numberVids.length > 0 ? Math.round(numberVids.reduce((s,v)=>s+v.views,0)/numberVids.length) : 0,
      howToAvgViews: howToVids.length > 0 ? Math.round(howToVids.reduce((s,v)=>s+v.views,0)/howToVids.length) : 0,
    },
    durationBuckets,
    viralCoeff: { viral1k, viral10k, viral100k, viral1m, total: videos.length },
    subEfficiency: { viewsPerSub, viewsPerSubPerVideo },
    freshness: { recentCount: recent.length, recentAvgViews: recentAvg, allTimeAvg: mean },
    topTags,
    totalViews, totalLikes, totalComments,
    videoCount: videos.length,
  };
}

function computeGini(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a,b) => a-b);
  const n = sorted.length;
  const mean = sorted.reduce((s,v) => s+v, 0) / n;
  if (mean === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += (2*(i+1) - n - 1) * sorted[i];
  return sum / (n * n * mean);
}

function printSection(title) {
  console.log("\n" + "=".repeat(90));
  console.log(`  ${title}`);
  console.log("=".repeat(90));
}

function printRow(label, wwVal, fraVal, winner = "") {
  console.log(`  ${label.padEnd(30)} | ${String(wwVal).padStart(18)} | ${String(fraVal).padStart(18)} |${winner}`);
}

async function main() {
  const channels = [];
  for (const h of HANDLES) {
    console.log(`Fetching ${h}...`);
    const ch = await getChannel(h);
    const videos = await getAllVideos(ch.uploadsPlaylistId);
    const metrics = analyze(ch, videos);
    channels.push({ ...ch, videos, metrics });
    console.log(`  ${ch.title}: ${videos.length} videos.`);
  }

  const [ww, fra] = channels;
  const mw = ww.metrics;
  const mf = fra.metrics;

  // ============ 1. VIEW DISTRIBUTION ============
  printSection("1. VIEW DISTRIBUTION (How concentrated are views?)");
  console.log(`  ${"Metric".padEnd(30)} | ${"Wint Wealth".padStart(18)} | ${"FRA".padStart(18)} | Insight`);
  console.log("-".repeat(90));
  printRow("Mean views/video", fmt(mw.distribution.mean), fmt(mf.distribution.mean));
  printRow("Median views/video", fmt(mw.distribution.p50), fmt(mf.distribution.p50));
  printRow("Mean/Median ratio", (mw.distribution.mean/mw.distribution.p50).toFixed(1)+"x", (mf.distribution.mean/mf.distribution.p50).toFixed(1)+"x", " (>2x = hit-driven)");
  printRow("P10 (bottom 10%)", fmt(mw.distribution.p10), fmt(mf.distribution.p10));
  printRow("P25 (bottom 25%)", fmt(mw.distribution.p25), fmt(mf.distribution.p25));
  printRow("P75 (top 25%)", fmt(mw.distribution.p75), fmt(mf.distribution.p75));
  printRow("P90 (top 10%)", fmt(mw.distribution.p90), fmt(mf.distribution.p90));
  printRow("P95 (top 5%)", fmt(mw.distribution.p95), fmt(mf.distribution.p95));
  printRow("Gini coefficient", mw.distribution.gini.toFixed(3), mf.distribution.gini.toFixed(3), " (1=unequal, 0=equal)");
  printRow("Top 10% share of views", `${mw.distribution.top10pctShare.toFixed(1)}%`, `${mf.distribution.top10pctShare.toFixed(1)}%`);

  // ============ 2. VIRAL DISTRIBUTION ============
  printSection("2. VIRAL THRESHOLDS (What % of videos hit milestones?)");
  console.log(`  ${"Threshold".padEnd(30)} | ${"Wint Wealth".padStart(18)} | ${"FRA".padStart(18)} |`);
  console.log("-".repeat(90));
  printRow("≥ 1K views", `${mw.viralCoeff.viral1k}/${mw.viralCoeff.total} (${(mw.viralCoeff.viral1k/mw.viralCoeff.total*100).toFixed(0)}%)`, `${mf.viralCoeff.viral1k}/${mf.viralCoeff.total} (${(mf.viralCoeff.viral1k/mf.viralCoeff.total*100).toFixed(0)}%)`);
  printRow("≥ 10K views", `${mw.viralCoeff.viral10k}/${mw.viralCoeff.total} (${(mw.viralCoeff.viral10k/mw.viralCoeff.total*100).toFixed(0)}%)`, `${mf.viralCoeff.viral10k}/${mf.viralCoeff.total} (${(mf.viralCoeff.viral10k/mf.viralCoeff.total*100).toFixed(0)}%)`);
  printRow("≥ 100K views", `${mw.viralCoeff.viral100k}/${mw.viralCoeff.total} (${(mw.viralCoeff.viral100k/mw.viralCoeff.total*100).toFixed(0)}%)`, `${mf.viralCoeff.viral100k}/${mf.viralCoeff.total} (${(mf.viralCoeff.viral100k/mf.viralCoeff.total*100).toFixed(0)}%)`);
  printRow("≥ 1M views", `${mw.viralCoeff.viral1m}/${mw.viralCoeff.total} (${(mw.viralCoeff.viral1m/mw.viralCoeff.total*100).toFixed(0)}%)`, `${mf.viralCoeff.viral1m}/${mf.viralCoeff.total} (${(mf.viralCoeff.viral1m/mf.viralCoeff.total*100).toFixed(0)}%)`);

  // ============ 3. UPLOAD CONSISTENCY ============
  printSection("3. UPLOAD CONSISTENCY & FREQUENCY");
  console.log(`  ${"Metric".padEnd(30)} | ${"Wint Wealth".padStart(18)} | ${"FRA".padStart(18)} |`);
  console.log("-".repeat(90));
  printRow("Avg uploads/month", mw.consistency.avgMonthlyUploads.toFixed(1), mf.consistency.avgMonthlyUploads.toFixed(1));
  printRow("Avg gap between uploads", `${mw.consistency.avgGap.toFixed(1)} days`, `${mf.consistency.avgGap.toFixed(1)} days`);
  printRow("Median gap", `${mw.consistency.medianGap.toFixed(1)} days`, `${mf.consistency.medianGap.toFixed(1)} days`);
  printRow("Longest gap", `${mw.consistency.maxGap.toFixed(0)} days`, `${mf.consistency.maxGap.toFixed(0)} days`);
  printRow("Shortest gap", `${mw.consistency.minGap.toFixed(1)} days`, `${mf.consistency.minGap.toFixed(1)} days`);

  // ============ 4. DAY OF WEEK ============
  printSection("4. POSTING DAY PERFORMANCE");
  console.log(`  ${"Day".padEnd(8)} | ${"WW #".padStart(5)} | ${"WW Avg Views".padStart(14)} | ${"FRA #".padStart(6)} | ${"FRA Avg Views".padStart(14)} |`);
  console.log("-".repeat(90));
  for (const day of DAYS) {
    const w = ww.metrics.dayStats[day] || { count: 0, views: 0 };
    const f = fra.metrics.dayStats[day] || { count: 0, views: 0 };
    const wAvg = w.count > 0 ? fmt(Math.round(w.views/w.count)) : "—";
    const fAvg = f.count > 0 ? fmt(Math.round(f.views/f.count)) : "—";
    console.log(`  ${day.padEnd(8)} | ${String(w.count).padStart(5)} | ${wAvg.padStart(14)} | ${String(f.count).padStart(6)} | ${fAvg.padStart(14)} |`);
  }

  // ============ 5. POSTING HOUR (IST) ============
  printSection("5. POSTING HOUR PERFORMANCE (IST approximate)");
  console.log(`  ${"Hour".padEnd(8)} | ${"WW #".padStart(5)} | ${"WW Avg Views".padStart(14)} | ${"FRA #".padStart(6)} | ${"FRA Avg Views".padStart(14)} |`);
  console.log("-".repeat(90));
  const allHours = [...new Set([...Object.keys(mw.hourStats), ...Object.keys(mf.hourStats)])].sort();
  for (const h of allHours) {
    const w = mw.hourStats[h] || { count: 0, views: 0 };
    const f = mf.hourStats[h] || { count: 0, views: 0 };
    const wAvg = w.count > 0 ? fmt(Math.round(w.views/w.count)) : "—";
    const fAvg = f.count > 0 ? fmt(Math.round(f.views/f.count)) : "—";
    console.log(`  ${h.padEnd(8)} | ${String(w.count).padStart(5)} | ${wAvg.padStart(14)} | ${String(f.count).padStart(6)} | ${fAvg.padStart(14)} |`);
  }

  // ============ 6. DURATION SWEET SPOT ============
  printSection("6. DURATION SWEET SPOT");
  console.log(`  ${"Duration".padEnd(12)} | ${"WW #".padStart(5)} | ${"WW Avg Views".padStart(14)} | ${"WW Eng%".padStart(8)} | ${"FRA #".padStart(6)} | ${"FRA Avg Views".padStart(14)} | ${"FRA Eng%".padStart(8)}`);
  console.log("-".repeat(90));
  for (const label of ["0-30s","30-60s","1-2min","2-5min","5-10min","10-20min","20min+"]) {
    const wb = mw.durationBuckets.find(b => b.label === label);
    const fb = mf.durationBuckets.find(b => b.label === label);
    const wCount = wb?.vids.length || 0;
    const fCount = fb?.vids.length || 0;
    const wViews = wCount > 0 ? fmt(Math.round(wb.vids.reduce((s,v)=>s+v.views,0)/wCount)) : "—";
    const fViews = fCount > 0 ? fmt(Math.round(fb.vids.reduce((s,v)=>s+v.views,0)/fCount)) : "—";
    const wLikes = wb?.vids.reduce((s,v)=>s+v.likes,0) || 0;
    const wCmts = wb?.vids.reduce((s,v)=>s+v.comments,0) || 0;
    const wTotV = wb?.vids.reduce((s,v)=>s+v.views,0) || 0;
    const fLikes = fb?.vids.reduce((s,v)=>s+v.likes,0) || 0;
    const fCmts = fb?.vids.reduce((s,v)=>s+v.comments,0) || 0;
    const fTotV = fb?.vids.reduce((s,v)=>s+v.views,0) || 0;
    const wEng = wTotV > 0 ? `${((wLikes+wCmts)/wTotV*100).toFixed(1)}%` : "—";
    const fEng = fTotV > 0 ? `${((fLikes+fCmts)/fTotV*100).toFixed(1)}%` : "—";
    console.log(`  ${label.padEnd(12)} | ${String(wCount).padStart(5)} | ${wViews.padStart(14)} | ${wEng.padStart(8)} | ${String(fCount).padStart(6)} | ${fViews.padStart(14)} | ${fEng.padStart(8)}`);
  }

  // ============ 7. TITLE PATTERNS ============
  printSection("7. TITLE PATTERN ANALYSIS");
  console.log(`  ${"Pattern".padEnd(30)} | ${"WW %".padStart(8)} | ${"WW Avg Views".padStart(14)} | ${"FRA %".padStart(8)} | ${"FRA Avg Views".padStart(14)}`);
  console.log("-".repeat(90));
  printRow("Emoji in title", `${mw.titleAnalysis.emojiPct.toFixed(0)}%`, `${mf.titleAnalysis.emojiPct.toFixed(0)}%`);
  printRow("  → avg views", fmt(mw.titleAnalysis.emojiAvgViews), fmt(mf.titleAnalysis.emojiAvgViews));
  printRow("₹/numbers in title", `${mw.titleAnalysis.numberPct.toFixed(0)}%`, `${mf.titleAnalysis.numberPct.toFixed(0)}%`);
  printRow("  → avg views", fmt(mw.titleAnalysis.numberAvgViews), fmt(mf.titleAnalysis.numberAvgViews));
  printRow("Question/How-to opener", `${mw.titleAnalysis.howToPct.toFixed(0)}%`, `${mf.titleAnalysis.howToPct.toFixed(0)}%`);
  printRow("  → avg views", fmt(mw.titleAnalysis.howToAvgViews), fmt(mf.titleAnalysis.howToAvgViews));
  printRow("Avg title length (chars)", String(mw.titleAnalysis.avgTitleLen), String(mf.titleAnalysis.avgTitleLen));

  // ============ 8. SUBSCRIBER EFFICIENCY ============
  printSection("8. SUBSCRIBER EFFICIENCY");
  console.log(`  ${"Metric".padEnd(30)} | ${"Wint Wealth".padStart(18)} | ${"FRA".padStart(18)} |`);
  console.log("-".repeat(90));
  printRow("Views per subscriber", `${mw.subEfficiency.viewsPerSub.toFixed(1)}`, `${mf.subEfficiency.viewsPerSub.toFixed(1)}`);
  printRow("Views/sub/video", `${mw.subEfficiency.viewsPerSubPerVideo.toFixed(2)}`, `${mf.subEfficiency.viewsPerSubPerVideo.toFixed(2)}`);

  // ============ 9. CONTENT FRESHNESS ============
  printSection("9. CONTENT FRESHNESS (Last 30 days vs All Time)");
  console.log(`  ${"Metric".padEnd(30)} | ${"Wint Wealth".padStart(18)} | ${"FRA".padStart(18)} |`);
  console.log("-".repeat(90));
  printRow("Videos (last 30d)", String(mw.freshness.recentCount), String(mf.freshness.recentCount));
  printRow("Avg views (last 30d)", fmt(mw.freshness.recentAvgViews), fmt(mf.freshness.recentAvgViews));
  printRow("Avg views (all time)", fmt(mw.freshness.allTimeAvg), fmt(mf.freshness.allTimeAvg));
  const wwDelta = mw.freshness.allTimeAvg > 0 ? ((mw.freshness.recentAvgViews - mw.freshness.allTimeAvg) / mw.freshness.allTimeAvg * 100).toFixed(1) : "N/A";
  const fraDelta = mf.freshness.allTimeAvg > 0 ? ((mf.freshness.recentAvgViews - mf.freshness.allTimeAvg) / mf.freshness.allTimeAvg * 100).toFixed(1) : "N/A";
  printRow("Recent vs all-time delta", `${wwDelta}%`, `${fraDelta}%`);

  // ============ 10. TOP TAGS ============
  printSection("10. TOP TAGS / SEO KEYWORDS");
  console.log(`\n  WINT WEALTH (top 15 tags):`);
  for (const [tag, count] of mw.topTags) console.log(`    ${String(count).padStart(4)}x  ${tag}`);
  console.log(`\n  FRA (top 15 tags):`);
  for (const [tag, count] of mf.topTags) console.log(`    ${String(count).padStart(4)}x  ${tag}`);

  console.log("\n" + "=".repeat(90));
}

main().catch(e => { console.error(e.message); process.exit(1); });
