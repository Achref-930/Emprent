/**
 * lib/products.js
 * Single source of truth for all product data.
 * To add a product: duplicate an entry and update the fields.
 * To mark a size out of stock: set its stock value to 0.
 */

export const products = [
  {
    id: "classic-tee",
    name: "Oversized T",
    tagline: "Timeless cut. Premium weight cotton.",
    price: 4500,
    originalPrice: 7000,
    variants: {
      black: {
        label: "Black",
        image: "/products/black-t1.webp",
      },
      white: {
        label: "White",
        image: "/products/white-t1.webp",
      },
    },
    sizes: ["S", "M", "L", "XL", "XXL"],
    // Set to 0 to mark a size as out of stock
    stock: {
      black: { S: 10, M: 8, L: 5, XL: 3, XXL: 2 },
      white: { S: 6, M: 4, L: 1, XL: 2, XXL: 1 },
    },
    features: [
      "100% heavyweight combed cotton",
      "Pre-shrunk — true to size",
      "Reinforced stitched seams",
      "Available in Black & White",
    ],
  },
  {
    id: "cargo-pant",
    name: "Cargo Pant",
    tagline: "Structured fit. Built for every occasion.",
    price: 5900,
    originalPrice: 9500,
    variants: {
      black: {
        label: "Black",
        image: null,
      },
      white: {
        label: "White",
        image: null,
      },
    },
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: {
      black: { S: 4, M: 6, L: 8, XL: 3, XXL: 1 },
      white: { S: 2, M: 5, L: 4, XL: 0, XXL: 0 },
    },
    features: [
      "Ripstop twill fabric — durable & lightweight",
      "Six utility pockets",
      "Adjustable ankle cuffs",
      "Available in Black & White",
    ],
  },
];

/**
 * Helper: format a price number as Algerian Dinar string.
 * formatPrice(4500) → "4,500 DA"
 */
export function formatPrice(amount) {
  return `${amount.toLocaleString('fr-DZ')} DA`;
}

/**
 * Helper: check if a specific size is in stock for a product + color combo.
 */
export function isInStock(product, color, size) {
  return (product.stock?.[color]?.[size] ?? 1) > 0;
}
