const SESSION_COOKIE = "flickle_session";
const SESSION_TTL_DAYS = 30;
const MAGIC_LINK_TTL_MINUTES = 15;

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const method = request.method.toUpperCase();

      if (method === "OPTIONS") {
        return withCors(new Response(null, { status: 204 }), request, env);
      }

      if (url.pathname === "/api/auth/request-link" && method === "POST") {
        return withCors(await requestMagicLink(request, env), request, env);
      }

      if (url.pathname === "/api/auth/callback" && method === "GET") {
        return withCors(await completeMagicLink(request, env), request, env);
      }

      if (url.pathname === "/api/auth/logout" && method === "POST") {
        return withCors(await logout(request, env), request, env);
      }

      if (url.pathname === "/api/me" && method === "GET") {
        return withCors(await getMe(request, env), request, env);
      }

      if (url.pathname === "/api/archive/progress" && method === "GET") {
        return withCors(await getArchiveProgress(request, env), request, env);
      }

      if (url.pathname === "/api/archive/progress" && method === "POST") {
        return withCors(await upsertArchiveProgress(request, env), request, env);
      }

      if (url.pathname === "/api/archive/stats" && method === "GET") {
        return withCors(await getArchiveStats(request, env), request, env);
      }

      return withCors(json({ error: "Not found" }, 404), request, env);
    } catch (error) {
      const status = Number(error?.status);
      if (Number.isInteger(status) && status >= 400 && status < 500) {
        return withCors(json({ error: String(error?.message || "Bad request") }, status), request, env);
      }
      const payload = { error: "Server error" };
      if (String(env.DEBUG_ERRORS || "0") === "1") {
        payload.detail = String(error?.message || error);
      }
      return withCors(json(payload, 500), request, env);
    }
  }
};

async function requestMagicLink(request, env) {
  requireD1(env);
  const body = await readJsonBody(request);
  const email = normalizeEmail(body?.email);
  if (!email || !isValidEmail(email)) {
    return json({ error: "Valid email is required." }, 400);
  }

  const token = makeToken();
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + MAGIC_LINK_TTL_MINUTES * 60 * 1000).toISOString();

  await env.DB
    .prepare(`
      INSERT INTO auth_magic_links (token_hash, email, expires_at, consumed_at, created_at, request_ip, user_agent)
      VALUES (?, ?, ?, NULL, ?, ?, ?)
    `)
    .bind(
      tokenHash,
      email,
      expiresAt,
      now.toISOString(),
      request.headers.get("CF-Connecting-IP") || null,
      request.headers.get("User-Agent") || null
    )
    .run();

  const callbackOrigin = resolveAuthCallbackOrigin(request, env);
  const magicLink = `${callbackOrigin}/api/auth/callback?token=${encodeURIComponent(token)}`;
  const devAuthLinksEnabled = String(env.DEV_AUTH_LINKS || "0") === "1";

  if (!isEmailDeliveryConfigured(env) && !devAuthLinksEnabled) {
    return json({ error: "Sign-in email is not configured yet." }, 503);
  }

  if (isEmailDeliveryConfigured(env)) {
    try {
      await sendMagicLinkEmail(env, {
        toEmail: email,
        magicLink,
        expiresMinutes: MAGIC_LINK_TTL_MINUTES
      });
    } catch (error) {
      console.error("Flickle auth email send failed:", error);
      return json({ error: "Unable to send sign-in email right now. Please try again." }, 502);
    }
  }

  const payload = {
    ok: true,
    message: "If that email exists, a sign-in link has been generated."
  };
  if (devAuthLinksEnabled) {
    payload.dev_magic_link = magicLink;
  }

  return json(payload);
}

async function completeMagicLink(request, env) {
  requireD1(env);
  const url = new URL(request.url);
  const token = String(url.searchParams.get("token") || "").trim();
  if (!token) {
    return json({ error: "Missing token." }, 400);
  }

  const tokenHash = await sha256Hex(token);
  const row = await env.DB
    .prepare(`
      SELECT token_hash, email, expires_at, consumed_at
      FROM auth_magic_links
      WHERE token_hash = ?
      LIMIT 1
    `)
    .bind(tokenHash)
    .first();

  if (!row) return json({ error: "Invalid sign-in link." }, 400);
  if (row.consumed_at) return json({ error: "This sign-in link was already used." }, 400);
  if (Date.parse(row.expires_at) < Date.now()) return json({ error: "This sign-in link has expired." }, 400);

  const email = normalizeEmail(row.email);
  if (!email) return json({ error: "Invalid account data." }, 400);

  const nowIso = new Date().toISOString();
  let user = await env.DB
    .prepare("SELECT id, email, created_at, last_login_at FROM users WHERE email = ? LIMIT 1")
    .bind(email)
    .first();

  if (!user) {
    const userId = crypto.randomUUID();
    await env.DB
      .prepare("INSERT INTO users (id, email, created_at, last_login_at) VALUES (?, ?, ?, ?)")
      .bind(userId, email, nowIso, nowIso)
      .run();
    user = { id: userId, email };
  } else {
    await env.DB
      .prepare("UPDATE users SET last_login_at = ? WHERE id = ?")
      .bind(nowIso, user.id)
      .run();
  }

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await env.DB
    .prepare("INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)")
    .bind(sessionId, user.id, nowIso, expiresAt, nowIso)
    .run();

  await env.DB
    .prepare("UPDATE auth_magic_links SET consumed_at = ? WHERE token_hash = ?")
    .bind(nowIso, tokenHash)
    .run();

  const redirectTo = resolveRedirectUrl(request, env);
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo,
      "Set-Cookie": buildSessionCookie(sessionId, SESSION_TTL_DAYS, env),
      "Cache-Control": "no-store"
    }
  });
}

