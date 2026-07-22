/**
 * lib/mongodb.js
 * MongoDB connection with caching for Next.js serverless functions.
 * Reuses an existing connection across hot reloads in dev and
 * across invocations within the same Lambda container in production.
 */

import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

// Cache the connection on the global object so it survives
// Next.js hot-reloads in development.
let cached = global._mongoose;

if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI — add it to your Vercel Environment Variables (Settings → Environment Variables).");
  }

  if (cached.conn) return cached.conn;

  // Some Windows setups have Node's internal DNS resolver (c-ares) fall
  // back to 127.0.0.1 instead of the OS's real DNS servers, which breaks
  // SRV-record lookups (relevant if MONGODB_URI ever goes back to using
  // the `mongodb+srv://` scheme instead of the explicit host list).
  dns.setServers(["8.8.8.8", "1.1.1.1"]);

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
