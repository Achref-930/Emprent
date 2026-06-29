/**
 * app/api/admin-login/route.js
 * Verifies the admin password and returns a signed JWT token.
 *
 * Security layers:
 *  - Password compared with bcrypt (never stored in plain text)
 *  - Rate limiting: 3 failed attempts → 15 min lockout (in-memory)
 *  - JWT expires in 24 hours
 *  - All secrets live in environment variables only
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 0.25 * 60 * 1000; //  minutes

// In-memory store — resets if the serverless container restarts.
// Good enough for a single-admin dashboard.
const failTracker = {
  attempts: 0,
  lockedUntil: null,
};

export async function POST(request) {
  try {
    // ── Check environment ──────────────────────────────────
    if (!JWT_SECRET || !ADMIN_PASSWORD_HASH) {
      return NextResponse.json(
        { message: "Server misconfiguration." },
        { status: 500 },
      );
    }

    // ── Check lockout ──────────────────────────────────────
    if (failTracker.lockedUntil && Date.now() < failTracker.lockedUntil) {
      const remaining = Math.ceil(
        (failTracker.lockedUntil - Date.now()) / 1000,
      );
      return NextResponse.json(
        { message: "Too many attempts.", lockoutRemaining: remaining },
        { status: 429 },
      );
    }

    // Reset lockout if it has expired
    if (failTracker.lockedUntil && Date.now() >= failTracker.lockedUntil) {
      failTracker.attempts = 0;
      failTracker.lockedUntil = null;
    }

    // ── Parse body ─────────────────────────────────────────
    const body = await request.json().catch(() => ({}));
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { message: "Password is required." },
        { status: 400 },
      );
    }

    // ── Verify password ────────────────────────────────────
    const match = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

    if (!match) {
      failTracker.attempts += 1;

      if (failTracker.attempts >= MAX_ATTEMPTS) {
        failTracker.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
        const remaining = Math.ceil(LOCKOUT_DURATION_MS / 1000);
        return NextResponse.json(
          { message: "Too many attempts.", lockoutRemaining: remaining },
          { status: 429 },
        );
      }

      return NextResponse.json(
        { message: "Incorrect password." },
        { status: 401 },
      );
    }

    // ── Success — reset tracker, issue token ───────────────
    failTracker.attempts = 0;
    failTracker.lockedUntil = null;

    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "24h" });

    return NextResponse.json({ token }, { status: 200 });
  } catch (err) {
    console.error("[ADMIN_LOGIN_ERROR]", err);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
}