async function logout(request, env) {
  requireD1(env);
  const sessionId = getCookie(request, SESSION_COOKIE);
  if (sessionId) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
  }
  const res = json({ ok: true });
  res.headers.append("Set-Cookie", clearSessionCookie(env));
  return res;
}

async function getMe(request, env) {
  requireD1(env);
  const user = await requireUser(request, env);
  if (!user) return json({ user: null }, 401);
  return json({ user });
}

async function getArchiveProgress(request, env) {
  requireD1(env);
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const url = new URL(request.url);
  const from = String(url.searchParams.get("from") || "").trim();
  const to = String(url.searchParams.get("to") || "").trim();
  if (!isIsoDate(from) || !isIsoDate(to)) {
    return json({ error: "from and to must be YYYY-MM-DD" }, 400);
  }
  if (from > to) return json({ error: "from must be <= to" }, 400);

  const { results } = await env.DB
    .prepare(`
      SELECT puzzle_date, status, guesses_used, completed_at, updated_at
      FROM archive_progress
      WHERE user_id = ? AND puzzle_date >= ? AND puzzle_date <= ?
      ORDER BY puzzle_date ASC
    `)
    .bind(user.id, from, to)
    .all();

  return json({ progress: results || [] });
}

async function upsertArchiveProgress(request, env) {
  requireD1(env);
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await readJsonBody(request);
  const puzzleDate = String(body?.puzzle_date || "").trim();
  const status = String(body?.status || "").trim();
  const guessesUsedRaw = body?.guesses_used;

  if (!isIsoDate(puzzleDate)) return json({ error: "puzzle_date must be YYYY-MM-DD" }, 400);
  if (!["started", "won", "lost"].includes(status)) {
    return json({ error: "status must be started, won, or lost" }, 400);
  }

  let guessesUsed = null;
  if (guessesUsedRaw !== null && guessesUsedRaw !== undefined && guessesUsedRaw !== "") {
    const n = Number(guessesUsedRaw);
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      return json({ error: "guesses_used must be an integer between 1 and 10" }, 400);
    }
    guessesUsed = n;
  }

  const nowIso = new Date().toISOString();
  const completedAt = status === "started" ? null : nowIso;

  await env.DB
    .prepare(`
      INSERT INTO archive_progress (user_id, puzzle_date, status, guesses_used, completed_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, puzzle_date) DO UPDATE SET
        status = excluded.status,
        guesses_used = excluded.guesses_used,
        completed_at = excluded.completed_at,
        updated_at = excluded.updated_at
    `)
    .bind(user.id, puzzleDate, status, guessesUsed, completedAt, nowIso)
    .run();

  return json({ ok: true });
}

async function getArchiveStats(request, env) {
  requireD1(env);
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const row = await env.DB
    .prepare(`
      SELECT
        COUNT(*) AS played,
        SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) AS won,
        SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) AS lost,
        SUM(CASE WHEN status = 'won' AND guesses_used = 1 THEN 1 ELSE 0 END) AS perfect
      FROM archive_progress
      WHERE user_id = ?
    `)
    .bind(user.id)
    .first();

  const played = Number(row?.played || 0);
  const won = Number(row?.won || 0);
  const lost = Number(row?.lost || 0);
  const perfect = Number(row?.perfect || 0);
  const winRate = played > 0 ? Math.round((won / played) * 1000) / 10 : 0;

  return json({ played, won, lost, perfect, win_rate: winRate });
}

async function requireUser(request, env) {
  const sessionId = getCookie(request, SESSION_COOKIE);
  if (!sessionId) return null;

  const session = await env.DB
    .prepare(`
      SELECT s.id, s.user_id, s.expires_at, u.email
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
      LIMIT 1
    `)
    .bind(sessionId)
    .first();

  if (!session) return null;
  if (Date.parse(session.expires_at) < Date.now()) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
    return null;
  }

  await env.DB
    .prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), session.id)
    .run();

  return {
    id: session.user_id,
    email: session.email
  };
}

