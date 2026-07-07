/**
 * app/api/update-order/route.js
 * Updates an order's status and/or notes.
 * Requires a valid JWT token in the Authorization header.
 */

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "../../../lib/mongodb";
import Order from "../../../lib/models/Order";
import Product from "../../../lib/models/Product";
import { getStockAction } from "../../../lib/stockLogic";

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

    const existing = await Order.findById(orderId).lean();
    if (!existing) {
      return NextResponse.json(
        { message: "Order not found." },
        { status: 404 },
      );
    }

    // Work out whether this status change should deduct or restore
    // stock (see lib/stockLogic.js for the full rule). Only lines that
    // carry a productId + size are stock-tracked; legacy/misc lines are
    // skipped.
    const stockAction =
      status !== undefined
        ? getStockAction(existing.status, status)
        : "none";

    const trackedLines = (existing.products || []).filter(
      (line) => line.productId && line.size,
    );

    if (stockAction === "deduct" && trackedLines.length > 0) {
      // Verify every line has enough stock BEFORE deducting anything,
      // so a partially-insufficient order never leaves stock half-applied.
      const insufficient = [];
      const productsById = new Map();

      for (const line of trackedLines) {
        let product = productsById.get(line.productId);
        if (!product) {
          product = await Product.findOne({
            productId: line.productId,
          }).lean();
          if (product) productsById.set(line.productId, product);
        }
        if (!product) continue; // unknown product — nothing to check

        const available = product.stock?.[line.size] ?? 0;
        if (available < line.quantity) {
          insufficient.push({
            name: line.name,
            size: line.size,
            available,
            requested: line.quantity,
          });
        }
      }

      if (insufficient.length > 0) {
        return NextResponse.json(
          {
            message:
              "Not enough stock to confirm this order. Restock or adjust the order before confirming.",
            insufficient,
          },
          { status: 409 },
        );
      }

      for (const line of trackedLines) {
        await Product.updateOne(
          { productId: line.productId },
          {
            $inc: {
              [`stock.${line.size}`]: -line.quantity,
              sold: line.quantity,
            },
          },
        );
      }
    } else if (stockAction === "restore" && trackedLines.length > 0) {
      for (const line of trackedLines) {
        await Product.updateOne(
          { productId: line.productId },
          {
            $inc: {
              [`stock.${line.size}`]: line.quantity,
              sold: -line.quantity,
            },
          },
        );
      }
    }

    const update = {};
    if (status !== undefined) update.status = status;
    if (notes !== undefined) update.notes = notes;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { $set: update },
      { new: true, lean: true }, // return updated doc
    );

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
