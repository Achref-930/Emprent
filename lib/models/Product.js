/**
 * lib/models/Product.js
 * Mongoose schema for products.
 *
 * Holds the fields the admin can edit live (price, discountPrice, stock
 * per size, sold count). Design-time fields (name, tagline, images,
 * features, sizes) are seeded from lib/products.js and generally left
 * alone here, though they're stored too so the whole catalog can be
 * served from one place.
 *
 * stock is a plain object keyed by size, e.g. { S: 10, M: 8, L: 5 }.
 * It's declared as Mixed so we can $inc individual sizes with dot-path
 * updates (e.g. "stock.M") without fighting Mongoose's schema casting.
 */

import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, unique: true, trim: true },

    name: { type: String, required: true, trim: true },
    tagline: { type: String, default: "" },

    price: { type: Number, required: true, min: 0 },
    // null/undefined = no discount active
    discountPrice: { type: Number, default: null, min: 0 },

    sizes: { type: [String], default: ["S", "M", "L", "XL", "XXL"] },
    stock: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Units sold — shown on the storefront as social proof, and moves
    // in lockstep (inverse) with stock deductions/restorations.
    sold: { type: Number, default: 0, min: 0 },

    images: { type: [String], default: [] },
    features: { type: [String], default: [] },
  },
  { timestamps: true },
);

const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);

export default Product;
