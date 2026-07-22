"use client";

/**
 * app/components/CartDrawer.jsx
 * Slide-in cart + checkout drawer.
 *
 * Replaces the old inline "order-form" page section. Checkout now lives
 * entirely inside this overlay (cart items -> customer form -> receipt),
 * so the product grid underneath can never be "scrolled past" mid-flow.
 *
 * Props:
 *   isOpen        → boolean, controls drawer visibility
 *   onClose       → () => void, called on X / overlay / Esc (ignored during
 *                    the success screen — that step only exits via
 *                    "Continue Shopping")
 *   cart          → Array<{ cartItemId, productId, name, size, price }>
 *   onRemoveItem  → (cartItemId: string) => void
 *   onOrderPlaced → () => void, called the moment the order succeeds so the
 *                    parent can clear the live cart
 */

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  Package,
  User,
  Phone,
  ChevronRight,
  Trash2,
  X,
} from "lucide-react";
import { formatPrice } from "../../lib/products";
import { getOrderAddress } from "../../lib/orderData.mjs";
import ShippingSelector from "./ShippingSelector";

const INPUT_BASE =
  "w-full px-4 py-3.5 text-[14px] text-black bg-white " +
  "border border-black placeholder-gray-300 " +
  "outline-none focus:border-[2px] focus:border-black " +
  "transition-all duration-100";

