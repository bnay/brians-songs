import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * React + Tailwind wireframe with working audio playback.
 * Safe multiline strings (use "\\n"); self-tests check for "\\n".
 * Sorting: Newest / Most Liked / A–Z.
 * Stories & lyrics render with <pre className="whitespace-pre-wrap leading-relaxed">.
 * Hash routing so URLs survive refresh (#/music, #/song/slug).
 * Persistence via localStorage + document.title per route.
 */

/* -------------------------
 * Mock Data (seed)
 * ------------------------- */
const SEED_SONGS = [
  {
    id: 1,
    title: "Be Good",
    slug: "be-good",
    duration: "3:42",
    releaseDate: "2025-07-15",
    genre: "Southern Rock",
    moods: ["uplifting", "nostalgic"],
    story:
      `A feel-good track about small lessons and second chances—` +
      `\\nBlending southern rock guitars with a sing-along chorus.` +
      `\\nWritten on a summer afternoon after remembering a childhood lesson.`,
    lyrics:
      `Mama said be a good boy... (lyrics preview)\\n` +
      `Chorus: Be good, be kind, do right...`,
    audioUrl: "",
    likes: 24,
    visibility: "public",
  },
  {
    id: 2,
    title: "Diminished, Erased, and Ignored",
    slug: "diminished-erased-ignored",
    duration: "4:18",
    releaseDate: "2025-08-10",
    genre: "Blues Rock",
    moods: ["reflective", "defiant"],
    story:
      `Gritty blues-rock storytelling with a raw vocal—` +
      `\\nA song about resilience and finding your footing again.` +
      `\\nDrawn from late-night writing sessions and raw emotion.`,
    lyrics:
      `But what of the man with years behind... (lyrics preview)\\n` +
      `Chorus: Diminished, erased, ignored...`,
    audioUrl: "",
    likes: 31,
    visibility: "public",
  },
  {
    id: 3,
    title: "Sunset Heartbreak",
    slug: "sunset-heartbreak",
    duration: "3:58",
    releaseDate: "2025-06-14",
    genre: "Country Ballad",
    moods: ["somber", "tender"],
    story:
      `A quiet ballad set at dusk—` +
      `\\nTwo people watching the sun slip under the horizon on their last day together.` +
      `\\nCaptures the bittersweet calm of endings and memory.`,
    lyrics:
      `We watched the sun lay down its crown... (lyrics preview)\\n` +
      `Chorus: Sunset fading, holding on...`,
    audioUrl: "",
    likes: 17,
    visibility: "private",
  },
];

const MOCK_POSTS = [
  {
    id: 1,
    title: "The riff that sparked a chorus",
    slug: "riff-that-sparked",
    date: "2025-08-01",
    tags: ["songwriting"],
    content:
      `I was noodling on a pentatonic lick in G—\\n` +
      `And the hook for 'Be Good' fell into place almost by accident.\\n` +
      `It reminded me that inspiration often comes when least expected.`,
  },
  {
    id: 2,
    title: "Choosing a tempo for a story",
    slug: "choosing-tempo-story",
    date: "2025-07-20",
    tags: ["craft", "life"],
    content:
      `When the lyrics feel heavy, I try a slower shuffle before committing.\\n` +
      `The groove sets the mood, and the right tempo can completely change the story.\\n` +
      `Sometimes it takes hours of experimentation to find what clicks.`,
  },
];

/* -------------------------
 * useLocalStorage hook
 * ------------------------- */
function useLocalStorage(key: string, initialValue: any) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore write errors */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

/* -------------------------
 * Lightweight Self-Tests
 * ------------------------- */
function runSelfTests(songs: any[]) {
  console.group("✅ Running UI self-tests");
  try {
    const required = [
      "id",
      "title",
      "slug",
      "duration",
      "releaseDate",
      "genre",
      "moods",
      "story",
      "lyrics",
      "visibility",
    ];
    songs.forEach((s, i) => {
      required.forEach((k) => {
        console.assert(k in s, `Song[${i}] missing key: ${k}`);
      });
      console.assert(typeof s.title === "string" && s.title.length > 0, `Song[${i}] title invalid`);
      console.assert(typeof s.slug === "string" && /^[a-z0-9-]+$/i.test(s.slug), `Song[${i}] slug invalid`);
      console.assert(typeof s.lyrics === "string", `Song[${i}] lyrics must be a string`);
      console.assert(Array.isArray(s.moods), `Song[${i}] moods must be array`);
    });

    songs.forEach((s) => {
      const path = `/song/${s.slug}`;
      console.assert(path.startsWith("/song/"), `Route path malformed for ${s.title}`);
    });

    const q = songs[0]?.moods?.[0]?.toUpperCase?.() || "UPLIFTING";
    const found = songs.filter(
      (s) => s.title.toLowerCase().includes(q.toLowerCase()) || s.moods.join(" ").toLowerCase().includes(q.toLowerCase())
    );
    console.assert(found.length >= 1, "Search by mood should find at least one song");

    const hasNewline = songs.some((s) => s.lyrics.includes("\\n"));
    console.assert(hasNewline, "At least one song should have multiline lyrics with a newline");

    const pub = songs.some((s) => s.visibility === "public");
    const pri = songs.some((s) => s.visibility === "private");
    console.assert(pub && pri, "Seed should include both public and private songs");

    songs.forEach((s, i) => {
      console.assert(/^[-a-z0-9]+$/i.test(s.slug), `Song[${i}] slug should be alphanumeric/dash only`);
    });

    const byDateDesc = (a: any, b: any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
    const byLikesDesc = (a: any, b: any) => (b.likes || 0) - (a.likes || 0);
    const byTitleAsc = (a: any, b: any) => (a.title || "").localeCompare(b.title || "");
    [byDateDesc, byLikesDesc, byTitleAsc].forEach((cmp, idx) => {
      const copy = songs.slice();
      copy.sort(cmp);
      console.assert(Array.isArray(copy) && copy.length === songs.length, `Sort test ${idx + 1} ok`);
    });
  } catch (err) {
    console.error("Self-tests encountered an error:", err);
  }
  console.groupEnd();
}

/* -------------------------
 * Utilities
 * ------------------------- */
const routes = [
  { path: "/", label: "Home" },
  { path: "/music", label: "Music" },
  { path: "/playlists", label: "Playlists" },
  { path: "/stories", label: "Stories" },
  { path: "/request", label: "Request" },
  { path: "/guestbook", label: "Guestbook" },
  { path: "/about", label: "About" },
  { path: "/subscribe", label: "Subscribe" },
  { path: "/private", label: "Private" },
];

function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function computeTitle(path: string, song?: { title: string } | null) {
  if (path.startsWith("/song/") && song?.title) return `${song.title} – Brian's Songs`;
  switch (path) {
    case "/":
      return "Home – Brian's Songs";
    case "/music":
      return "Music – Brian's Songs";
    case "/playlists":
      return "Playlists – Brian's Songs";
    case "/stories":
      return "Stories – Brian's Songs";
    case "/request":
      return "Request a Song – Brian's Songs";
    case "/guestbook":
      return "Guestbook – Brian's Songs";
    case "/about":
      return "About – Brian's Songs";
    case "/subscribe":
      return "Subscribe – Brian's Songs";
    case "/private":
      return "Private – Brian's Songs";
    default:
      return "Brian's Songs";
  }
}

/* -------------------------
 * Main App
 * ------------------------- */
export default function App() {
  const [path, setPath] = useState("/");
  const [query, setQuery] = useState("");

  // Persisted state
  const [songs, setSongs] = useLocalStorage("msw:songs", SEED_SONGS);
  const [liked, setLiked] = useLocalStorage("msw:liked", {});
  const [guestbook, setGuestbook] = useLocalStorage("msw:guestbook", []);
  const [comments, setComments] = useLocalStorage("msw:comments", {});
  const [privateUnlocked, setPrivateUnlocked] = useLocalStorage("msw:priv", false);
  const [sortMode, setSortMode] = useLocalStorage("msw:sort", "newest"); // 'newest' | 'liked' | 'az'

  // Player state
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Init: self-tests
  useEffect(() => {
    runSelfTests(songs);
  }, []); // only once

  // Hash routing: sync path <-> location.hash
  useEffect(() => {
    const readHash = () => {
      const h = window.location.hash.replace(/^#/, "") || "/";
      setPath(h);
    };
    window.addEventListener("hashchange", readHash);
    readHash();
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  const navigate = (to: string) => {
    if (!to.startsWith("#")) {
      window.location.hash = to;
    }
    setPath(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Visible + sorted songs (respect search & private unlock)
  const visibleSongs = useMemo(() => {
    let base = songs.slice();
    if (path !== "/private") {
      base = base.filter((s: any) => s.visibility === "public");
    } else if (!privateUnlocked) {
      base = [];
    }
    const q = query.trim().toLowerCase();
    base = q
      ? base.filter(
          (s: any) =>
            s.title.toLowerCase().includes(q) ||
            s.genre.toLowerCase().includes(q) ||
            s.moods.join(" ").toLowerCase().includes(q)
        )
      : base;

    const byDateDesc = (a: any, b: any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
    const byLikesDesc = (a: any, b: any) =>
      (b.likes + (liked[b.id] ? 1 : 0)) - (a.likes + (liked[a.id] ? 1 : 0));
    const byTitleAsc = (a: any, b: any) => a.title.localeCompare(b.title);

    if (sortMode === "liked") base.sort(byLikesDesc);
    else if (sortMode === "az") base.sort(byTitleAsc);
    else base.sort(byDateDesc);

    return base;
  }, [songs, query, path, privateUnlocked, sortMode, liked]);

  // Song detail by slug (from path)
  const routeSong = useMemo(() => {
    if (!path.startsWith("/song/")) return null;
    const slug = path.replace("/song/", "");
    return songs.find((s: any) => s.slug === slug) || null;
  }, [path, songs]);

  // Document title
  useEffect(() => {
    const title = computeTitle(path, routeSong);
    document.title = title;
  }, [path, routeSong]);

  // Player helpers
  const playBySong = (song: any) => {
    const idx = visibleSongs.findIndex((s: any) => s.id === song.id);
    if (idx !== -1) {
      setActiveIndex(idx);
      setIsPlaying(true);
      if (!path.startsWith("/song/")) navigate(`/song/${song.slug}`);
    }
  };

  const openSongDetail = (song: any) => navigate(`/song/${song.slug}`);

  // Update a song (attach audio URL, etc.)
  const updateSong = (id: number, patch: any) => {
    setSongs((prev: any[]) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const currentRoute = (() => {
    if (path.startsWith("/song/")) return "song";
    const match = routes.find((r) => r.path === path);
    return match ? match.label.toLowerCase() : "notfound";
  })();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            className="text-xl font-bold tracking-tight hover:opacity-80"
            onClick={() => navigate("/")}
            aria-label="Go home"
          >
            🎵 Brian's Songs
          </button>

          <nav className="hidden md:flex gap-4 text-sm">
            {routes.map((r) => (
              <button
                key={r.path}
                onClick={() => navigate(r.path)}
                className={classNames(
                  "px-3 py-2 rounded-xl hover:bg-neutral-100",
                  path === r.path && "bg-neutral-200"
                )}
              >
                {r.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search songs by title, mood, genre..."
              className="w-40 md:w-72 px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        {currentRoute === "home" && (
          <HomePage onPlaySong={playBySong} navigate={navigate} songs={songs} />
        )}

        {currentRoute === "music" && (
          <MusicPage
            songs={visibleSongs}
            onOpenSong={openSongDetail}
            onPlaySong={playBySong}
            liked={liked}
            setLiked={setLiked}
            sortMode={sortMode}
            setSortMode={setSortMode}
          />
        )}

        {currentRoute === "song" && (
          <SongDetailPage
            song={routeSong}
            onPlaySong={playBySong}
            onBack={() => navigate("/music")}
            comments={comments}
            setComments={setComments}
            liked={liked}
            setLiked={setLiked}
            onUpdateSong={updateSong}
          />
        )}

        {currentRoute === "playlists" && (
          <PlaylistsPage songs={songs} onPlaySong={playBySong} navigate={navigate} />
        )}

        {currentRoute === "stories" && <StoriesPage posts={MOCK_POSTS} />}

        {currentRoute === "request" && <RequestPage />}

        {currentRoute === "guestbook" && (
          <GuestbookPage entries={guestbook} onSubmit={(e: any) => setGuestbook([e, ...guestbook])} />
        )}

        {currentRoute === "about" && <AboutPage />}

        {currentRoute === "subscribe" && <SubscribePage />}

        {currentRoute === "private" && (
          <PrivatePage
            unlocked={privateUnlocked}
            setUnlocked={setPrivateUnlocked}
            songs={visibleSongs}
            onOpenSong={openSongDetail}
            onPlaySong={playBySong}
          />
        )}

        {currentRoute === "notfound" && <NotFound onBack={() => navigate("/")} />}
      </main>

      {/* Persistent Mini Player */}
      <MiniPlayer
        songs={visibleSongs}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
      />

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-6 text-sm">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-neutral-600">© {new Date().getFullYear()} Brian Nay — All rights reserved.</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/subscribe")}
              className="px-3 py-2 rounded-xl bg-neutral-900 text-white hover:opacity-90"
            >
              Subscribe
            </button>
            <button
              onClick={() => navigate("/request")}
              className="px-3 py-2 rounded-xl border hover:bg-neutral-100"
            >
              Request a Song
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* -------------------------
 * Components
 * ------------------------- */
function HomePage({ onPlaySong, navigate, songs }: any) {
  const latest =
    [...songs].filter((s) => s.visibility === "public").sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())[0];

  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <div className="rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-700 text-white p-8 md:p-12 shadow-xl">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Grip. Rip. Repeat.</h1>
        <p className="mt-2 text-neutral-200 max-w-2xl">
          Songs and stories from the road—bluesy grit, southern rock swagger, and quiet moments in between.
        </p>
        {latest && (
          <div className="mt-6 flex flex-col md:flex-row items-start md:items-center gap-3">
            <button
              className="px-5 py-3 rounded-2xl bg-white text-neutral-900 font-medium hover:opacity-90"
              onClick={() => onPlaySong(latest)}
            >
              ▶ Play Latest — {latest.title}
            </button>
            <button
              className="px-5 py-3 rounded-2xl border border-white/40 hover:bg-white/10"
              onClick={() => navigate("/music")}
            >
              Browse All Songs
            </button>
          </div>
        )}
      </div>

      {/* Featured playlist teaser */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold">Featured Playlist · New &amp; Noteworthy</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {songs
            .filter((s: any) => s.visibility === "public")
            .slice(0, 3)
            .map((s: any) => (
              <SongCard key={s.id} song={s} onPlay={() => onPlaySong(s)} />
            ))}
        </div>
      </div>
    </section>
  );
}

function MusicPage({ songs, onOpenSong, onPlaySong, liked, setLiked, sortMode, setSortMode }: any) {
  const sortLabel =
    sortMode === "newest" ? "Sorted by Newest" : sortMode === "liked" ? "Sorted by Most Liked" : "Sorted A–Z";

  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Song Library</h1>
          <p className="text-neutral-600">Browse by mood, genre, or just press play.</p>
          <p className="mt-2 text-xs text-neutral-500">
            {sortLabel} • {songs.length} song{songs.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {[
            { key: "newest", label: "Newest" },
            { key: "liked", label: "Most Liked" },
            { key: "az", label: "A–Z" },
          ].map((b) => (
            <button
              key={b.key}
              onClick={() => setSortMode(b.key)}
              aria-pressed={sortMode === b.key}
              className={classNames(
                "px-3 py-2 rounded-xl border",
                sortMode === b.key ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {songs.map((s: any) => (
          <div key={s.id} className="group rounded-2xl border p-4 hover:shadow-lg transition-shadow bg-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-lg leading-tight">{s.title}</h3>
                <p className="text-xs text-neutral-600">
                  {s.genre} • {s.duration}
                </p>
              </div>
              <button
                onClick={() => {
                  setLiked((prev: any) => ({ ...prev, [s.id]: !prev[s.id] }));
                }}
                className={classNames(
                  "px-2 py-1 text-xs rounded-lg border",
                  liked[s.id] ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"
                )}
              >
                {liked[s.id] ? "♥ Liked" : "♡ Like"}
              </button>
            </div>
            <p className="mt-2 text-sm text-neutral-700 line-clamp-2">{s.story.replaceAll("\\n", " ")}</p>
            <div className="mt-4 flex items-center justify-between">
              <button onClick={() => onOpenSong(s)} className="text-sm underline underline-offset-4">
                View lyrics
              </button>
              <button
                onClick={() => onPlaySong(s)}
                className="px-3 py-2 rounded-xl bg-neutral-900 text-white hover:opacity-90"
              >
                Play
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SongDetailPage({
  song,
  onPlaySong,
  onBack,
  comments,
  setComments,
  liked,
  setLiked,
  onUpdateSong,
}: any) {
  if (!song)
    return (
      <section className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-neutral-600">Song not found.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 rounded-xl border">
          Back to Music
        </button>
      </section>
    );

  const thread = comments[song.slug] || [];
  const shareUrl = `${window.location.origin}${window.location.pathname}#/song/${song.slug}`;

  return (
    <section className="max-w-3xl mx-auto px-4 py-10">
      <button onClick={onBack} className="text-sm underline underline-offset-4">
        ← Back to Music
      </button>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{song.title}</h1>
          <p className="text-neutral-600 text-sm">
            {song.genre} • {song.duration} • Released {song.releaseDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLiked((prev: any) => ({ ...prev, [song.id]: !prev[song.id] }))}
            className={classNames(
              "px-3 py-2 rounded-xl border text-sm",
              liked[song.id] ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"
            )}
          >
            {liked[song.id] ? "♥ Liked" : "♡ Like"}
          </button>
          <button
            onClick={() => onPlaySong(song)}
            className="px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm hover:opacity-90"
          >
            ▶ Play
          </button>
        </div>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border p-4 bg-white">
          <h2 className="font-semibold">Lyrics</h2>
          <pre className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
            {song.lyrics}
          </pre>
        </div>
        <div className="rounded-2xl border p-4 bg-white">
          <h2 className="font-semibold">Song Story</h2>
          <pre className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
            {song.story}
          </pre>

          {/* Audio attach (URL or file upload) */}
          <div className="mt-6">
            <h3 className="font-medium text-sm">Attach Audio</h3>
            <div className="mt-2 grid gap-2 text-sm">
              <input
                type="url"
                placeholder="Paste direct MP3/WAV URL (https://...)"
                defaultValue={song.audioUrl}
                className="px-3 py-2 rounded-xl border w-full"
                onBlur={(e) => onUpdateSong(song.id, { audioUrl: e.target.value.trim() })}
              />
              <label className="text-xs text-neutral-600">or upload a file</label>
              <input
                type="file"
                accept="audio/*"
                className="px-3 py-2 rounded-xl border w-full"
                onChange={(e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  const url = URL.createObjectURL(file);
                  onUpdateSong(song.id, { audioUrl: url });
                  alert("Audio attached. Click ▶ Play to listen.");
                }}
              />
            </div>

            <div className="mt-3 text-xs text-neutral-600">
              <p>Tip: In CodeSandbox, a pasted HTTPS URL is simplest. Uploaded files play via a temporary local URL.</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-medium text-sm">Share</h3>
            <button
              className="mt-2 px-3 py-2 rounded-xl border text-sm hover:bg-neutral-100"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  alert("Song link copied to clipboard.");
                } catch {
                  alert("Link copied (simulated).");
                }
              }}
            >
              Copy link
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border p-4 bg-white">
        <h2 className="font-semibold">Comments</h2>
        <CommentForm
          onSubmit={(entry: any) => {
            const item = { ...entry, createdAt: new Date().toISOString() };
            setComments((prev: any) => ({
              ...prev,
              [song.slug]: [item, ...thread],
            }));
          }}
        />
        <div className="mt-4 space-y-3">
          {thread.length === 0 && (
            <p className="text-sm text-neutral-600">No comments yet—be the first to share a thought.</p>
          )}
          {thread.map((c: any, idx: number) => (
            <div key={idx} className="rounded-xl border p-3">
              <div className="text-sm">
                <span className="font-medium">{c.name}</span>{" "}
                <span className="text-neutral-500">· {new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm mt-1">{c.message}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlaylistsPage({ songs, onPlaySong, navigate }: any) {
  const moodBuckets = [
    { title: "Uplifting", mood: "uplifting" },
    { title: "Reflective", mood: "reflective" },
    { title: "Southern Rock", mood: "southern" },
  ];
  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold">Playlists by Mood/Theme</h1>
      <p className="text-neutral-600">Handpicked sets to match the moment.</p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {moodBuckets.map((b) => (
          <div key={b.title} className="rounded-2xl border p-4 bg-white">
            <h3 className="font-semibold">{b.title}</h3>
            <ul className="mt-2 text-sm list-disc list-inside text-neutral-700">
              {songs
                .filter((s: any) =>
                  b.mood === "southern" ? s.genre.toLowerCase().includes("southern") : s.moods.includes(b.mood)
                )
                .filter((s: any) => s.visibility === "public")
                .slice(0, 5)
                .map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <button className="underline underline-offset-4" onClick={() => navigate(`/song/${s.slug}`)}>
                      {s.title}
                    </button>
                    <button
                      className="text-xs px-2 py-1 rounded-lg border hover:bg-neutral-100"
                      onClick={() => onPlaySong(s)}
                    >
                      ▶ Play
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function StoriesPage({ posts }: any) {
  return (
    <section className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold">Stories &amp; Updates</h1>
      <div className="mt-6 space-y-4">
        {posts.map((p: any) => (
          <article key={p.id} className="rounded-2xl border p-4 bg-white">
            <h2 className="font-semibold">{p.title}</h2>
            <p className="text-xs text-neutral-500">
              {p.date} · {p.tags.join(", ")}
            </p>
            <pre className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
              {p.content}
            </pre>
          </article>
        ))}
      </div>
    </section>
  );
}

function RequestPage() {
  const [form, setForm] = useState({ name: "", idea: "", vibe: "", dedication: "" });
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <section className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold">Request a Song</h1>
      <p className="text-neutral-600">Have a theme, dedication, or mood in mind? Tell me below.</p>
      <div className="mt-6 grid gap-4">
        <input name="name" value={form.name} onChange={onChange} placeholder="Your name" className="px-3 py-2 rounded-xl border" />
        <textarea name="idea" value={form.idea} onChange={onChange} placeholder="Idea / story / occasion" className="px-3 py-2 rounded-xl border min-h-[100px]" />
        <input name="vibe" value={form.vibe} onChange={onChange} placeholder="Tempo / vibe (e.g., bluesy, 90 bpm)" className="px-3 py-2 rounded-xl border" />
        <input name="dedication" value={form.dedication} onChange={onChange} placeholder="Dedication (optional)" className="px-3 py-2 rounded-xl border" />
        <button
          className="px-4 py-2 rounded-xl bg-neutral-900 text-white hover:opacity-90"
          onClick={() => {
            alert(`Thanks ${form.name || "friend"}! Request received: ${form.idea.slice(0, 60)}...`);
            setForm({ name: "", idea: "", vibe: "", dedication: "" });
          }}
        >
          Send Request
        </button>
      </div>
    </section>
  );
}

function GuestbookPage({ entries, onSubmit }: any) {
  const [form, setForm] = useState({ name: "", message: "" });
  return (
    <section className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold">Guestbook</h1>
      <p className="text-neutral-600">Leave a note for Brian.</p>
      <div className="mt-6 grid gap-3">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Your name"
          className="px-3 py-2 rounded-xl border"
        />
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Your message"
          className="px-3 py-2 rounded-xl border min-h-[100px]"
        />
        <button
          className="px-4 py-2 rounded-xl bg-neutral-900 text-white hover:opacity-90"
          onClick={() => {
            if (!form.message.trim()) return;
            onSubmit({ ...form, createdAt: new Date().toISOString() });
            setForm({ name: "", message: "" });
          }}
        >
          Sign Guestbook
        </button>
      </div>
      <div className="mt-6 space-y-3">
        {entries.length === 0 && <p className="text-sm text-neutral-600">No messages yet—say hello!</p>}
        {entries.map((e: any, idx: number) => (
          <div key={idx} className="rounded-xl border p-3 bg-white">
            <div className="text-sm">
              <span className="font-medium">{e.name || "Anonymous"}</span>{" "}
              <span className="text-neutral-500">· {new Date(e.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-sm mt-1">{e.message}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <section className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold">About the Artist</h1>
      <pre className="mt-2 whitespace-pre-wrap text-neutral-800 leading-relaxed">
        {`I write songs that live somewhere between blues rock, southern fried swagger, and quiet twilight ballads.
        
This site is a home for works-in-progress and finished tracks I share with family and friends.`}
      </pre>
      <div className="mt-6 rounded-2xl border p-4 bg-white">
        <h2 className="font-semibold">Influences</h2>
        <p className="text-sm mt-2">
          Lynyrd Skynyrd, Chris Stapleton, The Black Keys, John Mayer (trio era), and a steady diet of old-school blues.
        </p>
      </div>
    </section>
  );
}

function SubscribePage() {
  const [email, setEmail] = useState("");
  return (
    <section className="max-w-sm mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Subscribe for Updates</h1>
      <p className="mt-2 text-neutral-600">Get an email when a new song drops.</p>
      <div className="mt-6 grid gap-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="px-3 py-2 rounded-xl border"
        />
        <button
          className="px-4 py-2 rounded-xl bg-neutral-900 text-white hover:opacity-90"
          onClick={() => {
            alert("Thanks! Check your inbox to confirm.");
            setEmail("");
          }}
        >
          Subscribe
        </button>
      </div>
    </section>
  );
}

function PrivatePage({ unlocked, setUnlocked, songs, onOpenSong, onPlaySong }: any) {
  const [pw, setPw] = useState("");
  return (
    <section className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold">Private Area</h1>
      {!unlocked ? (
        <div className="mt-4 rounded-2xl border p-4 bg-white">
          <p className="text-sm text-neutral-700">Enter the family password to access early releases and drafts.</p>
          <div className="mt-3 flex gap-2">
            <input
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              type="password"
              placeholder="Password"
              className="px-3 py-2 rounded-xl border"
            />
            <button
              className="px-4 py-2 rounded-xl bg-neutral-900 text-white hover:opacity-90"
              onClick={() => setUnlocked(pw.trim().length > 0)}
            >
              Unlock
            </button>
          </div>
          <p className="text-xs text-neutral-500 mt-2">(Prototype: any non-empty password unlocks.)</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {songs.map((s: any) => (
            <div key={s.id} className="rounded-2xl border p-4 bg-white">
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-xs text-neutral-600">
                {s.genre} • {s.duration}
              </p>
              <p className="mt-2 text-sm text-neutral-700 line-clamp-2">{s.story.replaceAll("\\n", " ")}</p>
              <div className="mt-4 flex items-center justify-between">
                <button onClick={() => onOpenSong(s)} className="text-sm underline underline-offset-4">
                  View lyrics
                </button>
                <button
                  onClick={() => onPlaySong(s)}
                  className="px-3 py-2 rounded-xl bg-neutral-900 text-white hover:opacity-90"
                >
                  Play
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CommentForm({ onSubmit }: any) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  return (
    <div className="mt-3 grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="px-3 py-2 rounded-xl border"
        />
        <button
          className="px-3 py-2 rounded-xl border hover:bg-neutral-100"
          onClick={() => {
            setName("");
            setMessage("");
          }}
        >
          Clear
        </button>
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write a comment"
        className="px-3 py-2 rounded-xl border min-h-[90px]"
      />
      <div>
        <button
          className="px-4 py-2 rounded-xl bg-neutral-900 text-white hover:opacity-90"
          onClick={() => {
            if (!message.trim()) return;
            onSubmit({ name: name || "Anonymous", message });
            setMessage("");
          }}
        >
          Post Comment
        </button>
      </div>
    </div>
  );
}

function SongCard({ song, onPlay }: any) {
  return (
    <div className="rounded-2xl border p-4 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold leading-tight">{song.title}</h3>
          <p className="text-xs text-neutral-600">
            {song.genre} • {song.duration}
          </p>
        </div>
        <button className="text-xs px-2 py-1 rounded-lg border hover:bg-neutral-100" onClick={onPlay}>
          ▶ Play
        </button>
      </div>
      <p className="mt-2 text-sm text-neutral-700 line-clamp-2">{song.story.replaceAll("\\n", " ")}</p>
    </div>
  );
}

function MiniPlayer({ songs, activeIndex, setActiveIndex, isPlaying, setIsPlaying }: any) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load/auto-play when activeIndex changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (activeIndex == null || !songs[activeIndex]) return;

    const url = songs[activeIndex].audioUrl || "";
    audio.src = url;
    if (url) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      setIsPlaying(false);
    }
  }, [activeIndex, songs, setIsPlaying]);

  const hasTrack = activeIndex != null && songs[activeIndex];

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!hasTrack || !songs[activeIndex].audioUrl) {
      alert("No audio attached for this song yet. Open the song and add an MP3/WAV URL or upload a file.");
      return;
    }
    if (audio.paused) {
      audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const step = (dir: number) => {
    if (!songs.length) return;
    if (activeIndex == null) return;
    const next = (activeIndex + dir + songs.length) % songs.length;
    setActiveIndex(next);
  };

  const stop = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const song = hasTrack ? songs[activeIndex] : null;

  return (
    <div className="sticky bottom-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-4 rounded-2xl shadow-lg border bg-white overflow-hidden">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-neutral-200" />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{song ? song.title : "Nothing playing"}</div>
                <div className="text-xs text-neutral-500 truncate">
                  {song ? `${song.genre} • ${song.duration}` : "Select a song and attach audio"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 rounded-xl border text-sm hover:bg-neutral-100"
                onClick={() => step(-1)}
                disabled={activeIndex == null}
              >
                ⏮
              </button>
              <button
                className="px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm hover:opacity-90"
                onClick={togglePlay}
                disabled={activeIndex == null}
              >
                {isPlaying ? "⏸" : "⏯"}
              </button>
              <button
                className="px-3 py-2 rounded-xl border text-sm hover:bg-neutral-100"
                onClick={() => step(1)}
                disabled={activeIndex == null}
              >
                ⏭
              </button>
              {song && (
                <button className="px-3 py-2 rounded-xl border text-sm hover:bg-neutral-100" onClick={stop}>
                  Stop
                </button>
              )}
            </div>
          </div>
          {/* Hidden audio element controls actual playback */}
          <audio ref={audioRef} className="w-full hidden" onEnded={() => step(1)} />
        </div>
      </div>
    </div>
  );
}

function NotFound({ onBack }: any) {
  return (
    <section className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold">404</h1>
      <p className="mt-2 text-neutral-600">That page wandered off. Let&apos;s get you back to the music.</p>
      <button onClick={onBack} className="mt-6 px-4 py-2 rounded-xl border hover:bg-neutral-100">
        Back to Home
      </button>
    </section>
  );
}
