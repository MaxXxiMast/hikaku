#!/usr/bin/env node

/**
 * Fetches all videos from a YouTube channel and outputs detailed per-video stats
 * sorted by views, with content categorization.
 *
 * Usage: node scripts/youtube-video-breakdown.mjs <API_KEY> <CHANNEL_HANDLE>
 */

const API_KEY = process.argv[2];
const CHANNEL_HANDLE = process.argv[3] || "@FixedReturnsAcademy";
const BASE_URL = "https://www.googleapis.com/youtube/v3";

if (!API_KEY) {
  console.error("Usage: node scripts/youtube-video-breakdown.mjs <API_KEY> [@ChannelHandle]");
  process.exit(1);
}

async function ytFetch(endpoint, params) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("key", API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`API error (${res.status}): ${JSON.stringify(err.error?.message || err)}`);
  }
  return res.json();
}

async function getChannelId(handle) {
  const clean = handle.startsWith("@") ? handle : `@${handle}`;
  const data = await ytFetch("search", { part: "snippet", q: clean, type: "channel", maxResults: "1" });
  if (data.items?.length > 0) return { id: data.items[0].snippet.channelId, title: data.items[0].snippet.title };
  throw new Error(`Channel not found: ${handle}`);
}

async function getUploadsPlaylistId(channelId) {
  const data = await ytFetch("channels", { part: "contentDetails", id: channelId });
  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

async function getAllVideos(playlistId) {
  const videoIds = [];
  let next = null;
  do {
    const params = { part: "contentDetails", playlistId, maxResults: "50" };
    if (next) params.pageToken = next;
    const data = await ytFetch("playlistItems", params);
    for (const item of data.items || []) videoIds.push(item.contentDetails.videoId);
    next = data.nextPageToken;
  } while (next);

  const videos = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const data = await ytFetch("videos", { part: "snippet,statistics,contentDetails", id: batch.join(",") });
    for (const v of data.items || []) {
      const dur = v.contentDetails.duration;
      const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const seconds = (parseInt(match?.[1] || 0) * 3600) + (parseInt(match?.[2] || 0) * 60) + parseInt(match?.[3] || 0);

      videos.push({
        id: v.id,
        title: v.snippet.title,
        publishedAt: v.snippet.publishedAt,
        views: Number(v.statistics.viewCount || 0),
        likes: Number(v.statistics.likeCount || 0),
        comments: Number(v.statistics.commentCount || 0),
        durationSec: seconds,
        tags: v.snippet.tags || [],
        description: v.snippet.description?.slice(0, 300) || "",
      });
    }
  }
  return videos;
}

