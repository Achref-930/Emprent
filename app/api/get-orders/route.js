/**
 * app/api/get-orders/route.js
 * Returns all orders sorted newest first.
 * Requires a valid JWT token in the Authorization header.
 */

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "../../../lib/mongodb";
import Order from "../../../lib/models/Order";

const JWT_SECRET = process.env.JWT_SECRET;

function verifyToken(request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    // ── Auth ───────────────────────────────────────────────
    const payload = verifyToken(request);
    if (!payload) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    // ── Fetch ──────────────────────────────────────────────
    await connectDB();

    const orders = await Order.find({})
      .sort({ createdAt: -1 }) // newest first
      .lean(); // plain JS objects, faster

    return NextResponse.json({ orders }, { status: 200 });
  } catch (err) {
    console.error("[GET_ORDERS_ERROR]", err);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function POST() {
  return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
}
