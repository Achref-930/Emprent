"use client";

import { useState, useRef, useCallback } from "react";
import { Package, Check, Plus } from "lucide-react";
import Image from "next/image";
import ColorSelector from "./ColorSelector";
import SizeSelector from "./SizeSelector";
import { formatPrice, isInStock } from "../../lib/products";

export default function ProductCard({ product, onAddToCart }) {
  const colorKeys = Object.keys(product.variants);

  const [selectedColor, setSelectedColor] = useState(colorKeys[0]);
  const [selectedSize, setSelectedSize] = useState(null);
  const [sizeError, setSizeError] = useState(false);
  const [added, setAdded] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartX = useRef(null);
  const dragStartTime = useRef(null);
  const trackRef = useRef(null);

  const currentIndex = colorKeys.indexOf(selectedColor);

  const handleColorChange = useCallback(
    (colorKey) => {
      setSelectedColor(colorKey);
      setDragOffset(0);
      if (selectedSize && !isInStock(product, colorKey, selectedSize)) {
        setSelectedSize(null);
      }
      setAdded(false);
    },
    [selectedSize, product],
  );

  const snapToIndex = useCallback(
    (index) => {
      const clamped = Math.max(0, Math.min(colorKeys.length - 1, index));
      handleColorChange(colorKeys[clamped]);
    },
    [colorKeys, handleColorChange],
  );

  /* ── Touch ── */
  const onTouchStart = (e) => {
    dragStartX.current = e.touches[0].clientX;
    dragStartTime.current = Date.now();
    setIsDragging(true);
  };

  const onTouchMove = (e) => {
    if (dragStartX.current === null) return;
    const delta = e.touches[0].clientX - dragStartX.current;
    const atStart = currentIndex === 0 && delta > 0;
    const atEnd = currentIndex === colorKeys.length - 1 && delta < 0;
    setDragOffset(atStart || atEnd ? delta * 0.2 : delta);
  };

  const onTouchEnd = (e) => {
    if (dragStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - dragStartX.current;
    const duration = Date.now() - dragStartTime.current;
    const velocity = Math.abs(delta) / duration;
    dragStartX.current = null;
    setIsDragging(false);
    setDragOffset(0);
    const width = trackRef.current?.offsetWidth ?? 300;
    const isFlick = velocity > 0.3;
    const isDrag = Math.abs(delta) > width * 0.35;
    if ((isFlick || isDrag) && Math.abs(delta) > 10) {
      snapToIndex(delta < 0 ? currentIndex + 1 : currentIndex - 1);
    }
  };

  /* ── Mouse (desktop) ── */
  const onMouseDown = (e) => {
    dragStartX.current = e.clientX;
    dragStartTime.current = Date.now();
    setIsDragging(true);
  };

  const onMouseMove = (e) => {
    if (!isDragging || dragStartX.current === null) return;
    const delta = e.clientX - dragStartX.current;
    const atStart = currentIndex === 0 && delta > 0;
    const atEnd = currentIndex === colorKeys.length - 1 && delta < 0;
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
      snapToIndex(delta < 0 ? currentIndex + 1 : currentIndex - 1);
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
      productId: product.id,
      name: product.name,
      color: selectedColor,
      colorLabel: product.variants[selectedColor].label,
      size: selectedSize,
      price: product.price,
    });
    setTimeout(() => setAdded(false), 10000);
  };

  const stockMap = product.stock?.[selectedColor] ?? {};

  return (
    <article className="border-t border-gray-200">
      {/* ── Drag Carousel ── */}
      <div
        ref={trackRef}
        className="w-full aspect-[3/4] max-w-lg mx-auto relative overflow-hidden select-none"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        {/* Slide track — all images side by side */}
        <div
          style={{
            display: "flex",
            width: `${colorKeys.length * 100}%`,
            height: "100%",
            transform: `translateX(calc(${-currentIndex * (100 / colorKeys.length)}% + ${dragOffset / colorKeys.length}px))`,
            transition: isDragging
              ? "none"
              : "transform 0.38s cubic-bezier(0.25, 1, 0.5, 1)",
            willChange: "transform",
          }}
        >
          {colorKeys.map((colorKey) => {
            const variant = product.variants[colorKey];
            const bg = colorKey === "black" ? "#111111" : "#F5F5F5";

            return (
              <div
                key={colorKey}
                style={{
                  width: `${100 / colorKeys.length}%`,
                  height: "100%",
                  flexShrink: 0,
                  position: "relative",
                  backgroundColor: bg,
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

                {variant.image ? (
                  <Image
                    src={variant.image}
                    alt={`${product.name} in ${variant.label}`}
                    fill
                    priority={colorKey === colorKeys[0]}
                    quality={85}
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
                      className={
                        colorKey === "black" ? "text-gray-700" : "text-gray-300"
                      }
                      aria-hidden="true"
                    />
                    <p
                      className={`text-[10px] tracking-[0.22em] uppercase ${colorKey === "black" ? "text-gray-600" : "text-gray-400"}`}
                    >
                      {variant.label} · {product.name}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Dot indicators */}
        {colorKeys.length > 1 && (
          <div
            className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10"
            aria-hidden="true"
          >
            {colorKeys.map((key) => (
              <span
                key={key}
                className={`
                  block rounded-full transition-all duration-300
                  ${
                    key === selectedColor
                      ? "w-4 h-1.5 bg-white"
                      : "w-1.5 h-1.5 bg-white/40"
                  }
                `}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Product Info ── */}
      <div className="max-w-lg mx-auto px-5 pt-9 pb-14 space-y-8">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-gray-400 mb-2">
            EMPRNTE Collection
          </p>
          <h2 className="text-[30px] font-black tracking-[-0.03em] text-black leading-none mb-2">
            {product.name}
          </h2>
          <p className="text-[13px] text-gray-500">{product.tagline}</p>
        </div>

        <ColorSelector
          colors={colorKeys}
          selected={selectedColor}
          onChange={handleColorChange}
        />

        <div className="border-t border-gray-200" />

        <div>
          <span className="text-[34px] font-black tracking-[-0.03em] text-black leading-none">
            {formatPrice(product.price)}
          </span>
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
          className={`
            w-full font-black text-[12px] tracking-[0.2em] uppercase
            py-[18px]
            flex items-center justify-center gap-3
            border-2
            transition-all duration-200
            active:scale-[0.99]
            ${
              added
                ? "bg-white text-black border-black"
                : "bg-black text-white border-black hover:bg-neutral-800"
            }
          `}
        >
          {added ? (
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
          <p className="text-center text-[11px] text-gray-400">
            Pick another colour or size and add again to order more.
          </p>
        )}
      </div>
    </article>
  );
}
