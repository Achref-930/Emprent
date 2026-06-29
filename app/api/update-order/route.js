/**
 * app/api/update-order/route.js
 * Updates an order's status and/or notes.
 * Requires a valid JWT token in the Authorization header.
 */

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "../../../lib/mongodb";
import Order from "../../../lib/models/Order";

const JWT_SECRET = process.env.JWT_SECRET;

const VALID_STATUSES = ["pending", "confirmed", "shipped", "cancelled"];

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

export async function PATCH(request) {
  try {
    // ── Auth ───────────────────────────────────────────────
    const payload = verifyToken(request);
    if (!payload) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    // ── Parse body ─────────────────────────────────────────
    const body = await request.json().catch(() => ({}));
    const { orderId, status, notes } = body;

    if (!orderId) {
      return NextResponse.json(
        { message: "orderId is required." },
        { status: 400 },
      );
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}.`,
        },
        { status: 400 },
      );
    }

    // ── Update ─────────────────────────────────────────────
    await connectDB();

    const update = {};
    if (status !== undefined) update.status = status;
    if (notes !== undefined) update.notes = notes;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { $set: update },
      { new: true, lean: true }, // return updated doc
    );

    if (!order) {
      return NextResponse.json(
        { message: "Order not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (err) {
    console.error("[UPDATE_ORDER_ERROR]", err);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
}
