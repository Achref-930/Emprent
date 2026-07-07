"use client";

/**
 * app/page.js — COD E-Commerce Landing Page
 * Stack: Next.js (App Router) · Tailwind CSS · Lucide React
 * Market: North Africa / Algeria  ·  Design: Strict B&W Minimalism
 *
 * NOTE: The entire page is a Client Component so the header and the
 * cart/checkout drawer (app/components/CartDrawer.jsx) share cart state.
 */

import { useState, useEffect } from "react";
import Image from "next/image";
import { Truck, Shield, Star, Zap, ShoppingBag } from "lucide-react";

import ProductCard from "./components/ProductCard";
import CartDrawer from "./components/CartDrawer";

/* ─────────────────────────────────────────────────
   STICKY HEADER
───────────────────────────────────────────────── */
function Header({ cartCount, onCartClick }) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-lg border-b border-black">
      <div className="max-w-lg mx-auto px-5 h-[56px] flex items-center justify-between">
        <span
          className="text-[22px] font-black tracking-[-0.04em] text-black uppercase select-none"
          aria-label="EMPRNTE store"
        >
          EMPRNTE
        </span>

        <button
          onClick={onCartClick}
          aria-label={
            cartCount > 0
              ? `Open cart, ${cartCount} item${cartCount > 1 ? "s" : ""}`
              : "Open cart"
          }
          className="
            relative flex items-center justify-center
            w-10 h-10
            text-black
            hover:opacity-70 active:scale-[0.94]
            transition-all duration-150
          "
        >
          <ShoppingBag size={22} strokeWidth={1.75} aria-hidden="true" />
          {cartCount > 0 && (
            <span
              aria-hidden="true"
              style={{
                animation: "badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
                background: "#FF3B30",
                boxShadow: "0 0 0 2.5px #fff, 0 2px 6px rgba(255,59,48,0.55)",
              }}
              className="
                absolute top-0 right-0
                min-w-[18px] h-[18px] px-[4px] rounded-full
                flex items-center justify-center
                text-[10px] font-black text-white leading-none tabular-nums
                pointer-events-none select-none
              "
            >
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────
   HERO IMAGE
───────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative h-screen w-full pt-[56px]">
      <div className="relative h-full w-full overflow-hidden">
        <Image
          src="/hero/hero-bg.webp"
          alt="EMPRNTE collection"
          fill
          priority
          quality={90}
          sizes="100vw"
          className="object-cover"
        />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────
   FEATURES
───────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Zap,
    title: "Ultra Performance",
    desc: "Premium-grade materials chosen for durability and lasting excellence.",
  },
  {
    icon: Shield,
    title: "100% Quality Assured",
    desc: "Every unit passes a strict multi-point inspection before shipping.",
  },
  {
    icon: Truck,
    title: "Nationwide Delivery",
    desc: "Delivered to all 58 wilayas of Algeria within 48–72 hours.",
  },
  {
    icon: Star,
    title: "Thousands of Customers",
    desc: "Join a growing community that trusts EMPRNTE for premium at fair prices.",
  },
];

function Features() {
  return (
    <section className="bg-[#F9F9F9] border-t border-gray-200">
      <div className="max-w-lg mx-auto px-5 py-16">
        <p className="text-[10px] tracking-[0.22em] uppercase text-gray-400 mb-2">
          Why EMPRNTE
        </p>
        <h2 className="text-[28px] font-black tracking-[-0.03em] text-black mb-12">
          Built Different.
        </h2>
        <div>
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={i}
              className="flex items-start gap-5 py-7 border-b border-gray-200 last:border-b-0"
            >
              <div className="shrink-0 w-10 h-10 border border-black flex items-center justify-center">
                <Icon
                  size={18}
                  strokeWidth={1.5}
                  className="text-black"
                  aria-hidden="true"
                />
              </div>
              <div className="pt-0.5">
                <h3 className="text-[12px] font-black tracking-[0.12em] uppercase text-black mb-1.5">
                  {title}
                </h3>
                <p className="text-[13px] text-gray-500 leading-[1.65]">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="max-w-lg mx-auto px-5 py-10 text-center">
        <span
          className="text-[22px] font-black tracking-[-0.04em] uppercase select-none"
          aria-label="EMPRNTE store"
        >
          EMPRNTE
        </span>
        <div className="mt-5 text-xs">
          &copy; {new Date().getFullYear()} EMPRNTE. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────
   PAGE ROOT — owns shared cart state
───────────────────────────────────────────────── */
export default function Page() {
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setProducts(Array.isArray(data.products) ? data.products : []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Append a new cart line — every call adds a fresh entry.
   * cartItemId (UUID) is generated in ProductCard so identical
   * variants can coexist as separate, independently removable lines.
   */
  const handleAddToCart = (newItem) => {
    setCart((prev) => [...prev, newItem]);
  };

  /**
   * Remove a single cart line by its unique cartItemId.
   */
  const handleRemoveFromCart = (cartItemId) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  return (
    <main className="min-h-screen bg-white font-sans antialiased">
      <Header cartCount={cart.length} onCartClick={() => setCartOpen(true)} />
      <Hero />
      {/* Products Section */}
      <section id="first-product" className="max-w-lg mx-auto px-5 pt-20">
        {productsLoading ? (
          <div className="py-24 text-center text-[12px] tracking-[0.18em] uppercase text-gray-400">
            Loading products…
          </div>
        ) : (
          <div className="space-y-16">
            {products.map((product) => (
              <ProductCard
                key={product.productId}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </section>

      <Features />

      <Footer />

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onRemoveItem={handleRemoveFromCart}
        onOrderPlaced={() => setCart([])}
      />
    </main>
  );
}
