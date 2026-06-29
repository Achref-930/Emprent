"use client";

/**
 * app/page.js — COD E-Commerce Landing Page
 * Stack: Next.js (App Router) · Tailwind CSS · Lucide React
 * Market: North Africa / Algeria  ·  Design: Strict B&W Minimalism
 *
 * NOTE: The entire page is a Client Component so the sticky header
 * scroll handler and the checkout form share the same module.
 * For production, extract <CheckoutForm> into its own
 * `app/components/CheckoutForm.jsx` with "use client", keep the
 * rest as a Server Component, and remove the top-level 'use client'.
 */

import { useState } from "react";
import Image from "next/image";
import { Truck, Shield, Star, Zap } from "lucide-react";

import { products } from "../lib/products";
import ProductCard from "./components/ProductCard";
import CheckoutForm from "./components/CheckoutForm";

/* ─────────────────────────────────────────────────
   STICKY HEADER
───────────────────────────────────────────────── */
function Header({ cartCount }) {
  const scrollToForm = () => {
    if (cartCount > 0) {
      document
        .getElementById("order-form")
        ?.scrollIntoView({ behavior: "smooth" });
    } else {
      document
        .getElementById("first-product")
        ?.scrollIntoView({ behavior: "smooth" });
    }
  };

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
          onClick={scrollToForm}
          className="
            relative bg-black text-white
            text-[11px] font-bold tracking-[0.16em] uppercase
            px-5 py-2.5
            hover:bg-neutral-800 active:scale-[0.97]
            transition-all duration-150
          "
        >
          {cartCount > 0 && (
            <span
              aria-label={`${cartCount} item${cartCount > 1 ? "s" : ""} in order`}
              className="
                absolute -top-1.5 -right-1.5
                w-4 h-4 rounded-full bg-white border border-black
                flex items-center justify-center
                text-[9px] font-black text-black leading-none
              "
            >
              {cartCount}
            </span>
          )}
          {cartCount > 0 ? "View Order" : "Buy Now"}
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
      <Header cartCount={cart.length} />
      <Hero />
      {/* Products Section */}
      <section id="first-product" className="max-w-lg mx-auto px-5 pt-20">
        <div className="space-y-16">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      </section>

      {/* Checkout Form Section */}
      <section
        id="order-form"
        className="bg-white border-t-2 border-black scroll-mt-[55px]"
      >
        <CheckoutForm cart={cart} onRemoveItem={handleRemoveFromCart} />
      </section>

      <Features />

      <Footer />
    </main>
  );
}
