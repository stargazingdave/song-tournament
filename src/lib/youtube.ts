const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be"
]);

export function parseYoutubeUrl(input: string) {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Enter a valid YouTube URL.");
  }

  if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("Only YouTube links are supported.");
  }

  let videoId = "";

  if (url.hostname.includes("youtu.be")) {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v") ?? "";
  } else if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/")) {
    videoId = url.pathname.split("/").filter(Boolean)[1] ?? "";
  }

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    throw new Error("Could not find a valid YouTube video id in that link.");
  }

  return {
    videoId,
    normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`
  };
}
