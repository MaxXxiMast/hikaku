#!/usr/bin/env node

/**
 * Head-to-head engagement comparison between two YouTube channels.
 * Usage: node scripts/engagement-comparison.mjs <API_KEY> <HANDLE1> <HANDLE2>
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
    id,
    title: item.snippet.title,
    subs: Number(item.statistics.subscriberCount),
    totalViews: Number(item.statistics.viewCount),
    videoCount: Number(item.statistics.videoCount),
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
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

function computeMetrics(videos) {
  const totalViews = videos.reduce((s,v) => s + v.views, 0);
  const totalLikes = videos.reduce((s,v) => s + v.likes, 0);
  const totalComments = videos.reduce((s,v) => s + v.comments, 0);
  const engRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100) : 0;
  const likeRate = totalViews > 0 ? (totalLikes / totalViews * 100) : 0;
  const commentRate = totalViews > 0 ? (totalComments / totalViews * 100) : 0;
  const likesPerVideo = videos.length > 0 ? totalLikes / videos.length : 0;
  const commentsPerVideo = videos.length > 0 ? totalComments / videos.length : 0;
  const viewsPerVideo = videos.length > 0 ? totalViews / videos.length : 0;

  // Like-to-view ratio per video (median)
  const perVideoEng = videos.map(v => v.views > 0 ? (v.likes + v.comments) / v.views * 100 : 0).sort((a,b) => a-b);
  const medianEng = perVideoEng[Math.floor(perVideoEng.length / 2)];

  // Engagement by month
  const monthly = {};
  for (const v of videos) {
    const key = v.publishedAt.slice(0, 7);
    if (!monthly[key]) monthly[key] = { views: 0, likes: 0, comments: 0, count: 0 };
    monthly[key].views += v.views;
    monthly[key].likes += v.likes;
    monthly[key].comments += v.comments;
    monthly[key].count++;
  }

  // Engagement by duration bucket
  const shorts = videos.filter(v => v.durationSec <= 60);
  const medium = videos.filter(v => v.durationSec > 60 && v.durationSec <= 600);
  const long = videos.filter(v => v.durationSec > 600);

  function bucketMetrics(vids) {
    const tv = vids.reduce((s,v) => s + v.views, 0);
    const tl = vids.reduce((s,v) => s + v.likes, 0);
    const tc = vids.reduce((s,v) => s + v.comments, 0);
    return { count: vids.length, views: tv, eng: tv > 0 ? ((tl+tc)/tv*100) : 0 };
  }

  // Top engaged videos (by eng rate, min 500 views)
  const qualified = videos.filter(v => v.views >= 500);
  const topEngaged = qualified
    .map(v => ({ ...v, eng: (v.likes + v.comments) / v.views * 100 }))
    .sort((a,b) => b.eng - a.eng)
    .slice(0, 5);

  return {
    totalViews, totalLikes, totalComments, engRate, likeRate, commentRate,
    likesPerVideo, commentsPerVideo, viewsPerVideo, medianEng,
    monthly: Object.entries(monthly).sort(([a],[b]) => a.localeCompare(b)).map(([m,d]) => ({
      month: m, ...d, eng: d.views > 0 ? ((d.likes+d.comments)/d.views*100) : 0
    })),
    duration: { shorts: bucketMetrics(shorts), medium: bucketMetrics(medium), long: bucketMetrics(long) },
    topEngaged,
    videoCount: videos.length,
  };
}

async function main() {
  const channels = [];
  for (const h of HANDLES) {
    console.log(`Fetching ${h}...`);
    const ch = await getChannel(h);
    const videos = await getAllVideos(ch.uploadsPlaylistId);
    const metrics = computeMetrics(videos);
    channels.push({ ...ch, videos, metrics });
    console.log(`  ${ch.title}: ${videos.length} videos fetched.`);
  }

  const [ww, fra] = channels;

  // ============ OVERALL ENGAGEMENT ============
  console.log("\n" + "=".repeat(85));
  console.log("  ENGAGEMENT RATE COMPARISON: Wint Wealth vs Fixed Returns Academy");
  console.log("=".repeat(85));

  console.log("\n  OVERALL METRICS");
  console.log("-".repeat(85));
  const rows = [
    ["Subscribers", fmt(ww.subs), fmt(fra.subs)],
    ["Total Videos", String(ww.metrics.videoCount), String(fra.metrics.videoCount)],
    ["Total Views", fmt(ww.metrics.totalViews), fmt(fra.metrics.totalViews)],
    ["Total Likes", fmt(ww.metrics.totalLikes), fmt(fra.metrics.totalLikes)],
    ["Total Comments", fmt(ww.metrics.totalComments), fmt(fra.metrics.totalComments)],
    ["", "", ""],
    ["Eng Rate (overall)", `${ww.metrics.engRate.toFixed(2)}%`, `${fra.metrics.engRate.toFixed(2)}%`],
    ["Like Rate", `${ww.metrics.likeRate.toFixed(2)}%`, `${fra.metrics.likeRate.toFixed(2)}%`],
    ["Comment Rate", `${ww.metrics.commentRate.toFixed(3)}%`, `${fra.metrics.commentRate.toFixed(3)}%`],
    ["Median Per-Video Eng", `${ww.metrics.medianEng.toFixed(2)}%`, `${fra.metrics.medianEng.toFixed(2)}%`],
    ["", "", ""],
    ["Avg Views/Video", fmt(Math.round(ww.metrics.viewsPerVideo)), fmt(Math.round(fra.metrics.viewsPerVideo))],
    ["Avg Likes/Video", fmt(Math.round(ww.metrics.likesPerVideo)), fmt(Math.round(fra.metrics.likesPerVideo))],
    ["Avg Comments/Video", String(Math.round(ww.metrics.commentsPerVideo)), String(Math.round(fra.metrics.commentsPerVideo))],
  ];

  console.log(`  ${"Metric".padEnd(25)} | ${"Wint Wealth".padStart(15)} | ${"FRA".padStart(15)} | Winner`);
  console.log("-".repeat(85));
  for (const [label, wwVal, fraVal] of rows) {
    if (!label) { console.log("  " + " ".repeat(25) + " |" + " ".repeat(16) + " |"); continue; }
    const wwNum = parseFloat(wwVal);
    const fraNum = parseFloat(fraVal);
    let winner = "";
    if (label.includes("Eng") || label.includes("Rate") || label.includes("Likes/") || label.includes("Comments/")) {
      winner = fraNum > wwNum ? "  << FRA" : wwNum > fraNum ? "  WW >>" : "  TIE";
    }
    console.log(`  ${label.padEnd(25)} | ${wwVal.padStart(15)} | ${fraVal.padStart(15)} |${winner}`);
  }

  // ============ MONTHLY ENGAGEMENT TREND (OVERLAPPING MONTHS) ============
  console.log("\n\n  MONTHLY ENGAGEMENT TREND (Overlapping Period)");
  console.log("-".repeat(85));
  console.log(`  ${"Month".padEnd(10)} | ${"WW Eng%".padStart(8)} | ${"WW Views".padStart(10)} | ${"FRA Eng%".padStart(9)} | ${"FRA Views".padStart(10)} | Winner`);
  console.log("-".repeat(85));

  const wwMonths = new Map(ww.metrics.monthly.map(m => [m.month, m]));
  const fraMonths = new Map(fra.metrics.monthly.map(m => [m.month, m]));
  const allMonths = [...new Set([...wwMonths.keys(), ...fraMonths.keys()])].sort();

  for (const month of allMonths) {
    const w = wwMonths.get(month);
    const f = fraMonths.get(month);
    if (!w && !f) continue;
    const wEng = w ? `${w.eng.toFixed(1)}%` : "—";
    const wViews = w ? fmt(w.views) : "—";
    const fEng = f ? `${f.eng.toFixed(1)}%` : "—";
    const fViews = f ? fmt(f.views) : "—";
    let winner = "";
    if (w && f) winner = f.eng > w.eng ? "  << FRA" : "  WW >>";
    console.log(`  ${month.padEnd(10)} | ${wEng.padStart(8)} | ${wViews.padStart(10)} | ${fEng.padStart(9)} | ${fViews.padStart(10)} |${winner}`);
  }

  // ============ DURATION ENGAGEMENT ============
  console.log("\n\n  ENGAGEMENT BY VIDEO DURATION");
  console.log("-".repeat(85));
  console.log(`  ${"Duration".padEnd(20)} | ${"WW Count".padStart(8)} | ${"WW Eng%".padStart(8)} | ${"FRA Count".padStart(9)} | ${"FRA Eng%".padStart(9)} | Winner`);
  console.log("-".repeat(85));

  const durLabels = [["Shorts (≤1min)", "shorts"], ["Medium (1-10min)", "medium"], ["Long (>10min)", "long"]];
  for (const [label, key] of durLabels) {
    const w = ww.metrics.duration[key];
    const f = fra.metrics.duration[key];
    const wEng = w.count > 0 ? `${w.eng.toFixed(1)}%` : "—";
    const fEng = f.count > 0 ? `${f.eng.toFixed(1)}%` : "—";
    let winner = "";
    if (w.count > 0 && f.count > 0) winner = f.eng > w.eng ? "  << FRA" : "  WW >>";
    console.log(`  ${label.padEnd(20)} | ${String(w.count).padStart(8)} | ${wEng.padStart(8)} | ${String(f.count).padStart(9)} | ${fEng.padStart(9)} |${winner}`);
  }

  // ============ TOP ENGAGED VIDEOS ============
  console.log("\n\n  TOP 5 MOST ENGAGED VIDEOS (min 500 views)");
  console.log("-".repeat(85));

  console.log(`\n  WINT WEALTH:`);
  for (const v of ww.metrics.topEngaged) {
    console.log(`    ${v.eng.toFixed(1)}% eng | ${fmt(v.views).padStart(7)} views | ${v.title.slice(0,55)}`);
  }

  console.log(`\n  FIXED RETURNS ACADEMY:`);
  for (const v of fra.metrics.topEngaged) {
    console.log(`    ${v.eng.toFixed(1)}% eng | ${fmt(v.views).padStart(7)} views | ${v.title.slice(0,55)}`);
  }

  console.log("\n" + "=".repeat(85));
}

main().catch(e => { console.error(e.message); process.exit(1); });