function parseDuration(sec) {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

function categorize(title) {
  const t = title.toLowerCase();
  if (t.includes("tax") || t.includes("taxed") || t.includes("taxation")) return "Taxation";
  if (t.includes("bond ladder") || t.includes("passive income") || t.includes("monthly income")) return "Income Strategy";
  if (t.includes("fd") || t.includes("fixed deposit")) return "FD Comparison";
  if (t.includes("credit rating") || t.includes("safe")) return "Risk/Safety";
  if (t.includes("ytm") || t.includes("coupon") || t.includes("yield") || t.includes("face value") || t.includes("par value")) return "Bond Basics";
  if (t.includes("debt fund") || t.includes("mutual fund") || t.includes("stock") || t.includes("equity") || t.includes("gold") || t.includes("real estate")) return "Asset Comparison";
  if (t.includes("rbi") || t.includes("repo") || t.includes("interest rate") || t.includes("rate cut")) return "Macro/RBI";
  if (t.includes("ncd") || t.includes("corporate bond") || t.includes("government") || t.includes("sovereign") || t.includes("g-sec") || t.includes("sgb")) return "Bond Types";
  if (t.includes("grip") || t.includes("platform")) return "Grip Platform";
  if (t.includes("how to") || t.includes("beginner") || t.includes("start") || t.includes("what is") || t.includes("what are") || t.includes("explained") || t.includes("guide")) return "Educational";
  if (t.includes("mistake") || t.includes("avoid") || t.includes("myth") || t.includes("truth") || t.includes("wrong") || t.includes("never")) return "Myths/Mistakes";
  if (t.includes("vs") || t.includes("better") || t.includes("comparison")) return "Comparison";
  if (t.includes("#") || t.includes("short")) return "Shorts";
  return "Other";
}

function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

async function main() {
  console.log(`\nFetching all videos for ${CHANNEL_HANDLE}...\n`);

  const { id, title } = await getChannelId(CHANNEL_HANDLE);
  console.log(`Channel: ${title} (${id})`);

  const playlistId = await getUploadsPlaylistId(id);
  const videos = await getAllVideos(playlistId);
  console.log(`Fetched ${videos.length} videos.\n`);

  // Sort by views descending
  videos.sort((a, b) => b.views - a.views);

  // Categorize
  for (const v of videos) v.category = categorize(v.title);

  // --- All videos ranked ---
  console.log("=".repeat(100));
  console.log("  ALL VIDEOS RANKED BY VIEWS");
  console.log("=".repeat(100));
  console.log(`  ${"#".padStart(3)} | ${"Views".padStart(7)} | ${"Likes".padStart(5)} | ${"Cmts".padStart(4)} | ${"Duration".padEnd(8)} | ${"Category".padEnd(18)} | Title`);
  console.log("-".repeat(100));

  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    const engRate = v.views > 0 ? (((v.likes + v.comments) / v.views) * 100).toFixed(1) : "0";
    console.log(
      `  ${String(i + 1).padStart(3)} | ${fmt(v.views).padStart(7)} | ${fmt(v.likes).padStart(5)} | ${String(v.comments).padStart(4)} | ${parseDuration(v.durationSec).padEnd(8)} | ${v.category.padEnd(18)} | ${v.title.slice(0, 55)}`
    );
  }

  // --- Category breakdown ---
  const cats = {};
  for (const v of videos) {
    if (!cats[v.category]) cats[v.category] = { count: 0, views: 0, likes: 0, comments: 0, videos: [] };
    cats[v.category].count++;
    cats[v.category].views += v.views;
    cats[v.category].likes += v.likes;
    cats[v.category].comments += v.comments;
    cats[v.category].videos.push(v);
  }

  const catArr = Object.entries(cats)
    .map(([name, d]) => ({ name, ...d, avgViews: Math.round(d.views / d.count), engRate: d.views > 0 ? (((d.likes + d.comments) / d.views) * 100).toFixed(1) : "0" }))
    .sort((a, b) => b.avgViews - a.avgViews);

  console.log("\n" + "=".repeat(90));
  console.log("  CATEGORY PERFORMANCE (sorted by avg views/video)");
  console.log("=".repeat(90));
  console.log(`  ${"Category".padEnd(20)} | ${"Videos".padStart(6)} | ${"Total Views".padStart(12)} | ${"Avg/Video".padStart(10)} | ${"Eng Rate".padStart(8)} | Top Video`);
  console.log("-".repeat(90));

  for (const c of catArr) {
    const top = c.videos.sort((a, b) => b.views - a.views)[0];
    console.log(
      `  ${c.name.padEnd(20)} | ${String(c.count).padStart(6)} | ${fmt(c.views).padStart(12)} | ${fmt(c.avgViews).padStart(10)} | ${(c.engRate + "%").padStart(8)} | ${top.title.slice(0, 35)}`
    );
  }

  // --- Duration analysis ---
  const shorts = videos.filter(v => v.durationSec <= 60);
  const medium = videos.filter(v => v.durationSec > 60 && v.durationSec <= 600);
  const long = videos.filter(v => v.durationSec > 600);

  const durBuckets = [
    { label: "Shorts (≤1min)", vids: shorts },
    { label: "Medium (1-10min)", vids: medium },
    { label: "Long (>10min)", vids: long },
  ];

  console.log("\n" + "=".repeat(70));
  console.log("  DURATION ANALYSIS");
  console.log("=".repeat(70));
  console.log(`  ${"Duration".padEnd(20)} | ${"Count".padStart(5)} | ${"Total Views".padStart(12)} | ${"Avg/Video".padStart(10)} | ${"Eng Rate".padStart(8)}`);
  console.log("-".repeat(70));

  for (const b of durBuckets) {
    const total = b.vids.reduce((s, v) => s + v.views, 0);
    const avg = b.vids.length > 0 ? Math.round(total / b.vids.length) : 0;
    const likes = b.vids.reduce((s, v) => s + v.likes, 0);
    const cmts = b.vids.reduce((s, v) => s + v.comments, 0);
    const eng = total > 0 ? (((likes + cmts) / total) * 100).toFixed(1) : "0";
    console.log(`  ${b.label.padEnd(20)} | ${String(b.vids.length).padStart(5)} | ${fmt(total).padStart(12)} | ${fmt(avg).padStart(10)} | ${(eng + "%").padStart(8)}`);
  }

  // --- Title pattern analysis ---
  const questionVids = videos.filter(v => v.title.includes("?"));
  const nonQuestionVids = videos.filter(v => !v.title.includes("?"));

  console.log("\n" + "=".repeat(70));
  console.log("  TITLE PATTERN ANALYSIS");
  console.log("=".repeat(70));

  const qViews = questionVids.reduce((s, v) => s + v.views, 0);
  const nqViews = nonQuestionVids.reduce((s, v) => s + v.views, 0);
  const qAvg = questionVids.length > 0 ? Math.round(qViews / questionVids.length) : 0;
  const nqAvg = nonQuestionVids.length > 0 ? Math.round(nqViews / nonQuestionVids.length) : 0;

  console.log(`  Question titles (?)  : ${questionVids.length} videos, avg ${fmt(qAvg)} views`);
  console.log(`  Statement titles     : ${nonQuestionVids.length} videos, avg ${fmt(nqAvg)} views`);
  console.log(`  Winner               : ${qAvg > nqAvg ? "Question titles" : "Statement titles"} (+${Math.round(Math.abs(qAvg - nqAvg) / Math.min(qAvg, nqAvg) * 100)}% more views)`);

  // --- CSV export ---
  console.log("\n\n  CSV EXPORT:\n");
  console.log("Rank,Title,Views,Likes,Comments,Duration(s),Category,Published,Engagement Rate %");
  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    const eng = v.views > 0 ? (((v.likes + v.comments) / v.views) * 100).toFixed(1) : "0";
    const safeTitle = v.title.replace(/,/g, ";").replace(/"/g, "'");
    console.log(`${i + 1},"${safeTitle}",${v.views},${v.likes},${v.comments},${v.durationSec},${v.category},${v.publishedAt.slice(0, 10)},${eng}`);
  }

  console.log("");
}

main().catch(e => { console.error(e.message); process.exit(1); });
