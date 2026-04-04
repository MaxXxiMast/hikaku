#!/usr/bin/env node

/**
 * YouTube Channel Monthly Viewership Fetcher
 *
 * Fetches all videos from a YouTube channel and aggregates
 * view counts by month to produce month-on-month viewership data.
 *
 * Usage:
 *   node scripts/youtube-channel-stats.mjs <API_KEY> [CHANNEL_HANDLE]
 *
 * Example:
 *   node scripts/youtube-channel-stats.mjs AIzaSy... @WintWealthYT
 *
 * Get your API key from: https://console.cloud.google.com/
 *   1. Create/select a project
 *   2. Enable "YouTube Data API v3"
 *   3. Create an API key under Credentials
 */

const API_KEY = process.argv[2];
const CHANNEL_HANDLE = process.argv[3] || "@WintWealthYT";
const BASE_URL = "https://www.googleapis.com/youtube/v3";

if (!API_KEY) {
  console.error("\nUsage: node scripts/youtube-channel-stats.mjs <YOUR_API_KEY> [@ChannelHandle]\n");
  console.error("Get your API key from: https://console.cloud.google.com/");
  console.error("  1. Create/select a project");
  console.error('  2. Enable "YouTube Data API v3"');
  console.error("  3. Create an API key under Credentials\n");
  process.exit(1);
}

// ---------- API helpers ----------

async function ytFetch(endpoint, params) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("key", API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`YouTube API error (${res.status}): ${JSON.stringify(err.error?.message || err)}`);
  }
  return res.json();
}

// ---------- Step 1: Resolve channel ----------

async function getChannelId(handle) {
  // Try handle-based lookup first
  const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;

  // Use search to resolve handle -> channelId
  const searchData = await ytFetch("search", {
    part: "snippet",
    q: cleanHandle,
    type: "channel",
    maxResults: "1",
  });

  if (searchData.items?.length > 0) {
    const channel = searchData.items[0];
    return {
      id: channel.snippet.channelId,
      title: channel.snippet.title,
    };
  }

  throw new Error(`Channel not found for handle: ${handle}`);
}

// ---------- Step 2: Get channel stats ----------

async function getChannelStats(channelId) {
  const data = await ytFetch("channels", {
    part: "statistics,snippet,contentDetails",
    id: channelId,
  });

  if (!data.items?.length) throw new Error("Channel not found");

  const ch = data.items[0];
  return {
    title: ch.snippet.title,
    description: ch.snippet.description?.slice(0, 200),
    subscriberCount: Number(ch.statistics.subscriberCount),
    totalViews: Number(ch.statistics.viewCount),
    videoCount: Number(ch.statistics.videoCount),
    uploadsPlaylistId: ch.contentDetails.relatedPlaylists.uploads,
    joinedDate: ch.snippet.publishedAt,
  };
}

// ---------- Step 3: Fetch all videos ----------

async function getAllVideos(uploadsPlaylistId) {
  const videoIds = [];
  let nextPageToken = null;

  // Get all video IDs from uploads playlist
  do {
    const params = {
      part: "contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: "50",
    };
    if (nextPageToken) params.pageToken = nextPageToken;

    const data = await ytFetch("playlistItems", params);
    for (const item of data.items || []) {
      videoIds.push(item.contentDetails.videoId);
    }
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  // Fetch video details in batches of 50
  const videos = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const data = await ytFetch("videos", {
      part: "snippet,statistics,contentDetails",
      id: batch.join(","),
    });

    for (const v of data.items || []) {
      videos.push({
        id: v.id,
        title: v.snippet.title,
        publishedAt: v.snippet.publishedAt,
        views: Number(v.statistics.viewCount || 0),
        likes: Number(v.statistics.likeCount || 0),
        comments: Number(v.statistics.commentCount || 0),
        duration: v.contentDetails.duration,
      });
    }
  }

  return videos;
}

// ---------- Step 4: Aggregate by month ----------

function aggregateByMonth(videos) {
  const monthly = {};

  for (const v of videos) {
    const date = new Date(v.publishedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!monthly[key]) {
      monthly[key] = {
        month: key,
        videoCount: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        videos: [],
      };
    }

    monthly[key].videoCount++;
    monthly[key].totalViews += v.views;
    monthly[key].totalLikes += v.likes;
    monthly[key].totalComments += v.comments;
    monthly[key].videos.push({
      title: v.title.slice(0, 60),
      views: v.views,
    });
  }

  // Sort by month and calculate MoM changes
  const sorted = Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].totalViews;
    const curr = sorted[i].totalViews;
    sorted[i].momChange = prev > 0 ? (((curr - prev) / prev) * 100).toFixed(1) : "N/A";
  }
  if (sorted.length > 0) sorted[0].momChange = "—";

  return sorted;
}

