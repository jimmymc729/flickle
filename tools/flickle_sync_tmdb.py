#!/usr/bin/env python3
"""
Sync Flickle movie data from TMDB.

Usage:
  TMDB_API_KEY=xxx python3 flickle/tools/flickle_sync_tmdb.py --pages 12 --update-html flickle/index.html
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import pathlib
import re
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


TMDB_BASE = "https://api.themoviedb.org/3"

# Prefer familiar "consumer-facing" studio names when available.
PREFERRED_STUDIO_ORDER = [
    "Warner Bros. Pictures",
    "Universal Pictures",
    "Paramount Pictures",
    "Walt Disney Pictures",
    "20th Century Studios",
    "20th Century Fox",
    "Columbia Pictures",
    "Sony Pictures Animation",
    "Sony Pictures",
    "Marvel Studios",
    "Lucasfilm Ltd.",
    "Pixar",
    "DreamWorks Pictures",
    "DreamWorks Animation",
    "New Line Cinema",
    "Metro-Goldwyn-Mayer",
    "Lionsgate",
    "Miramax",
    "A24",
]

STUDIO_ALIASES = {
    "warner bros": "Warner Bros. Pictures",
    "warner bros pictures": "Warner Bros. Pictures",
    "warner bros pictures inc": "Warner Bros. Pictures",
    "universal pictures": "Universal Pictures",
    "paramount pictures": "Paramount Pictures",
    "walt disney pictures": "Walt Disney Pictures",
    "walt disney productions": "Walt Disney Pictures",
    "disney": "Walt Disney Pictures",
    "20th century studios": "20th Century Studios",
    "20th century fox": "20th Century Fox",
    "columbia pictures": "Columbia Pictures",
    "sony pictures": "Sony Pictures",
    "sony pictures animation": "Sony Pictures Animation",
    "marvel studios": "Marvel Studios",
    "lucasfilm": "Lucasfilm Ltd.",
    "lucasfilm ltd": "Lucasfilm Ltd.",
    "pixar": "Pixar",
    "dreamworks pictures": "DreamWorks Pictures",
    "dreamworks skg": "DreamWorks Pictures",
    "dreamworks animation": "DreamWorks Animation",
    "new line cinema": "New Line Cinema",
    "metro goldwyn mayer": "Metro-Goldwyn-Mayer",
    "mgm": "Metro-Goldwyn-Mayer",
    "lionsgate": "Lionsgate",
    "miramax": "Miramax",
    "a24": "A24",
}

LANGUAGE_CODE_TO_NAME = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "ru": "Russian",
    "hi": "Hindi",
    "ar": "Arabic",
    "sv": "Swedish",
    "da": "Danish",
    "no": "Norwegian",
    "fi": "Finnish",
    "nl": "Dutch",
    "pl": "Polish",
    "tr": "Turkish",
    "he": "Hebrew",
    "th": "Thai",
    "cs": "Czech",
    "uk": "Ukrainian",
}


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()


def normalize_company(value: str) -> str:
    return normalize(value).replace(" co ", " company ")


def tmdb_get(
    path: str,
    api_key: str,
    params: dict[str, Any] | None = None,
    retries: int = 4,
    backoff_seconds: float = 1.0,
) -> dict[str, Any]:
    query: dict[str, Any] = {"api_key": api_key}
    if params:
        query.update(params)
    url = f"{TMDB_BASE}{path}?{urllib.parse.urlencode(query)}"
    req = urllib.request.Request(url, headers={"accept": "application/json"})
    attempts = retries + 1
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            # 429/5xx are worth retrying; most other HTTP errors are terminal.
            if exc.code not in (429, 500, 502, 503, 504) or attempt >= attempts:
                raise RuntimeError(f"TMDB request failed [{exc.code}] for {path}: {detail[:220]}") from exc
            last_error = exc
        except (urllib.error.URLError, TimeoutError, socket.timeout) as exc:
            last_error = exc
            if attempt >= attempts:
                break

        time.sleep(backoff_seconds * attempt)

    raise RuntimeError(f"TMDB request failed for {path}: {last_error}") from last_error


def discover_candidates(
    api_key: str,
    pages: int,
    min_votes: int,
    min_rating: float,
    language: str,
    region: str | None,
) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    seen: set[int] = set()
    today = dt.date.today().isoformat()
    for page in range(1, pages + 1):
        params: dict[str, Any] = {
            "language": language,
            "sort_by": "vote_count.desc",
            "include_adult": "false",
            "include_video": "false",
            "vote_count.gte": min_votes,
            "vote_average.gte": min_rating,
            "primary_release_date.lte": today,
            "with_release_type": "3|2",
            "page": page,
        }
        if region:
            params["region"] = region

        payload = tmdb_get(
            "/discover/movie",
            api_key,
            params,
        )
        for item in payload.get("results", []):
            mid = item.get("id")
            if not isinstance(mid, int) or mid in seen:
                continue
            seen.add(mid)
            candidates.append(
                {
                    "id": mid,
                    "vote_count": item.get("vote_count"),
                    "vote_average": item.get("vote_average"),
                    "popularity": item.get("popularity"),
                }
            )
    return candidates


def load_must_have(path: pathlib.Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid must-have JSON: {path} ({exc})") from exc

    if not isinstance(raw, list):
        raise RuntimeError(f"Must-have JSON must be an array: {path}")

    out: list[dict[str, Any]] = []
    for idx, item in enumerate(raw):
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", "")).strip()
        year = item.get("year")
        tmdb_id = item.get("tmdbId")
        if not title:
            continue
        parsed: dict[str, Any] = {"title": title}
        if isinstance(year, int) and year > 1800:
            parsed["year"] = year
        if isinstance(tmdb_id, int) and tmdb_id > 0:
            parsed["tmdbId"] = tmdb_id
        if "year" not in parsed and "tmdbId" not in parsed:
            print(f"Skipping must-have entry #{idx + 1} ({title!r}): missing year/tmdbId")
            continue
        out.append(parsed)
    return out


def resolve_must_have_id(api_key: str, language: str, entry: dict[str, Any]) -> int | None:
    forced_id = entry.get("tmdbId")
    if isinstance(forced_id, int) and forced_id > 0:
        return forced_id

    title = str(entry.get("title", "")).strip()
    year = entry.get("year")
    params: dict[str, Any] = {
        "language": language,
        "query": title,
        "include_adult": "false",
    }
    if isinstance(year, int):
        params["year"] = year

    payload = tmdb_get("/search/movie", api_key, params=params)
    results = payload.get("results") or []
    if not results:
        return None

    if isinstance(year, int):
        for movie in results:
            if not isinstance(movie, dict):
                continue
            release_year = extract_year(str(movie.get("release_date", "")))
            if release_year == year and isinstance(movie.get("id"), int):
                return int(movie["id"])

    for movie in results:
        if isinstance(movie, dict) and isinstance(movie.get("id"), int):
            return int(movie["id"])
    return None


def fetch_must_have_candidates(api_key: str, language: str, entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    seen_ids: set[int] = set()
    for entry in entries:
        movie_id: int | None = None
        try:
            movie_id = resolve_must_have_id(api_key, language, entry)
        except RuntimeError as exc:
            print(f"Must-have lookup failed for {entry.get('title')!r}: {exc}")
            continue
        if not isinstance(movie_id, int) or movie_id <= 0:
            label = str(entry.get("title", "")).strip()
            year = entry.get("year")
            suffix = f" ({year})" if isinstance(year, int) else ""
            print(f"Must-have lookup returned no result: {label}{suffix}")
            continue
        if movie_id in seen_ids:
            continue
        seen_ids.add(movie_id)
        out.append({"id": movie_id})
    return out


def pick_country(detail: dict[str, Any]) -> str:
    countries = detail.get("production_countries") or []
    if countries:
        country = countries[0].get("name", "").strip()
        if country == "United States of America":
            return "USA"
        return country or "Unknown"
    return "Unknown"


def pick_language(detail: dict[str, Any]) -> str:
    original = str(detail.get("original_language", "")).strip().lower()
    spoken = detail.get("spoken_languages") or []
    # Prefer a spoken language that matches the original language code.
    if original:
        for item in spoken:
            iso = str(item.get("iso_639_1", "")).strip().lower()
            if iso and iso == original:
                lang = str(item.get("english_name", "")).strip()
                if lang:
                    return lang

    if spoken:
        lang = str(spoken[0].get("english_name", "")).strip()
        if lang:
            return lang
    if original in LANGUAGE_CODE_TO_NAME:
        return LANGUAGE_CODE_TO_NAME[original]
    return original.upper() if original else "Unknown"


def extract_director(detail: dict[str, Any]) -> str:
    crew = (detail.get("credits") or {}).get("crew") or []
    names: list[str] = []
    seen: set[str] = set()
    for person in crew:
        if person.get("job") != "Director":
            continue
        name = str(person.get("name", "")).strip()
        if not name:
            continue
        key = normalize(name)
        if key in seen:
            continue
        seen.add(key)
        names.append(name)
    return " and ".join(names[:2]) if names else "Unknown"


def extract_cast(detail: dict[str, Any], max_cast: int) -> list[str]:
    cast_raw = (detail.get("credits") or {}).get("cast") or []
    cast = sorted(
        cast_raw,
        key=lambda p: (
            int(p.get("order", 9999)) if isinstance(p, dict) else 9999,
            -(float(p.get("popularity", 0.0)) if isinstance(p, dict) and isinstance(p.get("popularity"), (int, float)) else 0.0),
        ),
    )
    out: list[str] = []
    seen: set[str] = set()
    for person in cast:
        if len(out) >= max_cast:
            break
        name = str(person.get("name", "")).strip()
        if not name:
            continue
        key = normalize(name)
        if key in seen:
            continue
        seen.add(key)
        out.append(name)
    return out


def movie_override_key(title: str, year: int) -> str:
    return f"{normalize(title)}::{year}"


def load_overrides(path: pathlib.Path) -> dict[str, dict[str, Any]]:
    if not path.exists():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid overrides JSON: {path} ({exc})") from exc

    out: dict[str, dict[str, Any]] = {}
    if isinstance(raw, dict):
        for key, value in raw.items():
            if isinstance(key, str) and isinstance(value, dict):
                out[key.strip()] = value
    return out


def apply_overrides(movie: dict[str, Any], overrides: dict[str, dict[str, Any]]) -> dict[str, Any]:
    key = movie_override_key(str(movie.get("title", "")), int(movie.get("year", 0) or 0))
    patch = overrides.get(key)
    if not patch:
        return movie

    allowed = {
        "title",
        "year",
        "runtime",
        "genres",
        "director",
        "cast",
        "country",
        "language",
        "franchise",
        "studio",
        "boxOffice",
        "voteCount",
        "voteAverage",
        "popularity",
        "tmdbId",
        "posterPath",
    }
    for field, value in patch.items():
        if field not in allowed:
            continue
        movie[field] = value
    return movie


def extract_year(release_date: str) -> int | None:
    if not release_date:
        return None
    try:
        return int(release_date[:4])
    except (TypeError, ValueError):
        return None


def extract_studio(detail: dict[str, Any]) -> str:
    companies = detail.get("production_companies") or []
    ranked: list[str] = []
    for company in companies:
        name = str(company.get("name", "")).strip()
        if not name:
            continue
        normalized = normalize_company(name)
        canonical = STUDIO_ALIASES.get(normalized, name)
        ranked.append(canonical)

    if not ranked:
        return ""

    # First, pick the highest-priority familiar studio if present.
    for preferred in PREFERRED_STUDIO_ORDER:
        if any(normalize_company(candidate) == normalize_company(preferred) for candidate in ranked):
            return preferred

    # Otherwise keep the first non-empty company from TMDB ordering.
    return ranked[0]


def fetch_movie(
    detail_id: int,
    api_key: str,
    language: str,
    max_cast: int,
    discover_hint: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    detail = tmdb_get(f"/movie/{detail_id}", api_key, {"language": language, "append_to_response": "credits"})
    title = str(detail.get("title", "")).strip()
    year = extract_year(str(detail.get("release_date", "")))
    runtime = detail.get("runtime")
    genres = [str(g.get("name", "")).strip() for g in (detail.get("genres") or []) if str(g.get("name", "")).strip()]
    director = extract_director(detail)
    cast = extract_cast(detail, max_cast=max_cast)
    country = pick_country(detail)
    language_name = pick_language(detail)
    franchise = ((detail.get("belongs_to_collection") or {}).get("name") or "").strip()
    studio = extract_studio(detail)
    revenue = detail.get("revenue")
    poster_path = (detail.get("poster_path") or "").strip()

    if not title or year is None or not isinstance(runtime, int) or runtime <= 0 or not genres or not cast:
        return None

    vote_count = detail.get("vote_count")
    if not isinstance(vote_count, int) and discover_hint:
        vote_count = discover_hint.get("vote_count")
    vote_average = detail.get("vote_average")
    if not isinstance(vote_average, (int, float)) and discover_hint:
        vote_average = discover_hint.get("vote_average")
    popularity = detail.get("popularity")
    if not isinstance(popularity, (int, float)) and discover_hint:
        popularity = discover_hint.get("popularity")

    return {
        "title": title,
        "year": year,
        "runtime": runtime,
        "genres": genres[:3],
        "director": director,
        "cast": cast,
        "country": country,
        "language": language_name,
        "franchise": franchise,
        "studio": studio,
        "boxOffice": int(revenue) if isinstance(revenue, int) and revenue > 0 else 0,
        "voteCount": int(vote_count) if isinstance(vote_count, int) else 0,
        "voteAverage": float(vote_average) if isinstance(vote_average, (int, float)) else 0.0,
        "popularity": float(popularity) if isinstance(popularity, (int, float)) else 0.0,
        "tmdbId": detail_id,
        "posterPath": poster_path,
    }


def render_movies_js(movies: list[dict[str, Any]]) -> str:
    lines: list[str] = ["    const MOVIES = ["]
    for movie in movies:
        line = (
            "      { "
            f"title: {json.dumps(movie['title'])}, "
            f"year: {movie['year']}, "
            f"runtime: {movie['runtime']}, "
            f"genres: {json.dumps(movie['genres'])}, "
            f"director: {json.dumps(movie['director'])}, "
            f"cast: {json.dumps(movie['cast'])}, "
            f"country: {json.dumps(movie['country'])}, "
            f"language: {json.dumps(movie['language'])}, "
            f"franchise: {json.dumps(movie['franchise'])}, "
            f"studio: {json.dumps(movie.get('studio', ''))}, "
            f"boxOffice: {int(movie.get('boxOffice', 0) or 0)}, "
            f"voteCount: {movie.get('voteCount', 0)}, "
            f"voteAverage: {movie.get('voteAverage', 0.0):.1f}, "
            f"popularity: {movie.get('popularity', 0.0):.1f} "
            "},"
        )
        lines.append(line)
    lines.append("    ];")
    return "\n".join(lines)


def update_flickle_html(path: pathlib.Path, movies: list[dict[str, Any]]) -> None:
    source = path.read_text(encoding="utf-8")
    block = render_movies_js(movies)
    pattern = re.compile(r"const MOVIES = \[\n.*?\n\s*\];\n\n\s*const OSCAR_NOMS_BY_TITLE = \{", re.S)

    def repl(_: re.Match[str]) -> str:
        return f"{block}\n\n    const OSCAR_NOMS_BY_TITLE = {{"

    updated, count = pattern.subn(repl, source, count=1)
    if count != 1:
        raise RuntimeError("Could not locate MOVIES block in flickle.html")
    path.write_text(updated, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Flickle movie dataset from TMDB.")
    parser.add_argument("--api-key", default=os.getenv("TMDB_API_KEY", "").strip(), help="TMDB API key (or set TMDB_API_KEY env var)")
    parser.add_argument("--pages", type=int, default=10, help="Number of TMDB discover pages to pull (20 results/page)")
    parser.add_argument("--min-votes", type=int, default=1500, help="Discover filter: minimum vote count")
    parser.add_argument("--min-rating", type=float, default=6.0, help="Discover filter: minimum vote average")
    parser.add_argument("--max-cast", type=int, default=5, help="Maximum cast names to keep per movie")
    parser.add_argument("--language", default="en-US", help="TMDB language parameter")
    parser.add_argument("--region", default="US", help="TMDB region filter (empty string to disable)")
    parser.add_argument("--max-movies", type=int, default=200, help="Cap output movie count")
    parser.add_argument("--output-json", default="flickle/data/flickle-movies.json", help="Where to write the synced dataset JSON")
    parser.add_argument("--update-html", default="", help="Optional path to flickle.html to replace const MOVIES block")
    parser.add_argument("--overrides", default="flickle/data/flickle-overrides.json", help="Optional JSON map of manual per-movie fixes")
    parser.add_argument("--must-have", default="flickle/data/flickle-must-have.json", help="Optional JSON array of movie seeds to force-include")
    parser.add_argument("--sleep-ms", type=int, default=140, help="Delay between detail calls to avoid hammering TMDB")
    args = parser.parse_args()

    if not args.api_key:
        print("Missing TMDB API key. Pass --api-key or set TMDB_API_KEY.", file=sys.stderr)
        return 2

    if args.pages < 1 or args.max_movies < 1:
        print("--pages and --max-movies must be >= 1", file=sys.stderr)
        return 2

    must_have_path = pathlib.Path(args.must_have)
    try:
        must_have_entries = load_must_have(must_have_path)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    overrides_path = pathlib.Path(args.overrides)
    try:
        overrides = load_overrides(overrides_path)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    candidates = discover_candidates(
        args.api_key,
        pages=args.pages,
        min_votes=args.min_votes,
        min_rating=args.min_rating,
        language=args.language,
        region=(args.region or "").strip() or None,
    )
    if not candidates:
        print("No movies returned from TMDB discover.", file=sys.stderr)
        return 1

    if must_have_entries:
        must_have_candidates = fetch_must_have_candidates(args.api_key, args.language, must_have_entries)
        if must_have_candidates:
            seeded: list[dict[str, Any]] = []
            seen_ids: set[int] = set()
            for item in must_have_candidates + candidates:
                movie_id = item.get("id")
                if not isinstance(movie_id, int) or movie_id <= 0 or movie_id in seen_ids:
                    continue
                seen_ids.add(movie_id)
                seeded.append(item)
            candidates = seeded
            print(f"Injected {len(must_have_candidates)} must-have seeds before discover list.")

    movies: list[dict[str, Any]] = []
    seen_movies: set[str] = set()
    failures = 0
    for idx, candidate in enumerate(candidates, start=1):
        movie_id = candidate["id"]
        try:
            data = fetch_movie(
                movie_id,
                args.api_key,
                language=args.language,
                max_cast=args.max_cast,
                discover_hint=candidate,
            )
        except RuntimeError as exc:
            failures += 1
            print(f"Skipping movie id {movie_id} due to API/network error: {exc}")
            continue
        if not data:
            continue
        data = apply_overrides(data, overrides)
        key = movie_override_key(str(data.get("title", "")), int(data.get("year", 0) or 0))
        if key in seen_movies:
            continue
        seen_movies.add(key)
        movies.append(data)
        if len(movies) >= args.max_movies:
            break
        if args.sleep_ms > 0:
            time.sleep(args.sleep_ms / 1000)
        if idx % 25 == 0:
            print(f"Fetched details for {idx} candidates, kept {len(movies)}.")

    movies.sort(key=lambda m: (m["title"].lower(), m["year"]))

    output_path = pathlib.Path(args.output_json)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(movies, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(movies)} movies to {output_path}")

    if args.update_html:
        html_path = pathlib.Path(args.update_html)
        update_flickle_html(html_path, movies)
        print(f"Updated MOVIES block in {html_path}")

    print(f"Done. Skipped {failures} movies due to API/network errors.")
    print("Oscar nominations are still optional and remain managed in flickle.html.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
