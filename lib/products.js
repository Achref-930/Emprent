/**
 * lib/products.js
 * Static catalog defaults + shared helpers.
 *
 * IMPORTANT: price, discountPrice, stock, and sold are the *live* fields —
 * they are stored in MongoDB (see lib/models/Product.js) and can be edited
 * from the admin dashboard. The values below are only used the very first
 * time the app runs, to seed the database (see app/api/products/route.js).
 * Editing this file after that point will NOT change what customers see —
 * use the admin Stock tab instead.
 *
 * images / sizes / name / tagline / features are considered "design-time"
 * content. They're not editable from the admin yet, so this file remains
 * their source of truth.
 */

export const DEFAULT_PRODUCTS = [
  {
    productId: "design-1",
    name: "Oversized T Design 1",
    tagline: "Timeless cut. Premium weight cotton.",
    price: 4500,
    discountPrice: null,
    // Both existing product photos stay on Design 1 for now — swap/replace
    // later from the admin once new photography is ready.
    images: ["/products/black-t1.webp", "/products/white-t1.webp"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    // Flat per-size stock — single color, so no color key anymore.
    stock: { S: 10, M: 8, L: 5, XL: 3, XXL: 2 },
    sold: 0,
    features: [
      "100% heavyweight combed cotton",
      "Pre-shrunk — true to size",
      "Reinforced stitched seams",
      "Oversized fit",
    ],
  },
  {
    productId: "design-2",
    name: "Oversized T Design 2",
    tagline: "Bold silhouette. Everyday comfort.",
    price: 4500,
    discountPrice: null,
    images: [],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
    sold: 0,
    features: [
      "100% heavyweight combed cotton",
      "Pre-shrunk — true to size",
      "Reinforced stitched seams",
      "Oversized fit",
    ],
  },
];

/**
 * Two-tier product photos.
 *
 * Every path in `images` (see DEFAULT_PRODUCTS above, or the admin-edited
 * copy in Mongo) points at the *zoom* tier — the full-res, hand-tuned
 * Squoosh export. That file is only ever fetched when someone actually
 * opens the zoom overlay.
 *
 * For everyday browsing (the swipeable carousel) we instead load a much
 * smaller *display* tier, generated from the same source images and
 * stored alongside them under a `display/` subfolder — e.g.
 *   /products/black-t1.webp          → zoom tier (unchanged, ~1080–1920px)
 *   /products/display/black-t1.webp  → display tier (~900px, generated)
 *
 * displayImageSrc() just rewrites the path; it doesn't touch the file.
 * Run `npm run generate:display-images` any time a new zoom-tier photo
 * is added, to (re)generate its matching display-tier copy.
 */
export function displayImageSrc(src) {
  if (!src) return src;
  const slash = src.lastIndexOf("/");
  if (slash === -1) return src;
  return `${src.slice(0, slash)}/display${src.slice(slash)}`;
}

/**
 * Helper: format a price number as Algerian Dinar string.
 * formatPrice(4500) → "4,500 DA"
 */
export function formatPrice(amount) {
  return `${(Number(amount) || 0).toLocaleString("fr-DZ")} DA`;
}

/**
 * Helper: check if a specific size is in stock for a product.
 * (No color dimension anymore — each design is a single color.)
 */
export function isInStock(product, size) {
  return (product.stock?.[size] ?? 0) > 0;
}

/**
 * The price the customer actually pays: the discount price if one is
 * set and it's actually lower than the regular price, otherwise the
 * regular price.
 */
export function effectivePrice(product) {
  const { price, discountPrice } = product;
  if (
    discountPrice != null &&
    discountPrice > 0 &&
    discountPrice < price
  ) {
    return discountPrice;
  }
  return price;
}

/**
 * Discount percentage off, rounded to the nearest whole number.
 * Returns 0 when there's no active discount.
 */
export function discountPercent(product) {
  const { price, discountPrice } = product;
  if (discountPrice == null || discountPrice <= 0 || discountPrice >= price) {
    return 0;
  }
  return Math.round((1 - discountPrice / price) * 100);
}

/**
 * Total stock across all sizes — used to decide if a product is
 * completely sold out.
 */
export function totalStock(product) {
  return Object.values(product.stock || {}).reduce(
    (sum, n) => sum + (Number(n) || 0),
    0,
  );
}
