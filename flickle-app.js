const ANALYTICS_MEASUREMENT_ID = "G-1B0MHEC0F9";

async function loadMovieDataset() {
  if (window.location.protocol === "file:") {
    const payload = await loadMovieDatasetFromScript();
    return payload.map(normalizeMovieRecord).filter(Boolean);
  }
  const response = await fetch("data/flickle-movies.json", { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Movie dataset failed to load (${response.status})`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload)) return [];
  return payload.map(normalizeMovieRecord).filter(Boolean);
}

let movieDatasetScriptPromise = null;

async function loadMovieDatasetFromScript() {
  if (Array.isArray(window.FLICKLE_MOVIES)) {
    return window.FLICKLE_MOVIES;
  }
  if (!movieDatasetScriptPromise) {
    movieDatasetScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "data/flickle-movies.js";
      script.defer = true;
      script.onload = () => {
        if (Array.isArray(window.FLICKLE_MOVIES)) {
          resolve(window.FLICKLE_MOVIES);
          return;
        }
        reject(new Error("Movie dataset script loaded without FLICKLE_MOVIES."));
      };
      script.onerror = () => {
        reject(new Error("Movie dataset script failed to load."));
      };
      document.head.appendChild(script);
    });
  }
  return movieDatasetScriptPromise;
}

function normalizeMovieRecord(movie) {
  if (!movie || typeof movie !== "object") return null;
  const title = String(movie.title || "").trim();
  const year = Number(movie.year);
  if (!title || !Number.isFinite(year)) return null;
  return {
    title,
    year,
    runtime: Number.isFinite(Number(movie.runtime)) ? Number(movie.runtime) : 0,
    genres: Array.isArray(movie.genres) ? movie.genres.map((value) => String(value || "").trim()).filter(Boolean) : [],
    director: String(movie.director || "").trim(),
    cast: Array.isArray(movie.cast) ? movie.cast.map((value) => String(value || "").trim()).filter(Boolean) : [],
    country: String(movie.country || "").trim(),
    language: String(movie.language || "").trim(),
    franchise: String(movie.franchise || "").trim(),
    studio: String(movie.studio || "").trim(),
    boxOffice: Number.isFinite(Number(movie.boxOffice)) ? Number(movie.boxOffice) : 0,
    voteCount: Number.isFinite(Number(movie.voteCount)) ? Number(movie.voteCount) : 0,
    voteAverage: Number.isFinite(Number(movie.voteAverage)) ? Number(movie.voteAverage) : 0,
    popularity: Number.isFinite(Number(movie.popularity)) ? Number(movie.popularity) : 0,
    tmdbId: Number.isFinite(Number(movie.tmdbId)) ? Number(movie.tmdbId) : null,
    posterPath: movie.posterPath ? String(movie.posterPath).trim() : ""
  };
}

async function boot() {
    const MAX_GUESSES = 10;
    const HINT_POINTS_HIT = 3;
    const HINT_POINTS_NEAR = 1;
    const HINT_POINT_COST = 50;
    const HINTS_MAX_PER_GAME = 3;
    const WIN_REVEAL_HOLD_MS = 2000;
    const WIN_REVEAL_SCROLL_DELAY_MS = 220;
    const ANSWER_MIN_VOTES = 700;
    const ANSWER_MIN_RATING = 6.0;
    const ANSWER_MIN_CAST_SCORE = 6;
    const ANSWER_MIN_POPULARITY = 9;
    const DAILY_POOL_TARGET_SIZE = 1000;
    const DAILY_POOL_FILL_MIN_VOTES = 600;
    const DAILY_POOL_FILL_MIN_RATING = 6.2;
    const DAILY_POOL_FILL_MIN_CAST_SCORE = 5;
    const DAILY_POOL_FILL_MIN_POPULARITY = 7;
    const JAM_MIN_VOTES = 300;
    const JAM_MIN_RATING = 6.0;
    const JAM_MIN_CAST_SCORE = 5;
    const JAM_MIN_POPULARITY = 8;
    const SEASONAL_BOOST_ENABLED = true;
    const SEASONAL_BOOST_RATE = 0.35;
    const SEASONAL_BASE_MULTIPLIER = 1.35;
    const SEASONAL_COOLDOWN_MULTIPLIER = 1.18;
    const SEASONAL_WEIGHT_VERSION = "seasonal-v2";
    const UI_SETTINGS_KEY = "flickle-ui-settings";
    const STATS_KEY = "flickle-stats";
    const CONSENT_PREF_KEY = "flickle-consent-pref-v1";
    const THUMB_CACHE_KEY = "flickle-thumb-cache-v2";
    const CAST_PORTRAIT_CACHE_KEY = "flickle-cast-portrait-cache-v1";
    const RATING_CACHE_KEY = "flickle-rating-cache-v1";
    const LANGUAGE_CACHE_KEY = "flickle-language-cache-v2";
    const TMDB_KEY_STORAGE = "flickle-tmdb-key";
    const PRACTICE_LAST_SEED_KEY = "flickle-practice-last-seed";
    const PRACTICE_IN_PROGRESS_KEY = "flickle-practice-in-progress";
    const ARCHIVE_SYNC_KEY_PREFIX = "flickle-archive-sync-v2";
    const STATS_SYNC_KEY_PREFIX = "flickle-stats-sync-v1";
    const TMDB_DEFAULT_API_KEY = "f932b68b94ae7ebe832f6859510d2695";
    const UI_SOUND_TYPES = Object.freeze(["start", "guess", "share", "win", "lose", "error", "toggle-on", "hint-ready"]);
    const storageFallback = {};
    const FAMILIAR_CAST_NAMES = [
      "Tom Hanks", "Leonardo DiCaprio", "Brad Pitt", "Morgan Freeman", "Robert De Niro",
      "Al Pacino", "Denzel Washington", "Tom Cruise", "Will Smith", "Keanu Reeves",
      "Matt Damon", "Ben Affleck", "Christian Bale", "Joaquin Phoenix", "Ryan Gosling",
      "Ryan Reynolds", "Chris Evans", "Chris Hemsworth", "Chris Pratt", "Robert Downey Jr.",
      "Mark Ruffalo", "Scarlett Johansson", "Samuel L. Jackson", "Harrison Ford", "Johnny Depp",
      "Hugh Jackman", "Daniel Craig", "Jason Statham", "Vin Diesel", "Tom Hardy",
      "Henry Cavill", "Idris Elba", "Michael B. Jordan", "Chadwick Boseman", "Zendaya",
      "Timothee Chalamet", "Margot Robbie", "Emma Stone", "Emma Watson", "Jennifer Lawrence",
      "Anne Hathaway", "Natalie Portman", "Meryl Streep", "Julia Roberts", "Sandra Bullock",
      "Charlize Theron", "Cate Blanchett", "Emily Blunt", "Rachel McAdams", "Amy Adams",
      "Angelina Jolie", "Cameron Diaz", "Jim Carrey", "Eddie Murphy", "Adam Sandler",
      "Steve Carell", "Seth Rogen", "Jonah Hill", "Melissa McCarthy", "Reese Witherspoon",
      "Viola Davis", "Lupita Nyong'o", "Gal Gadot", "Benedict Cumberbatch", "Andrew Garfield",
      "Tobey Maguire", "Andrew Lincoln", "Cillian Murphy", "Florence Pugh", "Anya Taylor-Joy",
      "Bill Murray", "Robin Williams", "Jack Nicholson", "Heath Ledger", "Gary Oldman",
      "J.K. Simmons", "Miles Teller", "Paul Rudd", "Brie Larson", "Pedro Pascal"
    ];
    // Must be initialized before DATA_AUDIT runs to avoid TDZ crashes.
    let castFamiliaritySetCache = null;
    let analyticsScriptRequested = false;

    function ensureAnalyticsLoaded() {
      if (consentChoice !== "all" || analyticsScriptRequested) return;
      analyticsScriptRequested = true;
      window.gtag("js", new Date());
      window.gtag("config", ANALYTICS_MEASUREMENT_ID);
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ANALYTICS_MEASUREMENT_ID)}`;
      document.head.appendChild(script);
    }

    function storageGet(key) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn("Flickle storage read failed:", error);
        return Object.prototype.hasOwnProperty.call(storageFallback, key) ? storageFallback[key] : null;
      }
    }

    function storageSet(key, value) {
      const text = String(value);
      try {
        localStorage.setItem(key, text);
      } catch (error) {
        console.warn("Flickle storage write failed:", error);
      }
      storageFallback[key] = text;
    }

    function storageRemove(key) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn("Flickle storage remove failed:", error);
      }
      delete storageFallback[key];
    }

    function normalizeConsentChoice(raw) {
      if (raw === "all" || raw === "essential") return raw;
      return null;
    }

    function loadConsentChoice() {
      const raw = storageGet(CONSENT_PREF_KEY);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return normalizeConsentChoice(parsed && parsed.choice);
      } catch {
        return normalizeConsentChoice(raw);
      }
    }

    function saveConsentChoice(choice) {
      const normalized = normalizeConsentChoice(choice);
      if (!normalized) return;
      consentChoice = normalized;
      storageSet(CONSENT_PREF_KEY, JSON.stringify({
        choice: normalized,
        updatedAt: new Date().toISOString()
      }));
      applyConsentToRuntime();
      renderConsentBanner();
    }

    function applyConsentToRuntime() {
      const adGranted = consentChoice === "all";
      window.flickleConsentState = {
        ad_storage: adGranted ? "granted" : "denied",
        analytics_storage: adGranted ? "granted" : "denied"
      };
      if (adGranted) {
        ensureAnalyticsLoaded();
      }
      if (typeof window.gtag === "function") {
        window.gtag("consent", "update", window.flickleConsentState);
      }
    }

    function renderConsentBanner() {
      if (!els.consentBanner) return;
      const needsChoice = !normalizeConsentChoice(consentChoice);
      els.consentBanner.classList.toggle("on", needsChoice);
      if (els.consentStatus) {
        const label = consentChoice === "all"
          ? "Current choice: Accept all."
          : consentChoice === "essential"
            ? "Current choice: Essential only."
            : "No preference saved yet.";
        els.consentStatus.textContent = label;
      }
    }

    function getPracticeStorageKey(seed) {
      if (!seed) return "";
      return `flickle-jam-state-jam-${seed}`;
    }

    function readPracticeProgress(seed) {
      if (!seed) {
        return {
          exists: false,
          inProgress: false,
          finished: false
        };
      }
      const key = getPracticeStorageKey(seed);
      const raw = storageGet(key);
      if (!raw) {
        return {
          exists: false,
          inProgress: false,
          finished: false
        };
      }
      try {
        const parsed = JSON.parse(raw);
        const guessCount = Array.isArray(parsed.guesses) ? parsed.guesses.length : 0;
        const started = Boolean(parsed.started) || guessCount > 0;
        const finished = Boolean(parsed.finished);
        return {
          exists: true,
          inProgress: started && !finished,
          finished
        };
      } catch {
        return {
          exists: false,
          inProgress: false,
          finished: false
        };
      }
    }

    const MOVIES = (await loadMovieDataset()).filter(Boolean);

    const OSCAR_NOMS_BY_TITLE = {
      "The Godfather": 11,
      "The Dark Knight": 8,
      "Inception": 8,
      "Interstellar": 5,
      "Parasite": 6,
      "Whiplash": 5,
      "La La Land": 14,
      "The Grand Budapest Hotel": 9,
      "Arrival": 8,
      "Blade Runner 2049": 5,
      "The Matrix": 4,
      "Mad Max: Fury Road": 10,
      "The Lord of the Rings: The Fellowship of the Ring": 13,
      "The Lord of the Rings: The Two Towers": 6,
      "The Lord of the Rings: The Return of the King": 11,
      "Titanic": 14,
      "Avatar": 9,
      "Avatar: The Way of Water": 4,
      "The Shawshank Redemption": 7,
      "Pulp Fiction": 7,
      "Inglourious Basterds": 8,
      "Django Unchained": 5,
      "Spirited Away": 1,
      "Your Name": 0,
      "The Lion King": 4,
      "Toy Story": 3,
      "Toy Story 3": 5,
      "Finding Nemo": 4,
      "The Social Network": 8,
      "Fight Club": 1,
      "Se7en": 1,
      "Good Will Hunting": 9,
      "The Silence of the Lambs": 7,
      "The Departed": 5,
      "The Wolf of Wall Street": 5,
      "Shutter Island": 0,
      "The Truman Show": 3,
      "Back to the Future": 0,
      "Jurassic Park": 3,
      "Jaws": 4,
      "E.T. the Extra-Terrestrial": 9,
      "The Prestige": 2,
      "Black Panther": 7,
      "Avengers: Endgame": 1,
      "Iron Man": 2,
      "Skyfall": 5,
      "No Time to Die": 3,
      "Top Gun: Maverick": 6,
      "Oppenheimer": 13,
      "Barbie": 8,
      "Everything Everywhere All at Once": 11,
      "Dune": 10,
      "Dune: Part Two": 5,
      "Encanto": 3,
      "The Batman": 3,
      "Gladiator": 12,
      "Alien": 2
    };

    const FLICKLE_FACTS_BY_TITLE = {
      "Donnie Darko": [
        "The film became a cult favorite after release, helped by word of mouth and home video discovery.",
        "Its theatrical run was modest, but the movie found its audience through home media and late-night discussion forums.",
        "Richard Kelly wrote and directed the film at a young age, and it quickly became one of his defining works."
      ],
      "The Matrix": [
        "Bullet-time was achieved with a ring of still cameras firing in sequence around the actors.",
        "The iconic green code was inspired by scanned symbols and stylized into one of sci-fi's most recognizable visuals.",
        "Many action beats were pre-visualized heavily, helping merge martial arts choreography with VFX planning."
      ],
      "Jaws": [
        "The mechanical shark famously malfunctioned, which pushed Spielberg to rely on suspense more than screen time.",
        "Its summer release and breakout box office helped define the modern blockbuster model.",
        "John Williams' two-note motif became one of the most instantly recognizable themes in film history."
      ],
      "The Godfather": [
        "Marlon Brando used subtle voice and physical choices that became some of cinema's most recognized character work.",
        "Gordon Willis' low-key lighting style earned him the nickname 'The Prince of Darkness.'",
        "The production reportedly fought to keep the period setting and tone that made the final film so distinctive."
      ],
      "Fight Club": [
        "David Fincher hid brief flashes of Tyler Durden before key story beats to reward eagle-eyed viewers.",
        "The film gained a much larger following on home video than it had in its initial theatrical run.",
        "Its blend of satire, unreliable narration, and visual style made it a lasting cult phenomenon."
      ],
      "Back to the Future": [
        "The script was rejected many times before becoming one of the defining films of the 1980s.",
        "The production switched lead actors after filming had already started, then re-shot major material.",
        "Its practical effects and sharp pacing helped it age into one of the most rewatchable adventure comedies ever made."
      ]
    };
    const CURATED_FACTS_BY_TITLE = (typeof window !== "undefined"
      && window.FLICKLE_CURATED_FACTS
      && typeof window.FLICKLE_CURATED_FACTS === "object")
      ? window.FLICKLE_CURATED_FACTS
      : {};
    let curatedFactsByNormalizedTitle = null;
    const MAINSTREAM_FACT_RANK_LIMIT = 300;

    const els = {
      intro: document.getElementById("intro"),
      game: document.getElementById("game"),
      playBtn: document.getElementById("play-btn"),
      introSubtitle: document.getElementById("intro-subtitle"),
      introModeLink: document.getElementById("intro-mode-link"),
      guessCount: document.getElementById("guess-count"),
      guessForm: document.getElementById("guess-form"),
      guessInput: document.getElementById("guess-input"),
      randomStartBtn: document.getElementById("random-start-btn"),
      guessTypeahead: document.getElementById("guess-typeahead"),
      helper: document.querySelector(".helper"),
      cards: document.getElementById("cards"),
      status: document.getElementById("status"),
      statusSuggestions: document.getElementById("status-suggestions"),
      options: document.getElementById("movie-options"),
      hintPanel: document.getElementById("hint-panel"),
      hintBuyBtn: document.getElementById("hint-buy-btn"),
      hintProgress: document.getElementById("hint-progress"),
      hintProgressFill: document.getElementById("hint-progress-fill"),
      hintList: document.getElementById("hint-list"),
      shareBtn: document.getElementById("share-btn"),
      tweetBtn: document.getElementById("tweet-btn"),
      rulesBtn: document.getElementById("rules-btn"),
      resultReveal: document.getElementById("result-reveal"),
      resultFlip: document.getElementById("result-flip"),
      resultPoster: document.getElementById("result-poster"),
      resultPosterFallback: document.getElementById("result-poster-fallback"),
      resultLabel: document.getElementById("result-label"),
      resultTitle: document.getElementById("result-title"),
      resultMeta: document.getElementById("result-meta"),
      resultTapHint: document.getElementById("result-tap-hint"),
      resultFactTitle: document.getElementById("result-fact-title"),
      resultFactBody: document.getElementById("result-fact-body"),
      resultEffort: document.getElementById("result-effort"),
      resultEffortTitle: document.getElementById("result-effort-title"),
      resultEffortBody: document.getElementById("result-effort-body"),
      nextDaily: document.getElementById("next-daily"),
      nextDailyTime: document.getElementById("next-daily-time"),
      finishShare: document.getElementById("finish-share"),
      finishShareBtn: document.getElementById("finish-share-btn"),
      finishXBtn: document.getElementById("finish-x-btn"),
      finishPlayAgainBtn: document.getElementById("finish-play-again-btn"),
      sharePreviewTitle: document.getElementById("share-preview-title"),
      sharePreviewText: document.getElementById("share-preview-text"),
      rulesText: document.getElementById("rules-text"),
      menuOpenBtn: document.getElementById("menu-open-btn"),
      menuCloseBtn: document.getElementById("menu-close-btn"),
      menuOverlay: document.getElementById("menu-overlay"),
      sideMenu: document.getElementById("side-menu"),
      statsBtn: document.getElementById("stats-btn"),
      audioBtn: document.getElementById("audio-btn"),
      helpBtn: document.getElementById("help-btn"),
      menuHome: document.getElementById("menu-home"),
      menuHowto: document.getElementById("menu-howto"),
      menuAbout: document.getElementById("menu-about"),
      menuContact: document.getElementById("menu-contact"),
      menuPrivacy: document.getElementById("menu-privacy"),
      menuConsent: document.getElementById("menu-consent"),
      menuTerms: document.getElementById("menu-terms"),
      modeDaily: document.getElementById("mode-daily"),
      modeArchive: document.getElementById("mode-archive"),
      modeCreate: document.getElementById("mode-create"),
      authStatusText: document.getElementById("auth-status-text"),
      authSignInBtn: document.getElementById("auth-signin-btn"),
      authSignOutBtn: document.getElementById("auth-signout-btn"),
      modalOverlay: document.getElementById("modal-overlay"),
      modalCloseBtn: document.getElementById("modal-close-btn"),
      modalTitle: document.getElementById("modal-title"),
      modalBody: document.getElementById("modal-body"),
      consentBanner: document.getElementById("consent-banner"),
      consentAcceptBtn: document.getElementById("consent-accept-btn"),
      consentEssentialBtn: document.getElementById("consent-essential-btn"),
      consentManageBtn: document.getElementById("consent-manage-btn"),
      consentStatus: document.getElementById("consent-status")
    };

    const movieByNormTitle = new Map();
    const movieByIdentity = new Map();
    const moviesByNormTitle = new Map();
    const moviesByCompactNormTitle = new Map();
    for (const m of MOVIES) {
      const key = normalize(m.title);
      const compactKey = normalizeCompact(m.title);
      const identityKey = movieIdentityKey(m);
      if (!moviesByNormTitle.has(key)) moviesByNormTitle.set(key, []);
      moviesByNormTitle.get(key).push(m);
      if (compactKey) {
        if (!moviesByCompactNormTitle.has(compactKey)) moviesByCompactNormTitle.set(compactKey, []);
        moviesByCompactNormTitle.get(compactKey).push(m);
      }
      if (!movieByNormTitle.has(key)) movieByNormTitle.set(key, m);
      if (identityKey && !movieByIdentity.has(identityKey)) movieByIdentity.set(identityKey, m);
    }
    const LOCKED_ANSWER_MOVIE_KEYS = [
      "10 things i hate about you|1999",
      "12 angry men|1957",
      "1917|2019",
      "2001 a space odyssey|1968",
      "28 days later|2002",
      "50 first dates|2004",
      "a bronx tale|1993",
      "a man called otto|2022",
      "a quiet place day one|2024",
      "a quiet place part ii|2021",
      "a quiet place|2018",
      "a working man|2025",
      "about time|2013",
      "air|2023",
      "aladdin|1992",
      "alice in wonderland|2010",
      "aliens|1986",
      "alien|1979",
      "american gangster|2007",
      "american history x|1998",
      "american psycho|2000",
      "angels demons|2009",
      "annihilation|2018",
      "ant man and the wasp quantumania|2023",
      "ant man and the wasp|2018",
      "ant man|2015",
      "apocalypto|2006",
      "arrival|2016",
      "avatar the way of water|2022",
      "avatar|2009",
      "avengers age of ultron|2015",
      "avengers endgame|2019",
      "avengers infinity war|2018",
      "babylon|2022",
      "back to the future|1985",
      "bad boys for life|2020",
      "bad boys ride or die|2024",
      "bad boys|1995",
      "ballerina|2025",
      "barbie|2023",
      "batman begins|2005",
      "batman v superman dawn of justice|2016",
      "batman|1989",
      "beast|2022",
      "beauty and the beast|2017",
      "big hero 6|2014",
      "big|1988",
      "birds of prey and the fantabulous emancipation of one harley quinn|2020",
      "black panther wakanda forever|2022",
      "black panther|2018",
      "black swan|2010",
      "black widow|2021",
      "blade runner 2049|2017",
      "blade runner|1982",
      "blended|2014",
      "bohemian rhapsody|2018",
      "bram stokers dracula|1992",
      "braveheart|1995",
      "brave|2012",
      "brokeback mountain|2005",
      "brother bear|2003",
      "bruce almighty|2003",
      "bugonia|2025",
      "bullet train|2022",
      "call me by your name|2017",
      "captain america civil war|2016",
      "captain america the first avenger|2011",
      "captain america the winter soldier|2014",
      "captain marvel|2019",
      "casino royale|2006",
      "cast away|2000",
      "catch me if you can|2002",
      "challengers|2024",
      "charlie and the chocolate factory|2005",
      "cinderella|2015",
      "click|2006",
      "closer|2004",
      "coco|2017",
      "coming to america|1988",
      "constantine|2005",
      "coraline|2009",
      "corpse bride|2005",
      "crazy stupid love|2011",
      "creed iii|2023",
      "creed ii|2018",
      "creed|2015",
      "cruella|2021",
      "dawn of the planet of the apes|2014",
      "dead poets society|1989",
      "deadpool 2|2018",
      "deadpool wolverine|2024",
      "deadpool|2016",
      "despicable me 2|2013",
      "despicable me 3|2017",
      "despicable me 4|2024",
      "despicable me|2010",
      "die hard|1988",
      "django unchained|2012",
      "doctor strange in the multiverse of madness|2022",
      "doctor strange|2016",
      "dont look up|2021",
      "drive|2011",
      "dumb and dumber|1994",
      "dune part two|2024",
      "dune|2021",
      "dunkirk|2017",
      "e t the extra terrestrial|1982",
      "edge of tomorrow|2014",
      "edward scissorhands|1990",
      "encanto|2021",
      "enola holmes|2020",
      "eternal sunshine of the spotless mind|2004",
      "extraction 2|2023",
      "extraction|2020",
      "eyes wide shut|1999",
      "f1|2025",
      "fantastic mr fox|2009",
      "fast furious presents hobbs shaw|2019",
      "fast x|2023",
      "fight club|1999",
      "finch|2021",
      "finding nemo|2003",
      "flight|2012",
      "flushed away|2006",
      "ford v ferrari|2019",
      "forrest gump|1994",
      "frankenstein|2025",
      "free guy|2021",
      "full metal jacket|1987",
      "furiosa a mad max saga|2024",
      "furious 7|2015",
      "fury|2014",
      "get out|2017",
      "ghostbusters|1984",
      "ghosted|2023",
      "gifted|2017",
      "girl interrupted|1999",
      "gladiator ii|2024",
      "gladiator|2000",
      "glass onion a knives out mystery|2022",
      "glass|2019",
      "godzilla vs kong|2021",
      "gone girl|2014",
      "good will hunting|1997",
      "goodfellas|1990",
      "gravity|2013",
      "green book|2018",
      "greyhound|2020",
      "grown ups 2|2013",
      "grown ups|2010",
      "guardians of the galaxy vol 2|2017",
      "guardians of the galaxy vol 3|2023",
      "guardians of the galaxy|2014",
      "hacksaw ridge|2016",
      "hamnet|2025",
      "harry potter and the chamber of secrets|2002",
      "harry potter and the deathly hallows part 1|2010",
      "harry potter and the deathly hallows part 2|2011",
      "harry potter and the goblet of fire|2005",
      "harry potter and the half blood prince|2009",
      "harry potter and the order of the phoenix|2007",
      "harry potter and the philosophers stone|2001",
      "harry potter and the prisoner of azkaban|2004",
      "havoc|2025",
      "heat|1995",
      "her|2013",
      "hidden figures|2016",
      "homefront|2013",
      "hook|1991",
      "horton hears a who|2008",
      "hotel transylvania 3 summer vacation|2018",
      "hotel transylvania|2012",
      "how to train your dragon 2|2014",
      "how to train your dragon the hidden world|2019",
      "how to train your dragon|2010",
      "howls moving castle|2004",
      "i am legend|2007",
      "i robot|2004",
      "if|2024",
      "in time|2011",
      "inception|2010",
      "incredibles 2|2018",
      "independence day|1996",
      "indiana jones and the dial of destiny|2023",
      "indiana jones and the last crusade|1989",
      "indiana jones and the temple of doom|1984",
      "inglourious basterds|2009",
      "inside out 2|2024",
      "inside out|2015",
      "interstellar|2014",
      "iron man 2|2010",
      "iron man 3|2013",
      "iron man|2008",
      "jack reacher|2012",
      "jason bourne|2016",
      "jaws|1975",
      "jerry maguire|1996",
      "john wick chapter 2|2017",
      "john wick chapter 3 parabellum|2019",
      "john wick chapter 4|2023",
      "john wick|2014",
      "jojo rabbit|2019",
      "joker|2019",
      "jurassic world dominion|2022",
      "jurassic world fallen kingdom|2018",
      "jurassic world rebirth|2025",
      "jurassic world|2015",
      "just go with it|2011",
      "justice league|2017",
      "kill bill vol 1|2003",
      "killers of the flower moon|2023",
      "kingsman the secret service|2015",
      "knives out|2019",
      "kong skull island|2017",
      "kpop demon hunters|2025",
      "kung fu panda 2|2011",
      "kung fu panda 3|2016",
      "kung fu panda 4|2024",
      "kung fu panda|2008",
      "la la land|2016",
      "legally blonde|2001",
      "leon the professional|1994",
      "les miserables|2012",
      "life is beautiful|1997",
      "lightyear|2022",
      "limitless|2011",
      "little women|2019",
      "logan|2017",
      "lost in translation|2003",
      "love other drugs|2010",
      "lucy|2014",
      "mad max fury road|2015",
      "maleficent mistress of evil|2019",
      "maleficent|2014",
      "mamma mia|2008",
      "man of steel|2013",
      "man on fire|2004",
      "marty supreme|2025",
      "materialists|2025",
      "me before you|2016",
      "mean girls|2004",
      "meet joe black|1998",
      "meg 2 the trench|2023",
      "megamind|2010",
      "memento|2000",
      "men in black ii|2002",
      "men in black|1997",
      "mercy|2026",
      "midsommar|2019",
      "minions the rise of gru|2022",
      "minority report|2002",
      "mission impossible dead reckoning part one|2023",
      "mission impossible fallout|2018",
      "mission impossible ghost protocol|2011",
      "mission impossible rogue nation|2015",
      "mission impossible the final reckoning|2025",
      "mission impossible|1996",
      "monsters inc|2001",
      "monsters vs aliens|2009",
      "mortal kombat legends scorpions revenge|2020",
      "mother|2017",
      "mr mrs smith|2005",
      "mrs doubtfire|1993",
      "mulan|1998",
      "my fault|2023",
      "napoleon|2023",
      "no country for old men|2007",
      "no hard feelings|2023",
      "no time to die|2021",
      "now you see me 2|2016",
      "now you see me|2013",
      "oblivion|2013",
      "oceans eight|2018",
      "oceans eleven|2001",
      "once upon a time in america|1984",
      "once upon a time in hollywood|2019",
      "one battle after another|2025",
      "one flew over the cuckoos nest|1975",
      "oppenheimer|2023",
      "pacific rim|2013",
      "pans labyrinth|2006",
      "parasite|2019",
      "pirates of the caribbean at worlds end|2007",
      "pirates of the caribbean dead mans chest|2006",
      "pirates of the caribbean dead men tell no tales|2017",
      "pirates of the caribbean on stranger tides|2011",
      "pirates of the caribbean the curse of the black pearl|2003",
      "point break|1991",
      "poor things|2023",
      "predator badlands|2025",
      "pretty woman|1990",
      "prisoners|2013",
      "project hail mary|2026",
      "prometheus|2012",
      "psycho|1960",
      "pulp fiction|1994",
      "puss in boots the last wish|2022",
      "raiders of the lost ark|1981",
      "rango|2011",
      "ratatouille|2007",
      "ready player one|2018",
      "real steel|2011",
      "red one|2024",
      "reservoir dogs|1992",
      "return of the jedi|1983",
      "rio|2011",
      "rogue one a star wars story|2016",
      "rush|2013",
      "saving private ryan|1998",
      "scarface|1983",
      "schindlers list|1993",
      "se7en|1995",
      "send help|2026",
      "shang chi and the legend of the ten rings|2021",
      "sherlock holmes|2009",
      "shrek 2|2004",
      "shrek forever after|2010",
      "shrek the third|2007",
      "shrek|2001",
      "shutter island|2010",
      "sicario|2015",
      "silver linings playbook|2012",
      "sing 2|2021",
      "sing|2016",
      "sinners|2025",
      "skyfall|2012",
      "sleepers|1996",
      "sleepy hollow|1999",
      "snatch|2000",
      "snowpiercer|2013",
      "sonic the hedgehog 2|2022",
      "sonic the hedgehog 3|2024",
      "sonic the hedgehog|2020",
      "soul|2020",
      "southpaw|2015",
      "spectre|2015",
      "speed|1994",
      "spider man 2|2004",
      "spider man 3|2007",
      "spider man across the spider verse|2023",
      "spider man far from home|2019",
      "spider man homecoming|2017",
      "spider man into the spider verse|2018",
      "spider man no way home|2021",
      "spider man|2002",
      "spirit stallion of the cimarron|2002",
      "spirited away|2001",
      "split|2017",
      "star wars episode i the phantom menace|1999",
      "star wars episode ii attack of the clones|2002",
      "star wars episode iii revenge of the sith|2005",
      "star wars|1977",
      "stepmom|1998",
      "sunshine|2007",
      "superbad|2007",
      "tangled|2010",
      "taxi driver|1976",
      "terminator 2 judgment day|1991",
      "the accountant|2016",
      "the adam project|2022",
      "the amazing spider man 2|2014",
      "the amazing spider man|2012",
      "the avengers|2012",
      "the basketball diaries|1995",
      "the batman|2022",
      "the beekeeper|2024",
      "the big short|2015",
      "the blind side|2009",
      "the bourne identity|2002",
      "the conjuring|2013",
      "the croods|2013",
      "the curious case of benjamin button|2008",
      "the da vinci code|2006",
      "the dark knight rises|2012",
      "the dark knight|2008",
      "the departed|2006",
      "the devil wears prada|2006",
      "the devils advocate|1997",
      "the empire strikes back|1980",
      "the equalizer 2|2018",
      "the equalizer 3|2023",
      "the equalizer|2014",
      "the expendables 3|2014",
      "the fall guy|2024",
      "the fantastic 4 first steps|2025",
      "the fifth element|1997",
      "the garfield movie|2024",
      "the godfather part iii|1990",
      "the godfather part ii|1974",
      "the godfather|1972",
      "the good the bad and the ugly|1966",
      "the gorge|2025",
      "the grand budapest hotel|2014",
      "the gray man|2022",
      "the great gatsby|2013",
      "the greatest showman|2017",
      "the green mile|1999",
      "the grinch|2018",
      "the hateful eight|2015",
      "the help|2011",
      "the hobbit the desolation of smaug|2013",
      "the hunger games catching fire|2013",
      "the hunger games mockingjay part 1|2014",
      "the hunger games|2012",
      "the idea of you|2024",
      "the imitation game|2014",
      "the incredibles|2004",
      "the intern|2015",
      "the intouchables|2011",
      "the irishman|2019",
      "the iron giant|1999",
      "the jungle book|2016",
      "the last samurai|2003",
      "the lego movie|2014",
      "the lion king|1994",
      "the longest yard|2005",
      "the lord of the rings the fellowship of the ring|2001",
      "the lord of the rings the return of the king|2003",
      "the lord of the rings the two towers|2002",
      "the magnificent seven|2016",
      "the martian|2015",
      "the mask|1994",
      "the matrix reloaded|2003",
      "the matrix resurrections|2021",
      "the matrix revolutions|2003",
      "the matrix|1999",
      "the maze runner|2014",
      "the meg|2018",
      "the menu|2022",
      "the ministry of ungentlemanly warfare|2024",
      "the nice guys|2016",
      "the notebook|2004",
      "the pianist|2002",
      "the prestige|2006",
      "the princess diaries|2001",
      "the proposal|2009",
      "the pursuit of happyness|2006",
      "the revenant|2015",
      "the rip|2026",
      "the shawshank redemption|1994",
      "the shining|1980",
      "the sixth sense|1999",
      "the social network|2010",
      "the suicide squad|2021",
      "the super mario bros movie|2023",
      "the terminal|2004",
      "the terminator|1984",
      "the tomorrow war|2021",
      "the transporter|2002",
      "the truman show|1998",
      "the untouchables|1987",
      "the usual suspects|1995",
      "the wild robot|2024",
      "the witch|2016",
      "the wolf of wall street|2013",
      "thor love and thunder|2022",
      "thor ragnarok|2017",
      "thor the dark world|2013",
      "thor|2011",
      "thunderbolts|2025",
      "titanic|1997",
      "top gun maverick|2022",
      "top gun|1986",
      "toy story 2|1999",
      "toy story 3|2010",
      "toy story 4|2019",
      "toy story|1995",
      "trading places|1983",
      "training day|2001",
      "transformers one|2024",
      "troy|2004",
      "up|2009",
      "v for vendetta|2006",
      "van helsing|2004",
      "venom let there be carnage|2021",
      "venom the last dance|2024",
      "venom|2018",
      "wake up dead man a knives out mystery|2025",
      "wall e|2008",
      "wanted|2008",
      "war of the worlds|2005",
      "warrior|2011",
      "whiplash|2014",
      "wonder woman 1984|2020",
      "wonder woman|2017",
      "wonder|2017",
      "wonka|2023",
      "world war z|2013",
      "wrath of man|2021",
      "x men days of future past|2014",
      "xxx return of xander cage|2017",
      "xxx|2002",
      "your name|2016",
      "zack snyders justice league|2021",
      "zodiac|2007",
      "zombieland|2009",
      "zootopia 2|2025",
      "zootopia|2016",
    ];
    const LOCKED_ANSWER_MOVIE_KEY_SET = new Set(LOCKED_ANSWER_MOVIE_KEYS);
    const answerLibraryMovies = LOCKED_ANSWER_MOVIE_KEY_SET.size
      ? MOVIES.filter((movie) => LOCKED_ANSWER_MOVIE_KEY_SET.has(movieIdentityKey(movie)))
      : MOVIES;
    const DATA_AUDIT = validateDataset(answerLibraryMovies, OSCAR_NOMS_BY_TITLE);
    const thumbCache = loadThumbCache();
    const castPortraitCache = loadCastPortraitCache();
    const ratingCache = loadRatingCache();
    const languageCache = loadLanguageCache();
    const castPortraitLookupsInFlight = new Set();
    const typeaheadPosterLookupsInFlight = new Set();
    const ratingLookupsInFlight = new Set();
    const languageLookupsInFlight = new Set();

    const urlParams = new URLSearchParams(window.location.search);
    const explicitApiBase = (urlParams.get("api") || "").trim();
    const apiBaseOrigin = resolveApiBaseOrigin(explicitApiBase);
    installViewportHeightFix();
    const tmdbApiKey = loadTmdbApiKey(urlParams);
    const uiSettings = loadUiSettings();
    const customMovie = parseCustomMovieFromUrl();
    const customMode = Boolean(customMovie);
    const requestedMode = (urlParams.get("mode") || "daily").toLowerCase();
    const archiveDateParam = (urlParams.get("date") || "").trim();
    const archiveStatusParam = (urlParams.get("archiveStatus") || "").trim().toLowerCase();
    const archiveGuessesParam = Number(urlParams.get("archiveGuesses"));
    const archiveDefaultDate = buildPuzzleDate(new Date(), -1);
    const archiveSelectedDate = parsePuzzleDateKey(archiveDateParam) || archiveDefaultDate;
    const isArchiveModeRequested = requestedMode === "archive" || requestedMode === "rewind";
    const gameMode = customMode ? "custom" : (isArchiveModeRequested ? "archive" : "daily");
    const explicitPracticeSeed = (urlParams.get("seed") || "").trim();
    const rememberedPracticeSeed = requestedMode === "jam" && !explicitPracticeSeed
      ? (storageGet(PRACTICE_LAST_SEED_KEY) || "").trim()
      : "";
    const rememberedPracticeProgress = readPracticeProgress(rememberedPracticeSeed);
    const jamSeed = explicitPracticeSeed
      || (rememberedPracticeProgress.inProgress ? rememberedPracticeSeed : "")
      || String(Date.now());
    const today = new Date();
    const puzzleDate = gameMode === "archive"
      ? archiveSelectedDate
      : buildPuzzleDate(today, 0);
    const puzzleKey = customMode
      ? `custom-${hash(movieIdentityKey(customMovie) || normalize(customMovie.title))}`
      : gameMode === "jam"
        ? `jam-${jamSeed}`
        : formatPuzzleKey(puzzleDate);
    const dailyAnswerPool = DATA_AUDIT.answerPool;
    const jamAnswerPool = Array.isArray(DATA_AUDIT.jamAnswerPool) && DATA_AUDIT.jamAnswerPool.length
      ? DATA_AUDIT.jamAnswerPool
      : dailyAnswerPool;
    const answerPoolForMode = gameMode === "jam" ? jamAnswerPool : dailyAnswerPool;
    // Archive replays daily puzzle keys by date, so it should use the daily picker.
    const pickerMode = gameMode === "jam" ? "jam" : "daily";
    const answer = customMode ? customMovie : pickWeightedMovie(answerPoolForMode, puzzleKey, pickerMode);
    const storagePrefix = customMode
      ? "flickle-custom-state"
      : gameMode === "jam"
        ? "flickle-jam-state"
        : gameMode === "archive"
          ? "flickle-archive-state"
          : "flickle-state";
    const storageKey = `${storagePrefix}-${puzzleKey}`;

    const state = {
      started: false,
      guesses: [],
      finished: false,
      won: false,
      winCelebrating: false,
      message: "",
      scored: false,
      hintPoints: 0,
      hintsUsed: 0,
      revealedHintCast: [],
      localUpdatedAt: "",
      readOnlyArchiveCompletion: false,
      remoteArchiveGuessesUsed: 0,
      archiveHydratedFromServer: false,
      syntheticArchiveGuessFallback: false
    };
    let nextDailyCountdownTimer = null;
    let winRevealHoldUntil = 0;
    let winRevealReleaseTimer = null;
    let winRevealScrollTimer = null;
    let postGamePanelsAnimated = false;
    let resultRevealFlipped = false;
    let resultFactCursorByTitle = new Map();
    let activeResultFactTitle = "";
    let activeResultFactText = "";
    let movieFactBankCache = null;
    let lastPointFxGuessCount = 0;
    let pointFlyLayerEl = null;
    let pointFlyCollectPulseTimer = null;
    let hintReadyFlashTimer = null;
    let hintReadyWasBuyable = false;
    let hintReadyTrackerPrimed = false;
    let hintUnlockingInProgress = false;
    let hintUnlockTimer = null;
    let pendingHintRevealKey = "";
    let typeaheadOptions = [];
    let activeTypeaheadIndex = -1;
    let typeaheadHideTimer = null;
    let consentChoice = null;
    const archiveSyncInFlight = new Set();
    const authState = {
      checked: false,
      loading: false,
      user: null,
      apiReachable: true
    };

    if (urlParams.get("reset") === "1") {
      storageRemove(storageKey);
      storageRemove(THUMB_CACHE_KEY);
    }

    loadState();
    consentChoice = loadConsentChoice();
    applyConsentToRuntime();
    if (state.finished) {
      state.message = buildCompletionStatusMessage();
    }
    if (
      gameMode === "archive"
      && (archiveStatusParam === "won" || archiveStatusParam === "lost")
      && !state.finished
    ) {
      state.started = true;
      state.guesses = [];
      state.finished = true;
      state.won = archiveStatusParam === "won";
      state.scored = true;
      state.hintPoints = 0;
      state.hintsUsed = 0;
      state.revealedHintCast = [];
      state.readOnlyArchiveCompletion = true;
      state.remoteArchiveGuessesUsed = Math.max(0, Math.min(MAX_GUESSES, Number.isFinite(archiveGuessesParam) ? archiveGuessesParam : 0));
      state.message = buildCompletionStatusMessage();
    }
    if (state.guesses.length > 0 || state.finished) state.started = true;
    lastPointFxGuessCount = state.guesses.length;
    if (state.finished && !state.scored) {
      applyResultStats();
      state.scored = true;
      persistState();
    }
    // Bind core game controls as early as possible so non-critical setup
    // failures (like audio/media permissions) cannot freeze gameplay.
    bindCoreInteractions();
    persistPracticeSessionMemory();
    try {
      applyUiSettings();
    } catch (error) {
      console.error("Flickle UI settings init failed:", error);
    }
    try {
      primeUiSounds();
    } catch (error) {
      console.error("Flickle sound init failed:", error);
    }
    try {
      bindTopShell();
      renderConsentBanner();
    } catch (error) {
      console.error("Flickle shell init failed:", error);
    }
    const authInitPromise = refreshAuthState({ silent: true });
    authInitPromise.catch((error) => {
      console.warn("Flickle auth init failed:", error);
    });
    authInitPromise.then(async () => {
      try {
        await hydrateUserStatsFromServer();
      } catch (error) {
        console.warn("Flickle signed-in stats hydrate failed:", error);
      }
      hydrateSignedInPuzzleStateFromServer().catch((error) => {
        console.warn("Flickle signed-in progress hydrate failed:", error);
      });
    });
    window.addEventListener("resize", syncResultRevealHeight, { passive: true });
    // Defer first paint until the script fully initializes all constants/functions.
    // This avoids refresh-time clue card drops when restoring in-progress games.
    window.setTimeout(() => {
      renderAll();
    }, 0);

    function startOrResumeGame() {
      const wasStarted = state.started;
      state.started = true;
      if (state.finished) {
        state.message = buildCompletionStatusMessage();
      } else if (!state.message) {
        state.message = `${MAX_GUESSES - state.guesses.length} guesses left.`;
      }
      renderAll();
      persistState();
      els.guessInput.focus();
      if (!wasStarted) {
        trackAnalyticsEvent("start_game", {
          game_mode: gameMode,
          custom_mode: customMode ? "yes" : "no",
          puzzle_key: puzzleKey
        });
        playUiSound("start");
      }
    }

    function getFinishedGuessCount() {
      if (state.syntheticArchiveGuessFallback) {
        const remoteGuesses = Number(state.remoteArchiveGuessesUsed) || 0;
        return Math.max(0, Math.min(MAX_GUESSES, remoteGuesses));
      }
      const localGuesses = Number(state.guesses.length) || 0;
      if (localGuesses > 0) return localGuesses;
      const remoteGuesses = Number(state.remoteArchiveGuessesUsed) || 0;
      return Math.max(0, Math.min(MAX_GUESSES, remoteGuesses));
    }

    function applySyncedProgressRow(row) {
      if (!row || !["started", "won", "lost"].includes(String(row.status || ""))) return false;

      const restoredGuesses = Array.isArray(row.guesses)
        ? row.guesses.map(resolveMovieReference).filter(Boolean).slice(0, MAX_GUESSES)
        : [];
      const isCompleted = row.status === "won" || row.status === "lost";
      const needsSyntheticSolvedCard = gameMode === "archive" && isCompleted && restoredGuesses.length === 0;

      state.guesses = needsSyntheticSolvedCard ? [answer] : restoredGuesses;
      state.started = state.guesses.length > 0 || isCompleted;
      state.finished = isCompleted;
      state.won = row.status === "won";
      state.scored = isCompleted ? state.scored : false;
      state.readOnlyArchiveCompletion = gameMode === "archive" && isCompleted;
      state.syntheticArchiveGuessFallback = needsSyntheticSolvedCard;
      state.remoteArchiveGuessesUsed = Math.max(
        restoredGuesses.length,
        Math.max(0, Math.min(MAX_GUESSES, Number(row.guesses_used) || 0))
      );
      state.archiveHydratedFromServer = gameMode === "archive";
      state.message = isCompleted
        ? buildCompletionStatusMessage()
        : `${MAX_GUESSES - state.guesses.length} guesses left.`;

      if (state.finished && !state.scored) {
        applyResultStats();
        state.scored = true;
      }

      renderAll();
      persistState();
      return true;
    }

    async function hydrateSignedInPuzzleStateFromServer() {
      if (gameMode !== "archive" && gameMode !== "daily") return;

      const user = await refreshAuthState({ silent: true });
      if (!user || !user.id) return;

      const result = await fetchArchiveProgressRange(puzzleKey, puzzleKey);
      if (result.unauthorized) return;
      const row = Array.isArray(result.progress) ? result.progress[0] : null;
      if (!row || !["started", "won", "lost"].includes(String(row.status || ""))) return;
      const preferredRow = choosePreferredArchiveProgressRow(row, buildLocalProgressRow());
      if (!preferredRow || preferredRow.localOnly) return;
      applySyncedProgressRow(preferredRow);
    }

    function bindCoreInteractions() {
      if (els.playBtn.dataset.bound === "1") return;
      els.playBtn.dataset.bound = "1";
      window.__flicklePlayFallback = startOrResumeGame;
      window.__flickleGuessFallback = () => submitGuess(els.guessInput.value);
      els.playBtn.disabled = false;
      els.playBtn.removeAttribute("aria-busy");

      els.playBtn.addEventListener("click", startOrResumeGame);

      els.guessForm.addEventListener("submit", (event) => {
        if (event.defaultPrevented) return;
        event.preventDefault();
        submitGuess(els.guessInput.value);
      });
      if (els.randomStartBtn) {
        els.randomStartBtn.addEventListener("click", () => {
          if (!state.started || state.finished || state.guesses.length > 0) return;
          const randomMovie = pickRandomStartMovie();
          if (!randomMovie) {
            setStatus("No random starter available. Try typing a title.", "error");
            playUiSound("error");
            return;
          }
          const randomLabel = buildMovieChoiceLabel(randomMovie);
          submitGuess(randomLabel || randomMovie.title);
        });
      }

      els.guessInput.addEventListener("input", () => {
        renderGuessTypeahead(els.guessInput.value);
      });
      els.guessInput.addEventListener("focus", () => {
        renderGuessTypeahead(els.guessInput.value);
      });
      els.guessInput.addEventListener("blur", () => {
        if (typeaheadHideTimer) window.clearTimeout(typeaheadHideTimer);
        typeaheadHideTimer = window.setTimeout(() => {
          hideGuessTypeahead();
          typeaheadHideTimer = null;
        }, 140);
      });
      els.guessInput.addEventListener("keydown", (event) => {
        if (!els.guessTypeahead || els.guessTypeahead.classList.contains("hidden")) return;
        if (event.key === "ArrowDown") {
          event.preventDefault();
          stepTypeaheadSelection(1);
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          stepTypeaheadSelection(-1);
          return;
        }
        if (event.key === "Enter") {
          if (activeTypeaheadIndex >= 0 && typeaheadOptions[activeTypeaheadIndex]) {
            event.preventDefault();
            chooseTypeaheadOption(typeaheadOptions[activeTypeaheadIndex]);
          }
          return;
        }
        if (event.key === "Escape") {
          hideGuessTypeahead();
        }
      });
      if (els.guessTypeahead) {
        els.guessTypeahead.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        els.guessTypeahead.addEventListener("click", (event) => {
          const btn = event.target.closest(".guess-typeahead-item");
          if (!btn) return;
          const index = Number(btn.dataset.optionIndex);
          if (!Number.isFinite(index)) return;
          const option = typeaheadOptions[index];
          if (!option) return;
          chooseTypeaheadOption(option);
        });
      }

      let shareActionInFlight = false;

      async function handleShareClick(targetBtn) {
        if (shareActionInFlight) return;
        shareActionInFlight = true;
        trackAnalyticsEvent("share_clicked", {
          game_mode: gameMode,
          custom_mode: customMode ? "yes" : "no",
          puzzle_key: puzzleKey,
          context: targetBtn === els.finishShareBtn ? "result_screen" : "in_game",
          native_share: "no"
        });
        if (targetBtn) targetBtn.disabled = true;
        try {
          const result = await shareResult();
          if (result === "copied") {
            flashActionButton(targetBtn, "Copied!");
          } else if (result === "manual") {
            flashActionButton(targetBtn, "Copy Manually");
          }
        } finally {
          if (targetBtn) targetBtn.disabled = false;
          shareActionInFlight = false;
        }
      }

      if (els.shareBtn) {
        els.shareBtn.addEventListener("click", function () {
          handleShareClick(this);
        });
      }

      if (els.finishShareBtn) {
        els.finishShareBtn.addEventListener("click", function () {
          handleShareClick(this);
        });
      }

      function handleXShareClick(targetBtn) {
        const opened = openXShareComposer();
        trackAnalyticsEvent(opened ? "share_success" : "share_failed", {
          method: opened ? "x_intent" : "x_intent_blocked",
          game_mode: gameMode,
          custom_mode: customMode ? "yes" : "no",
          puzzle_key: puzzleKey
        });
        if (opened) {
          setStatus("Opened X composer.", "success");
          flashActionButton(targetBtn, "Opened X");
          playUiSound("share");
        } else {
          setStatus("Could not open X. Check pop-up settings.", "complete");
        }
      }

      if (els.tweetBtn) {
        els.tweetBtn.addEventListener("click", function () {
          trackAnalyticsEvent("share_clicked", {
            game_mode: gameMode,
            custom_mode: customMode ? "yes" : "no",
            puzzle_key: puzzleKey,
            context: "in_game",
            native_share: "no",
            channel: "x"
          });
          handleXShareClick(this);
        });
      }
      if (els.finishXBtn) {
        els.finishXBtn.addEventListener("click", function () {
          trackAnalyticsEvent("share_clicked", {
            game_mode: gameMode,
            custom_mode: customMode ? "yes" : "no",
            puzzle_key: puzzleKey,
            context: "result_screen",
            native_share: "no",
            channel: "x"
          });
          handleXShareClick(this);
        });
      }
      if (els.finishPlayAgainBtn) {
        els.finishPlayAgainBtn.addEventListener("click", () => {
          const nextSeed = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
          storageSet(PRACTICE_LAST_SEED_KEY, nextSeed);
          storageSet(PRACTICE_IN_PROGRESS_KEY, "1");
          location.search = `?mode=jam&seed=${encodeURIComponent(nextSeed)}`;
        });
      }

      if (els.hintBuyBtn) {
        els.hintBuyBtn.addEventListener("click", () => {
          buyHint();
        });
      }

      const handlePreviewCopy = () => {
        trackAnalyticsEvent("share_clicked", {
          game_mode: gameMode,
          custom_mode: customMode ? "yes" : "no",
          puzzle_key: puzzleKey,
          context: "preview_box",
          native_share: "no"
        });
        handleShareClick(els.finishShareBtn);
      };

      if (els.sharePreviewText) {
        els.sharePreviewText.addEventListener("click", handlePreviewCopy);
        els.sharePreviewText.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handlePreviewCopy();
          }
        });
      }

      if (els.resultReveal) {
        const toggleRevealFact = () => {
          if (!canFlipResultReveal()) return;
          if (!resultRevealFlipped) {
            if (!activeResultFactText || activeResultFactTitle !== answer.title) {
              setNextActiveFlickleFact(answer);
            }
            if (els.resultFactTitle) els.resultFactTitle.textContent = answer.title;
            if (els.resultFactBody) els.resultFactBody.textContent = activeResultFactText;
            resultRevealFlipped = true;
          } else {
            setNextActiveFlickleFact(answer, els.resultFactBody ? els.resultFactBody.textContent : "");
            if (els.resultFactTitle) els.resultFactTitle.textContent = answer.title;
            if (els.resultFactBody) els.resultFactBody.textContent = activeResultFactText;
            resultRevealFlipped = false;
          }
          applyResultRevealFlipState();
          playUiSound("toggle-on");
        };
        els.resultReveal.addEventListener("click", toggleRevealFact);
        els.resultReveal.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleRevealFact();
          }
        });
      }

      if (els.cards) {
        els.cards.addEventListener("click", (event) => {
          const card = event.target.closest(".guess-card");
          if (!card) return;
          if (!state.finished) return;
          if (customMode) return;
          if (gameMode !== "daily") return;
          if (isWinRevealHoldActive()) return;
          playCardEasterFlip(card);
        });
      }

      if (els.statusSuggestions) {
        els.statusSuggestions.addEventListener("click", (event) => {
          const chip = event.target.closest(".suggestion-chip");
          if (!chip) return;
          const title = chip.dataset.title || "";
          if (!title) return;
          els.guessInput.value = title;
          els.guessInput.focus();
          hideStatusSuggestions();
          setStatus(`Try "${title}"`, "complete");
        });
      }
    }

    if (els.rulesBtn) {
      els.rulesBtn.addEventListener("click", showHelpModal);
    }


    function submitGuess(rawInput) {
      if (!state.started || state.finished) return;
      hideGuessTypeahead();

      const typed = rawInput.trim();
      if (!typed) {
        setStatus("Type a movie title first.", "error");
        playUiSound("error");
        return;
      }

      const { year: typedYear } = splitInputTitleAndYear(typed);
      const guessMovie = findMovieByInput(typed);
      if (!guessMovie) {
        const disambiguation = getTitleDisambiguationChoices(typed, 6);
        if (disambiguation.length) {
          if (typedYear !== null) {
            setStatus("That year doesn't match this title. Try one of these versions:", "error");
          } else {
            setStatus("Multiple versions found. Pick the title with a year:", "error");
          }
          showStatusSuggestions(disambiguation);
          trackAnalyticsEvent("guess_disambiguation_needed", {
            game_mode: gameMode,
            custom_mode: customMode ? "yes" : "no",
            puzzle_key: puzzleKey,
            input: typed.slice(0, 80),
            suggestion_count: disambiguation.length,
            input_year: typedYear
          });
          playUiSound("error");
          return;
        }

        const closestTitles = getClosestMovieTitles(typed, 5);
        const poolLabel = getCurrentPoolLabel();
        if (closestTitles.length) {
          setStatus(`Not in ${poolLabel}. Try one of these:`, "error");
          showStatusSuggestions(closestTitles);
        } else {
          setStatus(`Not in ${poolLabel}. Try a more common title.`, "error");
          hideStatusSuggestions();
        }
        trackAnalyticsEvent("guess_not_found", {
          game_mode: gameMode,
          custom_mode: customMode ? "yes" : "no",
          puzzle_key: puzzleKey,
          input: typed.slice(0, 80),
          suggestion_count: closestTitles.length
        });
        playUiSound("error");
        return;
      }

      if (state.guesses.some((g) => moviesMatchByIdentity(g, guessMovie))) {
        hideStatusSuggestions();
        setStatus("You already guessed that title.", "error");
        playUiSound("error");
        return;
      }

      state.guesses.push(guessMovie);
      hideStatusSuggestions();
      els.guessInput.value = "";
      const pointGain = scoreHintPointsForGuess(guessMovie, answer);
      if (pointGain > 0) {
        state.hintPoints += pointGain;
      }
      trackAnalyticsEvent("guess_submitted", {
        game_mode: gameMode,
        custom_mode: customMode ? "yes" : "no",
        puzzle_key: puzzleKey,
        guess_title: guessMovie.title,
        guess_number: state.guesses.length,
        hint_points_gained: pointGain,
        hint_points_total: state.hintPoints
      });

      if (moviesMatchByIdentity(guessMovie, answer)) {
        state.finished = true;
        state.won = true;
        state.winCelebrating = true;
        state.message = `Correct. You solved Flickle in ${state.guesses.length}/${MAX_GUESSES}.`;
        postGamePanelsAnimated = false;
        winRevealHoldUntil = Date.now() + WIN_REVEAL_HOLD_MS;
        if (winRevealReleaseTimer) {
          window.clearTimeout(winRevealReleaseTimer);
          winRevealReleaseTimer = null;
        }
        if (winRevealScrollTimer) {
          window.clearTimeout(winRevealScrollTimer);
          winRevealScrollTimer = null;
        }
        winRevealReleaseTimer = window.setTimeout(() => {
          state.winCelebrating = false;
          winRevealHoldUntil = 0;
          winRevealReleaseTimer = null;
          renderAll();
          winRevealScrollTimer = window.setTimeout(() => {
            winRevealScrollTimer = null;
            smoothScrollToPostGame();
          }, WIN_REVEAL_SCROLL_DELAY_MS);
        }, WIN_REVEAL_HOLD_MS);
        trackAnalyticsEvent("win_game", {
          game_mode: gameMode,
          custom_mode: customMode ? "yes" : "no",
          puzzle_key: puzzleKey,
          guesses_used: state.guesses.length
        });
      } else if (state.guesses.length >= MAX_GUESSES) {
        state.finished = true;
        state.won = false;
        state.message = gameMode === "jam"
          ? `Out of guesses. This practice movie was ${answer.title}.`
          : gameMode === "archive"
            ? `Out of guesses. This archive movie was ${answer.title}.`
            : `Out of guesses. Today's movie was ${answer.title}.`;
        trackAnalyticsEvent("lose_game", {
          game_mode: gameMode,
          custom_mode: customMode ? "yes" : "no",
          puzzle_key: puzzleKey,
          guesses_used: state.guesses.length
        });
      } else {
        state.message = `${MAX_GUESSES - state.guesses.length} guesses left.`;
      }

      if (state.finished && !state.scored) {
        applyResultStats();
        state.scored = true;
      }
      syncArchiveProgressIfNeeded("submit-guess").catch((error) => {
        console.warn("Flickle archive sync after guess failed:", error);
      });

      renderAll();
      persistState();
      if (state.finished || state.winCelebrating) {
        playUiSound(state.won ? "win" : "lose");
      } else {
        playUiSound("guess");
      }
    }

    function renderAll() {
      sanitizeStateGuesses();
      const introLine = customMode
        ? `${MAX_GUESSES} guesses, friend challenge. Can you solve it?`
        : gameMode === "jam"
          ? `Practice mode: endless movie practice, 10 guesses each.`
          : gameMode === "archive"
            ? `Archive mode: replay a past daily puzzle, ${MAX_GUESSES} guesses.`
            : `Can you find the movie in ${MAX_GUESSES} guesses?`;
      const introModeTag = customMode
        ? "friend challenge"
        : gameMode === "jam"
          ? "practice mode"
          : gameMode === "archive"
            ? "archive mode"
            : "daily puzzle";
      els.introSubtitle.textContent = introLine;
      els.introModeLink.textContent = introModeTag;
      els.helper.textContent = customMode
        ? "Guess the movie your friend picked."
        : gameMode === "archive"
          ? "Guess the archive movie."
          : gameMode === "jam"
            ? "Guess the practice movie."
            : "Guess the movie of the day.";
      els.playBtn.textContent = "PLAY";

      els.intro.classList.toggle("hidden", state.started);
      els.game.classList.toggle("on", state.started);

      if (!state.started) {
        stopNextDailyCountdown();
        postGamePanelsAnimated = false;
        hideGuessTypeahead();
        return;
      }

      const used = state.finished ? getFinishedGuessCount() : state.guesses.length;
      const currentGuess = Math.min(MAX_GUESSES, used + 1);
      const guessText = state.finished
        ? `Guesses ${used} of ${MAX_GUESSES}`
        : gameMode === "jam"
          ? `Guess ${used + 1} (Practice)`
          : `Guess ${currentGuess} of ${MAX_GUESSES}`;
      els.guessCount.textContent = guessText;

      const holdWinReveal = isWinRevealHoldActive();
      if (!state.finished || holdWinReveal) {
        postGamePanelsAnimated = false;
      }
      renderRevealMovie(holdWinReveal);
      renderCards();
      if (state.finished) {
        setStatus(state.message || buildCompletionStatusMessage(), state.won ? "success" : "complete");
      } else {
        setStatus(state.message || `${MAX_GUESSES - used} guesses left.`);
      }
      renderHintPanel();

      const showFinishShare = state.finished && !customMode && !holdWinReveal
        && (!state.readOnlyArchiveCompletion || state.guesses.length > 0)
        && !state.syntheticArchiveGuessFallback;
      els.finishShare.classList.toggle("hidden", !showFinishShare);
      if (!showFinishShare) {
        els.finishShare.classList.remove("postgame-enter");
      }
      if (showFinishShare) {
        if (els.finishPlayAgainBtn) {
          const showPracticePlayAgain = gameMode === "jam";
          els.finishPlayAgainBtn.classList.toggle("hidden", !showPracticePlayAgain);
        }
        els.finishShareBtn.textContent = "Share Result";
        if (els.finishXBtn) els.finishXBtn.textContent = "Post to X";
        renderSharePreview();
      } else if (els.finishPlayAgainBtn) {
        els.finishPlayAgainBtn.classList.add("hidden");
      }

      const showNextDailyCountdown = !customMode && gameMode === "daily" && state.finished && !holdWinReveal;
      els.nextDaily.classList.toggle("hidden", !showNextDailyCountdown);
      if (!showNextDailyCountdown) {
        els.nextDaily.classList.remove("postgame-enter");
      }
      if (showNextDailyCountdown) {
        startNextDailyCountdown();
      } else {
        stopNextDailyCountdown();
      }

      if (state.finished && !holdWinReveal && !postGamePanelsAnimated) {
        animatePostGamePanels();
        postGamePanelsAnimated = true;
      }

      const inputLocked = state.finished || holdWinReveal;
      els.guessInput.disabled = inputLocked;
      if (inputLocked) {
        hideGuessTypeahead();
      }
      if (state.finished) {
        if (customMode) {
          els.guessInput.placeholder = state.won ? "Challenge solved — nice work." : "Challenge complete.";
        } else if (gameMode === "archive") {
          els.guessInput.placeholder = state.won ? "Archive solved — nice work." : "Archive complete.";
        } else if (gameMode === "jam") {
          els.guessInput.placeholder = state.won ? "Practice solved — queueing next..." : "Practice complete.";
        } else {
          els.guessInput.placeholder = state.won ? "Daily solved — nice work." : "Daily complete.";
        }
      } else {
        els.guessInput.placeholder = "Type a movie title...";
      }
      const showRandomStart = shouldShowRandomStartButton();
      els.guessForm.classList.toggle("has-random-start", showRandomStart);
      if (els.randomStartBtn) {
        els.randomStartBtn.classList.toggle("hidden", !showRandomStart);
        els.randomStartBtn.disabled = inputLocked;
      }
      const submitBtn = els.guessForm.querySelector("button[type='submit']");
      submitBtn.disabled = inputLocked;
      els.shareBtn.disabled = false;
    }

    function startNextDailyCountdown() {
      if (!els.nextDailyTime) return;
      updateNextDailyCountdown();
      if (nextDailyCountdownTimer) return;
      nextDailyCountdownTimer = window.setInterval(updateNextDailyCountdown, 1000);
    }

    function stopNextDailyCountdown() {
      if (!nextDailyCountdownTimer) return;
      window.clearInterval(nextDailyCountdownTimer);
      nextDailyCountdownTimer = null;
    }

    function updateNextDailyCountdown() {
      if (!els.nextDailyTime) return;
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      const remainingMs = Math.max(0, next.getTime() - now.getTime());
      const totalSeconds = Math.floor(remainingMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      els.nextDailyTime.textContent = `Next daily in ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    function isWinRevealHoldActive() {
      return state.finished && state.won && state.winCelebrating && Date.now() < winRevealHoldUntil;
    }

    function smoothScrollToPostGame() {
      const target = !els.resultEffort.classList.contains("hidden")
        ? els.resultEffort
        : els.resultReveal;
      if (!target || target.classList.contains("hidden")) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }

    function syncResultRevealHeight() {
      if (!els.resultReveal || !els.resultFlip) return;
      const front = els.resultReveal.querySelector(".result-front");
      const back = els.resultReveal.querySelector(".result-back");
      if (!front || !back) return;
      const targetHeight = Math.max(front.scrollHeight, back.scrollHeight);
      if (targetHeight > 0) {
        els.resultFlip.style.minHeight = `${targetHeight + 2}px`;
      }
    }

    function canFlipResultReveal() {
      if (!els.resultReveal) return false;
      if (!state.finished) return false;
      if (isWinRevealHoldActive()) return false;
      if (customMode) return false;
      if (gameMode !== "daily" && gameMode !== "archive") return false;
      return !els.resultReveal.classList.contains("hidden");
    }

    function applyResultRevealFlipState() {
      const enabled = canFlipResultReveal();
      const flipped = enabled && resultRevealFlipped;
      els.resultReveal.classList.toggle("fact-enabled", enabled);
      els.resultReveal.classList.toggle("flipped", flipped);
      if (enabled) {
        els.resultReveal.setAttribute("role", "button");
        els.resultReveal.setAttribute("tabindex", "0");
        els.resultReveal.setAttribute("aria-pressed", flipped ? "true" : "false");
        els.resultReveal.setAttribute("aria-label", flipped ? "Show movie result details" : "Show Flickle Fact");
      } else {
        els.resultReveal.removeAttribute("role");
        els.resultReveal.removeAttribute("tabindex");
        els.resultReveal.removeAttribute("aria-pressed");
        els.resultReveal.removeAttribute("aria-label");
      }
    }

    function playCardEasterFlip(card) {
      if (!card) return;
      const tiles = Array.from(card.querySelectorAll(".tile"));
      const tilesToAnimate = tiles.filter((tile) => tile.classList.contains("hit") || tile.classList.contains("near"));
      if (!tilesToAnimate.length) return;

      tilesToAnimate.forEach((tile) => {
        tile.classList.remove("tile-enter");
        tile.style.removeProperty("--tile-spin-ms");
        tile.style.animationDelay = "0ms";
      });
      // Force reflow so repeated taps retrigger the same stagger animation.
      void card.offsetWidth;
      tilesToAnimate.forEach((tile, tileIndex) => {
        tile.classList.add("tile-enter");
        tile.style.animationDelay = `${tileIndex * 24}ms`;
      });
      playUiSound("toggle-on");
    }

    function normalizeFactList(value) {
      if (Array.isArray(value)) {
        return value
          .map((line) => String(line || "").trim())
          .filter(Boolean);
      }
      if (typeof value === "string" && value.trim()) {
        return [value.trim()];
      }
      return [];
    }

    function getCuratedFactsForTitle(title) {
      const rawTitle = String(title || "").trim();
      if (!rawTitle) return [];

      const directCurated = normalizeFactList(CURATED_FACTS_BY_TITLE[rawTitle]);
      if (directCurated.length > 0) return directCurated;

      const directLegacy = normalizeFactList(FLICKLE_FACTS_BY_TITLE[rawTitle]);
      if (directLegacy.length > 0) return directLegacy;

      const normalizedTitle = normalize(rawTitle);
      if (!normalizedTitle) return [];

      if (!curatedFactsByNormalizedTitle) {
        curatedFactsByNormalizedTitle = new Map();
        const appendFacts = (source) => {
          if (!source || typeof source !== "object") return;
          for (const [sourceTitle, sourceFacts] of Object.entries(source)) {
            const key = normalize(sourceTitle);
            if (!key || curatedFactsByNormalizedTitle.has(key)) continue;
            const normalizedFacts = normalizeFactList(sourceFacts);
            if (normalizedFacts.length === 0) continue;
            curatedFactsByNormalizedTitle.set(key, normalizedFacts);
          }
        };
        appendFacts(CURATED_FACTS_BY_TITLE);
        appendFacts(FLICKLE_FACTS_BY_TITLE);
      }

      return curatedFactsByNormalizedTitle.get(normalizedTitle) || [];
    }

    function buildFlickleFact(movie) {
      const curatedFacts = getCuratedFactsForTitle(movie && movie.title);
      if (curatedFacts.length > 0) {
        return curatedFacts;
      }

      const factBank = getMovieFactBank();
      const movieFacts = factBank[movie.title];
      if (Array.isArray(movieFacts) && movieFacts.length > 0) {
        return movieFacts;
      }

      const snippets = [];
      if (movie.director) snippets.push(`Directed by ${movie.director}.`);
      if (Array.isArray(movie.cast) && movie.cast.length) {
        snippets.push(`Top-billed cast includes ${movie.cast.slice(0, 3).join(", ")}.`);
      }
      const rating = getMovieRating(movie);
      if (rating && rating !== "N/A") snippets.push(`US theatrical rating: ${rating}.`);
      if (Number.isFinite(movie.runtime) && movie.runtime > 0) snippets.push(`Runtime lands at ${movie.runtime} minutes.`);
      if (movie.studio) snippets.push(`Released through ${movie.studio}.`);
      if (movie.language) snippets.push(`Primary language is ${movie.language}.`);

      if (snippets.length === 0) {
        return [`${movie.title} released in ${movie.year}.`];
      }
      const generated = [];
      generated.push(snippets.slice(0, 2).join(" "));
      if (snippets.length >= 3) {
        generated.push([snippets[0], snippets[2]].join(" "));
      }
      if (snippets.length >= 4) {
        generated.push([snippets[1], snippets[3]].join(" "));
      }
      return generated;
    }

    function getMovieFactBank() {
      if (movieFactBankCache) return movieFactBankCache;
      movieFactBankCache = buildMovieFactBank(MOVIES, MAINSTREAM_FACT_RANK_LIMIT);
      return movieFactBankCache;
    }

    function buildMovieFactBank(movies, mainstreamLimit = 300) {
      if (!Array.isArray(movies) || movies.length === 0) return Object.create(null);
      const ranked = [...movies]
        .sort((a, b) => getPopularityRankScore(b) - getPopularityRankScore(a));
      const analytics = buildFactAnalytics(ranked);
      const bank = Object.create(null);

      for (let i = 0; i < ranked.length; i += 1) {
        const movie = ranked[i];
        const title = String(movie?.title || "").trim();
        if (!title) continue;
        const rank = i + 1;
        const isMainstreamRanked = rank <= Math.max(0, mainstreamLimit);
        bank[title] = generateMovieFacts(movie, rank, ranked.length, isMainstreamRanked, analytics);
      }
      return bank;
    }

    function getPopularityRankScore(movie) {
      if (!movie || typeof movie !== "object") return 0;
      const voteCount = Number.isFinite(movie.voteCount) ? movie.voteCount : 0;
      const voteAverage = Number.isFinite(movie.voteAverage) ? movie.voteAverage : 0;
      const popularity = Number.isFinite(movie.popularity) ? movie.popularity : 0;
      const boxOffice = Number.isFinite(movie.boxOffice) ? Math.max(0, movie.boxOffice) : 0;
      const castScore = Number.isFinite(movie.castScore) ? movie.castScore : getCastFamiliarityScore(movie);
      const voteSignal = Math.log10(Math.max(1, voteCount)) * 2600;
      const qualitySignal = Math.max(0, voteAverage - 5.5) * 260;
      const popularitySignal = popularity * 140;
      const boxOfficeSignal = Math.log10(Math.max(1, boxOffice)) * 280;
      const castSignal = castScore * 180;
      const lowSamplePenalty = voteCount < 2000 ? -700 : 0;
      return voteSignal + qualitySignal + popularitySignal + boxOfficeSignal + castSignal + lowSamplePenalty;
    }

    function buildFactAnalytics(movies) {
      const runtimes = [];
      const years = [];
      const voteCounts = [];
      const popularityScores = [];
      const boxOffices = [];

      const genreComboCounts = Object.create(null);
      const studioCounts = Object.create(null);
      const countryLanguageCounts = Object.create(null);
      const titleWordCounts = Object.create(null);

      for (const movie of movies) {
        if (!movie || typeof movie !== "object") continue;
        if (Number.isFinite(movie.runtime) && movie.runtime > 0) runtimes.push(movie.runtime);
        if (Number.isFinite(movie.year)) years.push(movie.year);
        if (Number.isFinite(movie.voteCount) && movie.voteCount > 0) voteCounts.push(movie.voteCount);
        const popScore = getPopularityRankScore(movie);
        if (Number.isFinite(popScore) && popScore > 0) popularityScores.push(popScore);
        if (Number.isFinite(movie.boxOffice) && movie.boxOffice > 0) boxOffices.push(movie.boxOffice);

        const comboKey = getGenreComboKey(movie.genres);
        if (comboKey) {
          genreComboCounts[comboKey] = (genreComboCounts[comboKey] || 0) + 1;
        }

        const studioKey = String(movie.studio || "").trim().toLowerCase();
        if (studioKey) {
          studioCounts[studioKey] = (studioCounts[studioKey] || 0) + 1;
        }

        const country = String(movie.country || "").trim();
        const language = String(getMovieLanguage(movie) || movie.language || "").trim();
        if (country && language) {
          const pairKey = `${country.toLowerCase()}||${language.toLowerCase()}`;
          countryLanguageCounts[pairKey] = (countryLanguageCounts[pairKey] || 0) + 1;
        }

        const titleWords = getTitleWordCount(movie.title);
        if (titleWords > 0) {
          titleWordCounts[titleWords] = (titleWordCounts[titleWords] || 0) + 1;
        }
      }

      runtimes.sort((a, b) => a - b);
      years.sort((a, b) => a - b);
      voteCounts.sort((a, b) => a - b);
      popularityScores.sort((a, b) => a - b);
      boxOffices.sort((a, b) => a - b);

      return {
        runtimes,
        years,
        voteCounts,
        popularityScores,
        boxOffices,
        genreComboCounts,
        studioCounts,
        countryLanguageCounts,
        titleWordCounts
      };
    }

    function getGenreComboKey(genres) {
      if (!Array.isArray(genres) || genres.length === 0) return "";
      const cleaned = genres
        .map((genre) => String(genre || "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      if (!cleaned.length) return "";
      return cleaned.join(" + ");
    }

    function getTitleWordCount(title) {
      const normalized = String(title || "")
        .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!normalized) return 0;
      return normalized.split(" ").filter(Boolean).length;
    }

    function getPercentile(sortedAsc, value) {
      if (!Array.isArray(sortedAsc) || !sortedAsc.length || !Number.isFinite(value)) return null;
      let lo = 0;
      let hi = sortedAsc.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (sortedAsc[mid] < value) lo = mid + 1;
        else hi = mid;
      }
      const lowerBound = lo;
      lo = 0;
      hi = sortedAsc.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (sortedAsc[mid] <= value) lo = mid + 1;
        else hi = mid;
      }
      const upperBound = lo;
      const midRank = (lowerBound + upperBound - 1) / 2;
      const denom = Math.max(1, sortedAsc.length - 1);
      return Math.min(1, Math.max(0, midRank / denom));
    }

    function toTopPercentLabel(percentile) {
      if (!Number.isFinite(percentile)) return null;
      return Math.max(1, Math.round((1 - percentile) * 100));
    }

    function toBottomPercentLabel(percentile) {
      if (!Number.isFinite(percentile)) return null;
      return Math.max(1, Math.round(percentile * 100));
    }

    function generateMovieFacts(movie, rank, totalRanked, isMainstreamRanked, analytics) {
      const genres = Array.isArray(movie.genres) ? movie.genres.filter(Boolean) : [];
      const genreCombo = getGenreComboKey(genres);
      const studio = String(movie.studio || "").trim();
      const country = String(movie.country || "").trim();
      const language = String(getMovieLanguage(movie) || movie.language || "").trim();
      const titleWords = getTitleWordCount(movie.title);
      const runtime = Number.isFinite(movie.runtime) ? movie.runtime : null;
      const year = Number.isFinite(movie.year) ? movie.year : null;
      const voteCount = Number.isFinite(movie.voteCount) ? movie.voteCount : null;
      const boxOffice = Number.isFinite(movie.boxOffice) ? movie.boxOffice : null;
      const rating = String(getMovieRating(movie) || "").trim();

      const facts = [];
      const seen = new Set();
      const pushFact = (line) => {
        const cleaned = String(line || "").replace(/\s+/g, " ").trim();
        if (!cleaned || seen.has(cleaned)) return;
        seen.add(cleaned);
        facts.push(cleaned);
      };

      if (analytics && runtime && analytics.runtimes.length >= 40) {
        const runtimePct = getPercentile(analytics.runtimes, runtime);
        const topPct = toTopPercentLabel(runtimePct);
        const bottomPct = toBottomPercentLabel(runtimePct);
        if (topPct !== null && topPct <= 8) {
          pushFact(`Runtime outlier: only about ${topPct}% of Flickle movies run longer than ${runtime} minutes.`);
        } else if (bottomPct !== null && bottomPct <= 8) {
          pushFact(`Runtime sprint: only about ${bottomPct}% of Flickle movies are shorter than ${runtime} minutes.`);
        }
      }

      if (analytics && year && analytics.years.length >= 40) {
        const yearPct = getPercentile(analytics.years, year);
        const newestPct = toTopPercentLabel(yearPct);
        const oldestPct = toBottomPercentLabel(yearPct);
        if (newestPct !== null && newestPct <= 10) {
          pushFact(`Time capsule alert: this sits in the newest ${newestPct}% of the Flickle library.`);
        } else if (oldestPct !== null && oldestPct <= 10) {
          pushFact(`Deep cut era: this lands in the oldest ${oldestPct}% of the Flickle library.`);
        }
      }

      if (analytics && voteCount && analytics.voteCounts.length >= 40) {
        const votePct = getPercentile(analytics.voteCounts, voteCount);
        const topPct = toTopPercentLabel(votePct);
        if (topPct !== null && topPct <= 12) {
          pushFact(`Crowd-tested pick: this is in the top ${topPct}% of Flickle titles by rating count (${voteCount.toLocaleString()}).`);
        }
      }

      if (analytics && Number.isFinite(boxOffice) && boxOffice > 0 && analytics.boxOffices.length >= 40) {
        const boxPct = getPercentile(analytics.boxOffices, boxOffice);
        const topPct = toTopPercentLabel(boxPct);
        if (topPct !== null && topPct <= 12) {
          pushFact(`Box-office heavyweight: this is in Flickle's top ${topPct}% for global gross.`);
        }
      }

      if (analytics && genreCombo) {
        const comboCount = analytics.genreComboCounts[genreCombo] || 0;
        if (comboCount > 0 && comboCount <= 5) {
          const total = Math.max(1, totalRanked);
          const pct = Math.max(1, Math.round((comboCount / total) * 100));
          pushFact(`Rare genre blend: only ${comboCount} movie${comboCount === 1 ? "" : "s"} in Flickle share "${genreCombo}" (${pct}% of the pool).`);
        }
      }

      if (analytics && studio) {
        const studioCount = analytics.studioCounts[studio.toLowerCase()] || 0;
        if (studioCount > 0 && studioCount <= 4) {
          pushFact(`Studio rarity: ${studio} appears on only ${studioCount} title${studioCount === 1 ? "" : "s"} in the current Flickle set.`);
        }
      }

      if (analytics && country && language) {
        const pairKey = `${country.toLowerCase()}||${language.toLowerCase()}`;
        const pairCount = analytics.countryLanguageCounts[pairKey] || 0;
        if (pairCount > 0 && pairCount <= 5) {
          pushFact(`Passport combo: only ${pairCount} Flickle title${pairCount === 1 ? "" : "s"} share the ${country} + ${language} profile.`);
        }
      }

      if (analytics && titleWords > 0) {
        const wordCountFrequency = analytics.titleWordCounts[titleWords] || 0;
        if (wordCountFrequency > 0 && wordCountFrequency <= 4) {
          pushFact(`Title quirk: exactly ${titleWords} word${titleWords === 1 ? "" : "s"} appears in only ${wordCountFrequency} movie title${wordCountFrequency === 1 ? "" : "s"} here.`);
        }
      }

      const cast = Array.isArray(movie.cast) ? movie.cast.filter(Boolean) : [];
      if (cast.length >= 2) {
        pushFact(`Top-billed pair: ${cast[0]} and ${cast[1]}.`);
      } else if (cast.length === 1) {
        pushFact(`Top-billed lead: ${cast[0]}.`);
      }

      if (runtime && year) {
        pushFact(`Released in ${year}, runtime ${runtime} minutes.`);
      } else if (year) {
        pushFact(`Released in ${year}.`);
      } else if (runtime) {
        pushFact(`Runtime: ${runtime} minutes.`);
      }

      if (rating && rating !== "N/A") {
        pushFact(`US rating: ${rating}.`);
      }

      if (isMainstreamRanked) {
        pushFact(`Daily-pool visibility rank: #${rank} of ${Math.max(1, Math.min(totalRanked, MAINSTREAM_FACT_RANK_LIMIT))}.`);
      } else {
        pushFact(`Library visibility rank: #${rank} of ${Math.max(1, totalRanked)}.`);
      }

      return facts.slice(0, 8);
    }

    function getFlickleFactList(movie) {
      if (!movie || typeof movie !== "object") return [];
      const list = buildFlickleFact(movie);
      if (!Array.isArray(list)) return [];
      const unique = [];
      const seen = new Set();
      for (const line of list) {
        const text = String(line || "").trim();
        if (!text) continue;
        if (seen.has(text)) continue;
        seen.add(text);
        unique.push(text);
      }
      return unique;
    }

    function setNextActiveFlickleFact(movie, currentFactText = "") {
      const title = movie && movie.title ? movie.title : "";
      const facts = getFlickleFactList(movie);
      if (!title || facts.length === 0) {
        activeResultFactTitle = title;
        activeResultFactText = title ? `${title} released in ${movie.year}.` : "";
        return;
      }
      const normalizedCurrent = String(currentFactText || "").trim();
      let index = 0;
      if (normalizedCurrent) {
        const currentIndex = facts.findIndex((line) => line === normalizedCurrent);
        if (currentIndex >= 0) {
          index = (currentIndex + 1) % facts.length;
        } else {
          const cursor = resultFactCursorByTitle.get(title) || 0;
          index = cursor % facts.length;
        }
      } else {
        const cursor = resultFactCursorByTitle.get(title) || 0;
        index = cursor % facts.length;
      }
      activeResultFactTitle = title;
      activeResultFactText = facts[index];
      resultFactCursorByTitle.set(title, index + 1);
    }

    function animatePostGamePanels() {
      const panels = [
        { el: els.resultEffort, delay: 0 },
        { el: els.resultReveal, delay: 35 },
        { el: els.nextDaily, delay: 110 },
        { el: els.finishShare, delay: 180 }
      ];
      for (const panel of panels) {
        const element = panel.el;
        if (!element || element.classList.contains("hidden")) continue;
        element.classList.remove("postgame-enter");
        element.style.setProperty("--pg-delay", `${panel.delay}ms`);
        // Restart animation for newly shown completion panels only.
        void element.offsetWidth;
        element.classList.add("postgame-enter");
      }
    }

    function renderRevealMovie(holdWinReveal = false) {
      if (!state.finished || holdWinReveal) {
        resultRevealFlipped = false;
        activeResultFactTitle = "";
        activeResultFactText = "";
        els.resultReveal.classList.add("hidden");
        els.resultReveal.classList.remove("flipped", "fact-enabled");
        els.resultReveal.classList.remove("has-image");
        els.resultReveal.classList.remove("postgame-enter");
        els.resultEffort.classList.add("hidden");
        els.resultEffort.classList.remove("postgame-enter");
        els.resultPoster.removeAttribute("src");
        if (els.resultFlip) {
          els.resultFlip.style.removeProperty("min-height");
        }
        return;
      }

      els.resultReveal.classList.remove("hidden");
      if (state.won) {
        els.resultLabel.textContent = customMode
          ? "Challenge Solved"
          : gameMode === "archive"
            ? "Archive Solved"
            : gameMode === "jam"
              ? "Practice Solved"
              : "Daily Solved";
      } else {
        els.resultLabel.textContent = customMode
          ? "Challenge Complete"
          : gameMode === "archive"
            ? "Archive Complete"
            : gameMode === "jam"
              ? "Practice Complete"
              : "Daily Complete";
      }
      els.resultTitle.textContent = answer.title;
      els.resultMeta.textContent = `${answer.year} • ${answer.genres.join(", ")}`;
      if (activeResultFactTitle !== answer.title || !activeResultFactText) {
        setNextActiveFlickleFact(answer);
      }
      if (els.resultFactTitle) els.resultFactTitle.textContent = answer.title;
      if (els.resultFactBody) els.resultFactBody.textContent = activeResultFactText;
      if (els.resultTapHint) {
        els.resultTapHint.textContent = resultRevealFlipped
          ? "Tap card to return to result"
          : "Tap card for a Flickle Fact";
      }
      if (state.won) {
        els.resultEffort.classList.add("hidden");
      } else {
        els.resultEffortTitle.textContent = "Tough Luck...";
        const label = gameMode === "jam"
          ? "This practice movie was"
          : gameMode === "archive"
            ? "This archive movie was"
            : "Today's answer was";
        els.resultEffortBody.textContent = `You used all ${MAX_GUESSES} guesses. ${label} ${answer.title}.`;
        els.resultEffort.classList.remove("hidden");
      }
      applyResultRevealFlipState();
      syncResultRevealHeight();
      els.resultPoster.alt = `Poster for ${answer.title}`;
      els.resultPosterFallback.textContent = answer.title.charAt(0).toUpperCase() || "?";

      const key = `${movieCacheKey(answer)}-hero`;
      const cached = thumbCache[key];
      if (cached) {
        els.resultPoster.src = cached;
        els.resultReveal.classList.add("has-image");
        return;
      }

      fetchPosterForMovie(answer, "hero").then((url) => {
        if (!url) return;
        thumbCache[key] = url;
        persistThumbCache(thumbCache);
        els.resultPoster.src = url;
        els.resultReveal.classList.add("has-image");
        requestAnimationFrame(syncResultRevealHeight);
      }).catch(() => {
        // Keep fallback initial when a large poster can't be fetched.
      });
    }

    function renderCards() {
      if (!els.cards) return;
      els.cards.innerHTML = "";
      if (!answer || typeof answer !== "object") {
        setStatus("Puzzle data failed to load. Refresh to retry.", "error");
        return;
      }

      const safeGuesses = sanitizeStateGuesses();
      for (const [index, guess] of [...safeGuesses].reverse().entries()) {
        let year;
        let runtime;
        let titleWords;
        let genre;
        let director;
        let cast;
        let studio;
        let rating;
        let boxOffice;
        let country;
        let language;
        let franchise;
        try {
          year = compareYear(guess.year, answer.year);
          runtime = compareRuntime(guess.runtime, answer.runtime);
          titleWords = compareTitleWordCount(guess.title, answer.title);
          genre = compareGenre(guess.genres, answer.genres);
          director = compareExact(guess.director, answer.director);
          cast = compareCastMatches(guess.cast, answer.cast);
          studio = compareStudio(guess.studio, answer.studio);
          rating = compareRating(guess, answer);
          boxOffice = compareBoxOffice(guess.boxOffice, answer.boxOffice);
          country = compareCountry(guess, answer);
          language = compareLanguage(guess, answer);
          franchise = compareFranchise(guess.franchise, answer.franchise);
        } catch (error) {
          console.warn("Skipping invalid guess card due to data error:", error, guess);
          continue;
        }

        const card = document.createElement("article");
        card.className = "guess-card";

        card.innerHTML = `
          <div class="guess-head">
            <div class="avatar">
              <img class="avatar-img" alt="" loading="lazy" referrerpolicy="no-referrer" />
              <span class="avatar-fallback">${escapeHtml(guess.title.charAt(0).toUpperCase())}</span>
            </div>
            <div class="movie-title">${escapeHtml(guess.title)}</div>
          </div>
          <div class="tiles">
            ${tileHtml("Year", year.label, year.state)}
            ${tileHtml("Runtime", runtime.label, runtime.state)}
            ${tileHtml("Title Words", titleWords.label, titleWords.state)}
            ${buildGenreTilesHtml(genre)}
            ${tileHtml("Director", director.label, director.state)}
            ${buildCastTilesHtml(cast)}
            ${tileHtml("Studio", studio.label, studio.state)}
            ${tileHtml("Rating", rating.label, rating.state)}
            ${tileHtml("Box Office", boxOffice.label, boxOffice.state)}
            ${tileHtml("Country", country.label, country.state)}
            ${tileHtml("Language", language.label, language.state)}
            ${tileHtml("Franchise", franchise.label, franchise.state)}
          </div>
        `;

        const isLatest = index === 0;
        if (isLatest) {
          card.classList.add("latest-entry");
        }

        els.cards.appendChild(card);
        hydrateAvatar(card, guess);
        hydrateCastMatchPortraits(card);
        ensureRatingDataForMovie(guess);
        ensureLanguageDataForMovie(guess);

        if (isLatest) {
          const animateWinningCard = isWinRevealHoldActive() && moviesMatchByIdentity(guess, answer);
          const tiles = Array.from(card.querySelectorAll(".tile"));
          const tilesToAnimate = animateWinningCard
            ? tiles
            : tiles.filter((tile) => tile.classList.contains("hit") || tile.classList.contains("near"));
          const shouldPlayPointFlyFx = !animateWinningCard
            && !state.finished
            && safeGuesses.length > lastPointFxGuessCount
            && tilesToAnimate.length > 0;

          if (tilesToAnimate.length > 0) {
            // Apply after paint so the rotation is consistently visible.
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                tilesToAnimate.forEach((tile, tileIndex) => {
                  if (animateWinningCard) {
                    tile.style.setProperty("--tile-spin-ms", "1160ms");
                  } else {
                    tile.style.removeProperty("--tile-spin-ms");
                  }
                  tile.classList.add("tile-enter");
                  tile.style.animationDelay = `${tileIndex * 24}ms`;
                });
                if (shouldPlayPointFlyFx) {
                  playHintPointFlyFx(tilesToAnimate);
                }
              });
            });
          }
        }
      }
      lastPointFxGuessCount = safeGuesses.length;
      ensureRatingDataForMovie(answer);
      ensureLanguageDataForMovie(answer);
    }

    function prefersReducedMotion() {
      return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }

    function getPointFlyLayer() {
      if (pointFlyLayerEl && pointFlyLayerEl.isConnected) return pointFlyLayerEl;
      pointFlyLayerEl = document.createElement("div");
      pointFlyLayerEl.className = "point-fly-layer";
      document.body.appendChild(pointFlyLayerEl);
      return pointFlyLayerEl;
    }

    function pulseHintProgressCollect() {
      if (!els.hintProgress) return;
      els.hintProgress.classList.remove("collecting");
      void els.hintProgress.offsetWidth;
      els.hintProgress.classList.add("collecting");
      if (pointFlyCollectPulseTimer) {
        window.clearTimeout(pointFlyCollectPulseTimer);
      }
      pointFlyCollectPulseTimer = window.setTimeout(() => {
        pointFlyCollectPulseTimer = null;
        if (els.hintProgress) els.hintProgress.classList.remove("collecting");
      }, 360);
    }

    function triggerHintReadyFx() {
      if (els.hintPanel) {
        els.hintPanel.classList.remove("hint-ready-flash");
      }
      if (els.hintProgress) {
        els.hintProgress.classList.remove("hint-ready-flash");
      }
      if (hintReadyFlashTimer) {
        window.clearTimeout(hintReadyFlashTimer);
        hintReadyFlashTimer = null;
      }

      if (els.hintPanel) void els.hintPanel.offsetWidth;
      if (els.hintProgress) void els.hintProgress.offsetWidth;

      if (els.hintPanel) {
        els.hintPanel.classList.add("hint-ready-flash");
      }
      if (els.hintProgress) {
        els.hintProgress.classList.add("hint-ready-flash");
      }
      hintReadyFlashTimer = window.setTimeout(() => {
        hintReadyFlashTimer = null;
        if (els.hintPanel) els.hintPanel.classList.remove("hint-ready-flash");
        if (els.hintProgress) els.hintProgress.classList.remove("hint-ready-flash");
      }, 780);

      playUiSound("hint-ready");
    }

    function playHintPointFlyFx(tilesToAnimate) {
      if (!Array.isArray(tilesToAnimate) || tilesToAnimate.length === 0) return;
      if (!els.hintProgress || els.hintPanel.classList.contains("hidden")) return;
      if (prefersReducedMotion()) return;

      const targetRect = els.hintProgress.getBoundingClientRect();
      if (!targetRect || targetRect.width <= 0 || targetRect.height <= 0) return;

      let totalGain = 0;
      for (const tile of tilesToAnimate) {
        if (tile.classList.contains("hit")) totalGain += HINT_POINTS_HIT;
        else if (tile.classList.contains("near")) totalGain += HINT_POINTS_NEAR;
      }
      const finalPoints = Math.max(0, Math.min(HINT_POINT_COST, Number(state.hintPoints || 0)));
      const startPoints = Math.max(0, finalPoints - totalGain);
      const startRatio = HINT_POINT_COST > 0 ? (startPoints / HINT_POINT_COST) : 0;
      const fillRatio = HINT_POINT_COST > 0 ? (finalPoints / HINT_POINT_COST) : 0;
      const targetX = targetRect.left + Math.max(14, targetRect.width * Math.max(fillRatio, 0.08));
      const targetY = targetRect.top + targetRect.height / 2;
      const layer = getPointFlyLayer();
      if (els.hintProgressFill) {
        els.hintProgressFill.style.width = `${startRatio * 100}%`;
      }
      if (pointFlyCollectPulseTimer) {
        window.clearTimeout(pointFlyCollectPulseTimer);
        pointFlyCollectPulseTimer = null;
      }

      let maxImpactDelay = 0;
      let runningProgressPoints = startPoints;
      const impactEvents = [];

      tilesToAnimate.forEach((tile, tileIndex) => {
        const isHit = tile.classList.contains("hit");
        const isNear = tile.classList.contains("near");
        if (!isHit && !isNear) return;

        const tileRect = tile.getBoundingClientRect();
        if (!tileRect || tileRect.width <= 0 || tileRect.height <= 0) return;
        const startX = tileRect.left + tileRect.width / 2;
        const startY = tileRect.top + Math.min(tileRect.height * 0.34, 32);
        const pointValue = isHit ? HINT_POINTS_HIT : HINT_POINTS_NEAR;

        const badge = document.createElement("span");
        badge.className = `point-fly-badge ${isHit ? "hit" : "near"}`;
        badge.textContent = `+${pointValue}`;
        layer.appendChild(badge);

        const startDelay = 140 + (tileIndex * 36);
        const duration = 1060;
        const impactAt = startDelay + Math.round(duration * 0.86);
        maxImpactDelay = Math.max(maxImpactDelay, impactAt);
        impactEvents.push({ impactAt, pointValue });
        const midX = startX + ((targetX - startX) * 0.38);
        const midY = startY - 22 - (tileIndex % 3) * 5;
        const anim = badge.animate([
          { transform: `translate3d(${startX}px, ${startY}px, 0) scale(0.72)`, opacity: 0 },
          { transform: `translate3d(${startX}px, ${startY - 12}px, 0) scale(1)`, opacity: 1, offset: 0.18 },
          { transform: `translate3d(${midX}px, ${midY}px, 0) scale(0.93)`, opacity: 0.98, offset: 0.56 },
          { transform: `translate3d(${targetX}px, ${targetY}px, 0) scale(0.66)`, opacity: 0.94, offset: 0.86 },
          { transform: `translate3d(${targetX + 2}px, ${targetY - 4}px, 0) scale(0.56)`, opacity: 0 }
        ], {
          duration,
          delay: startDelay,
          easing: "cubic-bezier(0.18, 0.78, 0.2, 1)",
          fill: "forwards"
        });

        anim.onfinish = () => {
          badge.remove();
        };
      });

      impactEvents
        .sort((a, b) => a.impactAt - b.impactAt)
        .forEach(({ impactAt, pointValue }) => {
          window.setTimeout(() => {
            runningProgressPoints = Math.max(0, Math.min(HINT_POINT_COST, runningProgressPoints + pointValue));
            const ratio = HINT_POINT_COST > 0 ? (runningProgressPoints / HINT_POINT_COST) : 0;
            if (els.hintProgressFill) {
              els.hintProgressFill.style.width = `${ratio * 100}%`;
            }
            pulseHintProgressCollect();
          }, Math.max(0, impactAt));
        });

      // Snap to the final value at the end to avoid tiny drift.
      window.setTimeout(() => {
        if (els.hintProgressFill) {
          els.hintProgressFill.style.width = `${fillRatio * 100}%`;
        }
      }, Math.max(120, maxImpactDelay + 80));
    }

    function getTileStatesFromComparisonResults(results) {
      const states = [];
      if (!results || typeof results !== "object") return states;

      const scalarKeys = [
        "year",
        "runtime",
        "titleWords",
        "director",
        "studio",
        "rating",
        "boxOffice",
        "country",
        "language",
        "franchise"
      ];
      for (const key of scalarKeys) {
        const stateValue = results[key] && typeof results[key].state === "string" ? results[key].state : "na";
        states.push(stateValue);
      }

      if (results.genre && Array.isArray(results.genre.matches) && results.genre.matches.length > 1) {
        for (let i = 0; i < results.genre.matches.length; i += 1) states.push("hit");
      } else {
        states.push(results.genre && typeof results.genre.state === "string" ? results.genre.state : "na");
      }

      if (results.cast && Array.isArray(results.cast.matches) && results.cast.matches.length > 0) {
        for (let i = 0; i < results.cast.matches.length; i += 1) states.push("hit");
      } else {
        states.push(results.cast && typeof results.cast.state === "string" ? results.cast.state : "miss");
      }

      return states;
    }

    function getPointsForTileState(tileState) {
      if (tileState === "hit") return HINT_POINTS_HIT;
      if (tileState === "near") return HINT_POINTS_NEAR;
      return 0;
    }

    function scoreHintPointsForGuess(guessMovie, targetMovie) {
      if (!guessMovie || !targetMovie) return 0;
      let results;
      try {
        results = {
          year: compareYear(guessMovie.year, targetMovie.year),
          runtime: compareRuntime(guessMovie.runtime, targetMovie.runtime),
          titleWords: compareTitleWordCount(guessMovie.title, targetMovie.title),
          genre: compareGenre(guessMovie.genres, targetMovie.genres),
          director: compareExact(guessMovie.director, targetMovie.director),
          cast: compareCastMatches(guessMovie.cast, targetMovie.cast),
          studio: compareStudio(guessMovie.studio, targetMovie.studio),
          rating: compareRating(guessMovie, targetMovie),
          boxOffice: compareBoxOffice(guessMovie.boxOffice, targetMovie.boxOffice),
          country: compareCountry(guessMovie, targetMovie),
          language: compareLanguage(guessMovie, targetMovie),
          franchise: compareFranchise(guessMovie.franchise, targetMovie.franchise)
        };
      } catch (error) {
        console.warn("Hint point scoring skipped due to data error:", error);
        return 0;
      }

      const tileStates = getTileStatesFromComparisonResults(results);
      return tileStates.reduce((total, stateValue) => total + getPointsForTileState(stateValue), 0);
    }

    function getHintCastPool() {
      if (!answer || !Array.isArray(answer.cast)) return [];
      const unique = [];
      const seen = new Set();
      for (const rawName of answer.cast) {
        const name = String(rawName || "").trim();
        if (!name) continue;
        const key = normalize(name);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        unique.push(name);
      }
      return unique;
    }

    function getRevealedCastKeysFromGuesses() {
      const revealed = new Set();
      if (!answer || !Array.isArray(answer.cast) || !Array.isArray(state.guesses)) return revealed;
      for (const guess of state.guesses) {
        if (!guess || !Array.isArray(guess.cast)) continue;
        const castMatch = compareCastMatches(guess.cast, answer.cast);
        if (!castMatch || !Array.isArray(castMatch.matches)) continue;
        for (const name of castMatch.matches) {
          const key = normalize(name);
          if (key) revealed.add(key);
        }
      }
      return revealed;
    }

    function getAlreadyRevealedCastKeys() {
      const revealed = getRevealedCastKeysFromGuesses();
      const hinted = Array.isArray(state.revealedHintCast) ? state.revealedHintCast : [];
      for (const name of hinted) {
        const key = normalize(name);
        if (key) revealed.add(key);
      }
      return revealed;
    }

    function buyHint() {
      if (!state.started || state.finished || hintUnlockingInProgress) return;
      if (state.hintsUsed >= HINTS_MAX_PER_GAME) {
        setStatus("No hints left for this puzzle.", "error");
        playUiSound("error");
        return;
      }
      if (state.hintPoints < HINT_POINT_COST) {
        const needed = HINT_POINT_COST - state.hintPoints;
        setStatus(`${needed} more points needed for the next hint.`, "error");
        playUiSound("error");
        return;
      }

      const hintPool = getHintCastPool();
      if (!hintPool.length) {
        setStatus("No cast hint available for this movie.", "error");
        playUiSound("error");
        return;
      }
      const shownKeys = getAlreadyRevealedCastKeys();
      const nextHint = hintPool.find((name) => !shownKeys.has(normalize(name)));
      if (!nextHint) {
        setStatus("All available cast hints are already revealed.", "complete");
        playUiSound("toggle-on");
        return;
      }
      hintUnlockingInProgress = true;
      renderHintPanel();
      if (hintUnlockTimer) {
        window.clearTimeout(hintUnlockTimer);
      }
      hintUnlockTimer = window.setTimeout(() => {
        hintUnlockTimer = null;
        hintUnlockingInProgress = false;
        state.hintPoints -= HINT_POINT_COST;
        state.hintsUsed += 1;
        if (!Array.isArray(state.revealedHintCast)) state.revealedHintCast = [];
        state.revealedHintCast.push(nextHint);
        pendingHintRevealKey = normalize(nextHint);
        state.message = `Hint unlocked: ${nextHint}.`;
        trackAnalyticsEvent("hint_bought", {
          game_mode: gameMode,
          custom_mode: customMode ? "yes" : "no",
          puzzle_key: puzzleKey,
          hints_used: state.hintsUsed,
          hint_points_remaining: state.hintPoints
        });
        renderAll();
        persistState();
        playUiSound("toggle-on");
      }, 260);
    }

    function renderHintPanel() {
      if (!els.hintPanel) return;
      const showHintPanel = state.started && !state.finished;
      els.hintPanel.classList.toggle("hidden", !showHintPanel);
      if (!showHintPanel) {
        hintReadyTrackerPrimed = false;
        hintReadyWasBuyable = false;
        return;
      }

      const points = Math.max(0, Number(state.hintPoints) || 0);
      const hintsUsed = Math.max(0, Math.min(HINTS_MAX_PER_GAME, Number(state.hintsUsed) || 0));
      const hintsLeft = Math.max(0, HINTS_MAX_PER_GAME - hintsUsed);
      const hintPool = getHintCastPool();
      const shownKeys = getAlreadyRevealedCastKeys();
      const hasUnrevealedCastHint = hintPool.some((name) => !shownKeys.has(normalize(name)));
      const canBuy = state.started && !state.finished && hintsLeft > 0 && points >= HINT_POINT_COST && hasUnrevealedCastHint;
      const progressNow = Math.max(0, Math.min(HINT_POINT_COST, points));
      const progressPercent = HINT_POINT_COST > 0 ? (progressNow / HINT_POINT_COST) * 100 : 0;
      els.hintPanel.classList.toggle("hint-ready-copy-muted", canBuy || hintUnlockingInProgress);
      if (!hintReadyTrackerPrimed) {
        hintReadyTrackerPrimed = true;
      } else if (canBuy && !hintReadyWasBuyable) {
        triggerHintReadyFx();
      }
      hintReadyWasBuyable = canBuy;

      if (els.hintProgress && els.hintProgressFill) {
        els.hintProgressFill.style.width = `${progressPercent}%`;
        els.hintProgress.classList.toggle("ready", canBuy);
        els.hintProgress.setAttribute("aria-valuenow", String(progressNow));
      }

      if (els.hintBuyBtn) {
        if (hintUnlockingInProgress) {
          els.hintBuyBtn.textContent = "Unlocking...";
          els.hintBuyBtn.disabled = true;
          els.hintBuyBtn.classList.remove("ready");
          els.hintBuyBtn.setAttribute("aria-label", "Unlocking hint");
        } else {
          els.hintBuyBtn.textContent = canBuy ? `Get Hint (${HINT_POINT_COST}) • ${points} pts` : `${points} pts`;
          els.hintBuyBtn.disabled = !canBuy;
          els.hintBuyBtn.classList.toggle("ready", canBuy);
          els.hintBuyBtn.setAttribute("aria-label", canBuy ? `Get hint for ${HINT_POINT_COST} points. You have ${points} points.` : `${points} points`);
        }
      }

      const hints = Array.isArray(state.revealedHintCast) ? state.revealedHintCast : [];
      if (els.hintList) {
        els.hintList.innerHTML = "";
        for (let i = 0; i < hints.length; i += 1) {
          const item = document.createElement("li");
          item.className = "hint-item";
          const actorName = hints[i];
          const actorKey = normalize(actorName);
          if (pendingHintRevealKey && actorKey === pendingHintRevealKey) {
            item.classList.add("hint-item-enter");
          }
          item.innerHTML = `
            <div class="hint-item-main">
              <span class="hint-actor-avatar" data-cast-name="${escapeHtml(actorName)}" aria-hidden="true">
                <img class="hint-actor-img" alt="" loading="lazy" referrerpolicy="no-referrer" />
                <span class="hint-actor-fallback">${escapeHtml(getActorInitials(actorName))}</span>
              </span>
              <span class="hint-item-text">${escapeHtml(actorName)}</span>
            </div>
          `;
          els.hintList.appendChild(item);
          hydrateHintActorAvatar(item, actorName);
        }
        pendingHintRevealKey = "";
      }
    }

    function hydrateHintActorAvatar(scope, actorName) {
      if (!scope) return;
      const avatar = scope.querySelector(".hint-actor-avatar");
      const img = scope.querySelector(".hint-actor-img");
      const fallback = scope.querySelector(".hint-actor-fallback");
      if (!avatar || !img || !fallback) return;

      fallback.textContent = getActorInitials(actorName);
      const key = normalize(actorName);
      const cached = castPortraitCache[key];
      if (cached) {
        img.src = cached;
        avatar.classList.add("has-image");
        return;
      }
      if (castPortraitLookupsInFlight.has(key)) return;
      castPortraitLookupsInFlight.add(key);
      fetchCastPortraitForName(actorName).then((url) => {
        if (!url) return;
        castPortraitCache[key] = url;
        persistCastPortraitCache(castPortraitCache);
        img.src = url;
        avatar.classList.add("has-image");
      }).catch(() => {
        // Keep fallback initials when a portrait cannot be fetched.
      }).finally(() => {
        castPortraitLookupsInFlight.delete(key);
      });
    }

    function hydrateAvatar(card, movie) {
      const avatar = card.querySelector(".avatar");
      const img = card.querySelector(".avatar-img");
      if (!avatar || !img) return;

      const key = movieCacheKey(movie);
      const cached = thumbCache[key];
      if (cached) {
        img.src = cached;
        avatar.classList.add("has-image");
        return;
      }

      fetchPosterForMovie(movie, "thumb").then((url) => {
        if (!url) return;
        thumbCache[key] = url;
        persistThumbCache(thumbCache);
        img.src = url;
        avatar.classList.add("has-image");
      }).catch(() => {
        // Keep fallback initials when a poster can't be fetched.
      });
    }

    function patchTypeaheadThumbByKey(movieKey, imageUrl) {
      if (!els.guessTypeahead || els.guessTypeahead.classList.contains("hidden")) return;
      const rows = Array.from(els.guessTypeahead.querySelectorAll(".guess-typeahead-item"));
      for (const row of rows) {
        if (String(row.getAttribute("data-movie-key") || "") !== movieKey) continue;
        const thumbSlot = row.querySelector(".guess-typeahead-thumb");
        if (!thumbSlot) continue;
        thumbSlot.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer" />`;
      }
    }

    function hydrateTypeaheadPosters(options) {
      if (!Array.isArray(options) || !options.length) return;
      const maxHydrate = Math.min(12, options.length);
      for (let i = 0; i < maxHydrate; i += 1) {
        const entry = options[i];
        if (!entry || !entry.movie) continue;
        const movie = entry.movie;
        const key = movieCacheKey(movie);
        if (!key || thumbCache[key] || typeaheadPosterLookupsInFlight.has(key)) continue;
        typeaheadPosterLookupsInFlight.add(key);
        fetchPosterForMovie(movie, "thumb").then((url) => {
          if (!url) return;
          thumbCache[key] = url;
          persistThumbCache(thumbCache);
          patchTypeaheadThumbByKey(key, url);
        }).catch(() => {
          // Keep letter fallback when poster lookup fails.
        }).finally(() => {
          typeaheadPosterLookupsInFlight.delete(key);
        });
      }
    }

    function hydrateCastMatchPortraits(card) {
      if (!card) return;
      const castTiles = Array.from(card.querySelectorAll(".tile-cast-match[data-cast-name]"));
      for (const tile of castTiles) {
        const castName = String(tile.getAttribute("data-cast-name") || "").trim();
        if (!castName) continue;
        hydrateCastMatchPortrait(tile, castName);
      }
    }

    function hydrateCastMatchPortrait(tile, castName) {
      const avatar = tile.querySelector(".tile-cast-avatar");
      const img = tile.querySelector(".tile-cast-avatar-img");
      const fallback = tile.querySelector(".tile-cast-avatar-fallback");
      if (!avatar || !img || !fallback) return;

      fallback.textContent = getActorInitials(castName);
      const key = normalize(castName);
      const cached = castPortraitCache[key];
      if (cached) {
        img.src = cached;
        avatar.classList.add("has-image");
        return;
      }
      if (castPortraitLookupsInFlight.has(key)) return;
      castPortraitLookupsInFlight.add(key);

      fetchCastPortraitForName(castName).then((url) => {
        if (!url) return;
        castPortraitCache[key] = url;
        persistCastPortraitCache(castPortraitCache);
        img.src = url;
        avatar.classList.add("has-image");
      }).catch(() => {
        // Keep initials fallback when a portrait can't be fetched.
      }).finally(() => {
        castPortraitLookupsInFlight.delete(key);
      });
    }

    async function ensureRatingDataForMovie(movie) {
      if (!movie || typeof movie !== "object") return;
      if (getMovieRating(movie)) return;

      const cacheKey = movieCacheKey(movie);
      if (ratingLookupsInFlight.has(cacheKey)) return;
      ratingLookupsInFlight.add(cacheKey);

      try {
        const fetched = await fetchRatingForMovie(movie);
        const normalized = normalizeRating(fetched);
        if (!normalized) return;
        ratingCache[cacheKey] = normalized;
        persistRatingCache(ratingCache);
        if (!isWinRevealHoldActive()) renderAll();
      } catch {
        // Silent fallback: rating clue stays N/A when lookup fails.
      } finally {
        ratingLookupsInFlight.delete(cacheKey);
      }
    }

    async function fetchRatingForMovie(movie) {
      const tmdbCandidates = [];
      const primary = String(tmdbApiKey || "").trim();
      const fallback = String(TMDB_DEFAULT_API_KEY || "").trim();
      if (primary) tmdbCandidates.push(primary);
      if (fallback && fallback !== primary) tmdbCandidates.push(fallback);

      for (const key of tmdbCandidates) {
        try {
          const rating = await fetchRatingFromTmdb(movie, key);
          if (rating) return rating;
        } catch {
          // Try next key candidate.
        }
      }
      return "";
    }

    async function fetchRatingFromTmdb(movie, apiKey) {
      const directTmdbId = getMovieTmdbId(movie);
      if (directTmdbId !== null) {
        const directUrl = `https://api.themoviedb.org/3/movie/${directTmdbId}/release_dates?api_key=${encodeURIComponent(apiKey)}`;
        const directRes = await fetch(directUrl);
        if (directRes.status !== 401 && directRes.status !== 403 && directRes.ok) {
          const directPayload = await directRes.json();
          const directEntries = Array.isArray(directPayload.results) ? directPayload.results : [];
          const directUs = directEntries.find((entry) => normalize(entry.iso_3166_1) === "us");
          const directUsDates = directUs && Array.isArray(directUs.release_dates) ? directUs.release_dates : [];
          const directUsRating = directUsDates.find((entry) => normalizeRating(entry.certification));
          if (directUsRating) return normalizeRating(directUsRating.certification);
          for (const entry of directEntries) {
            const releaseDates = Array.isArray(entry.release_dates) ? entry.release_dates : [];
            const fallbackRating = releaseDates.find((item) => normalizeRating(item.certification));
            if (fallbackRating) return normalizeRating(fallbackRating.certification);
          }
        }
      }

      const query = encodeURIComponent(movie.title);
      const yearParam = Number.isFinite(movie.year) ? `&year=${movie.year}` : "";
      const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${encodeURIComponent(apiKey)}&query=${query}${yearParam}&include_adult=false&page=1`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.status === 401 || searchRes.status === 403) return "";
      if (!searchRes.ok) return "";

      const searchPayload = await searchRes.json();
      const results = Array.isArray(searchPayload.results) ? searchPayload.results : [];
      if (!results.length) return "";

      const best = pickBestTmdbMovieResult(results, movie);
      const movieId = best && Number.isFinite(best.id) ? best.id : null;
      if (!movieId) return "";

      const detailsUrl = `https://api.themoviedb.org/3/movie/${movieId}/release_dates?api_key=${encodeURIComponent(apiKey)}`;
      const detailsRes = await fetch(detailsUrl);
      if (!detailsRes.ok) return "";

      const detailsPayload = await detailsRes.json();
      const entries = Array.isArray(detailsPayload.results) ? detailsPayload.results : [];
      const us = entries.find((entry) => normalize(entry.iso_3166_1) === "us");
      const usDates = us && Array.isArray(us.release_dates) ? us.release_dates : [];
      const usRating = usDates.find((entry) => normalizeRating(entry.certification));
      if (usRating) return normalizeRating(usRating.certification);

      for (const entry of entries) {
        const releaseDates = Array.isArray(entry.release_dates) ? entry.release_dates : [];
        const fallbackRating = releaseDates.find((item) => normalizeRating(item.certification));
        if (fallbackRating) return normalizeRating(fallbackRating.certification);
      }
      return "";
    }

    async function ensureLanguageDataForMovie(movie) {
      if (!movie || typeof movie !== "object") return;
      const cacheKey = movieCacheKey(movie);
      if (String(languageCache[cacheKey] || "").trim()) return;
      if (languageLookupsInFlight.has(cacheKey)) return;
      languageLookupsInFlight.add(cacheKey);

      try {
        const fetched = await fetchLanguageForMovie(movie);
        const normalized = String(fetched || "").trim();
        if (!normalized) return;
        languageCache[cacheKey] = normalized;
        persistLanguageCache(languageCache);
        if (!isWinRevealHoldActive()) renderAll();
      } catch {
        // Silent fallback: keep bundled language if lookup fails.
      } finally {
        languageLookupsInFlight.delete(cacheKey);
      }
    }

    async function fetchLanguageForMovie(movie) {
      const tmdbCandidates = [];
      const primary = String(tmdbApiKey || "").trim();
      const fallback = String(TMDB_DEFAULT_API_KEY || "").trim();
      if (primary) tmdbCandidates.push(primary);
      if (fallback && fallback !== primary) tmdbCandidates.push(fallback);

      for (const key of tmdbCandidates) {
        try {
          const language = await fetchLanguageFromTmdb(movie, key);
          if (language) return language;
        } catch {
          // Try next key candidate.
        }
      }
      return "";
    }

    function pickLanguageFromTmdbDetail(detail) {
      const original = String(detail.original_language || "").trim().toLowerCase();
      const spoken = Array.isArray(detail.spoken_languages) ? detail.spoken_languages : [];
      if (original) {
        const matching = spoken.find((item) => String(item.iso_639_1 || "").trim().toLowerCase() === original);
        if (matching && String(matching.english_name || "").trim()) {
          return String(matching.english_name).trim();
        }
      }
      if (spoken.length > 0 && String(spoken[0].english_name || "").trim()) {
        return String(spoken[0].english_name).trim();
      }
      if (original && LANGUAGE_CODE_TO_NAME[original]) {
        return LANGUAGE_CODE_TO_NAME[original];
      }
      return original ? original.toUpperCase() : "";
    }

    async function fetchLanguageFromTmdb(movie, apiKey) {
      const directTmdbId = getMovieTmdbId(movie);
      if (directTmdbId !== null) {
        const directUrl = `https://api.themoviedb.org/3/movie/${directTmdbId}?api_key=${encodeURIComponent(apiKey)}`;
        const directRes = await fetch(directUrl);
        if (directRes.status !== 401 && directRes.status !== 403 && directRes.ok) {
          const directDetail = await directRes.json();
          return pickLanguageFromTmdbDetail(directDetail);
        }
      }

      const query = encodeURIComponent(movie.title);
      const yearParam = Number.isFinite(movie.year) ? `&year=${movie.year}` : "";
      const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${encodeURIComponent(apiKey)}&query=${query}${yearParam}&include_adult=false&page=1`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.status === 401 || searchRes.status === 403) return "";
      if (!searchRes.ok) return "";

      const searchPayload = await searchRes.json();
      const results = Array.isArray(searchPayload.results) ? searchPayload.results : [];
      if (!results.length) return "";

      const best = pickBestTmdbMovieResult(results, movie);
      const movieId = best && Number.isFinite(best.id) ? best.id : null;
      if (!movieId) return "";

      const detailsUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${encodeURIComponent(apiKey)}`;
      const detailsRes = await fetch(detailsUrl);
      if (!detailsRes.ok) return "";
      const detail = await detailsRes.json();
      return pickLanguageFromTmdbDetail(detail);
    }

    function tileHtml(label, value, tone, wide = false) {
      const cls = wide ? `tile ${tone} franchise` : `tile ${tone}`;
      const text = String(value ?? "");
      const normalized = text.replace(/\s+/g, " ").trim();
      let valueClass = "tile-value";
      if (normalized.length >= 20) {
        valueClass += " tight";
      } else if (normalized.length >= 13) {
        valueClass += " compact";
      }
      return `<div class="${cls}"><div class="tile-label">${escapeHtml(label)}</div><div class="${valueClass}">${escapeHtml(value)}</div></div>`;
    }

    function castMatchTileHtml(label, castName) {
      const initials = getActorInitials(castName);
      return `
        <div class="tile hit tile-cast-match" data-cast-name="${escapeHtml(castName)}">
          <div class="tile-label">${escapeHtml(label)}</div>
          <div class="tile-cast-wrap">
            <span class="tile-cast-avatar" aria-hidden="true">
              <img class="tile-cast-avatar-img" alt="" loading="lazy" referrerpolicy="no-referrer" />
              <span class="tile-cast-avatar-fallback">${escapeHtml(initials)}</span>
            </span>
            <div class="tile-value compact">${escapeHtml(castName)}</div>
          </div>
        </div>
      `;
    }

    function buildCastTilesHtml(castMatch) {
      if (castMatch.matches.length === 0) {
        return tileHtml("Cast Match", "No shared cast", "miss");
      }
      return castMatch.matches
        .map((name, i) => castMatchTileHtml(castMatch.matches.length > 1 ? `Cast Match ${i + 1}` : "Cast Match", name))
        .join("");
    }

    function buildGenreTilesHtml(genreMatch) {
      if (!genreMatch || genreMatch.state === "na") {
        return tileHtml("Genre", "N/A", "na");
      }
      if (Array.isArray(genreMatch.matches) && genreMatch.matches.length > 1) {
        return genreMatch.matches
          .map((name, i) => tileHtml(`Genre ${i + 1}`, name, "hit"))
          .join("");
      }
      return tileHtml("Genre", genreMatch.label, genreMatch.state);
    }

    function compareYear(guessYear, targetYear) {
      if (guessYear === targetYear) return { label: `${guessYear}`, state: "hit" };
      const diff = Math.abs(guessYear - targetYear);
      const arrow = guessYear < targetYear ? "↑" : "↓";
      const hint = guessYear < targetYear ? "later" : "earlier";
      return { label: `${guessYear} ${arrow} ${hint}`, state: diff <= 5 ? "near" : "miss" };
    }

    function compareRuntime(guessRuntime, targetRuntime) {
      if (guessRuntime === targetRuntime) return { label: `${guessRuntime}m`, state: "hit" };
      const diff = Math.abs(guessRuntime - targetRuntime);
      const arrow = guessRuntime < targetRuntime ? "↑" : "↓";
      const hint = guessRuntime < targetRuntime ? "longer" : "shorter";
      return { label: `${guessRuntime}m ${arrow} ${hint}`, state: diff <= 10 ? "near" : "miss" };
    }

    function compareTitleWordCount(guessTitle, targetTitle) {
      const guessCount = countTitleWords(guessTitle);
      const targetCount = countTitleWords(targetTitle);
      if (guessCount === targetCount) return { label: `${guessCount}`, state: "hit" };
      const diff = Math.abs(guessCount - targetCount);
      const arrow = guessCount < targetCount ? "↑" : "↓";
      const hint = guessCount < targetCount ? "more words" : "fewer words";
      return { label: `${guessCount} ${arrow} ${hint}`, state: diff <= 1 ? "near" : "miss" };
    }

    function compareGenre(guessGenres, targetGenres) {
      const guessList = Array.isArray(guessGenres) ? guessGenres.filter(Boolean) : [];
      const targetList = Array.isArray(targetGenres) ? targetGenres.filter(Boolean) : [];
      const shared = guessList.filter((g) => targetList.includes(g));
      if (shared.length > 0) return { label: shared.join(", "), state: "hit", matches: shared };
      if (guessList.length === 0) return { label: "N/A", state: "na", matches: [] };
      return { label: guessList.join(", "), state: "miss", matches: [] };
    }

    function compareExact(guessValue, targetValue) {
      const same = normalize(guessValue) === normalize(targetValue);
      return { label: guessValue, state: same ? "hit" : "miss" };
    }

    function compareCastMatches(guessCast, targetCast) {
      const guessList = Array.isArray(guessCast) ? guessCast.filter(Boolean) : [];
      const targetList = Array.isArray(targetCast) ? targetCast.filter(Boolean) : [];
      const shared = guessList.filter((name) => targetList.some((target) => normalize(target) === normalize(name)));
      return {
        state: shared.length > 0 ? "hit" : "miss",
        matches: shared
      };
    }

    const STUDIO_FAMILY_KEYWORDS = [
      {
        id: "disney",
        keywords: [
          "walt disney pictures",
          "walt disney feature animation",
          "walt disney animation studios",
          "walt disney productions",
          "disneytoon studios",
          "buena vista",
          "touchstone",
          "lucasfilm",
          "marvel studios",
          "searchlight",
          "20th century studios",
          "20th century fox",
          "disney"
        ]
      },
      { id: "pixar", keywords: ["pixar animation studios", "pixar"] },
      { id: "warner", keywords: ["warner bros", "new line cinema", "new line", "dc studios"] },
      { id: "universal", keywords: ["universal pictures", "focus features", "illumination", "dreamworks"] },
      { id: "sony", keywords: ["sony pictures", "columbia pictures", "screen gems", "tristar", "tri star"] },
      { id: "paramount", keywords: ["paramount pictures", "nickelodeon movies", "mtv films"] },
      { id: "lionsgate", keywords: ["lionsgate", "summit entertainment"] },
      { id: "mgm", keywords: ["metro goldwyn mayer", "mgm", "orion pictures", "united artists", "ua"] },
      { id: "fox", keywords: ["20th century fox", "fox searchlight"] }
    ];

    function getStudioFamily(studioName) {
      const normalizedStudio = normalize(studioName);
      if (!normalizedStudio) return "";
      for (const rule of STUDIO_FAMILY_KEYWORDS) {
        if (rule.keywords.some((keyword) => normalizedStudio.includes(keyword))) {
          return rule.id;
        }
      }
      return "";
    }

    function isStudioFamilyNearMatch(leftFamily, rightFamily) {
      if (!leftFamily || !rightFamily) return false;
      if (leftFamily === rightFamily) return true;
      // Pixar is a distinct label, but close to Disney umbrella for clue quality.
      if ((leftFamily === "pixar" && rightFamily === "disney") || (leftFamily === "disney" && rightFamily === "pixar")) {
        return true;
      }
      return false;
    }

    function compareStudio(guessStudio, targetStudio) {
      const guessValue = String(guessStudio || "").trim();
      const targetValue = String(targetStudio || "").trim();
      if (!guessValue || !targetValue) return { label: "N/A", state: "na" };
      const guessNorm = normalize(guessValue);
      const targetNorm = normalize(targetValue);
      if (guessNorm === targetNorm) return { label: guessValue, state: "hit" };

      const guessFamily = getStudioFamily(guessValue);
      const targetFamily = getStudioFamily(targetValue);
      if (isStudioFamilyNearMatch(guessFamily, targetFamily)) {
        return { label: guessValue, state: "near" };
      }

      // Fallback: if one label contains the other (e.g. "Warner Bros" vs "Warner Bros Pictures"), mark close.
      if (guessNorm.length >= 6 && targetNorm.length >= 6 && (guessNorm.includes(targetNorm) || targetNorm.includes(guessNorm))) {
        return { label: guessValue, state: "near" };
      }

      return { label: guessValue, state: "miss" };
    }

    function normalizeRating(value) {
      const cleaned = String(value || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace(/_/g, "-");
      if (!cleaned) return "";
      if (cleaned === "PG13" || cleaned === "PG-13") return "PG-13";
      if (cleaned === "NC17" || cleaned === "NC-17") return "NC-17";
      if (cleaned === "NOTRATED" || cleaned === "UNRATED" || cleaned === "NR" || cleaned === "N/A") return "UNRATED";
      if (cleaned === "G" || cleaned === "PG" || cleaned === "R" || cleaned === "TV-MA" || cleaned === "TV-14" || cleaned === "TV-PG" || cleaned === "TV-G") return cleaned;
      return "";
    }

    function getMovieRating(movie) {
      if (!movie || typeof movie !== "object") return "";
      const embedded = normalizeRating(movie.rating || movie.certification || movie.mpaa);
      if (embedded) return embedded;
      return normalizeRating(ratingCache[movieCacheKey(movie)]);
    }

    function compareRating(guessMovie, targetMovie) {
      const ratingOrder = ["G", "PG", "PG-13", "R", "NC-17"];
      const guessRating = getMovieRating(guessMovie);
      const targetRating = getMovieRating(targetMovie);
      if (!guessRating || !targetRating) return { label: guessRating || "N/A", state: "na" };
      if (guessRating === targetRating) return { label: guessRating, state: "hit" };

      const guessIndex = ratingOrder.indexOf(guessRating);
      const targetIndex = ratingOrder.indexOf(targetRating);
      if (guessIndex !== -1 && targetIndex !== -1) {
        const diff = Math.abs(guessIndex - targetIndex);
        const arrow = guessIndex < targetIndex ? "↑" : "↓";
        const hint = guessIndex < targetIndex ? "stricter" : "softer";
        return { label: `${guessRating} ${arrow} ${hint}`, state: diff === 1 ? "near" : "miss" };
      }
      return { label: guessRating, state: "miss" };
    }

    function compareCountry(guessMovie, targetMovie) {
      if (!targetMovie || typeof targetMovie !== "object") return { label: "N/A", state: "na" };
      const guessValue = String(guessMovie.country || "").trim();
      const targetValue = String(targetMovie.country || "").trim();
      if (!guessValue || !targetValue) return { label: guessValue || "N/A", state: "na" };
      return { label: guessValue, state: normalize(guessValue) === normalize(targetValue) ? "hit" : "miss" };
    }

    const LANGUAGE_CODE_TO_NAME = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ja: "Japanese",
      ko: "Korean",
      zh: "Chinese",
      ru: "Russian",
      hi: "Hindi",
      ar: "Arabic",
      sv: "Swedish",
      da: "Danish",
      no: "Norwegian",
      fi: "Finnish",
      nl: "Dutch",
      pl: "Polish",
      tr: "Turkish",
      he: "Hebrew",
      th: "Thai",
      cs: "Czech",
      uk: "Ukrainian"
    };

    function getMovieLanguage(movie) {
      if (!movie || typeof movie !== "object") return "";
      const key = movieCacheKey(movie);
      const cached = String(languageCache[key] || "").trim();
      if (cached) return cached;
      return String(movie.language || "").trim();
    }

    function compareLanguage(guessMovie, targetMovie) {
      if (!targetMovie || typeof targetMovie !== "object") return { label: "N/A", state: "na" };
      const guessValue = getMovieLanguage(guessMovie);
      const targetValue = getMovieLanguage(targetMovie);
      if (!guessValue || !targetValue) return { label: guessValue || "N/A", state: "na" };
      return { label: guessValue, state: normalize(guessValue) === normalize(targetValue) ? "hit" : "miss" };
    }

    const BOX_OFFICE_BUCKETS = [
      { max: 50_000_000, label: "<$50M" },
      { max: 150_000_000, label: "$50M-$150M" },
      { max: 500_000_000, label: "$150M-$500M" },
      { max: 1_000_000_000, label: "$500M-$1B" },
      { max: Number.POSITIVE_INFINITY, label: "$1B+" }
    ];

    function getBoxOfficeBucket(value) {
      if (!Number.isFinite(value) || value <= 0) return null;
      for (let i = 0; i < BOX_OFFICE_BUCKETS.length; i += 1) {
        if (value < BOX_OFFICE_BUCKETS[i].max) {
          return { index: i, label: BOX_OFFICE_BUCKETS[i].label };
        }
      }
      return null;
    }

    function compareBoxOffice(guessBoxOffice, targetBoxOffice) {
      const guessBucket = getBoxOfficeBucket(guessBoxOffice);
      const targetBucket = getBoxOfficeBucket(targetBoxOffice);
      if (!guessBucket || !targetBucket) return { label: "N/A", state: "na" };
      if (guessBucket.index === targetBucket.index) return { label: guessBucket.label, state: "hit" };
      const diff = Math.abs(guessBucket.index - targetBucket.index);
      const arrow = guessBucket.index < targetBucket.index ? "↑" : "↓";
      const hint = guessBucket.index < targetBucket.index ? "higher" : "lower";
      return { label: `${guessBucket.label} ${arrow} ${hint}`, state: diff === 1 ? "near" : "miss" };
    }

    function compareFranchise(guessFranchise, targetFranchise) {
      const guessHas = Boolean(String(guessFranchise || "").trim());
      const targetHas = Boolean(String(targetFranchise || "").trim());
      return { label: guessHas ? "Yes" : "No", state: guessHas === targetHas ? "hit" : "miss" };
    }

    function splitInputTitleAndYear(input) {
      const raw = String(input || "").trim();
      const yearMatch = raw.match(/^(.*?)(?:\s*[\(\[]?\s*(\d{4})\s*[\)\]]?)$/);
      if (!yearMatch) return { titlePart: raw, year: null };
      const parsedYear = Number(yearMatch[2]);
      if (!Number.isFinite(parsedYear) || parsedYear < 1888 || parsedYear > 2200) {
        return { titlePart: raw, year: null };
      }
      const titlePart = String(yearMatch[1] || "").trim();
      return { titlePart: titlePart || raw, year: parsedYear };
    }

    function buildMovieChoiceLabel(movie) {
      if (!movie || typeof movie !== "object") return "";
      const year = Number.isFinite(movie.year) ? movie.year : "????";
      return `${movie.title} (${year})`;
    }

    function getGuessTypeaheadOptions(input, limit = 12) {
      const raw = String(input || "").trim();
      if (!raw) return [];
      const { titlePart, year } = splitInputTitleAndYear(raw);
      const normInput = normalize(titlePart || raw);
      const compactInput = normalizeCompact(titlePart || raw);
      const compactInputNoArticle = stripLeadingArticle(compactInput);
      if (!normInput) return [];

      const inputWords = normInput.split(/\s+/).filter(Boolean);
      const scored = [];

      for (const movie of MOVIES) {
        const normTitle = normalize(movie.title);
        const compactTitle = normalizeCompact(movie.title);
        const compactTitleNoArticle = stripLeadingArticle(compactTitle);
        if (!normTitle) continue;
        const titleWords = normTitle.split(/\s+/).filter(Boolean);
        const paddedTitle = ` ${normTitle} `;
        const paddedInput = ` ${normInput} `;

        let score = 0;
        const exactTitle = normTitle === normInput;
        if (exactTitle) score += 220;
        else if (normTitle.startsWith(normInput)) score += 120;
        else if (normTitle.includes(normInput)) score += 88;
        else if (normInput.includes(normTitle)) score += 66;
        if (paddedTitle.includes(paddedInput)) score += 84;

        let matchedInputWordCount = 0;
        for (const word of inputWords) {
          if (word.length < 2) continue;
          const hasContains = normTitle.includes(word);
          const hasWholeWord = titleWords.includes(word);
          const hasWordPrefix = titleWords.some((titleWord) => titleWord.startsWith(word));
          if (hasContains) score += 14;
          if (hasWordPrefix) score += 11;
          if (hasWholeWord) score += 34;
          if (hasWholeWord || hasWordPrefix || hasContains) matchedInputWordCount += 1;
        }
        if (inputWords.length && matchedInputWordCount === inputWords.length) {
          score += 52;
        }

        if (compactInput && compactTitle) {
          if (compactInput === compactTitle) score += 180;
          if (compactInputNoArticle && compactTitleNoArticle && compactInputNoArticle === compactTitleNoArticle) score += 160;

          if (Math.abs(compactInput.length - compactTitle.length) <= 2) {
            const typoDistance = boundedEditDistance(compactInput, compactTitle, 2);
            if (typoDistance === 1) score += 58;
            else if (typoDistance === 2) score += 34;
          }

          if (compactInputNoArticle && compactTitleNoArticle && Math.abs(compactInputNoArticle.length - compactTitleNoArticle.length) <= 2) {
            const articleDistance = boundedEditDistance(compactInputNoArticle, compactTitleNoArticle, 2);
            if (articleDistance === 1) score += 40;
            else if (articleDistance === 2) score += 24;
          }
        }

        if (year !== null) {
          if (Number(movie.year) === year) score += 120;
          else score -= Math.min(50, Math.abs(Number(movie.year) - year));
        }

        const popularityBoost = Number.isFinite(movie.popularity) ? Math.min(20, movie.popularity / 3.8) : 0;
        const votesBoost = Number.isFinite(movie.voteCount) ? Math.min(24, Math.log10(Math.max(10, movie.voteCount)) * 4.4) : 0;
        score += popularityBoost + votesBoost;

        if (score < 34) continue;

        scored.push({
          movie,
          score
        });
      }

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aVotes = Number.isFinite(a.movie.voteCount) ? a.movie.voteCount : 0;
        const bVotes = Number.isFinite(b.movie.voteCount) ? b.movie.voteCount : 0;
        if (bVotes !== aVotes) return bVotes - aVotes;
        if (b.movie.year !== a.movie.year) return b.movie.year - a.movie.year;
        return a.movie.title.localeCompare(b.movie.title);
      });

      const out = [];
      const seen = new Set();
      for (const item of scored) {
        const label = buildMovieChoiceLabel(item.movie);
        const key = normalize(label);
        if (!label || seen.has(key)) continue;
        seen.add(key);
        out.push({
          movie: item.movie,
          label,
          score: item.score
        });
        if (out.length >= limit) break;
      }
      return out;
    }

    function findMovieByInput(input) {
      const raw = String(input || "").trim();
      if (!raw) return null;
      const { titlePart, year } = splitInputTitleAndYear(raw);
      const normTitle = normalize(titlePart || raw);
      const compactTitle = normalizeCompact(titlePart || raw);
      if (!normTitle) return null;

      const exactTitleMatches = moviesByNormTitle.get(normTitle) || [];
      const compactTitleMatches = compactTitle ? (moviesByCompactNormTitle.get(compactTitle) || []) : [];
      if (year !== null) {
        const yearExact = exactTitleMatches.find((movie) => Number(movie.year) === year);
        if (yearExact) return yearExact;
        const compactYearExact = compactTitleMatches.find((movie) => Number(movie.year) === year);
        if (compactYearExact) return compactYearExact;
        return null;
      }

      if (exactTitleMatches.length === 1) return exactTitleMatches[0];
      if (exactTitleMatches.length > 1 && year === null) return null;
      if (compactTitleMatches.length === 1) return compactTitleMatches[0];
      if (compactTitleMatches.length > 1 && year === null) return null;

      const options = getGuessTypeaheadOptions(raw, 4);
      if (!options.length) return null;
      if (options.length === 1) return options[0].movie;
      if ((options[0].score - options[1].score) >= 58) return options[0].movie;
      return null;
    }

    function getCurrentPoolLabel() {
      if (customMode) return "this custom puzzle";
      if (gameMode === "jam") return "the practice pool";
      if (gameMode === "archive") return "this archive day";
      return "today’s Flickle pool";
    }

    function shouldShowRandomStartButton() {
      if (!els.randomStartBtn || !els.guessForm) return false;
      if (!state.started || state.finished) return false;
      return state.guesses.length === 0;
    }

    function pickRandomStartMovie() {
      let pool = [];
      if (customMode) {
        pool = Array.isArray(jamAnswerPool) && jamAnswerPool.length ? jamAnswerPool : MOVIES;
      } else if (gameMode === "jam") {
        pool = Array.isArray(jamAnswerPool) && jamAnswerPool.length ? jamAnswerPool : MOVIES;
      } else {
        pool = Array.isArray(dailyAnswerPool) && dailyAnswerPool.length ? dailyAnswerPool : MOVIES;
      }

      if (!Array.isArray(pool) || pool.length === 0) return null;

      const answerKey = normalize(answer && answer.title ? answer.title : "");
      const candidatePool = pool.filter((movie) => {
        if (!movie || typeof movie !== "object" || !movie.title) return false;
        const movieKey = normalize(movie.title);
        if (!answerKey) return true;
        if (pool.length <= 1) return true;
        return movieKey !== answerKey;
      });
      if (!candidatePool.length) return null;

      const randomIndex = Math.floor(Math.random() * candidatePool.length);
      return candidatePool[randomIndex] || null;
    }

    function getClosestMovieTitles(input, limit = 5) {
      return getGuessTypeaheadOptions(input, limit).map((entry) => entry.label);
    }

    function getTitleDisambiguationChoices(input, limit = 6) {
      const raw = String(input || "").trim();
      if (!raw) return [];
      const { titlePart, year } = splitInputTitleAndYear(raw);
      const normTitle = normalize(titlePart || raw);
      const compactTitle = normalizeCompact(titlePart || raw);
      if (!normTitle) return [];

      const exactTitleMatches = moviesByNormTitle.get(normTitle) || [];
      const compactTitleMatches = compactTitle ? (moviesByCompactNormTitle.get(compactTitle) || []) : [];
      const source = year !== null
        ? (exactTitleMatches.length ? exactTitleMatches : compactTitleMatches)
        : exactTitleMatches.length > 1
          ? exactTitleMatches
          : compactTitleMatches.length > 1
            ? compactTitleMatches
            : [];
      if (!source.length) return [];

      const sorted = [...source].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return a.title.localeCompare(b.title);
      });

      const seen = new Set();
      const out = [];
      for (const movie of sorted) {
        const label = buildMovieChoiceLabel(movie);
        const key = normalize(label);
        if (!label || seen.has(key)) continue;
        seen.add(key);
        out.push(label);
        if (out.length >= limit) break;
      }
      return out;
    }

    function showStatusSuggestions(titles) {
      if (!els.statusSuggestions) return;
      if (!Array.isArray(titles) || !titles.length) {
        hideStatusSuggestions();
        return;
      }
      els.statusSuggestions.innerHTML = titles
        .map((title) => `<button class="suggestion-chip" type="button" data-title="${escapeHtml(title)}">${escapeHtml(title)}</button>`)
        .join("");
      els.statusSuggestions.classList.remove("hidden");
    }

    function hideStatusSuggestions() {
      if (!els.statusSuggestions) return;
      els.statusSuggestions.innerHTML = "";
      els.statusSuggestions.classList.add("hidden");
    }

    function renderGuessTypeahead(input) {
      if (!els.guessTypeahead || !els.guessInput || !state.started || state.finished) {
        hideGuessTypeahead();
        return;
      }
      const raw = String(input || "").trim();
      if (raw.length < 2) {
        hideGuessTypeahead();
        return;
      }

      const options = getGuessTypeaheadOptions(raw, 12);
      if (!options.length) {
        hideGuessTypeahead();
        return;
      }

      typeaheadOptions = options;
      activeTypeaheadIndex = 0;

      const html = options.map((entry, index) => {
        const movie = entry.movie;
        const thumbKey = movieCacheKey(movie);
        const thumb = thumbCache[thumbKey];
        const fallback = escapeHtml((movie.title || "?").trim().charAt(0).toUpperCase() || "?");
        const thumbMarkup = thumb
          ? `<img src="${escapeHtml(thumb)}" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer" />`
          : fallback;
        const genreText = Array.isArray(movie.genres) && movie.genres.length
          ? escapeHtml(movie.genres.slice(0, 2).join(", "))
          : "Movie";
        return `
          <button class="guess-typeahead-item${index === activeTypeaheadIndex ? " active" : ""}" type="button" data-option-index="${index}" data-movie-key="${escapeHtml(thumbKey)}" role="option" aria-selected="${index === activeTypeaheadIndex ? "true" : "false"}">
            <span class="guess-typeahead-thumb">${thumbMarkup}</span>
            <span>
              <span class="guess-typeahead-main">${escapeHtml(entry.label)}</span>
              <span class="guess-typeahead-sub">${genreText}</span>
            </span>
          </button>
        `;
      }).join("");

      els.guessTypeahead.innerHTML = html;
      els.guessTypeahead.classList.remove("hidden");
      hydrateTypeaheadPosters(options);
    }

    function hideGuessTypeahead() {
      if (!els.guessTypeahead) return;
      typeaheadOptions = [];
      activeTypeaheadIndex = -1;
      els.guessTypeahead.innerHTML = "";
      els.guessTypeahead.classList.add("hidden");
    }

    function stepTypeaheadSelection(direction) {
      if (!Array.isArray(typeaheadOptions) || !typeaheadOptions.length) return;
      const count = typeaheadOptions.length;
      if (activeTypeaheadIndex < 0) activeTypeaheadIndex = 0;
      else activeTypeaheadIndex = (activeTypeaheadIndex + direction + count) % count;
      updateTypeaheadSelectionUi();
    }

    function updateTypeaheadSelectionUi() {
      if (!els.guessTypeahead) return;
      const nodes = Array.from(els.guessTypeahead.querySelectorAll(".guess-typeahead-item"));
      nodes.forEach((node, index) => {
        const active = index === activeTypeaheadIndex;
        node.classList.toggle("active", active);
        node.setAttribute("aria-selected", active ? "true" : "false");
      });
      const activeNode = nodes[activeTypeaheadIndex];
      if (activeNode) {
        activeNode.scrollIntoView({ block: "nearest" });
      }
    }

    function chooseTypeaheadOption(option) {
      if (!option || !option.movie) return;
      els.guessInput.value = buildMovieChoiceLabel(option.movie);
      hideGuessTypeahead();
      els.guessInput.focus();
      setStatus(`Selected "${option.movie.title}" (${option.movie.year}).`, "complete");
    }

    function setStatus(text, kind = "") {
      els.status.className = "status";
      if (kind) els.status.classList.add(kind);
      els.status.textContent = text;
      els.status.classList.remove("status-pulse");
      requestAnimationFrame(() => {
        els.status.classList.add("status-pulse");
      });
    }