// ---------- Step 5: Display results ----------

function formatNumber(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function displayResults(channelStats, monthlyData) {
  console.log("\n" + "=".repeat(80));
  console.log(`  YOUTUBE CHANNEL ANALYTICS: ${channelStats.title}`);
  console.log("=".repeat(80));

  console.log(`\n  Subscribers : ${formatNumber(channelStats.subscriberCount)}`);
  console.log(`  Total Views : ${formatNumber(channelStats.totalViews)}`);
  console.log(`  Videos      : ${channelStats.videoCount}`);
  console.log(`  Joined      : ${new Date(channelStats.joinedDate).toLocaleDateString("en-IN")}`);

  console.log("\n" + "-".repeat(80));
  console.log(
    "  Month       | Videos | Total Views    | Avg Views/Video | MoM Change"
  );
  console.log("-".repeat(80));

  for (const m of monthlyData) {
    const avg = m.videoCount > 0 ? Math.round(m.totalViews / m.videoCount) : 0;
    const change =
      m.momChange === "—" || m.momChange === "N/A"
        ? m.momChange
        : `${Number(m.momChange) >= 0 ? "+" : ""}${m.momChange}%`;

    console.log(
      `  ${m.month}    |   ${String(m.videoCount).padStart(3)}  | ${formatNumber(m.totalViews).padStart(14)} | ${formatNumber(avg).padStart(15)} | ${change}`
    );
  }

  console.log("-".repeat(80));

  // Summary stats
  const totalViewsFromVideos = monthlyData.reduce((s, m) => s + m.totalViews, 0);
  const totalVideos = monthlyData.reduce((s, m) => s + m.videoCount, 0);
  const avgMonthlyViews = monthlyData.length > 0 ? Math.round(totalViewsFromVideos / monthlyData.length) : 0;

  console.log(`\n  Summary:`);
  console.log(`  Total views (all videos) : ${formatNumber(totalViewsFromVideos)}`);
  console.log(`  Total videos analyzed    : ${totalVideos}`);
  console.log(`  Avg monthly views        : ${formatNumber(avgMonthlyViews)}`);
  console.log(`  Active months            : ${monthlyData.length}`);

  // Top 5 videos
  const allVideos = monthlyData.flatMap((m) => m.videos);
  allVideos.sort((a, b) => b.views - a.views);

  console.log(`\n  Top 5 Videos:`);
  for (const v of allVideos.slice(0, 5)) {
    console.log(`    ${formatNumber(v.views).padStart(8)} views — ${v.title}`);
  }

  console.log("\n" + "=".repeat(80));

  // Export as CSV
  console.log("\n  CSV Export (copy below):\n");
  console.log("Month,Videos,Total Views,Avg Views/Video,MoM Change %");
  for (const m of monthlyData) {
    const avg = m.videoCount > 0 ? Math.round(m.totalViews / m.videoCount) : 0;
    console.log(`${m.month},${m.videoCount},${m.totalViews},${avg},${m.momChange}`);
  }

  console.log("");
}

// ---------- Main ----------

async function main() {
  try {
    console.log(`\nFetching channel data for ${CHANNEL_HANDLE}...`);

    // Step 1: Resolve channel
    console.log("  Resolving channel handle...");
    const { id: channelId, title } = await getChannelId(CHANNEL_HANDLE);
    console.log(`  Found: ${title} (${channelId})`);

    // Step 2: Get channel stats
    console.log("  Fetching channel statistics...");
    const channelStats = await getChannelStats(channelId);

    // Step 3: Fetch all videos
    console.log(`  Fetching all ${channelStats.videoCount} videos (this may take a moment)...`);
    const videos = await getAllVideos(channelStats.uploadsPlaylistId);
    console.log(`  Fetched ${videos.length} videos.`);

    // Step 4: Aggregate by month
    const monthlyData = aggregateByMonth(videos);

    // Step 5: Display results
    displayResults(channelStats, monthlyData);
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
}

main();
