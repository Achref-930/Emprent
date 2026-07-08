"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Package, Check, Plus, ZoomIn } from "lucide-react";
import Image from "next/image";
import SizeSelector from "./SizeSelector";
import ZoomOverlay from "./ZoomOverlay";
import {
  formatPrice,
  isInStock,
  effectivePrice,
  discountPercent,
  totalStock,
  displayImageSrc,
  glueLastWords,
} from "../../lib/products";

// Below this many px of movement, we haven't yet decided whether the
// gesture is a horizontal swipe (carousel) or a vertical one (page scroll).
const AXIS_LOCK_THRESHOLD = 8;

export default function ProductCard({ product, onAddToCart, isFirstProduct = false }) {
  const images = product.images?.length ? product.images : [null];

  const [imageIndex, setImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [sizeError, setSizeError] = useState(false);
  const [added, setAdded] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  const dragStartX = useRef(null);
  const dragStartY = useRef(null);
  const dragStartTime = useRef(null);
  const dragAxis = useRef(null); // "x" | "y" | null — decided once per gesture
  const trackRef = useRef(null);
  // Mirrors imageIndex/isDragging into refs so the native (non-passive)
  // touch listeners — attached once — always read fresh values without
  // needing to be re-attached on every render.
  const imageIndexRef = useRef(imageIndex);
  imageIndexRef.current = imageIndex;

  const snapToIndex = useCallback(
    (index) => {
      const clamped = Math.max(0, Math.min(images.length - 1, index));
      setImageIndex(clamped);
      setDragOffset(0);
    },
    [images.length],
  );

  /* ── Touch — attached natively so touchmove can call preventDefault()
     (React's synthetic touch handlers are passive by default and can't).
     We only preventDefault once the gesture is confirmed horizontal, so
     a vertical swipe that starts on the carousel still scrolls the page
     normally and nothing "wiggles" or fights the native scroll. ── */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    function handleTouchStart(e) {
      dragStartX.current = e.touches[0].clientX;
      dragStartY.current = e.touches[0].clientY;
      dragStartTime.current = Date.now();
      dragAxis.current = null;
      setIsDragging(true);
    }

    function handleTouchMove(e) {
      if (dragStartX.current === null) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartX.current;
      const deltaY = touch.clientY - dragStartY.current;

      if (dragAxis.current === null) {
        if (
          Math.abs(deltaX) < AXIS_LOCK_THRESHOLD &&
          Math.abs(deltaY) < AXIS_LOCK_THRESHOLD
        ) {
          return; // not enough movement yet to decide
        }
        dragAxis.current = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
        if (dragAxis.current === "y") {
          // Vertical gesture — hand it back to the browser entirely.
          dragStartX.current = null;
          setIsDragging(false);
          return;
        }
      }

      if (dragAxis.current !== "x") return;

      // Confirmed horizontal — stop the page from also trying to scroll.
      e.preventDefault();

      const index = imageIndexRef.current;
      const atStart = index === 0 && deltaX > 0;
      const atEnd = index === images.length - 1 && deltaX < 0;
      setDragOffset(atStart || atEnd ? deltaX * 0.2 : deltaX);
    }

    function handleTouchEnd(e) {
      if (dragStartX.current === null || dragAxis.current !== "x") {
        dragStartX.current = null;
        dragAxis.current = null;
        setIsDragging(false);
        setDragOffset(0);
        return;
      }
      const touch = e.changedTouches[0];
      const delta = touch.clientX - dragStartX.current;
      const duration = Date.now() - dragStartTime.current;
      const velocity = Math.abs(delta) / duration;
      dragStartX.current = null;
      dragAxis.current = null;
      setIsDragging(false);
      setDragOffset(0);
      const width = trackRef.current?.offsetWidth ?? 300;
      const isFlick = velocity > 0.3;
      const isDrag = Math.abs(delta) > width * 0.35;
      if ((isFlick || isDrag) && Math.abs(delta) > 10) {
        snapToIndex(delta < 0 ? imageIndexRef.current + 1 : imageIndexRef.current - 1);
      }
    }

    // touchmove must be non-passive so preventDefault() actually works.
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [images.length, snapToIndex]);

  /* ── Mouse (desktop) ── */
  const onMouseDown = (e) => {
    dragStartX.current = e.clientX;
    dragStartTime.current = Date.now();
    setIsDragging(true);
  };

  const onMouseMove = (e) => {
    if (!isDragging || dragStartX.current === null) return;
    const delta = e.clientX - dragStartX.current;
    const atStart = imageIndex === 0 && delta > 0;
    const atEnd = imageIndex === images.length - 1 && delta < 0;
    setDragOffset(atStart || atEnd ? delta * 0.2 : delta);
  };

  const onMouseUp = (e) => {
    if (dragStartX.current === null) return;
    const delta = e.clientX - dragStartX.current;
    const duration = Date.now() - dragStartTime.current;
    const velocity = Math.abs(delta) / duration;
    dragStartX.current = null;
    setIsDragging(false);
    setDragOffset(0);
    const width = trackRef.current?.offsetWidth ?? 300;
    const isFlick = velocity > 0.3;
    const isDrag = Math.abs(delta) > width * 0.35;
    if ((isFlick || isDrag) && Math.abs(delta) > 10) {
      snapToIndex(delta < 0 ? imageIndex + 1 : imageIndex - 1);
    }
  };

  const onMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragOffset(0);
      dragStartX.current = null;
    }
  };

  /* ── Form handlers ── */
  const handleSizeChange = (size) => {
    setSelectedSize(size);
    setSizeError(false);
    setAdded(false);
  };

  const handleAddToOrder = () => {
    if (!selectedSize) {
      setSizeError(true);
      return;
    }
    setSizeError(false);
    setAdded(true);
    onAddToCart({
      cartItemId: crypto.randomUUID(),
      productId: product.productId,
      name: product.name,
      size: selectedSize,
      price: effectivePrice(product),
    });
    setTimeout(() => setAdded(false), 10000);
  };

  const stockMap = product.stock ?? {};
  const soldOut = totalStock(product) === 0;
  const price = effectivePrice(product);
  const pct = discountPercent(product);
  const hasDiscount = pct > 0;

  return (
    <article className="border-t border-gray-200">
      {/* ── Image Carousel ── */}
      <div
        ref={trackRef}
        className="w-full aspect-[3/4] max-w-lg mx-auto relative overflow-hidden select-none"
        style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "pan-y" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        {/* Discount badge */}
        {hasDiscount && (
          <div className="absolute top-3 left-3 z-10 bg-black text-white text-[11px] font-black tracking-[0.08em] uppercase px-2.5 py-1">
            -{pct}%
          </div>
        )}
        {soldOut && (
          <div className="absolute top-3 right-3 z-10 bg-white text-black text-[11px] font-black tracking-[0.08em] uppercase px-2.5 py-1 border border-black">
            Sold Out
          </div>
        )}

        {/* Slide track — all images side by side */}
        <div
          style={{
            display: "flex",
            width: `${images.length * 100}%`,
            height: "100%",
            transform: `translateX(calc(${-imageIndex * (100 / images.length)}% + ${dragOffset / images.length}px))`,
            transition: isDragging
              ? "none"
              : "transform 0.38s cubic-bezier(0.25, 1, 0.5, 1)",
            willChange: "transform",
          }}
        >
          {images.map((image, i) => (
            <div
              key={i}
              style={{
                width: `${100 / images.length}%`,
                height: "100%",
                flexShrink: 0,
                position: "relative",
                backgroundColor: "#111111",
              }}
            >
              {/* Subtle grid texture */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0.06,
                  backgroundImage:
                    "repeating-linear-gradient(0deg,#888 0,#888 1px,transparent 1px,transparent 60px)," +
                    "repeating-linear-gradient(90deg,#888 0,#888 1px,transparent 1px,transparent 60px)",
                }}
              />

              {image ? (
                <Image
                  src={displayImageSrc(image)}
                  alt={`${product.name} — photo ${i + 1}`}
                  fill
                  priority={isFirstProduct && i === 0}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  draggable={false}
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                  }}
                >
                  <Package
                    size={68}
                    strokeWidth={0.8}
                    className="text-gray-700"
                    aria-hidden="true"
                  />
                  <p className="text-[10px] tracking-[0.22em] uppercase text-gray-600">
                    {glueLastWords(product.name)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Zoom trigger — opens the full-screen overlay for the current slide */}
        {images[imageIndex] && (
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            aria-label="Zoom in on this photo"
            className="absolute bottom-3 right-3 z-10 w-10 h-10 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-transform duration-150"
          >
            <ZoomIn size={17} strokeWidth={2.2} aria-hidden="true" />
          </button>
        )}

        {/* Dot indicators */}
        {images.length > 1 && (
          <div
            className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10"
            aria-hidden="true"
          >
            {images.map((_, i) => (
              <span
                key={i}
                className={`
                  block rounded-full transition-all duration-300
                  ${
                    i === imageIndex
                      ? "w-4 h-1.5 bg-white"
                      : "w-1.5 h-1.5 bg-white/40"
                  }
                `}
              />
            ))}
          </div>
        )}
      </div>

      {zoomOpen && images[imageIndex] && (
        <ZoomOverlay
          displaySrc={displayImageSrc(images[imageIndex])}
          zoomSrc={images[imageIndex]}
          alt={`${product.name} — photo ${imageIndex + 1}`}
          onClose={() => setZoomOpen(false)}
        />
      )}

      {/* ── Product Info ── */}
      <div className="max-w-lg mx-auto px-5 pt-9 pb-14 space-y-8">
        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-[10px] tracking-[0.22em] uppercase text-gray-400">
              EMPRNTE Collection
            </p>
          </div>
          <h2 className="text-[30px] font-black tracking-[-0.03em] text-black leading-none mb-2">
            {glueLastWords(product.name)}
          </h2>
          <p className="text-[13px] text-gray-500">{product.tagline}</p>
        </div>

        <div className="border-t border-gray-200" />

        <div className="flex items-baseline gap-3">
          <span className="text-[34px] font-black tracking-[-0.03em] text-black leading-none">
            {formatPrice(price)}
          </span>
          {hasDiscount && (
            <span className="text-[16px] font-medium text-gray-400 line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        <SizeSelector
          sizes={product.sizes}
          selected={selectedSize}
          onChange={handleSizeChange}
          stockMap={stockMap}
          error={sizeError}
        />

        <button
          type="button"
          onClick={handleAddToOrder}
          disabled={soldOut}
          className={`
            w-full font-black text-[12px] tracking-[0.2em] uppercase
            py-[18px]
            flex items-center justify-center gap-3
            border-2
            transition-all duration-200
            active:scale-[0.99]
            ${
              soldOut
                ? "bg-white text-gray-300 border-gray-200 cursor-not-allowed"
                : added
                  ? "bg-white text-black border-black"
                  : "bg-black text-white border-black hover:bg-neutral-800"
            }
          `}
        >
          {soldOut ? (
            "Sold Out"
          ) : added ? (
            <>
              <Check size={15} strokeWidth={2.5} aria-hidden="true" />
              Added to Order
            </>
          ) : (
            <>
              <Plus size={15} aria-hidden="true" />
              Add to Order
            </>
          )}
        </button>

        {added && (
          <div
            style={{
              animation: "slideUpFade 0.35s cubic-bezier(0.22,1,0.36,1) both",
            }}
            className="flex items-start gap-3 border border-black/10 bg-gray-50 rounded-sm px-4 py-3"
          >
            <span className="mt-[1px] shrink-0 text-black">
              {/* rotate arrow icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 15 3 9l6-6"/><path d="M3 9h13a5 5 0 0 1 0 10h-1"/>
              </svg>
            </span>
            <p className="text-[11px] leading-[1.6] text-gray-600">
              <span className="font-semibold text-black">Want another one?</span>{" "}
              Pick a different size and tap <span className="font-semibold text-black">Add to Order</span> again.
            </p>
          </div>
        )}

        <style>{`
          @keyframes slideUpFade {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </article>
  );
}