function buildSessionCookie(sessionId, ttlDays, env) {
  const maxAge = Math.max(60, Math.floor(ttlDays * 24 * 60 * 60));
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`
  ];
  const cookieDomain = resolveAuthCookieDomain(env);
  if (cookieDomain) {
    parts.push(`Domain=${cookieDomain}`);
  }
  return parts.join("; ");
}

function clearSessionCookie(env) {
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0"
  ];
  const cookieDomain = resolveAuthCookieDomain(env);
  if (cookieDomain) {
    parts.push(`Domain=${cookieDomain}`);
  }
  return parts.join("; ");
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  if (!cookie) return "";
  const pieces = cookie.split(";");
  for (const piece of pieces) {
    const [k, ...rest] = piece.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function readJsonBody(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.includes("application/json")) {
    throw httpError(400, "Expected application/json");
  }
  try {
    return await request.json();
  } catch {
    throw httpError(400, "Malformed JSON body");
  }
}

function makeToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64Url(bytes);
}

async function sha256Hex(input) {
  const data = new TextEncoder().encode(String(input));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes) {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function requireD1(env) {
  if (!env.DB) {
    throw new Error("D1 binding DB is missing. Configure it in wrangler.toml.");
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function withCors(response, request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return response;
  if (!isAllowedOrigin(origin, env)) return response;

  // Some Responses (for example from Response.redirect) have immutable headers.
  const writable = new Response(response.body, response);
  writable.headers.set("Access-Control-Allow-Origin", origin);
  writable.headers.set("Vary", "Origin");
  writable.headers.set("Access-Control-Allow-Credentials", "true");
  writable.headers.set("Access-Control-Allow-Headers", "Content-Type");
  writable.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  return writable;
}

function isAllowedOrigin(origin, env) {
  const list = String(env.ALLOWED_ORIGINS || "").trim();
  if (list) {
    const allowed = list
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return allowed.includes(origin);
  }
  const defaults = [
    "https://flickle.io",
    "https://www.flickle.io",
    "https://api.flickle.io",
    "http://localhost:8788",
    "http://127.0.0.1:8788",
    "null"
  ];
  return defaults.includes(origin);
}

function resolveRedirectUrl(request, env) {
  const configured = String(env.AUTH_SUCCESS_REDIRECT || "").trim();
  const fallback = "https://flickle.io/";
  if (!configured) return fallback;
  try {
    return new URL(configured).toString();
  } catch {
    return new URL(configured, request.url).toString();
  }
}

function resolveAuthCookieDomain(env) {
  return String(env.AUTH_COOKIE_DOMAIN || "").trim();
}

function resolveAuthCallbackOrigin(request, env) {
  const configured = String(env.AUTH_CALLBACK_ORIGIN || "").trim();
  if (!configured) {
    return new URL(request.url).origin;
  }
  try {
    return new URL(configured).origin;
  } catch {
    return new URL(configured, request.url).origin;
  }
}

function isEmailDeliveryConfigured(env) {
  const provider = getEmailProvider(env);
  if (provider === "resend") {
    return Boolean(String(env.RESEND_API_KEY || "").trim())
      && Boolean(String(env.AUTH_FROM_EMAIL || "").trim());
  }
  return false;
}

function getEmailProvider(env) {
  const configured = String(env.AUTH_EMAIL_PROVIDER || "").trim().toLowerCase();
  if (configured) return configured;
  if (String(env.RESEND_API_KEY || "").trim()) return "resend";
  return "";
}

async function sendMagicLinkEmail(env, { toEmail, magicLink, expiresMinutes }) {
  const provider = getEmailProvider(env);
  if (provider === "resend") {
    return sendMagicLinkEmailViaResend(env, { toEmail, magicLink, expiresMinutes });
  }
  throw new Error(`Unsupported AUTH_EMAIL_PROVIDER: ${provider || "(empty)"}`);
}

async function sendMagicLinkEmailViaResend(env, { toEmail, magicLink, expiresMinutes }) {
  const apiKey = String(env.RESEND_API_KEY || "").trim();
  const from = String(env.AUTH_FROM_EMAIL || "").trim();
  const subject = String(env.AUTH_EMAIL_SUBJECT || "Your Flickle sign-in link").trim();
  if (!apiKey || !from) {
    throw new Error("Resend is missing RESEND_API_KEY or AUTH_FROM_EMAIL.");
  }

  const safeLink = escapeHtml(magicLink);
  const html = [
    "<div style=\"font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.55;color:#111827;max-width:560px\">",
    "<h2 style=\"margin:0 0 12px\">Sign in to Flickle</h2>",
    "<p style=\"margin:0 0 16px\">Click the button below to securely sign in.</p>",
    `<p style="margin:0 0 16px"><a href="${safeLink}" style="background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block">Sign In to Flickle</a></p>`,
    `<p style="margin:0 0 8px;color:#4b5563">This link expires in ${Number(expiresMinutes)} minutes.</p>`,
    `<p style="margin:0;color:#6b7280;font-size:13px;word-break:break-all">If the button does not work, paste this link into your browser:<br>${safeLink}</p>`,
    "</div>"
  ].join("");

  const text = [
    "Sign in to Flickle",
    "",
    "Use this secure sign-in link:",
    magicLink,
    "",
    `This link expires in ${Number(expiresMinutes)} minutes.`,
    "If you did not request this email, you can ignore it."
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject,
      html,
      text
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend send failed (${response.status}): ${detail.slice(0, 400)}`);
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
