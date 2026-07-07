/**
 * app/api/admin-products/route.js
 * Admin-only endpoint for editing product price, discount price, and
 * per-size stock. Requires a valid JWT token, same as the orders admin
 * routes.
 */

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "../../../lib/mongodb";
import Product from "../../../lib/models/Product";
import { DEFAULT_PRODUCTS } from "../../../lib/products";

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

async function ensureSeeded() {
  const count = await Product.countDocuments({});
  if (count === 0) {
    await Product.insertMany(DEFAULT_PRODUCTS);
  }
}

export async function GET(request) {
  try {
    const payload = verifyToken(request);
    if (!payload) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    await ensureSeeded();

    const products = await Product.find({}).sort({ productId: 1 }).lean();
    return NextResponse.json({ products }, { status: 200 });
  } catch (err) {
    console.error("[ADMIN_PRODUCTS_GET_ERROR]", err);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
  try {
    const payload = verifyToken(request);
    if (!payload) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { productId, price, discountPrice, stock } = body;

    if (!productId) {
      return NextResponse.json(
        { message: "productId is required." },
        { status: 400 },
      );
    }

    await connectDB();

    const product = await Product.findOne({ productId });
    if (!product) {
      return NextResponse.json(
        { message: "Product not found." },
        { status: 404 },
      );
    }

    const update = {};

    if (price !== undefined) {
      const n = Number(price);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json(
          { message: "Price must be a non-negative number." },
          { status: 400 },
        );
      }
      update.price = n;
    }

    if (discountPrice !== undefined) {
      if (discountPrice === null || discountPrice === "") {
        update.discountPrice = null;
      } else {
        const n = Number(discountPrice);
        const basePrice = price !== undefined ? Number(price) : product.price;
        if (!Number.isFinite(n) || n < 0) {
          return NextResponse.json(
            { message: "Discount price must be a non-negative number." },
            { status: 400 },
          );
        }
        if (n >= basePrice) {
          return NextResponse.json(
            {
              message:
                "Discount price must be lower than the regular price.",
            },
            { status: 400 },
          );
        }
        update.discountPrice = n;
      }
    }

    if (stock !== undefined && typeof stock === "object" && stock !== null) {
      const sizes = product.sizes?.length
        ? product.sizes
        : Object.keys(stock);
      const nextStock = { ...(product.stock || {}) };
      for (const size of sizes) {
        if (stock[size] === undefined) continue;
        const n = Number(stock[size]);
        if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
          return NextResponse.json(
            { message: `Stock for size ${size} must be a whole number ≥ 0.` },
            { status: 400 },
          );
        }
        nextStock[size] = n;
      }
      update.stock = nextStock;
    }

    const updated = await Product.findOneAndUpdate(
      { productId },
      { $set: update },
      { new: true, lean: true },
    );

    return NextResponse.json({ product: updated }, { status: 200 });
  } catch (err) {
    console.error("[ADMIN_PRODUCTS_PATCH_ERROR]", err);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 },
    );
  }
}
