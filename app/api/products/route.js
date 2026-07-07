/**
 * app/api/products/route.js
 * Public endpoint — returns the live product catalog for the storefront.
 * No auth required; this is customer-facing data.
 *
 * On first run (empty collection) it seeds the DB from DEFAULT_PRODUCTS
 * so the app works out of the box without a manual seeding step.
 */

import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import Product from "../../../lib/models/Product";
import { DEFAULT_PRODUCTS } from "../../../lib/products";

async function ensureSeeded() {
  const count = await Product.countDocuments({});
  if (count === 0) {
    await Product.insertMany(DEFAULT_PRODUCTS);
  }
}

export async function GET() {
  try {
    await connectDB();
    await ensureSeeded();

    const products = await Product.find({})
      .sort({ productId: 1 })
      .select("-__v")
      .lean();

    return NextResponse.json({ products }, { status: 200 });
  } catch (err) {
    console.error("[PRODUCTS_ERROR]", err);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 },
    );
  }
}