function resolveApiBaseOrigin(explicitBase) {
  const candidate = String(explicitBase || "").trim()
    || String(window.FLICKLE_API_BASE || "").trim();
  if (candidate) return candidate.replace(/\/+$/, "");
  if (window.location.protocol === "file:") return "http://127.0.0.1:8787";
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://127.0.0.1:8787";
  }
  return window.location.origin;
}

    function buildApiUrl(pathname) {
      const path = String(pathname || "").trim();
      if (!path.startsWith("/")) {
        throw new Error(`API path must start with "/": ${path}`);
      }
      return `${apiBaseOrigin}${path}`;
    }

    function buildNavigationSearch(updates = {}, deleteKeys = []) {
      const params = new URLSearchParams(window.location.search);
      if (explicitApiBase) {
        params.set("api", explicitApiBase);
      }
      for (const key of deleteKeys) {
        params.delete(key);
      }
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      const query = params.toString();
      return query ? `?${query}` : "";
    }

    function navigateWithQuery(updates = {}, deleteKeys = []) {
      location.search = buildNavigationSearch(updates, deleteKeys);
    }

    function formatArchiveDateLabel(dateKey) {
      const parsed = parsePuzzleDateKey(dateKey);
      if (!parsed) return dateKey;
      return parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    }

    function formatArchiveWeekday(dateKey) {
      const parsed = parsePuzzleDateKey(dateKey);
      if (!parsed) return "";
      return parsed.toLocaleDateString(undefined, {
        weekday: "short"
      });
    }

    async function fetchArchiveProgressRange(from, to) {
      const response = await apiFetch(
        `/api/archive/progress?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { method: "GET" }
      );
      const data = await safeReadJson(response);
      if (response.status === 401) return { unauthorized: true, progress: [] };
      if (!response.ok) {
        throw new Error((data && data.error) || `Archive load failed (${response.status})`);
      }
      return { unauthorized: false, progress: Array.isArray(data && data.progress) ? data.progress : [] };
    }

    async function safeReadJson(response) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }

    async function apiFetch(pathname, options = {}) {
      const init = {
        credentials: "include",
        ...options
      };
      return fetch(buildApiUrl(pathname), init);
    }

    function isLikelyEmail(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
    }

    function getWorkerDevCommand() {
      return "cd /Users/jamesmcnicholas/Documents/New project/flickle/workers && npx wrangler dev";
    }

    function isLocalPreviewRuntime() {
      return window.location.protocol === "file:"
        || window.location.hostname === "localhost"
        || window.location.hostname === "127.0.0.1";
    }

    function isNetworkFetchError(error) {
      const text = String(error && error.message ? error.message : error || "").toLowerCase();
      return text.includes("failed to fetch")
        || text.includes("networkerror")
        || text.includes("network request failed")
        || text.includes("load failed")
        || text.includes("couldn't connect to server");
    }

    function buildApiOfflineHelpText() {
      const target = escapeHtml(apiBaseOrigin);
      if (isLocalPreviewRuntime()) {
        const command = escapeHtml(getWorkerDevCommand());
        return `Account API is offline (${target}). Start it with: ${command}`;
      }
      return `Account API is offline (${target}). Check your Worker route/domain + CORS settings.`;
    }

    function setAuthMenuState() {
      if (!els.authStatusText || !els.authSignInBtn || !els.authSignOutBtn) return;
      if (!authState.checked || authState.loading) {
        els.authStatusText.textContent = "Checking account status...";
        els.authSignInBtn.disabled = true;
        els.authSignOutBtn.disabled = true;
        return;
      }

      if (!authState.apiReachable) {
        els.authStatusText.textContent = buildApiOfflineHelpText();
        els.authSignInBtn.classList.remove("hidden");
        els.authSignOutBtn.classList.add("hidden");
        els.authSignInBtn.disabled = false;
        els.authSignOutBtn.disabled = true;
        return;
      }

      els.authSignInBtn.disabled = false;
      els.authSignOutBtn.disabled = false;
      if (authState.user && authState.user.email) {
        els.authStatusText.textContent = `Signed in as ${authState.user.email}. Archive sync is enabled.`;
        els.authSignInBtn.classList.add("hidden");
        els.authSignOutBtn.classList.remove("hidden");
      } else {
        els.authStatusText.textContent = "Not signed in. Sign in to save daily and archive progress.";
        els.authSignInBtn.classList.remove("hidden");
        els.authSignOutBtn.classList.add("hidden");
      }
    }

    function getArchivePuzzleDateForSync() {
      if (customMode) return "";
      if (gameMode !== "daily" && gameMode !== "archive") return "";
      return /^\d{4}-\d{2}-\d{2}$/.test(puzzleKey) ? puzzleKey : "";
    }

    function getArchiveSyncStorageKey(puzzleDate) {
      const userId = authState && authState.user && authState.user.id
        ? String(authState.user.id).trim()
        : "anonymous";
      const apiScope = String(apiBaseOrigin || window.location.origin || "").trim().replace(/\/+$/, "");
      return `${ARCHIVE_SYNC_KEY_PREFIX}-${userId}-${apiScope}-${puzzleDate}`;
    }

    function loadArchiveSyncMarker(puzzleDate) {
      const raw = storageGet(getArchiveSyncStorageKey(puzzleDate));
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        if (!["started", "won", "lost"].includes(String(parsed.status || "").trim())) return null;
        return parsed;
      } catch {
        storageRemove(getArchiveSyncStorageKey(puzzleDate));
        return null;
      }
    }

    function saveArchiveSyncMarker(puzzleDate, payload) {
      storageSet(getArchiveSyncStorageKey(puzzleDate), JSON.stringify({
        status: payload.status,
        guesses_used: payload.guesses_used,
        guesses_signature: getArchiveGuessesSignature(payload.guesses),
        synced_at: new Date().toISOString()
      }));
    }

    function getArchiveGuessesSignature(guesses) {
      if (!Array.isArray(guesses) || !guesses.length) return "";
      return guesses
        .map((guess) => {
          if (!guess || typeof guess !== "object") return "";
          const title = String(guess.title || "").trim();
          const year = Number(guess.year);
          if (!title || !Number.isInteger(year)) return "";
          return `${normalize(title)}|${year}`;
        })
        .filter(Boolean)
        .join("||");
    }

    function buildArchiveProgressPayload() {
      const puzzleDate = getArchivePuzzleDateForSync();
      if (!puzzleDate) return null;
      const rawGuessCount = Number(state.guesses.length) || 0;
      if (!state.finished && rawGuessCount < 1) return null;
      const guessesUsed = Math.min(MAX_GUESSES, Math.max(1, rawGuessCount));
      const guesses = state.guesses
        .map((guess) => {
          if (!guess || typeof guess !== "object") return null;
          const title = String(guess.title || "").trim();
          const year = Number(guess.year);
          if (!title || !Number.isInteger(year)) return null;
          return { title, year };
        })
        .filter(Boolean)
        .slice(0, MAX_GUESSES);
      return {
        puzzle_date: puzzleDate,
        status: state.finished ? (state.won ? "won" : "lost") : "started",
        guesses_used: guessesUsed,
        guesses
      };
    }

    function getArchiveProgressStatusRank(status) {
      if (status === "won" || status === "lost") return 2;
      if (status === "started") return 1;
      return 0;
    }

    function choosePreferredArchiveProgressRow(current, candidate) {
      if (!current) return candidate || null;
      if (!candidate) return current;

      const currentRank = getArchiveProgressStatusRank(current.status);
      const candidateRank = getArchiveProgressStatusRank(candidate.status);
      if (candidateRank !== currentRank) {
        return candidateRank > currentRank ? candidate : current;
      }

      const currentGuesses = Number(current.guesses_used) || 0;
      const candidateGuesses = Number(candidate.guesses_used) || 0;
      if (candidateGuesses !== currentGuesses) {
        return candidateGuesses > currentGuesses ? candidate : current;
      }

      if (current.localOnly && !candidate.localOnly) return candidate;
      return current;
    }

    function buildLocalProgressRow() {
      const payload = buildArchiveProgressPayload();
      if (!payload) return null;
      return {
        ...payload,
        updated_at: state.localUpdatedAt || null,
        localOnly: true
      };
    }

    function readArchiveProgressRowFromStorage(storageKey, puzzleDate) {
      const raw = storageGet(storageKey);
      if (!raw) return null;

      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.guesses)) return null;

        const rawGuessCount = parsed.guesses.length;
        const guessCount = Math.min(MAX_GUESSES, Math.max(0, Number(rawGuessCount) || 0));
        const started = Boolean(parsed.started) || guessCount > 0;
        const finished = Boolean(parsed.finished);
        if (!started && !finished) return null;
        if (finished) return null;

        return {
          puzzle_date: puzzleDate,
          status: "started",
          guesses_used: Math.max(1, guessCount || 1),
          localOnly: true
        };
      } catch {
        return null;
      }
    }

    function getLocalArchiveProgressRow(puzzleDate) {
      const archiveRow = readArchiveProgressRowFromStorage(`flickle-archive-state-${puzzleDate}`, puzzleDate);
      const dailyRow = readArchiveProgressRowFromStorage(`flickle-state-${puzzleDate}`, puzzleDate);
      return choosePreferredArchiveProgressRow(archiveRow, dailyRow);
    }

    async function syncArchiveProgressPayloadIfNeeded(payload, reason = "runtime") {
      if (!payload) return;
      if (!authState.user || !authState.user.id) return;

      const previous = loadArchiveSyncMarker(payload.puzzle_date);
      const guessesSignature = getArchiveGuessesSignature(payload.guesses);
      if (
        previous
        && previous.status === payload.status
        && Number(previous.guesses_used) === Number(payload.guesses_used)
        && String(previous.guesses_signature || "") === guessesSignature
      ) {
        return;
      }

      const inFlightKey = `${payload.puzzle_date}|${payload.status}|${payload.guesses_used}`;
      if (archiveSyncInFlight.has(inFlightKey)) return;
      archiveSyncInFlight.add(inFlightKey);

      try {
        const response = await apiFetch("/api/archive/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await safeReadJson(response);
        if (!response.ok) {
          throw new Error((data && data.error) || `Archive sync failed (${response.status})`);
        }
        saveArchiveSyncMarker(payload.puzzle_date, payload);
      } catch (error) {
        console.warn(`Flickle archive sync skipped (${reason}):`, error);
      } finally {
        archiveSyncInFlight.delete(inFlightKey);
      }
    }

    async function syncArchiveProgressIfNeeded(reason = "runtime") {
      const payload = buildArchiveProgressPayload();
      return syncArchiveProgressPayloadIfNeeded(payload, reason);
    }

    async function refreshAuthState(options = {}) {
      const { silent = false } = options;
      if (authState.loading) return authState.user;
      authState.loading = true;
      if (!silent) {
        authState.checked = false;
      }
      setAuthMenuState();

      try {
        const response = await apiFetch("/api/me", { method: "GET" });
        const data = await safeReadJson(response);
        authState.apiReachable = true;
        if (response.status === 401) {
          authState.user = null;
        } else if (!response.ok) {
          throw new Error((data && data.error) || `Auth check failed (${response.status})`);
        } else {
          authState.user = data && data.user ? data.user : null;
        }
      } catch (error) {
        console.warn("Flickle auth state check failed:", error);
        authState.user = null;
        if (isNetworkFetchError(error)) {
          authState.apiReachable = false;
        }
      } finally {
        authState.checked = true;
        authState.loading = false;
        setAuthMenuState();
      }

      if (authState.user) {
        syncArchiveProgressIfNeeded("auth-refresh").catch((error) => {
          console.warn("Flickle archive sync on auth refresh failed:", error);
        });
      }
      return authState.user;
    }

    async function requestMagicLink(email) {
      const response = await apiFetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await safeReadJson(response);
      if (!response.ok) {
        throw new Error((data && data.error) || `Sign-in request failed (${response.status})`);
      }
      return data || {};
    }

    async function fetchUserStats() {
      const response = await apiFetch("/api/stats", { method: "GET" });
      const data = await safeReadJson(response);
      if (response.status === 401) return { unauthorized: true, stats: null };
      if (!response.ok) {
        throw new Error((data && data.error) || `Stats load failed (${response.status})`);
      }
      return { unauthorized: false, stats: data && data.stats ? data.stats : null };
    }

    function getStatsSyncStorageKey() {
      const userId = authState && authState.user && authState.user.id
        ? String(authState.user.id).trim()
        : "anonymous";
      const apiScope = String(apiBaseOrigin || window.location.origin || "").trim().replace(/\/+$/, "");
      return `${STATS_SYNC_KEY_PREFIX}-${userId}-${apiScope}`;
    }

    function loadStatsSyncMarker() {
      return String(storageGet(getStatsSyncStorageKey()) || "").trim();
    }

    function saveStatsSyncMarker(updatedAt) {
      if (!updatedAt) return;
      storageSet(getStatsSyncStorageKey(), String(updatedAt));
    }

    function buildSyncableStatsPayload(stats) {
      return {
        dailyStreak: Math.max(0, Number(stats.dailyStreak) || 0),
        bestDailyStreak: Math.max(0, Number(stats.bestDailyStreak) || 0),
        winStreak: Math.max(0, Number(stats.winStreak) || 0),
        bestWinStreak: Math.max(0, Number(stats.bestWinStreak) || 0),
        lastDailyPlayedKey: typeof stats.lastDailyPlayedKey === "string" ? stats.lastDailyPlayedKey : null,
        lastDailyWinKey: typeof stats.lastDailyWinKey === "string" ? stats.lastDailyWinKey : null,
        updatedAt: typeof stats.updatedAt === "string" ? stats.updatedAt : null
      };
    }

    function getStatsUpdatedAtMs(stats) {
      const text = stats && typeof stats.updatedAt === "string" ? stats.updatedAt : "";
      const ms = Date.parse(text);
      return Number.isFinite(ms) ? ms : 0;
    }

    function mergeSyncedStats(localStats, remoteStats) {
      if (!remoteStats) return localStats;
      const localMs = getStatsUpdatedAtMs(localStats);
      const remoteMs = getStatsUpdatedAtMs(remoteStats);
      const preferRemote = remoteMs > localMs;
      return {
        ...localStats,
        dailyStreak: preferRemote ? Math.max(0, Number(remoteStats.dailyStreak) || 0) : Math.max(0, Number(localStats.dailyStreak) || 0),
        bestDailyStreak: Math.max(
          Math.max(0, Number(localStats.bestDailyStreak) || 0),
          Math.max(0, Number(remoteStats.bestDailyStreak) || 0)
        ),
        winStreak: preferRemote ? Math.max(0, Number(remoteStats.winStreak) || 0) : Math.max(0, Number(localStats.winStreak) || 0),
        bestWinStreak: Math.max(
          Math.max(0, Number(localStats.bestWinStreak) || 0),
          Math.max(0, Number(remoteStats.bestWinStreak) || 0)
        ),
        lastDailyPlayedKey: preferRemote
          ? (typeof remoteStats.lastDailyPlayedKey === "string" ? remoteStats.lastDailyPlayedKey : null)
          : (typeof localStats.lastDailyPlayedKey === "string" ? localStats.lastDailyPlayedKey : null),
        lastDailyWinKey: preferRemote
          ? (typeof remoteStats.lastDailyWinKey === "string" ? remoteStats.lastDailyWinKey : null)
          : (typeof localStats.lastDailyWinKey === "string" ? localStats.lastDailyWinKey : null),
        updatedAt: preferRemote
          ? (typeof remoteStats.updatedAt === "string" ? remoteStats.updatedAt : localStats.updatedAt)
          : localStats.updatedAt
      };
    }

    function shouldPushMergedStatsToServer(mergedStats, remoteStats) {
      if (!remoteStats) return true;
      return (
        Math.max(0, Number(mergedStats.dailyStreak) || 0) !== Math.max(0, Number(remoteStats.dailyStreak) || 0)
        || Math.max(0, Number(mergedStats.bestDailyStreak) || 0) !== Math.max(0, Number(remoteStats.bestDailyStreak) || 0)
        || Math.max(0, Number(mergedStats.winStreak) || 0) !== Math.max(0, Number(remoteStats.winStreak) || 0)
        || Math.max(0, Number(mergedStats.bestWinStreak) || 0) !== Math.max(0, Number(remoteStats.bestWinStreak) || 0)
        || (typeof mergedStats.lastDailyPlayedKey === "string" ? mergedStats.lastDailyPlayedKey : null)
          !== (typeof remoteStats.lastDailyPlayedKey === "string" ? remoteStats.lastDailyPlayedKey : null)
        || (typeof mergedStats.lastDailyWinKey === "string" ? mergedStats.lastDailyWinKey : null)
          !== (typeof remoteStats.lastDailyWinKey === "string" ? remoteStats.lastDailyWinKey : null)
      );
    }

    async function syncUserStatsIfNeeded(reason = "runtime") {
      if (!authState.user || !authState.user.id) return;
      const stats = loadStats();
      const payload = buildSyncableStatsPayload(stats);
      if (!payload.updatedAt) return;
      if (loadStatsSyncMarker() === payload.updatedAt) return;

      try {
        const response = await apiFetch("/api/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await safeReadJson(response);
        if (!response.ok) {
          throw new Error((data && data.error) || `Stats sync failed (${response.status})`);
        }
        saveStatsSyncMarker(payload.updatedAt);
      } catch (error) {
        console.warn(`Flickle stats sync skipped (${reason}):`, error);
      }
    }

    async function hydrateUserStatsFromServer() {
      const user = authState.user || await refreshAuthState({ silent: true });
      if (!user || !user.id) return;

      const localStats = loadStats();
      const result = await fetchUserStats();
      if (result.unauthorized) return;

      const remoteStats = result.stats;
      if (!remoteStats) {
        if (!getStatsUpdatedAtMs(localStats)) {
          persistStats(localStats);
        }
        await syncUserStatsIfNeeded("stats-bootstrap");
        return;
      }

      const localMs = getStatsUpdatedAtMs(localStats);
      const remoteMs = getStatsUpdatedAtMs(remoteStats);
      const merged = mergeSyncedStats(localStats, remoteStats);
      persistStats(merged, { touch: false });

      if (localMs >= remoteMs || shouldPushMergedStatsToServer(merged, remoteStats)) {
        persistStats(merged);
        await syncUserStatsIfNeeded("stats-local-preferred");
      } else {
        saveStatsSyncMarker(typeof remoteStats.updatedAt === "string" ? remoteStats.updatedAt : "");
      }
    }

    function showSignInModal() {
      const body = `
        <div class="howto">
          <section class="howto-section">
            <h3 class="howto-heading">Sign In</h3>
            <p class="howto-text">Enter your email to receive a magic sign-in link.</p>
          </section>
          <section class="howto-section">
            <input id="auth-email-input" class="modal-input" type="email" placeholder="you@example.com" autocomplete="email" />
            <div class="modal-actions">
              <button id="auth-send-link-btn" class="modal-btn" type="button">Send Sign-In Link</button>
            </div>
            <p id="auth-modal-status" class="howto-mini"></p>
          </section>
        </div>
      `;
      showModal("Account Sign In", body, true);

      const emailInput = document.getElementById("auth-email-input");
      const sendBtn = document.getElementById("auth-send-link-btn");
      const statusEl = document.getElementById("auth-modal-status");
      if (!emailInput || !sendBtn || !statusEl) return;

      const updateStatus = (text, allowHtml = false) => {
        if (allowHtml) statusEl.innerHTML = text;
        else statusEl.textContent = text;
      };

      const send = async () => {
        const email = String(emailInput.value || "").trim().toLowerCase();
        if (!isLikelyEmail(email)) {
          updateStatus("Enter a valid email address.");
          return;
        }

        sendBtn.disabled = true;
        updateStatus("Sending sign-in link...");
        try {
          const payload = await requestMagicLink(email);
          authState.apiReachable = true;
          setAuthMenuState();
          updateStatus("If that email exists, a sign-in link has been generated.");
          if (payload && payload.dev_magic_link) {
            const safeLink = escapeHtml(payload.dev_magic_link);
            updateStatus(`Dev link: <a href="${safeLink}" target="_blank" rel="noopener noreferrer">${safeLink}</a>`, true);
          }
        } catch (error) {
          if (isNetworkFetchError(error)) {
            authState.apiReachable = false;
            setAuthMenuState();
            updateStatus(buildApiOfflineHelpText());
          } else {
            updateStatus(`Could not send sign-in link: ${escapeHtml(error.message || String(error))}`);
          }
        } finally {
          sendBtn.disabled = false;
        }
      };

      sendBtn.addEventListener("click", send);
      emailInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          send();
        }
      });
      emailInput.focus();
    }

    async function signOutAccount() {
      const response = await apiFetch("/api/auth/logout", { method: "POST" });
      const data = await safeReadJson(response);
      if (!response.ok) {
        throw new Error((data && data.error) || `Sign-out failed (${response.status})`);
      }
      authState.user = null;
      authState.checked = true;
      authState.loading = false;
      setAuthMenuState();
    }

    function trackAnalyticsEvent(name, params = {}) {
      try {
        if (consentChoice !== "all" || typeof window.gtag !== "function") return;
        ensureAnalyticsLoaded();
        window.gtag("event", name, params);
      } catch (error) {
        console.warn("Analytics event failed:", name, error);
      }
    }

    function openXShareComposer() {
      const text = buildShareText();
      const link = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      const popup = window.open(link, "_blank", "noopener,noreferrer");
      return Boolean(popup);
    }

    async function shareResult() {
      const text = buildShareText();
      const copyResult = await copyTextWithFallback(text);
      if (copyResult === "copied") {
        trackAnalyticsEvent("share_success", {
          method: "clipboard",
          game_mode: gameMode,
          custom_mode: customMode ? "yes" : "no",
          puzzle_key: puzzleKey
        });
        setStatus("Copied to clipboard.", "success");
        playUiSound("share");
        return "copied";
      } else {
        trackAnalyticsEvent("share_failed", {
          method: "clipboard",
          game_mode: gameMode,
          custom_mode: customMode ? "yes" : "no",
          puzzle_key: puzzleKey
        });
        showManualCopyFallback(text);
        setStatus("Clipboard unavailable. Press ⌘C / Ctrl+C to copy.", "complete");
        return "manual";
      }
    }

    function showManualCopyFallback(text) {
      const safeText = String(text || "");
      const promptMessage = "Copy failed. Press \u2318C / Ctrl+C to copy, then press Enter.";
      try {
        window.prompt(promptMessage, safeText);
      } catch {
        // No-op: status message already tells the user what to do.
      }
    }

    async function copyTextWithFallback(text) {
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          return "copied";
        } catch {
          // Fall through to legacy fallback.
        }
      }

      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        textArea.style.pointerEvents = "none";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, text.length);
        const ok = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (ok) return "copied";
      } catch {
        // Final fallback handled by prompt in caller.
      }

      return "manual";
    }

    let uiAudioContext = null;
    let uiAudioMasterGain = null;
    let uiNoiseBuffer = null;
    const UI_SOUND_MASTER_GAIN = 1.35;
    const UI_SOUND_GAIN_BOOST = 2.6;

    function primeUiSounds() {
      // Synthetic audio: lazily initialized on first user action to respect autoplay rules.
    }

    function ensureUiAudio() {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (!uiAudioContext) {
        uiAudioContext = new Ctx();
        uiAudioMasterGain = uiAudioContext.createGain();
        uiAudioMasterGain.gain.value = UI_SOUND_MASTER_GAIN;
        uiAudioMasterGain.connect(uiAudioContext.destination);
      }
      if (uiAudioContext.state === "suspended") {
        uiAudioContext.resume().catch(() => {});
      }
      return uiAudioContext;
    }

    function getUiNoiseBuffer(ctx) {
      if (uiNoiseBuffer && uiNoiseBuffer.sampleRate === ctx.sampleRate) return uiNoiseBuffer;
      const length = Math.max(1, Math.floor(ctx.sampleRate * 0.2));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        channel[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }
      uiNoiseBuffer = buffer;
      return uiNoiseBuffer;
    }

    function scheduleTone(ctx, opts) {
      const {
        start = ctx.currentTime,
        duration = 0.08,
        type = "sine",
        from = 440,
        to = from,
        gain = 0.12
      } = opts || {};
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(40, from), start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), start + duration);
      const boostedGain = Math.min(0.45, Math.max(0.0001, gain * UI_SOUND_GAIN_BOOST));
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.exponentialRampToValueAtTime(boostedGain, start + Math.min(0.015, duration * 0.25));
      amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(amp);
      amp.connect(uiAudioMasterGain);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    }

    function schedulePopNoise(ctx, opts) {
      const {
        start = ctx.currentTime,
        duration = 0.045,
        gain = 0.11,
        frequency = 1750,
        q = 1.6
      } = opts || {};
      const src = ctx.createBufferSource();
      src.buffer = getUiNoiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = Math.max(120, frequency);
      filter.Q.value = Math.max(0.1, q);
      const amp = ctx.createGain();
      const boostedGain = Math.min(0.42, Math.max(0.0001, gain * UI_SOUND_GAIN_BOOST));
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.exponentialRampToValueAtTime(boostedGain, start + 0.006);
      amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      src.connect(filter);
      filter.connect(amp);
      amp.connect(uiAudioMasterGain);
      src.start(start);
      src.stop(start + duration + 0.01);
    }

    function schedulePopcornClick(ctx, start, intensity = 1) {
      const hit = Math.max(0.4, Math.min(1.4, intensity));
      schedulePopNoise(ctx, {
        start,
        duration: 0.011,
        gain: 0.06 * hit,
        frequency: 2850,
        q: 2.7
      });
      schedulePopNoise(ctx, {
        start: start + 0.0045,
        duration: 0.015,
        gain: 0.045 * hit,
        frequency: 2100,
        q: 1.9
      });
      scheduleTone(ctx, {
        start: start + 0.001,
        duration: 0.014,
        type: "triangle",
        from: 1550,
        to: 980,
        gain: 0.02 * hit
      });
    }

    function scheduleBubbleCluster(ctx, start, size = "medium") {
      const sets = size === "large"
        ? [
            { dt: 0.012, from: 560, to: 760, dur: 0.052, gain: 0.018 },
            { dt: 0.040, from: 640, to: 880, dur: 0.048, gain: 0.017 },
            { dt: 0.072, from: 730, to: 1010, dur: 0.045, gain: 0.0165 },
            { dt: 0.102, from: 860, to: 1180, dur: 0.042, gain: 0.015 }
          ]
        : [
            { dt: 0.016, from: 620, to: 860, dur: 0.046, gain: 0.0165 },
            { dt: 0.052, from: 760, to: 1040, dur: 0.041, gain: 0.0155 },
            { dt: 0.084, from: 900, to: 1220, dur: 0.038, gain: 0.0145 }
          ];

      for (const bubble of sets) {
        const ts = start + bubble.dt;
        scheduleTone(ctx, {
          start: ts,
          duration: bubble.dur,
          type: "sine",
          from: bubble.from,
          to: bubble.to,
          gain: bubble.gain
        });
        schedulePopNoise(ctx, {
          start: ts,
          duration: 0.018,
          gain: bubble.gain * 0.35,
          frequency: 1700,
          q: 1.1
        });
      }
    }

    function playUiSound(kind) {
      if (!uiSettings.soundEnabled) return;
      if (!UI_SOUND_TYPES.includes(kind)) return;
      const ctx = ensureUiAudio();
      if (!ctx || !uiAudioMasterGain) return;
      const t = ctx.currentTime + 0.01;

      try {
        if (kind === "guess") {
          // A dry popcorn crack, followed by soft soda-like bubble pops as clues flip.
          schedulePopcornClick(ctx, t, 1);
          scheduleBubbleCluster(ctx, t + 0.004, "medium");
          return;
        }
        if (kind === "start") {
          scheduleTone(ctx, { start: t, duration: 0.08, type: "sine", from: 300, to: 430, gain: 0.07 });
          scheduleTone(ctx, { start: t + 0.03, duration: 0.09, type: "triangle", from: 410, to: 520, gain: 0.05 });
          return;
        }
        if (kind === "share") {
          scheduleTone(ctx, { start: t, duration: 0.08, type: "sine", from: 660, to: 760, gain: 0.055 });
          scheduleTone(ctx, { start: t + 0.055, duration: 0.085, type: "sine", from: 840, to: 940, gain: 0.05 });
          return;
        }
        if (kind === "win") {
          scheduleTone(ctx, { start: t, duration: 0.09, type: "triangle", from: 520, to: 700, gain: 0.07 });
          scheduleTone(ctx, { start: t + 0.06, duration: 0.1, type: "triangle", from: 700, to: 920, gain: 0.065 });
          scheduleTone(ctx, { start: t + 0.12, duration: 0.12, type: "sine", from: 920, to: 1120, gain: 0.05 });
          return;
        }
        if (kind === "lose") {
          scheduleTone(ctx, { start: t, duration: 0.1, type: "sine", from: 380, to: 270, gain: 0.06 });
          scheduleTone(ctx, { start: t + 0.08, duration: 0.14, type: "triangle", from: 280, to: 180, gain: 0.045 });
          return;
        }
        if (kind === "error") {
          schedulePopNoise(ctx, { start: t, duration: 0.03, gain: 0.06 });
          scheduleTone(ctx, { start: t, duration: 0.045, type: "sawtooth", from: 260, to: 210, gain: 0.04 });
          return;
        }
        if (kind === "toggle-on") {
          scheduleTone(ctx, { start: t, duration: 0.06, type: "sine", from: 560, to: 740, gain: 0.05 });
          scheduleTone(ctx, { start: t + 0.03, duration: 0.07, type: "triangle", from: 720, to: 980, gain: 0.04 });
          return;
        }
        if (kind === "hint-ready") {
          scheduleTone(ctx, { start: t, duration: 0.05, type: "triangle", from: 620, to: 820, gain: 0.045 });
          scheduleTone(ctx, { start: t + 0.045, duration: 0.06, type: "sine", from: 860, to: 1160, gain: 0.052 });
          schedulePopNoise(ctx, { start: t + 0.026, duration: 0.02, gain: 0.024, frequency: 1900, q: 1.3 });
          return;
        }
      } catch {
        // Keep gameplay uninterrupted if audio scheduling fails.
      }
    }

    function flashActionButton(button, text) {
      if (!button) return;
      if (!button.dataset.baseText) {
        button.dataset.baseText = button.textContent.trim();
      }
      const original = button.dataset.baseText;
      if (button.dataset.flashTimer) {
        window.clearTimeout(Number(button.dataset.flashTimer));
      }
      button.textContent = text;
      const timer = window.setTimeout(() => {
        button.textContent = original;
        delete button.dataset.flashTimer;
      }, 1500);
      button.dataset.flashTimer = String(timer);
    }

    function renderSharePreview() {
      const text = buildShareText();
      els.sharePreviewText.textContent = text;

      const lines = text.split("\n");
      const previewTitle = (lines[0] || "Flickle").replace("#Flickle", "Flickle");
      els.sharePreviewTitle.textContent = previewTitle;
    }

    function buildCompletionStatusMessage() {
      const finishedGuessCount = getFinishedGuessCount();
      if (state.won) {
        if (customMode) {
          return `Challenge solved. Nice work: ${finishedGuessCount}/${MAX_GUESSES}.`;
        }
        if (gameMode === "jam") {
          return `Practice solved. Great job: ${finishedGuessCount}/${MAX_GUESSES}.`;
        }
        if (gameMode === "archive") {
          return `Archive solved. Great job: ${finishedGuessCount}/${MAX_GUESSES}.`;
        }
        return `Already solved today. Great job: ${finishedGuessCount}/${MAX_GUESSES}.`;
      }
      if (customMode) {
        return `Challenge complete. You gave it a solid run.`;
      }
      if (gameMode === "jam") {
        return `Practice complete. Tough luck — the answer was ${answer.title}.`;
      }
      if (gameMode === "archive") {
        return `Archive complete. Tough luck — the answer was ${answer.title}.`;
      }
      return `Daily Flickle complete. Tough luck — today's movie was ${answer.title}.`;
    }

    function persistState() {
      const updatedAt = new Date().toISOString();
      const payload = {
        started: state.started,
        guesses: state.guesses.map((g) => ({
          title: g.title,
          year: Number.isFinite(g.year) ? g.year : null
        })),
        finished: state.finished,
        won: state.won,
        message: state.message,
        scored: state.scored,
        hintPoints: state.hintPoints,
        hintsUsed: state.hintsUsed,
        revealedHintCast: Array.isArray(state.revealedHintCast) ? state.revealedHintCast : [],
        updatedAt
      };
      try {
        storageSet(storageKey, JSON.stringify(payload));
      } catch (error) {
        // Never block gameplay if storage is unavailable or quota is full.
        console.warn("Flickle state save failed:", error);
      }
      state.localUpdatedAt = updatedAt;
      persistPracticeSessionMemory();
    }

    function persistPracticeSessionMemory() {
      if (gameMode !== "jam") return;
      storageSet(PRACTICE_LAST_SEED_KEY, jamSeed);
      const inProgress = !state.finished && (state.started || state.guesses.length > 0);
      storageSet(PRACTICE_IN_PROGRESS_KEY, inProgress ? "1" : "0");
    }

    function loadState() {
      const raw = storageGet(storageKey);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.guesses)) return;
        state.started = Boolean(parsed.started);
        state.guesses = parsed.guesses.map(resolveMovieReference).filter(Boolean);
        state.finished = Boolean(parsed.finished);
        state.won = Boolean(parsed.won);
        state.message = typeof parsed.message === "string" ? parsed.message : "";
        state.scored = Boolean(parsed.scored);
        state.hintPoints = Math.max(0, Number(parsed.hintPoints) || 0);
        state.hintsUsed = Math.max(0, Math.min(HINTS_MAX_PER_GAME, Number(parsed.hintsUsed) || 0));
        state.localUpdatedAt = typeof parsed.updatedAt === "string" ? parsed.updatedAt : "";
        state.revealedHintCast = Array.isArray(parsed.revealedHintCast)
          ? parsed.revealedHintCast
            .map((name) => String(name || "").trim())
            .filter(Boolean)
          : [];

        // Backward compatibility for older saves that did not persist `won`
        // reliably: if a finished game contains the answer in guesses, treat it as solved.
        if (state.finished && !state.won) {
          const guessedAnswer = state.guesses.some((movie) => moviesMatchByIdentity(movie, answer));
          if (guessedAnswer) state.won = true;
        }
      } catch {
        storageRemove(storageKey);
      }
    }

    function bindTopShell() {
      const bind = (element, eventName, handler, label) => {
        if (!element || typeof element.addEventListener !== "function") {
          console.warn(`Flickle shell bind skipped: missing ${label}`);
          return false;
        }
        element.addEventListener(eventName, handler);
        if (eventName === "click" && element.dataset) {
          element.dataset.shellBound = "1";
        }
        return true;
      };

      bind(els.menuOpenBtn, "click", openMenu, "menu-open-btn");
      bind(els.menuCloseBtn, "click", closeMenu, "menu-close-btn");
      bind(els.menuOverlay, "click", closeMenu, "menu-overlay");

      bind(els.statsBtn, "click", () => showStatsModal("Stats"), "stats-btn");
      bind(els.helpBtn, "click", () => showHelpModal(), "help-btn");
      bind(els.audioBtn, "click", () => {
        uiSettings.soundEnabled = !uiSettings.soundEnabled;
        persistUiSettings(uiSettings);
        applyUiSettings();
        setStatus(`Sound ${uiSettings.soundEnabled ? "on" : "off"} (UI setting).`, "success");
        if (uiSettings.soundEnabled) {
          playUiSound("toggle-on");
        }
      }, "audio-btn");

      bind(els.menuHome, "click", () => {
        state.started = false;
        persistState();
        closeMenu();
        renderAll();
      }, "menu-home");
      bind(els.menuHowto, "click", () => {
        showHelpModal();
      }, "menu-howto");
      bind(els.menuAbout, "click", () => {
        showAboutModal();
      }, "menu-about");
      bind(els.menuContact, "click", () => {
        showContactModal();
      }, "menu-contact");
      bind(els.menuPrivacy, "click", () => {
        showPrivacyModal();
      }, "menu-privacy");
      bind(els.menuConsent, "click", () => {
        showConsentModal();
      }, "menu-consent");
      bind(els.menuTerms, "click", () => {
        showTermsModal();
      }, "menu-terms");
      bind(els.modeDaily, "click", () => {
        navigateWithQuery(
          { mode: null, date: null, seed: null, archiveStatus: null, archiveGuesses: null },
          ["mode", "date", "seed", "archiveStatus", "archiveGuesses"]
        );
      }, "mode-daily");
      bind(els.modeArchive, "click", () => {
        showArchiveModal();
      }, "mode-archive");
      bind(els.modeCreate, "click", () => {
        showCreateModal();
      }, "mode-create");
      bind(els.authSignInBtn, "click", () => {
        showSignInModal();
      }, "auth-signin-btn");
      bind(els.authSignOutBtn, "click", async () => {
        try {
          await signOutAccount();
          setStatus("Signed out.", "success");
          closeModal();
        } catch (error) {
          setStatus(`Sign out failed: ${error.message || String(error)}`, "error");
        }
      }, "auth-signout-btn");

      bind(els.modalOverlay, "click", (event) => {
        if (event.target === els.modalOverlay) closeModal();
      }, "modal-overlay");
      bind(els.modalCloseBtn, "click", closeModal, "modal-close-btn");

      bind(els.consentAcceptBtn, "click", () => {
        saveConsentChoice("all");
      }, "consent-accept-btn");
      bind(els.consentEssentialBtn, "click", () => {
        saveConsentChoice("essential");
      }, "consent-essential-btn");
      bind(els.consentManageBtn, "click", () => {
        showConsentModal();
      }, "consent-manage-btn");

      // Delegated fallback: keeps top controls working even if one direct bind misses.
      if (!window.__flickleTopShellDelegatedBound) {
        window.__flickleTopShellDelegatedBound = true;
        document.addEventListener("click", (event) => {
          const trigger = event.target && event.target.closest
            ? event.target.closest("#menu-open-btn, #menu-close-btn, #menu-overlay, #stats-btn, #help-btn, #audio-btn")
            : null;
          if (!trigger) return;
          if (trigger.dataset && trigger.dataset.shellBound === "1") return;

          if (trigger.id === "menu-open-btn") openMenu();
          else if (trigger.id === "menu-close-btn" || trigger.id === "menu-overlay") closeMenu();
          else if (trigger.id === "stats-btn") showStatsModal("Stats");
          else if (trigger.id === "help-btn") showHelpModal();
          else if (trigger.id === "audio-btn") {
            uiSettings.soundEnabled = !uiSettings.soundEnabled;
            persistUiSettings(uiSettings);
            applyUiSettings();
          }
        });
      }
    }

    function openMenu() {
      els.sideMenu.classList.add("on");
      els.menuOverlay.classList.add("on");
      els.sideMenu.setAttribute("aria-hidden", "false");
    }

    function closeMenu() {
      els.sideMenu.classList.remove("on");
      els.menuOverlay.classList.remove("on");
      els.sideMenu.setAttribute("aria-hidden", "true");
    }

    // Expose hard fallbacks used by inline handlers when regular binding gets interrupted.
    window.__flickleMenuOpenFallback = openMenu;
    window.__flickleMenuCloseFallback = closeMenu;

    function showModal(title, body, allowHtml = false) {
      els.modalTitle.textContent = title;
      els.modalBody.classList.toggle("html", allowHtml);
      if (allowHtml) {
        els.modalBody.innerHTML = body;
      } else {
        els.modalBody.textContent = body;
      }
      els.modalOverlay.classList.add("on");
      closeMenu();
    }

    function closeModal() {
      els.modalOverlay.classList.remove("on");
    }

    function showHelpModal() {
      showModal(
        "How To Play",
        `<div class="howto">
          <section class="howto-section">
            <h3 class="howto-heading">Goal</h3>
            <p class="howto-text">Find the mystery movie in <strong>10 guesses</strong>. Start with any title, or tap <strong>Random Start</strong> on guess one to break the ice.</p>
          </section>
          <section class="howto-section">
            <h3 class="howto-heading">Color Key</h3>
            <p class="howto-text">Each tile tells you how close that clue is:</p>
            <div class="howto-legend" aria-hidden="true">
              <span class="howto-chip hit">Green = Match</span>
              <span class="howto-chip near">Yellow = Close</span>
              <span class="howto-chip miss">Gray = No Match</span>
            </div>
            <p class="howto-tip">Tip: <strong>↑</strong> means the answer is higher/more, <strong>↓</strong> means lower/less.</p>
          </section>
          <section class="howto-section">
            <h3 class="howto-heading">Good First Steps</h3>
            <ul class="howto-list">
              <li>Use broad guesses early (popular movies help narrow faster).</li>
              <li>Follow directional clues on year, runtime, title words, and box office.</li>
              <li>Use genre, rating, country, language, and franchise to tighten your search.</li>
            </ul>
          </section>
          <p class="howto-mini">Daily mode counts toward streaks. Archive lets you replay past dailies, and Create is for friend challenges.</p>
        </div>`,
        true
      );
    }

    function showAboutModal() {
      showModal(
        "About Flickle",
        `<div class="howto">
          <section class="howto-section">
            <h3 class="howto-heading">The Idea</h3>
            <p class="howto-text">Flickle is a movie deduction game. You get 10 guesses to find the mystery film using clue tiles for year, runtime, genre, cast, studio, language, and more.</p>
          </section>
          <section class="howto-section">
            <h3 class="howto-heading">How A Round Works</h3>
            <ul class="howto-list">
              <li>Start with any movie title.</li>
              <li>Read color + arrow clues to narrow in.</li>
              <li>Earn hint points from close and exact matches.</li>
              <li>Solve it in as few guesses as possible.</li>
            </ul>
          </section>
          <section class="howto-section">
            <h3 class="howto-heading">Modes</h3>
            <ul class="howto-list">
              <li><strong>Daily:</strong> one official puzzle each day.</li>
              <li><strong>Archive:</strong> replay past daily puzzles by date.</li>
              <li><strong>Create:</strong> make a custom challenge link for friends.</li>
            </ul>
          </section>
          <p class="howto-mini">Built for movie fans who love puzzle logic and shareable wins.</p>
        </div>`,
        true
      );
    }

    function showContactModal() {
      showModal(
        "Contact",
        `<div class="howto">
          <section class="howto-section">
            <h3 class="howto-heading">Feedback and Support</h3>
            <p class="howto-text">Want to report a bug, suggest a feature, or request a movie/fact addition? Reach out any time:</p>
            <ul class="howto-list">
              <li><strong>Email:</strong> support@flickle.io</li>
              <li><strong>X:</strong> @Flickle_io</li>
              <li><strong>Bluesky:</strong> @Flickle.io</li>
            </ul>
          </section>
          <section class="howto-section">
            <h3 class="howto-heading">What Helps Most</h3>
            <ul class="howto-list">
              <li>Exact movie title and year you tried.</li>
              <li>Game mode (Daily, Archive, or Create).</li>
              <li>A screenshot and what you expected to happen.</li>
            </ul>
          </section>
        </div>`,
        true
      );
    }

    function showPrivacyModal() {
      showModal(
        "Privacy",
        `<div class="howto">
          <section class="howto-section">
            <h3 class="howto-heading">What We Store</h3>
            <p class="howto-text">Flickle stores gameplay settings and progress in your browser (for example streaks, guesses, and UI preferences). This helps your game state persist between visits.</p>
          </section>
          <section class="howto-section">
            <h3 class="howto-heading">Accounts</h3>
            <p class="howto-text">Flickle can optionally support account sign-in for features like archive progress syncing. Playing without an account remains available.</p>
          </section>
          <section class="howto-section">
            <h3 class="howto-heading">Cookies and Advertising</h3>
            <p class="howto-text">Flickle may use cookies and similar technologies for core site functionality, analytics, and advertising. Third-party vendors, including Google, may use cookies to serve ads based on your prior visits to this site or other sites.</p>
          </section>
          <section class="howto-section">
            <h3 class="howto-heading">Third-Party Services</h3>
            <p class="howto-text">Movie metadata and artwork may use The Movie Database (TMDB). Advertising and measurement services may process identifiers such as cookies, IP address, and device/browser information to deliver and measure ads.</p>
          </section>
          <section class="howto-section">
            <h3 class="howto-heading">Your Choices</h3>
            <p class="howto-text">Where required by law, Flickle requests consent before using non-essential cookies. You can also manage cookie preferences in your browser settings. For ad personalization controls, you can review Google ad settings and available opt-out options.</p>
          </section>
          <section class="howto-section">
            <h3 class="howto-heading">Questions</h3>
            <p class="howto-text">For privacy questions or requests, contact: support@flickle.io.</p>
          </section>
          <p class="howto-mini">Last updated: May 17, 2026.</p>
        </div>`,
        true
      );
    }

    function showConsentModal() {
      const current = consentChoice === "all"
        ? "Accept all"
        : consentChoice === "essential"
          ? "Essential only"
          : "Not set";
      const body = `
        <div class="howto">
          <section class="howto-section">
            <h3 class="howto-heading">Current Preference</h3>
            <p class="howto-text">${escapeHtml(current)}</p>
          </section>
          <section class="howto-section">
            <h3 class="howto-heading">What This Controls</h3>
            <p class="howto-text">Essential storage keeps core gameplay working. "Accept all" also allows non-essential technologies used for advertising and measurement where enabled.</p>
          </section>
          <section class="howto-section">
            <h3 class="howto-heading">Update Choice</h3>
            <div class="modal-actions">
              <button id="consent-modal-accept" class="modal-btn" type="button">Accept All</button>
              <button id="consent-modal-essential" class="modal-btn" type="button">Essential Only</button>
            </div>
          </section>
          <p class="howto-mini">You can return here any time to change this setting.</p>
        </div>
      `;
      showModal("Consent", body, true);
      const acceptBtn = document.getElementById("consent-modal-accept");
      const essentialBtn = document.getElementById("consent-modal-essential");
      if (acceptBtn) {
        acceptBtn.addEventListener("click", () => {
          saveConsentChoice("all");
          closeModal();
          setStatus("Consent updated: Accept all.", "success");
        });
      }
      if (essentialBtn) {
        essentialBtn.addEventListener("click", () => {
          saveConsentChoice("essential");
          closeModal();
          setStatus("Consent updated: Essential only.", "success");
        });
      }
    }

    function showTermsModal() {
      showModal(
        "Terms",
        `<div class="howto">
          <section class="howto-section">
            <h3 class="howto-heading">Use of the Game</h3>
            <p class="howto-text">Flickle is provided for personal entertainment. Please use it lawfully and do not abuse or attempt to disrupt the service.</p>
          </section>
          <section class="howto-section">
            <h3 class="howto-heading">Content and Availability</h3>
            <p class="howto-text">Movie data, clues, and facts can change over time. The game is provided \"as is\" without guarantees of uninterrupted availability.</p>
          </section>
          <section class="howto-section">
            <h3 class="howto-heading">Intellectual Property</h3>
            <p class="howto-text">Flickle branding and game presentation belong to the site owner. Movie titles, posters, and related trademarks belong to their respective owners.</p>
          </section>
          <section class="howto-section">
            <h3 class="howto-heading">Limitation of Liability</h3>
            <p class="howto-text">Flickle is provided "as is" and "as available." To the fullest extent permitted by law, Flickle is not liable for indirect, incidental, or consequential damages arising from use of the site.</p>
          </section>
          <section class="howto-section">
            <h3 class="howto-heading">Changes to Terms</h3>
            <p class="howto-text">These terms may be updated over time. Continued use of Flickle after updates means you accept the revised terms.</p>
          </section>
          <section class="howto-section">
            <h3 class="howto-heading">Contact</h3>
            <p class="howto-text">Legal or policy questions: support@flickle.io.</p>
          </section>
          <p class="howto-mini">By using Flickle, you agree to these terms. Last updated: May 17, 2026.</p>
        </div>`,
        true
      );
    }

    function showStatsModal(title) {
      const stats = loadStats();
      const winRate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
      const lines = [
        `Played: ${stats.played}`,
        `Wins: ${stats.wins}`,
        `Win rate: ${winRate}%`,
        `Daily streak: ${stats.dailyStreak}`,
        `Best daily streak: ${stats.bestDailyStreak}`,
        `Win streak: ${stats.winStreak}`,
        `Best win streak: ${stats.bestWinStreak}`,
        `Best solve: ${stats.bestGuess ?? "-"} guesses`
      ];
      showModal(title, lines.join("\n"));
    }

    function showDataHealthModal() {
      const issueLines = DATA_AUDIT.issues.slice(0, 20).map((line) => `- ${line}`);
      const body = [
        `Movies total (guess library): ${MOVIES.length}`,
        `Answer-library size (locked): ${answerLibraryMovies.length}`,
        `Daily-ready movies: ${DATA_AUDIT.answerPool.length}`,
        `Practice-ready movies: ${DATA_AUDIT.jamAnswerPool.length}`,
        `Daily threshold: voteCount >= ${ANSWER_MIN_VOTES}, voteAverage >= ${ANSWER_MIN_RATING.toFixed(1)}, castScore >= ${ANSWER_MIN_CAST_SCORE}, popularity >= ${ANSWER_MIN_POPULARITY}`,
        `Daily backfill target: ${DAILY_POOL_TARGET_SIZE} (fill threshold: voteCount >= ${DAILY_POOL_FILL_MIN_VOTES}, voteAverage >= ${DAILY_POOL_FILL_MIN_RATING.toFixed(1)}, castScore >= ${DAILY_POOL_FILL_MIN_CAST_SCORE}, popularity >= ${DAILY_POOL_FILL_MIN_POPULARITY})`,
        `Practice threshold: voteCount >= ${JAM_MIN_VOTES}, voteAverage >= ${JAM_MIN_RATING.toFixed(1)}, castScore >= ${JAM_MIN_CAST_SCORE}, popularity >= ${JAM_MIN_POPULARITY}`,
        `Daily core (strict): ${DATA_AUDIT.coreDailyCount}`,
        `Daily backfilled: ${DATA_AUDIT.backfilledDailyCount}`,
        `Mainstream movies found: ${DATA_AUDIT.mainstreamCount}`,
        `High cast-familiarity movies: ${DATA_AUDIT.castFamiliarCount}`,
        `Missing Oscar noms: ${DATA_AUDIT.missingOscarCount}`,
        `Missing studio: ${DATA_AUDIT.missingStudioCount}`,
        `Missing box office: ${DATA_AUDIT.missingBoxOfficeCount}`,
        `Duplicate title/year entries: ${DATA_AUDIT.duplicateCount}`,
        `Field issues: ${DATA_AUDIT.fieldIssueCount}`,
        "",
        DATA_AUDIT.issues.length ? "Sample issues:" : "No issues found.",
        ...issueLines
      ].join("\n");
      showModal("Data Health", body);
    }

    function showTmdbKeyModal() {
      const masked = tmdbApiKey ? `${tmdbApiKey.slice(0, 4)}...${tmdbApiKey.slice(-4)}` : "Not set";
      const body = `
        <div class="modal-field">Paste your TMDB v3 API key to enable better poster icons.</div>
        <div class="modal-field">Current key: ${escapeHtml(masked)}</div>
        <input id="tmdb-key-input" class="modal-input" placeholder="TMDB API key..." />
        <div class="modal-actions">
          <button id="tmdb-save-btn" class="modal-btn" type="button">Save Key</button>
          <button id="tmdb-clear-btn" class="modal-btn" type="button">Clear Key</button>
        </div>
        <div class="modal-link">Get one free at themoviedb.org/settings/api</div>
      `;
      showModal("TMDB Poster Key", body, true);

      const input = document.getElementById("tmdb-key-input");
      const saveBtn = document.getElementById("tmdb-save-btn");
      const clearBtn = document.getElementById("tmdb-clear-btn");

      saveBtn.addEventListener("click", () => {
        const value = (input.value || "").trim();
        if (!value) return;
        storageSet(TMDB_KEY_STORAGE, value);
        storageRemove(THUMB_CACHE_KEY);
        showModal("TMDB Poster Key", "Saved. Reloading so new poster lookups use TMDB.");
        setTimeout(() => location.reload(), 450);
      });

      clearBtn.addEventListener("click", () => {
        storageRemove(TMDB_KEY_STORAGE);
        storageRemove(THUMB_CACHE_KEY);
        showModal("TMDB Poster Key", "Cleared. Reloading now.");
        setTimeout(() => location.reload(), 450);
      });
    }

    function showCreateModal() {
      const options = orderedTitles.map((title) => `<option value="${escapeHtml(title)}"></option>`).join("");
      const body = `
        <div class="modal-field">Pick a movie for your friend to guess.</div>
        <input id="create-movie-input" class="modal-input" list="create-movie-options" placeholder="Type a movie title..." />
        <datalist id="create-movie-options">${options}</datalist>
        <div class="modal-actions">
          <button id="create-link-btn" class="modal-btn" type="button">Generate Link</button>
          <button id="copy-link-btn" class="modal-btn" type="button">Copy Link</button>
        </div>
        <div id="create-link-output" class="modal-link">No link generated yet.</div>
      `;
      showModal("Create Challenge", body, true);

      const input = document.getElementById("create-movie-input");
      const createBtn = document.getElementById("create-link-btn");
      const copyBtn = document.getElementById("copy-link-btn");
      const output = document.getElementById("create-link-output");
      let latestLink = "";

      function generate() {
        const raw = (input.value || "").trim();
        const disambiguation = getTitleDisambiguationChoices(raw, 6);
        if (disambiguation.length) {
          output.textContent = "That title has multiple versions. Pick one with a year (e.g., Title (1998)).";
          latestLink = "";
          return;
        }
        const picked = findMovieByInput(raw);
        if (!picked) {
          output.textContent = "Choose a movie from the Flickle library.";
          latestLink = "";
          return;
        }
        latestLink = buildCustomChallengeUrl(picked);
        output.textContent = latestLink;
      }

      createBtn.addEventListener("click", generate);
      copyBtn.addEventListener("click", async () => {
        if (!latestLink) generate();
        if (!latestLink) return;
        try {
          await navigator.clipboard.writeText(latestLink);
          output.textContent = "Copied: " + latestLink;
        } catch {
          output.textContent = "Copy failed. Manual link: " + latestLink;
        }
      });
    }

    async function showArchiveModal() {
      closeMenu();
      const days = 45;
      const today = buildPuzzleDate(new Date(), 0);
      const dateKeys = [];
      for (let i = 1; i <= days; i += 1) {
        dateKeys.push(formatPuzzleKey(buildPuzzleDate(today, -i)));
      }
      if (!dateKeys.length) return;

      let progressByDate = new Map();
      let progressHelpText = "Sign in to see played/unplayed colors.";

      if (authState.user && authState.user.id) {
        progressHelpText = "Loading your archive progress...";
        try {
          const from = dateKeys[dateKeys.length - 1];
          const to = dateKeys[0];
          const result = await fetchArchiveProgressRange(from, to);
          if (!result.unauthorized) {
            progressByDate = new Map(
              result.progress
                .filter((row) => row && typeof row.puzzle_date === "string")
                .map((row) => [row.puzzle_date, row])
            );
            progressHelpText = "Green = completed, yellow = in progress, gray = unplayed.";
          } else {
            progressHelpText = "Sign in to show archive progress states.";
          }
        } catch (error) {
          progressHelpText = `Could not load archive progress: ${escapeHtml(error.message || String(error))}`;
        }
      }

      dateKeys.forEach((dateKey) => {
        const localRow = getLocalArchiveProgressRow(dateKey);
        if (!localRow) return;
        const currentRow = progressByDate.get(dateKey) || null;
        const mergedRow = choosePreferredArchiveProgressRow(currentRow, localRow);
        if (mergedRow) {
          progressByDate.set(dateKey, mergedRow);
        }
        if (
          authState.user
          && authState.user.id
          && mergedRow === localRow
        ) {
          syncArchiveProgressPayloadIfNeeded({
            puzzle_date: localRow.puzzle_date,
            status: localRow.status,
            guesses_used: localRow.guesses_used
          }, "archive-modal-local-repair").catch((error) => {
            console.warn("Flickle archive repair sync failed:", error);
          });
        }
      });

      const rowsHtml = dateKeys.map((dateKey, index) => {
        const row = progressByDate.get(dateKey);
        const isWon = row && row.status === "won";
        const isLost = row && row.status === "lost";
        const isStarted = row && row.status === "started";
        const isCompleted = isWon || isLost;
        const perfect = isWon && Number(row.guesses_used) === 1;
        const startedGuessCount = isStarted
          ? Math.max(1, Math.min(MAX_GUESSES, Number(row.guesses_used) || 1))
          : 0;
        const startedTurnText = isStarted ? `${startedGuessCount}/${MAX_GUESSES}` : "";
        const cardNoteText = isStarted ? startedTurnText : "";
        const statusText = isStarted
          ? "In progress"
          : isCompleted
            ? "Completed"
            : "Unplayed";
        const stateClass = perfect
          ? "state-won state-perfect"
          : isCompleted
            ? "state-won"
            : isStarted
              ? "state-started"
              : "state-unplayed";
        const weekdayLabel = formatArchiveWeekday(dateKey);
        const dayStamp = weekdayLabel ? weekdayLabel.toUpperCase() : "DAY";
        return `
          <button class="archive-card archive-date-btn ${stateClass}" type="button" data-archive-date="${escapeHtml(dateKey)}">
            <div class="archive-card-art">
              <span class="archive-card-art-mark">${escapeHtml(dayStamp)}</span>
              ${cardNoteText ? `<span class="archive-card-note">${escapeHtml(cardNoteText)}</span>` : ""}
              <span class="archive-card-status">${escapeHtml(statusText)}</span>
              <span class="archive-card-art-meta">${escapeHtml(`${index + 1} ${index === 0 ? "day" : "days"} ago`)}</span>
              <span class="archive-card-date">${escapeHtml(formatArchiveDateLabel(dateKey))}</span>
            </div>
            <div>
              <div class="archive-card-sub">Daily puzzle</div>
            </div>
          </button>
        `;
      }).join("");

      const playedCount = dateKeys.reduce((total, dateKey) => {
        const row = progressByDate.get(dateKey);
        return total + (row ? 1 : 0);
      }, 0);
      const wonCount = dateKeys.reduce((total, dateKey) => {
        const row = progressByDate.get(dateKey);
        return total + (row && row.status === "won" ? 1 : 0);
      }, 0);
      const completionPct = dateKeys.length ? Math.round((playedCount / dateKeys.length) * 100) : 0;
      const progressHtml = authState.user
        ? `
          <div class="archive-progress" aria-label="Archive progress summary">
            <div class="archive-progress-row">
              <span class="archive-progress-title">Archive Progress</span>
              <span class="archive-progress-values">
                <span>Played <strong>${playedCount}/${dateKeys.length}</strong></span>
                <span>Won <strong>${wonCount}</strong></span>
                <span>Complete <strong>${completionPct}%</strong></span>
              </span>
            </div>
            <div class="archive-progress-bar"><div class="archive-progress-fill" style="width:${completionPct}%"></div></div>
          </div>
        `
        : "";

      const body = `
        <div class="howto">
          <section class="howto-section">
            <h3 class="howto-heading">Archive</h3>
            <p class="howto-text">Missed a day? Explore Flickle's movie vault and replay any previous puzzle.</p>
            <p class="howto-mini">${progressHelpText}</p>
            ${progressHtml}
          </section>
          <section class="howto-section">
            <div class="archive-grid">${rowsHtml}</div>
          </section>
        </div>
      `;
      showModal("Archive", body, true);

      const dateButtons = Array.from(document.querySelectorAll("[data-archive-date]"));
      dateButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const dateKey = String(button.getAttribute("data-archive-date") || "").trim();
          if (!dateKey) return;
          const row = progressByDate.get(dateKey);
          const isCompleted = row && (row.status === "won" || row.status === "lost");
          navigateWithQuery({
            mode: "archive",
            date: dateKey,
            seed: null,
            archiveStatus: isCompleted ? row.status : null,
            archiveGuesses: isCompleted ? (Number(row.guesses_used) || null) : null
          }, ["seed", "archiveStatus", "archiveGuesses"]);
        });
      });
    }

    function applyUiSettings() {
      if (els.audioBtn) {
        els.audioBtn.classList.toggle("audio-off", !uiSettings.soundEnabled);
        els.audioBtn.textContent = uiSettings.soundEnabled ? "🔊" : "🔇";
      }
    }

    function loadUiSettings() {
      const defaults = { soundEnabled: true };
      const raw = storageGet(UI_SETTINGS_KEY);
      if (!raw) return { ...defaults };
      try {
        const parsed = JSON.parse(raw);
        return {
          soundEnabled: parsed.soundEnabled !== false
        };
      } catch {
        storageRemove(UI_SETTINGS_KEY);
        return { ...defaults };
      }
    }

    function persistUiSettings(value) {
      storageSet(UI_SETTINGS_KEY, JSON.stringify({
        soundEnabled: value.soundEnabled !== false
      }));
    }

    function loadStats() {
      const defaults = {
        played: 0,
        wins: 0,
        dailyStreak: 0,
        bestDailyStreak: 0,
        winStreak: 0,
        bestWinStreak: 0,
        bestGuess: null,
        lastSolvedKey: null,
        lastDailyPlayedKey: null,
        lastDailyWinKey: null,
        updatedAt: ""
      };
      const raw = storageGet(STATS_KEY);
      if (!raw) return { ...defaults };
      try {
        const parsed = JSON.parse(raw);
        const fallbackWinStreak = Number.isFinite(parsed.currentStreak) ? parsed.currentStreak : 0;
        const fallbackBestWinStreak = Number.isFinite(parsed.bestStreak) ? parsed.bestStreak : 0;
        return {
          played: Number.isFinite(parsed.played) ? parsed.played : 0,
          wins: Number.isFinite(parsed.wins) ? parsed.wins : 0,
          dailyStreak: Number.isFinite(parsed.dailyStreak)
            ? parsed.dailyStreak
            : (Number.isFinite(parsed.dailyPlayStreak) ? parsed.dailyPlayStreak : 0),
          bestDailyStreak: Number.isFinite(parsed.bestDailyStreak)
            ? parsed.bestDailyStreak
            : (Number.isFinite(parsed.bestDailyPlayStreak) ? parsed.bestDailyPlayStreak : 0),
          winStreak: Number.isFinite(parsed.winStreak) ? parsed.winStreak : fallbackWinStreak,
          bestWinStreak: Number.isFinite(parsed.bestWinStreak) ? parsed.bestWinStreak : fallbackBestWinStreak,
          bestGuess: Number.isFinite(parsed.bestGuess) ? parsed.bestGuess : null,
          lastSolvedKey: typeof parsed.lastSolvedKey === "string" ? parsed.lastSolvedKey : null,
          lastDailyPlayedKey: typeof parsed.lastDailyPlayedKey === "string" ? parsed.lastDailyPlayedKey : null,
          lastDailyWinKey: typeof parsed.lastDailyWinKey === "string"
            ? parsed.lastDailyWinKey
            : (typeof parsed.lastSolvedKey === "string" ? parsed.lastSolvedKey : null),
          updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : ""
        };
      } catch {
        storageRemove(STATS_KEY);
        return { ...defaults };
      }
    }

    function persistStats(value, options = {}) {
      const { touch = true } = options;
      const next = {
        ...value,
        updatedAt: touch
          ? new Date().toISOString()
          : (typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString())
      };
      storageSet(STATS_KEY, JSON.stringify(next));
      return next;
    }

    function applyResultStats() {
      if (customMode) return;
      const stats = loadStats();
      const alreadyCountedDailyPlay = gameMode === "daily" && stats.lastDailyPlayedKey === puzzleKey;
      const alreadyCountedDailyWin = gameMode === "daily" && stats.lastDailyWinKey === puzzleKey;
      if (!(gameMode === "daily" && alreadyCountedDailyPlay)) {
        stats.played += 1;
      }
      if (gameMode === "daily" && !alreadyCountedDailyPlay) {
        stats.dailyStreak = isPreviousDayKey(stats.lastDailyPlayedKey, puzzleKey)
          ? stats.dailyStreak + 1
          : 1;
        stats.lastDailyPlayedKey = puzzleKey;
      }
      if (state.won) {
        if (!(gameMode === "daily" && alreadyCountedDailyWin)) {
          stats.wins += 1;
        }
        if (gameMode === "daily" && !alreadyCountedDailyWin) {
          stats.winStreak = isPreviousDayKey(stats.lastDailyWinKey, puzzleKey)
            ? stats.winStreak + 1
            : 1;
          stats.lastDailyWinKey = puzzleKey;
        }
        stats.lastSolvedKey = puzzleKey;
        if (stats.bestGuess === null || state.guesses.length < stats.bestGuess) {
          stats.bestGuess = state.guesses.length;
        }
      } else if (gameMode === "daily") {
        stats.winStreak = 0;
      }
      stats.bestDailyStreak = Math.max(stats.bestDailyStreak, stats.dailyStreak);
      stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.winStreak);
      const persistedStats = persistStats(stats);
      syncUserStatsIfNeeded("result-stats").catch((error) => {
        console.warn("Flickle stats sync after result failed:", error);
      });
      return persistedStats;
    }

    function isPreviousDayKey(previousKey, currentKey) {
      if (typeof previousKey !== "string" || typeof currentKey !== "string") return false;
      const prev = dateFromPuzzleKey(previousKey);
      const curr = dateFromPuzzleKey(currentKey);
      if (!prev || !curr) return false;
      return (curr.getTime() - prev.getTime()) === 24 * 60 * 60 * 1000;
    }

    function dateFromPuzzleKey(key) {
      if (typeof key !== "string") return null;
      const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return null;
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    function buildShareText() {
      const safeGuesses = sanitizeStateGuesses();
      const score = state.won ? state.guesses.length : "X";
      const numericScore = state.won ? state.guesses.length : MAX_GUESSES;
      const stats = loadStats();
      const lines = [`🎬 #Flickle ${puzzleKey}`];
      lines.push(`${score}/${MAX_GUESSES} — Rank: ${getFlickleRank(numericScore, state.won)}`);
      lines.push(`🔥 Daily: ${stats.dailyStreak} | Best: ${stats.bestDailyStreak}`);
      lines.push(`🏆 Wins: ${stats.winStreak} | Best: ${stats.bestWinStreak}`);
      const progressTokens = [];
      for (const guess of safeGuesses) {
        try {
          const rowStates = [
            compareYear(guess.year, answer.year).state,
            compareRuntime(guess.runtime, answer.runtime).state,
            compareTitleWordCount(guess.title, answer.title).state,
            compareGenre(guess.genres, answer.genres).state,
            compareExact(guess.director, answer.director).state,
            compareCastMatches(guess.cast, answer.cast).state,
            compareStudio(guess.studio, answer.studio).state,
            compareRating(guess, answer).state,
            compareBoxOffice(guess.boxOffice, answer.boxOffice).state,
            compareCountry(guess, answer).state,
            compareLanguage(guess, answer).state,
            compareFranchise(guess.franchise, answer.franchise).state
          ];
          const solved = moviesMatchByIdentity(guess, answer);
          progressTokens.push(getProgressTokenFromStates(rowStates, solved));
        } catch (error) {
          console.warn("Skipping invalid share progress row due to data error:", error, guess);
        }
      }
      while (progressTokens.length < MAX_GUESSES) {
        progressTokens.push("⬜");
      }
      lines.push("");
      lines.push(progressTokens.join(""));
      lines.push("");
      lines.push("Play:");
      lines.push("https://flickle.io");
      return lines.join("\n");
    }

    function getProgressTokenFromStates(states, solved) {
      if (solved) return "✅";
      const safeStates = Array.isArray(states) ? states : [];
      const maxPoints = safeStates.length * HINT_POINTS_HIT;
      if (maxPoints <= 0) return "⬛";

      let points = 0;
      for (const stateValue of safeStates) {
        if (stateValue === "hit") points += HINT_POINTS_HIT;
        else if (stateValue === "near") points += HINT_POINTS_NEAR;
      }
      const ratio = points / maxPoints;
      if (ratio >= 0.7) return "🟩";
      if (ratio >= 0.4) return "🟨";
      return "⬛";
    }

    function getFlickleRank(score, won = true) {
      if (!won) return "Lost in the Lobby";
      switch (Number(score)) {
        case 1: return "Lifetime Achievement Award";
        case 2: return "Oscar Lock";
        case 3: return "Box Office Legend";
        case 4: return "Leading Actor";
        case 5: return "Scene Stealer";
        case 6: return "Critics' Choice";
        case 7: return "Certified Fresh";
        case 8: return "Supporting Role";
        case 9: return "Background Extra";
        case 10:
        default:
          return "End Credits Only";
      }
    }

    function movieIdentityKey(movie) {
      if (!movie || typeof movie !== "object") return "";
      const titleKey = normalize(movie.title);
      const year = Number(movie.year);
      if (!titleKey || !Number.isFinite(year)) return "";
      return `${titleKey}|${year}`;
    }

    function moviesMatchByIdentity(left, right) {
      const leftKey = movieIdentityKey(left);
      const rightKey = movieIdentityKey(right);
      return Boolean(leftKey && rightKey && leftKey === rightKey);
    }

    function resolveMovieReference(value) {
      if (!value) return null;
      if (value && typeof value === "object" && typeof value.title === "string") {
        const fromIdentity = movieByIdentity.get(movieIdentityKey(value));
        if (fromIdentity) return fromIdentity;
        return movieByNormTitle.get(normalize(value.title)) || null;
      }
      if (typeof value === "string") {
        const byInput = findMovieByInput(value);
        if (byInput) return byInput;
        return movieByNormTitle.get(normalize(value)) || null;
      }
      if (value && typeof value === "object" && typeof value.name === "string") {
        const byInput = findMovieByInput(value.name);
        if (byInput) return byInput;
        return movieByNormTitle.get(normalize(value.name)) || null;
      }
      return null;
    }

    function sanitizeStateGuesses() {
      const safeGuesses = state.guesses
        .map(resolveMovieReference)
        .filter((guess) => guess && typeof guess.title === "string");
      if (safeGuesses.length !== state.guesses.length) {
        state.guesses = safeGuesses;
        persistState();
      }
      return safeGuesses;
    }

    function normalize(value) {
      return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/['’`]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    }

    function normalizeCompact(value) {
      return normalize(value).replace(/\s+/g, "");
    }

    function stripLeadingArticle(compactTitle) {
      const text = String(compactTitle || "").trim();
      if (!text) return "";
      if (text.startsWith("the") && text.length > 3) return text.slice(3);
      if (text.startsWith("an") && text.length > 2) return text.slice(2);
      if (text.startsWith("a") && text.length > 1) return text.slice(1);
      return text;
    }

    function boundedEditDistance(a, b, maxDistance = 2) {
      const left = String(a || "");
      const right = String(b || "");
      if (left === right) return 0;
      const leftLen = left.length;
      const rightLen = right.length;
      if (!leftLen) return rightLen <= maxDistance ? rightLen : maxDistance + 1;
      if (!rightLen) return leftLen <= maxDistance ? leftLen : maxDistance + 1;
      if (Math.abs(leftLen - rightLen) > maxDistance) return maxDistance + 1;

      let prev = new Array(rightLen + 1);
      let curr = new Array(rightLen + 1);
      for (let j = 0; j <= rightLen; j += 1) prev[j] = j;

      for (let i = 1; i <= leftLen; i += 1) {
        curr[0] = i;
        let rowMin = curr[0];
        const leftChar = left.charCodeAt(i - 1);
        for (let j = 1; j <= rightLen; j += 1) {
          const cost = leftChar === right.charCodeAt(j - 1) ? 0 : 1;
          const insertion = curr[j - 1] + 1;
          const deletion = prev[j] + 1;
          const substitution = prev[j - 1] + cost;
          const value = Math.min(insertion, deletion, substitution);
          curr[j] = value;
          if (value < rowMin) rowMin = value;
        }
        if (rowMin > maxDistance) return maxDistance + 1;
        const tmp = prev;
        prev = curr;
        curr = tmp;
      }

      return prev[rightLen];
    }

    function countTitleWords(title) {
      const cleaned = normalize(title);
      if (!cleaned) return 0;
      return cleaned.split(/\s+/).filter(Boolean).length;
    }

    function movieCacheKey(movie) {
      return movieIdentityKey(movie) || `${normalize(movie.title)}-${movie.year}`;
    }

    function getMovieTmdbId(movie) {
      const id = Number(movie && movie.tmdbId);
      return Number.isFinite(id) && id > 0 ? id : null;
    }

    function getTmdbResultYear(item) {
      const rawDate = String((item && item.release_date) || "").trim();
      if (!rawDate) return null;
      const year = Number(rawDate.slice(0, 4));
      return Number.isFinite(year) ? year : null;
    }

    function pickBestTmdbMovieResult(results, movie) {
      const list = Array.isArray(results) ? results.filter(Boolean) : [];
      if (!list.length || !movie || typeof movie !== "object") return null;

      const targetTitle = normalize(movie.title);
      const targetYear = Number.isFinite(Number(movie.year)) ? Number(movie.year) : null;
      if (!targetTitle) return null;

      const exactByYear = list.find((item) => {
        const titleNorm = normalize(item.title || "");
        const originalNorm = normalize(item.original_title || "");
        if (titleNorm !== targetTitle && originalNorm !== targetTitle) return false;
        if (targetYear === null) return true;
        return getTmdbResultYear(item) === targetYear;
      });
      if (exactByYear) return exactByYear;

      const exactTitle = list.find((item) => {
        const titleNorm = normalize(item.title || "");
        const originalNorm = normalize(item.original_title || "");
        return titleNorm === targetTitle || originalNorm === targetTitle;
      });
      if (exactTitle) return exactTitle;

      // Avoid short-title collisions like "Spider" accidentally matching "Spider-Man".
      const wordCount = targetTitle.split(/\s+/).filter(Boolean).length;
      if (wordCount >= 2) {
        const containsMatch = list.find((item) => normalize(item.title || "").includes(targetTitle));
        if (containsMatch) return containsMatch;
      }
      return list[0] || null;
    }

    async function fetchPosterForMovie(movie, size = "thumb") {
      const tmdbCandidates = [];
      const primary = String(tmdbApiKey || "").trim();
      const fallback = String(TMDB_DEFAULT_API_KEY || "").trim();
      if (primary) tmdbCandidates.push(primary);
      if (fallback && fallback !== primary) tmdbCandidates.push(fallback);

      for (const key of tmdbCandidates) {
        try {
          const tmdbPoster = await fetchPosterFromTmdb(movie, key, size);
          if (tmdbPoster) return tmdbPoster;
        } catch {
          // Try the next key candidate, then iTunes fallback.
        }
      }
      return fetchPosterFromItunes(movie, size);
    }

    async function fetchPosterFromTmdb(movie, apiKey, size = "thumb") {
      const tmdbId = getMovieTmdbId(movie);
      if (tmdbId !== null) {
        const detailsUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${encodeURIComponent(apiKey)}`;
        const detailsRes = await fetch(detailsUrl);
        if (detailsRes.status !== 401 && detailsRes.status !== 403 && detailsRes.ok) {
          const detail = await detailsRes.json();
          if (detail && detail.poster_path) {
            const tmdbSize = size === "hero" ? "w780" : "w342";
            return `https://image.tmdb.org/t/p/${tmdbSize}${detail.poster_path}`;
          }
        }
      }

      const query = encodeURIComponent(movie.title);
      const yearParam = Number.isFinite(movie.year) ? `&year=${movie.year}` : "";
      const url = `https://api.themoviedb.org/3/search/movie?api_key=${encodeURIComponent(apiKey)}&query=${query}${yearParam}&include_adult=false&page=1`;
      const response = await fetch(url);
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) return null;
      const payload = await response.json();
      const results = Array.isArray(payload.results) ? payload.results : [];
      if (!results.length) return null;

      const best = pickBestTmdbMovieResult(results, movie);
      if (!best || !best.poster_path) return null;
      const tmdbSize = size === "hero" ? "w780" : "w342";
      return `https://image.tmdb.org/t/p/${tmdbSize}${best.poster_path}`;
    }

    async function fetchPosterFromItunes(movie, size = "thumb") {
      const query = encodeURIComponent(`${movie.title} ${movie.year}`);
      const payload = await itunesSearchJsonp(`https://itunes.apple.com/search?term=${query}&entity=movie&limit=8`);
      const results = Array.isArray(payload.results) ? payload.results : [];
      if (!results.length) return null;

      const target = normalize(movie.title);
      const best = results.find((item) => normalize(item.trackName || "").includes(target)) || results[0];
      const art = best.artworkUrl100 || best.artworkUrl60 || null;
      if (!art) return null;
      const itunesSize = size === "hero" ? "600x600bb" : "300x300bb";
      return art.replace("100x100bb", itunesSize).replace("60x60bb", itunesSize);
    }

    async function fetchCastPortraitForName(castName) {
      const tmdbCandidates = [];
      const primary = String(tmdbApiKey || "").trim();
      const fallback = String(TMDB_DEFAULT_API_KEY || "").trim();
      if (primary) tmdbCandidates.push(primary);
      if (fallback && fallback !== primary) tmdbCandidates.push(fallback);

      for (const key of tmdbCandidates) {
        try {
          const portrait = await fetchCastPortraitFromTmdb(castName, key);
          if (portrait) return portrait;
        } catch {
          // Try next key candidate.
        }
      }
      return "";
    }

    async function fetchCastPortraitFromTmdb(castName, apiKey) {
      const query = encodeURIComponent(castName);
      const url = `https://api.themoviedb.org/3/search/person?api_key=${encodeURIComponent(apiKey)}&query=${query}&include_adult=false&page=1`;
      const response = await fetch(url);
      if (response.status === 401 || response.status === 403) return "";
      if (!response.ok) return "";
      const payload = await response.json();
      const results = Array.isArray(payload.results) ? payload.results : [];
      if (!results.length) return "";

      const target = normalize(castName);
      const best = results.find((item) => normalize(item.name || "") === target)
        || results.find((item) => normalize(item.name || "").includes(target))
        || results[0];
      if (!best || !best.profile_path) return "";
      return `https://image.tmdb.org/t/p/w185${best.profile_path}`;
    }

    function getActorInitials(castName) {
      const cleaned = String(castName || "").trim();
      if (!cleaned) return "?";
      const parts = cleaned.split(/\s+/).filter(Boolean);
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
    }

    function loadTmdbApiKey(params) {
      const fromQuery = (params.get("tmdbKey") || "").trim();
      if (fromQuery) {
        storageSet(TMDB_KEY_STORAGE, fromQuery);
        return fromQuery;
      }
      const fromStore = (storageGet(TMDB_KEY_STORAGE) || "").trim();
      return fromStore || TMDB_DEFAULT_API_KEY;
    }

    function itunesSearchJsonp(url) {
      return new Promise((resolve, reject) => {
        const callbackName = `flickleJsonp_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        const script = document.createElement("script");
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error("Poster lookup timed out"));
        }, 7000);

        function cleanup() {
          clearTimeout(timeout);
          if (script.parentNode) script.parentNode.removeChild(script);
          try {
            delete window[callbackName];
          } catch {
            window[callbackName] = undefined;
          }
        }

        window[callbackName] = (payload) => {
          cleanup();
          resolve(payload || {});
        };

        script.onerror = () => {
          cleanup();
          reject(new Error("Poster lookup failed"));
        };

        const sep = url.includes("?") ? "&" : "?";
        script.src = `${url}${sep}callback=${callbackName}`;
        document.head.appendChild(script);
      });
    }

    function loadThumbCache() {
      const raw = storageGet(THUMB_CACHE_KEY);
      if (!raw) return {};
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        storageRemove(THUMB_CACHE_KEY);
        return {};
      }
    }

    function persistThumbCache(cache) {
      storageSet(THUMB_CACHE_KEY, JSON.stringify(cache));
    }

    function loadCastPortraitCache() {
      const raw = storageGet(CAST_PORTRAIT_CACHE_KEY);
      if (!raw) return {};
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        storageRemove(CAST_PORTRAIT_CACHE_KEY);
        return {};
      }
    }

    function persistCastPortraitCache(cache) {
      storageSet(CAST_PORTRAIT_CACHE_KEY, JSON.stringify(cache));
    }

    function loadRatingCache() {
      const raw = storageGet(RATING_CACHE_KEY);
      if (!raw) return {};
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        storageRemove(RATING_CACHE_KEY);
        return {};
      }
    }

    function persistRatingCache(cache) {
      storageSet(RATING_CACHE_KEY, JSON.stringify(cache));
    }

    function loadLanguageCache() {
      const raw = storageGet(LANGUAGE_CACHE_KEY);
      if (!raw) return {};
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        storageRemove(LANGUAGE_CACHE_KEY);
        return {};
      }
    }

    function persistLanguageCache(cache) {
      storageSet(LANGUAGE_CACHE_KEY, JSON.stringify(cache));
    }

    function parseCustomMovieFromUrl() {
      const token = urlParams.get("custom");
      if (!token) return null;
      const decodedValue = decodeCustomToken(token);
      if (!decodedValue) return null;
      const byInput = findMovieByInput(decodedValue);
      if (byInput) return byInput;
      // Backward compatibility for older custom links that only encoded the title.
      return movieByNormTitle.get(normalize(decodedValue)) || null;
    }

    function buildCustomChallengeUrl(movie) {
      const token = encodeCustomToken(buildMovieChoiceLabel(movie));
      const base = location.href.split("?")[0].split("#")[0];
      return `${base}?custom=${encodeURIComponent(token)}`;
    }

    function encodeCustomToken(title) {
      const bytes = new TextEncoder().encode(title);
      let raw = "";
      for (const b of bytes) raw += String.fromCharCode(b);
      return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }

    function decodeCustomToken(token) {
      try {
        const padded = token.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((token.length + 3) % 4);
        const raw = atob(padded);
        const bytes = Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
        return new TextDecoder().decode(bytes);
      } catch {
        return null;
      }
    }

    function getCastFamiliarityScore(movie) {
      const cast = Array.isArray(movie?.cast) ? movie.cast : [];
      if (!cast.length) return 0;
      const familiarSet = getCastFamiliaritySet();
      let score = 0;

      for (let i = 0; i < Math.min(cast.length, 5); i += 1) {
        const name = normalize(cast[i]);
        if (!name) continue;
        if (!familiarSet.has(name)) continue;
        if (i === 0) score += 4;
        else if (i === 1) score += 3;
        else score += 2;
      }

      const voteCount = Number.isFinite(movie?.voteCount) ? movie.voteCount : 0;
      const voteAverage = Number.isFinite(movie?.voteAverage) ? movie.voteAverage : 0;
      const popularity = Number.isFinite(movie?.popularity) ? movie.popularity : 0;
      score += Math.max(0, Math.min(4, Math.floor(Math.log10(Math.max(1, voteCount))) - 2));
      if (voteAverage >= 7.5) score += 2;
      else if (voteAverage >= 7.0) score += 1;
      if (popularity >= 20) score += 2;
      else if (popularity >= 10) score += 1;

      return score;
    }

    function getCastFamiliaritySet() {
      if (castFamiliaritySetCache) return castFamiliaritySetCache;
      castFamiliaritySetCache = new Set(FAMILIAR_CAST_NAMES.map((name) => normalize(name)).filter(Boolean));
      return castFamiliaritySetCache;
    }

    function getMovieCastScore(movie) {
      if (!movie || typeof movie !== "object") return 0;
      if (Number.isFinite(movie.castScore)) return movie.castScore;
      return getCastFamiliarityScore(movie);
    }

    function validateDataset(movies, nomsByTitle) {
      const issues = [];
      const seen = new Set();
      const answerPool = [];
      const jamAnswerPool = [];
      const dailyFillCandidates = [];
      let mainstreamCount = 0;
      let castFamiliarCount = 0;
      let coreDailyCount = 0;
      let backfilledDailyCount = 0;
      let missingOscarCount = 0;
      let missingStudioCount = 0;
      let missingBoxOfficeCount = 0;
      let duplicateCount = 0;
      let fieldIssueCount = 0;

      for (const movie of movies) {
        const key = movieIdentityKey(movie) || normalize(movie.title);
        if (seen.has(key)) {
          duplicateCount += 1;
          issues.push(`Duplicate title/year: ${movie.title} (${movie.year})`);
          continue;
        }
        seen.add(key);

        let validFields = true;
        if (!Number.isFinite(movie.year)) { validFields = false; fieldIssueCount += 1; issues.push(`Missing year: ${movie.title}`); }
        if (!Number.isFinite(movie.runtime)) { validFields = false; fieldIssueCount += 1; issues.push(`Missing runtime: ${movie.title}`); }
        if (!Array.isArray(movie.genres) || movie.genres.length === 0) { validFields = false; fieldIssueCount += 1; issues.push(`Missing genres: ${movie.title}`); }
        if (!Array.isArray(movie.cast) || movie.cast.length === 0) { validFields = false; fieldIssueCount += 1; issues.push(`Missing cast: ${movie.title}`); }
        if (!movie.director) { validFields = false; fieldIssueCount += 1; issues.push(`Missing director: ${movie.title}`); }
        if (!movie.country || !movie.language) { validFields = false; fieldIssueCount += 1; issues.push(`Missing country/language: ${movie.title}`); }

        const hasOscar = Number.isFinite(nomsByTitle[movie.title]);
        if (!hasOscar) {
          missingOscarCount += 1;
          issues.push(`Missing Oscar noms: ${movie.title}`);
        }
        if (!String(movie.studio || "").trim()) {
          missingStudioCount += 1;
          issues.push(`Missing studio: ${movie.title}`);
        }
        if (!Number.isFinite(movie.boxOffice) || movie.boxOffice <= 0) {
          missingBoxOfficeCount += 1;
          issues.push(`Missing box office: ${movie.title}`);
        }

        const voteCount = Number.isFinite(movie.voteCount) ? movie.voteCount : 0;
        const voteAverage = Number.isFinite(movie.voteAverage) ? movie.voteAverage : 0;
        const popularity = Number.isFinite(movie.popularity) ? movie.popularity : 0;
        const mainstream = voteCount >= ANSWER_MIN_VOTES && voteAverage >= ANSWER_MIN_RATING;
        if (mainstream) mainstreamCount += 1;
        movie.castScore = getCastFamiliarityScore(movie);

        // Core daily pool: stricter mainstream + cast familiarity.
        if (validFields && mainstream && popularity >= ANSWER_MIN_POPULARITY) {
          if (movie.castScore >= ANSWER_MIN_CAST_SCORE) {
            castFamiliarCount += 1;
            answerPool.push(movie);
            coreDailyCount += 1;
          }
        }

        // Daily backfill candidates: still quality-filtered, just less strict than core.
        if (
          validFields &&
          voteCount >= DAILY_POOL_FILL_MIN_VOTES &&
          voteAverage >= DAILY_POOL_FILL_MIN_RATING &&
          movie.castScore >= DAILY_POOL_FILL_MIN_CAST_SCORE &&
          popularity >= DAILY_POOL_FILL_MIN_POPULARITY
        ) {
          const voteStrength = Math.max(0, Math.min(12, Math.log10(Math.max(1, voteCount)) * 3.2));
          const ratingStrength = Math.max(0, (voteAverage - DAILY_POOL_FILL_MIN_RATING) * 4.2);
          const castStrength = movie.castScore * 2.2;
          const popStrength = Math.max(0, Math.min(10, popularity / 6.5));
          const qualityScore = voteStrength + ratingStrength + castStrength + popStrength;
          dailyFillCandidates.push({
            movie,
            qualityScore
          });
        }

        // Practice answers should still be broadly recognizable, while clues can stay broad.
        if (
          validFields &&
          voteCount >= JAM_MIN_VOTES &&
          voteAverage >= JAM_MIN_RATING &&
          movie.castScore >= JAM_MIN_CAST_SCORE &&
          popularity >= JAM_MIN_POPULARITY
        ) {
          jamAnswerPool.push(movie);
        }
      }

      // Backfill daily pool up to target size without collapsing quality.
      if (answerPool.length < DAILY_POOL_TARGET_SIZE && dailyFillCandidates.length) {
        const alreadyInDaily = new Set(answerPool.map((movie) => `${normalize(movie.title)}|${movie.year}`));
        dailyFillCandidates.sort((a, b) => {
          if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
          const aVotes = Number.isFinite(a.movie.voteCount) ? a.movie.voteCount : 0;
          const bVotes = Number.isFinite(b.movie.voteCount) ? b.movie.voteCount : 0;
          if (bVotes !== aVotes) return bVotes - aVotes;
          const aPop = Number.isFinite(a.movie.popularity) ? a.movie.popularity : 0;
          const bPop = Number.isFinite(b.movie.popularity) ? b.movie.popularity : 0;
          if (bPop !== aPop) return bPop - aPop;
          const aYear = Number.isFinite(a.movie.year) ? a.movie.year : 0;
          const bYear = Number.isFinite(b.movie.year) ? b.movie.year : 0;
          if (bYear !== aYear) return bYear - aYear;
          return a.movie.title.localeCompare(b.movie.title);
        });
        for (const entry of dailyFillCandidates) {
          if (answerPool.length >= DAILY_POOL_TARGET_SIZE) break;
          const k = `${normalize(entry.movie.title)}|${entry.movie.year}`;
          if (alreadyInDaily.has(k)) continue;
          answerPool.push(entry.movie);
          alreadyInDaily.add(k);
          backfilledDailyCount += 1;
        }
      }

      const safeDailyPool = answerPool.length ? answerPool : movies.slice();
      const safeJamPool = jamAnswerPool.length
        ? jamAnswerPool
        : safeDailyPool;

      return {
        issues,
        answerPool: safeDailyPool,
        jamAnswerPool: safeJamPool.length ? safeJamPool : safeDailyPool,
        coreDailyCount,
        backfilledDailyCount,
        mainstreamCount,
        castFamiliarCount,
        missingOscarCount,
        missingStudioCount,
        missingBoxOfficeCount,
        duplicateCount,
        fieldIssueCount
      };
    }

    function buildPuzzleDate(baseDate, dayOffset) {
      const value = new Date(baseDate);
      value.setHours(0, 0, 0, 0);
      value.setDate(value.getDate() + dayOffset);
      return value;
    }

    function formatPuzzleKey(date) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function parsePuzzleDateKey(key) {
      const text = String(key || "").trim();
      const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return null;
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() !== year || (date.getMonth() + 1) !== month || date.getDate() !== day) return null;
      date.setHours(0, 0, 0, 0);
      return date;
    }

    function getSeasonalWindowForDate(date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const mmdd = month * 100 + day;
      if (mmdd >= 1024 && mmdd <= 1031) return { id: "halloween" };
      if (mmdd >= 1220 && mmdd <= 1231) return { id: "winter" };
      if (mmdd >= 212 && mmdd <= 214) return { id: "valentine" };
      return null;
    }

    function hasSeasonalTag(movie, seasonalWindowId) {
      if (!movie || typeof movie !== "object" || !seasonalWindowId) return false;
      const titleKey = normalize(movie.title);
      const genreKeys = Array.isArray(movie.genres)
        ? movie.genres.map((genre) => normalize(genre)).filter(Boolean)
        : [];
      const hasGenre = (name) => genreKeys.includes(normalize(name));

      if (seasonalWindowId === "halloween") {
        return hasGenre("horror")
          || hasGenre("thriller")
          || hasGenre("mystery")
          || titleKey.includes("halloween");
      }
      if (seasonalWindowId === "winter") {
        return titleKey.includes("christmas")
          || titleKey.includes("holiday")
          || titleKey.includes("xmas")
          || titleKey.includes("santa")
          || titleKey.includes("noel")
          || titleKey.includes("winter")
          || titleKey.includes("snow");
      }
      if (seasonalWindowId === "valentine") {
        return hasGenre("romance")
          || titleKey.includes("valentine")
          || titleKey.includes("love");
      }
      return false;
    }

    function hash(text) {
      let value = 0;
      for (let i = 0; i < text.length; i += 1) {
        value = (value * 31 + text.charCodeAt(i)) >>> 0;
      }
      return value;
    }

    function seededRandom(seed) {
      let t = seed >>> 0;
      return () => {
        t += 0x6D2B79F5;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
      };
    }

    function computeAnswerWeight(movie, mode, seasonalContext = null) {
      const castScore = getMovieCastScore(movie);
      const voteCount = Number.isFinite(movie.voteCount) ? movie.voteCount : 0;
      const voteAverage = Number.isFinite(movie.voteAverage) ? movie.voteAverage : 0;
      const popularity = Number.isFinite(movie.popularity) ? movie.popularity : 0;
      const voteBonus = Math.max(0, Math.min(5, Math.log10(Math.max(1, voteCount)) - 2));
      const ratingBonus = Math.max(0, voteAverage - ANSWER_MIN_RATING);
      const popBonus = Math.max(0, Math.min(4, popularity / 12));
      let seasonalMultiplier = 1;

      if (
        seasonalContext
        && seasonalContext.enabled
        && seasonalContext.windowId
        && hasSeasonalTag(movie, seasonalContext.windowId)
      ) {
        seasonalMultiplier = seasonalContext.multiplier;
      }

      if (mode === "jam") {
        // Practice keeps variety, but heavily favors recognizable mainstream titles.
        return (1 + castScore * 1.8 + voteBonus * 1.2 + ratingBonus * 1.4 + popBonus * 1.3) * seasonalMultiplier;
      }
      // Daily should feel mainstream/familiar.
      return (1 + castScore * 2.1 + voteBonus * 1.2 + ratingBonus * 1.3 + popBonus * 1.0) * seasonalMultiplier;
    }

    function pickWeightedMovie(pool, seedKey, mode) {
      const fallbackPool = Array.isArray(pool) && pool.length ? pool : MOVIES;
      let seasonalContext = null;
      if (SEASONAL_BOOST_ENABLED && mode === "daily") {
        const puzzleDate = parsePuzzleDateKey(seedKey);
        const seasonalWindow = getSeasonalWindowForDate(puzzleDate);
        if (seasonalWindow && seasonalWindow.id) {
          const boostGateRand = seededRandom(hash(`${seedKey}|${seasonalWindow.id}|${SEASONAL_WEIGHT_VERSION}|gate`));
          const boostToday = boostGateRand() < SEASONAL_BOOST_RATE;
          let boostedYesterday = false;
          const previousDate = buildPuzzleDate(puzzleDate, -1);
          const previousWindow = getSeasonalWindowForDate(previousDate);
          if (previousWindow && previousWindow.id === seasonalWindow.id) {
            const previousKey = formatPuzzleKey(previousDate);
            const prevBoostRand = seededRandom(hash(`${previousKey}|${seasonalWindow.id}|${SEASONAL_WEIGHT_VERSION}|gate`));
            boostedYesterday = prevBoostRand() < SEASONAL_BOOST_RATE;
          }
          // Prevent back-to-back seasonal push days to avoid over-theming.
          const effectiveBoostToday = boostToday && !boostedYesterday;
          if (effectiveBoostToday || boostedYesterday) {
            seasonalContext = {
              enabled: true,
              windowId: seasonalWindow.id,
              multiplier: boostedYesterday ? SEASONAL_COOLDOWN_MULTIPLIER : SEASONAL_BASE_MULTIPLIER
            };
          }
        }
      }
      const rand = seededRandom(hash(`${seedKey}|${mode}|flickle-cast-v1`));
      let totalWeight = 0;
      const weights = fallbackPool.map((movie) => {
        const weight = Math.max(0.001, computeAnswerWeight(movie, mode, seasonalContext));
        totalWeight += weight;
        return weight;
      });
      if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
        return fallbackPool[hash(seedKey) % fallbackPool.length];
      }

      let target = rand() * totalWeight;
      for (let i = 0; i < fallbackPool.length; i += 1) {
        target -= weights[i];
        if (target <= 0) return fallbackPool[i];
      }
      return fallbackPool[fallbackPool.length - 1];
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function installViewportHeightFix() {
      const touchDevice = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      const mobileLikeViewport = Math.min(window.screen.width || window.innerWidth, window.screen.height || window.innerHeight) < 900;
      const preferVisualViewport = touchDevice && mobileLikeViewport;

      const apply = () => {
        const innerHeight = Number.isFinite(window.innerHeight) ? Math.round(window.innerHeight) : 0;
        const vv = window.visualViewport;
        const vvHeight = vv && Number.isFinite(vv.height) ? Math.round(vv.height) : 0;
        const zoomed = !!(vv && Math.abs((vv.scale || 1) - 1) > 0.01);
        const viewHeight = preferVisualViewport && !zoomed && vvHeight > 0
          ? vvHeight
          : (innerHeight || vvHeight || 0);
        document.documentElement.style.setProperty("--app-height", `${Math.max(320, viewHeight)}px`);
      };
      apply();
      window.addEventListener("resize", apply);
      window.addEventListener("orientationchange", apply);
      if (window.visualViewport && preferVisualViewport) {
        window.visualViewport.addEventListener("resize", apply);
      }
    }

    function renderGameToText() {
      const payload = {
        coordinateSystem: "UI-only puzzle; no world coordinates",
        mode: !state.started ? "menu" : state.finished ? (state.won ? "won" : "lost") : "playing",
        gameMode,
        puzzleKey,
        customMode,
        guessesUsed: state.guesses.length,
        guessesRemaining: Math.max(0, MAX_GUESSES - state.guesses.length),
        lastGuess: state.guesses.length ? state.guesses[state.guesses.length - 1].title : null,
        answerRevealed: state.finished ? answer.title : null
      };
      return JSON.stringify(payload);
    }

    let virtualTimeMs = 0;
    function advanceTime(ms) {
      virtualTimeMs += Number(ms) || 0;
      return virtualTimeMs;
    }

    window.render_game_to_text = renderGameToText;
    window.advanceTime = advanceTime;
  
}

boot().catch((error) => {
  console.error("Flickle boot failed:", error);
  const introSubtitle = document.getElementById("intro-subtitle");
  if (introSubtitle) introSubtitle.textContent = "Puzzle data failed to load. Refresh to retry.";
  const introModeLink = document.getElementById("intro-mode-link");
  if (introModeLink) introModeLink.textContent = "startup issue";
  const playBtn = document.getElementById("play-btn");
  if (playBtn) {
    playBtn.disabled = false;
    playBtn.removeAttribute("aria-busy");
    playBtn.textContent = "Reload";
    playBtn.addEventListener("click", () => window.location.reload(), { once: true });
  }
});