const LABEL_BASE =
  "block text-[10px] font-black tracking-[0.18em] uppercase text-black mb-2";

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onRemoveItem,
  onOrderPlaced,
}) {
  const [form, setForm] = useState({ name: "", phone: "" });
  const [shipping, setShipping] = useState({
    wilaya: "",
    deliveryType: null,
    fee: 0,
    homeAddress: "",
  });
  const [shippingError, setShippingError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");

  // Frozen snapshot of the order, captured the instant the API call
  // succeeds. The receipt renders from this — never from the live cart —
  // so nothing added to the cart afterward can change what's shown.
  const [orderSnapshot, setOrderSnapshot] = useState(null);

  const receiptRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const panelRef = useRef(null);

  const cartEmpty = cart.length === 0;
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const total = subtotal + (shipping.fee || 0);

  const isSuccess = status === "success";

  /* ── Close behaviors: Esc key + body scroll lock while open.
     Disabled during the success screen — only "Continue Shopping" exits it. ── */
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === "Escape" && !isSuccess) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, isSuccess, onClose]);

  function handleOverlayClick() {
    if (!isSuccess) onClose();
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleShippingChange = (info) => {
    setShipping((prev) => ({ ...prev, ...info }));
    if (info.wilaya && info.deliveryType) {
      setShippingError("");
    }
  };

  const validateName = (name) => {
    // Trim whitespace
    const trimmed = name.trim();

    // At least 3 characters
    if (trimmed.length < 3) {
      return "Name must be at least 3 characters.";
    }

    // At least 2 words (first and last name)
    const words = trimmed.split(/\s+/);
    if (words.length < 2) {
      return "Please provide both first and last name.";
    }

    // Only letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-ZÀ-ÿ\s\-']+$/;
    if (!nameRegex.test(trimmed)) {
      return "Name can only contain letters, spaces, hyphens, and apostrophes.";
    }

    return null; // Valid
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cartEmpty) return;

    // Validate name
    const nameError = validateName(form.name);
    if (nameError) {
      setErrorMsg(nameError);
      setStatus("error");
      return;
    }

    if (!shipping.deliveryType) {
      setShippingError("Veuillez choisir un mode de livraison.");
      return;
    }
    if (!shipping.wilaya) {
      setShippingError("Veuillez choisir une wilaya.");
      return;
    }

    const normalizedAddress = getOrderAddress(shipping).trim();
    if (shipping.deliveryType === "domicile" && !normalizedAddress) {
      setErrorMsg("Please provide a home address for domicile delivery.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          wilaya: shipping.wilaya,
          deliveryType: shipping.deliveryType,
          homeAddress: normalizedAddress,
          address: normalizedAddress,
          shippingFee: shipping.fee,
          items: cart.map(({ productId, name, size, price }) => ({
            productId,
            name,
            size,
            price,
          })),
          subtotal,
          total,
          payment: "cash_on_delivery",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.message ?? "Something went wrong. Please try again.",
        );
      }

      // Snapshot everything the receipt needs *before* touching the cart.
      setOrderSnapshot({
        name: form.name,
        phone: form.phone,
        items: cart,
        subtotal,
        shippingFee: shipping.fee,
        total,
        wilaya: shipping.wilaya,
        deliveryType: shipping.deliveryType,
        address: normalizedAddress,
      });
      setStatus("success");
      onOrderPlaced?.(); // clear the live cart — receipt no longer reads from it
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  };

  async function handleDownloadReceipt() {
    if (!receiptRef.current || downloading) return;
    setDownloading(true);
    setDownloadError("");
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#000000",
        scale: 2,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const safeName = (orderSnapshot?.name || "order").replace(/\s+/g, "_");
      link.href = dataUrl;
      link.download = `receipt_${safeName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Receipt image capture failed:", err);
      setDownloadError("Couldn't generate the image. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  function handleContinueShopping() {
    // Full reset — the only way out of the success screen.
    setStatus("idle");
    setErrorMsg("");
    setOrderSnapshot(null);
    setForm({ name: "", phone: "" });
    setShipping({ wilaya: "", deliveryType: null, fee: 0 });
    setShippingError("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        style={{ animation: "cartFadeIn 0.2s ease" }}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Cart and checkout"
        className="absolute top-0 right-0 h-full w-full sm:max-w-md bg-white shadow-2xl flex flex-col"
        style={{
          animation: "cartSlideIn 0.28s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-[56px] border-b border-black shrink-0">
          <span className="text-[13px] font-black tracking-[0.14em] uppercase text-black">
            {isSuccess ? "Order Confirmed" : "Your Order"}
          </span>
          {!isSuccess && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close cart"
              className="text-black hover:opacity-60 transition-opacity"
            >
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          {isSuccess ? (
            <SuccessStep
              snapshot={orderSnapshot}
              receiptRef={receiptRef}
              onDownload={handleDownloadReceipt}
              downloading={downloading}
              downloadError={downloadError}
            />
          ) : (
            <FormStep
              cart={cart}
              cartEmpty={cartEmpty}
              subtotal={subtotal}
              total={total}
              shipping={shipping}
              shippingError={shippingError}
              form={form}
              status={status}
              errorMsg={errorMsg}
              onRemoveItem={onRemoveItem}
              onChange={handleChange}
              onShippingChange={handleShippingChange}
              onSubmit={handleSubmit}
            />
          )}
        </div>

        {/* Footer — only on success, to make the exit action unmistakable */}
        {isSuccess && (
          <div className="px-5 py-4 border-t border-black shrink-0">
            <button
              type="button"
              onClick={handleContinueShopping}
              className="w-full bg-black text-white font-black text-[12px] tracking-[0.2em] uppercase py-4 hover:bg-neutral-800 transition-colors active:scale-[0.99]"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes cartFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cartSlideIn {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   FORM STEP — cart items + customer info + shipping
───────────────────────────────────────────────── */
function FormStep({
  cart,
  cartEmpty,
  subtotal,
  total,
  shipping,
  shippingError,
  form,
  status,
  errorMsg,
  onRemoveItem,
  onChange,
  onShippingChange,
  onSubmit,
}) {
  if (cartEmpty) {
    return (
      <div className="border border-dashed border-gray-300 px-6 py-14 text-center">
        <Package
          size={28}
          strokeWidth={1}
          className="mx-auto mb-3 text-gray-300"
          aria-hidden="true"
        />
        <p className="text-[12px] text-gray-400 leading-relaxed">
          Your order is empty. Pick a product to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Order Summary ── */}
      <div className="border border-black">
        <div className="divide-y divide-gray-200">
          {cart.map((item) => (
            <div
              key={item.cartItemId}
              className="flex items-center justify-between px-4 py-3.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-black truncate">
                  {item.name}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Size {item.size}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-3 shrink-0">
                <p className="text-[13px] font-black text-black">
                  {formatPrice(item.price)}
                </p>
                {onRemoveItem && (
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.cartItemId)}
                    aria-label={`Remove ${item.name} (size ${item.size}) from order`}
                    className="text-gray-300 hover:text-black transition-colors"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 divide-y divide-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[11px] text-gray-400 tracking-[0.1em] uppercase">
              Subtotal
            </p>
            <p className="text-[13px] font-black text-black">
              {formatPrice(subtotal)}
            </p>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[11px] text-gray-400 tracking-[0.1em] uppercase">
              Frais de livraison
            </p>
            <p className="text-[13px] font-black text-black">
              {shipping.fee > 0 ? formatPrice(shipping.fee) : "—"}
            </p>
          </div>
          <div className="flex items-center justify-between px-4 py-4 bg-black">
            <p className="text-[10px] tracking-[0.16em] uppercase text-gray-400 font-bold">
              Total on Delivery
            </p>
            <p className="text-[15px] font-black text-white">
              {formatPrice(total)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Customer Form ── */}
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <div>
          <label htmlFor="cart-name" className={LABEL_BASE}>
            Full Name
          </label>
          <div className="relative">
            <User
              size={14}
              strokeWidth={1.5}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="cart-name"
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="Your full name"
              pattern="[a-zA-ZÀ-ÿ\s\-']+"
              title="Please enter a valid name (letters, spaces, hyphens, and apostrophes only)"
              value={form.name}
              onChange={onChange}
              className={`${INPUT_BASE} pl-10`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="cart-phone" className={LABEL_BASE}>
            Phone Number
          </label>
          <div className="relative">
            <Phone
              size={14}
              strokeWidth={1.5}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="cart-phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="05XX XX XX XX"
              value={form.phone}
              onChange={onChange}
              className={`${INPUT_BASE} pl-10`}
            />
          </div>
        </div>

        <ShippingSelector
          onShippingChange={onShippingChange}
          error={shippingError}
        />

        {status === "error" && (
          <div
            role="alert"
            className="border border-black px-4 py-3 flex items-start gap-3"
          >
            <span className="text-[11px] font-black tracking-wide uppercase text-black shrink-0">
              Error
            </span>
            <span className="text-[12px] text-gray-600">{errorMsg}</span>
          </div>
        )}

        <div className="border border-gray-200 bg-[#F9F9F9] p-4 flex items-start gap-3">
          <Package
            size={15}
            strokeWidth={1.5}
            className="text-black shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-[12px] text-gray-500 leading-[1.65]">
            <strong className="text-black font-bold">
              Cash on Delivery only.
            </strong>{" "}
            No card required. You pay when the courier hands you your package.
          </p>
        </div>

        <button
          type="submit"
          disabled={status === "loading" || cartEmpty}
          aria-busy={status === "loading"}
          className={`
            w-full font-black text-[12px] tracking-[0.2em] uppercase
            py-[18px]
            flex items-center justify-center gap-3
            border-2 border-black
            transition-all duration-150 active:scale-[0.99]
            ${
              status === "loading"
                ? "bg-black text-white opacity-60 cursor-not-allowed"
                : "bg-black text-white hover:bg-neutral-800"
            }
          `}
        >
          {status === "loading" ? (
            <>
              <span
                className="inline-block w-[14px] h-[14px] border-2 border-white border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              Processing…
            </>
          ) : (
            <>
              Confirm My Order
              <ChevronRight size={15} aria-hidden="true" />
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-gray-400 leading-[1.6]">
          By confirming you agree to our terms of service.
          <br />
          Your personal data is kept strictly private.
        </p>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   SUCCESS STEP — renders only from the frozen snapshot
───────────────────────────────────────────────── */
function SuccessStep({
  snapshot,
  receiptRef,
  onDownload,
  downloading,
  downloadError,
}) {
  if (!snapshot) return null;

  const locationText =
    snapshot.deliveryType === "domicile" && snapshot.address
      ? `${snapshot.wilaya}, ${snapshot.address}`
      : snapshot.wilaya;

  return (
    <div>
      <div
        ref={receiptRef}
        className="bg-black text-white px-6 py-8 text-center"
      >
        <span className="text-[16px] font-black tracking-[-0.04em] uppercase select-none">
          EMPRNTE
        </span>

        <div className="border-t border-gray-700 mt-5 pt-5">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <CheckCircle
              size={20}
              strokeWidth={2.5}
              className="text-white shrink-0"
              aria-hidden="true"
            />
            <h2 className="text-[17px] font-black tracking-[-0.02em] uppercase">
              Order Confirmed!
            </h2>
          </div>
          <p className="text-[13px] text-gray-200 leading-[1.7] mb-6">
            Thank you, <strong className="text-white">{snapshot.name}</strong>.
            Your order has been received. We will call{" "}
            <strong className="text-white">{snapshot.phone}</strong> shortly to
            confirm{" "}
            {snapshot.deliveryType === "domicile" ? "delivery to" : "pickup in"}{" "}
            <strong className="text-white">{locationText}</strong>.
          </p>
        </div>

        <div className="border border-gray-700 divide-y divide-gray-700 text-left mb-6">
          {snapshot.items.map((item) => (
            <div
              key={item.cartItemId}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="text-[12px] font-bold text-white">{item.name}</p>
                <p className="text-[11px] text-gray-300 mt-0.5">
                  Size {item.size}
                </p>
              </div>
              <p className="text-[12px] font-black text-white shrink-0 ml-4">
                {formatPrice(item.price)}
              </p>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[11px] text-gray-300">
              Frais de livraison (
              {snapshot.deliveryType === "domicile" ? "Domicile" : "Bureau"})
            </p>
            <p className="text-[12px] font-black text-white shrink-0 ml-4">
              {formatPrice(snapshot.shippingFee)}
            </p>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5 bg-white/[0.06]">
            <p className="text-[11px] tracking-[0.14em] uppercase text-gray-200 font-bold">
              Total
            </p>
            <p className="text-[15px] font-black text-white">
              {formatPrice(snapshot.total)}
            </p>
          </div>
        </div>

        <p className="text-[11px] font-bold text-white tracking-[0.18em] uppercase">
          Payment: Cash on Delivery
        </p>
      </div>

      <button
        type="button"
        onClick={onDownload}
        disabled={downloading}
        className="w-full mt-4 bg-white text-black border-2 border-black py-3.5 text-[12px] font-black tracking-[0.16em] uppercase disabled:opacity-50 hover:bg-gray-100 transition-colors"
      >
        {downloading ? "Preparing image…" : "Download Receipt as Image"}
      </button>
      {downloadError && (
        <p className="text-center text-[12px] text-red-700 mt-3">
          {downloadError}
        </p>
      )}
    </div>
  );
}
