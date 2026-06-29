"use client";

/**
 * app/components/CheckoutForm.jsx
 * COD-only checkout form with integrated shipping selector.
 *
 * Props:
 *   cart         → Array<{ cartItemId, productId, name, colorLabel, size, price }>
 *   onRemoveItem → (cartItemId: string) => void
 */

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  Package,
  User,
  Phone,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { formatPrice } from "../../lib/products";
import ShippingSelector from "./ShippingSelector";

const INPUT_BASE =
  "w-full px-4 py-3.5 text-[14px] text-black bg-white " +
  "border border-black placeholder-gray-300 " +
  "outline-none focus:border-[2px] focus:border-black " +
  "transition-all duration-100";

const LABEL_BASE =
  "block text-[10px] font-black tracking-[0.18em] uppercase text-black mb-2";

export default function CheckoutForm({ cart, onRemoveItem }) {
  const [form, setForm] = useState({ name: "", phone: "" });
  const [shipping, setShipping] = useState({
    wilaya: "",
    commune: "",
    deliveryType: null,
    fee: 0,
  });
  const [shippingError, setShippingError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");

  const receiptRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  // Bring the receipt into view the moment the order succeeds, accounting
  // for the sticky header height so the top of the receipt isn't cut off.
  useEffect(() => {
    if (status === "success" && receiptRef.current) {
      const yOffset = -76; // Sticky header (56px) + extra spacing (20px)
      const elementTop = receiptRef.current.getBoundingClientRect().top;
      const absoluteTop = elementTop + window.pageYOffset;
      window.scrollTo({ top: absoluteTop + yOffset, behavior: "smooth" });
    }
  }, [status]);

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
      const safeName = (form.name || "order").replace(/\s+/g, "_");
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

  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const total = subtotal + (shipping.fee || 0);
  const cartEmpty = cart.length === 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleShippingChange = (info) => {
    setShipping(info);
    if (info.wilaya && info.commune && info.deliveryType) {
      setShippingError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cartEmpty) return;

    // Validate shipping
    if (!shipping.deliveryType) {
      setShippingError("Veuillez choisir un mode de livraison.");
      return;
    }
    if (!shipping.wilaya) {
      setShippingError("Veuillez choisir une wilaya.");
      return;
    }
    if (!shipping.commune) {
      setShippingError("Veuillez choisir une commune.");
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
          commune: shipping.commune,
          deliveryType: shipping.deliveryType,
          shippingFee: shipping.fee,
          items: cart.map(({ productId, name, colorLabel, size, price }) => ({
            productId,
            name,
            color: colorLabel,
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

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  };

  /* ── Success screen ── */
  if (status === "success") {
    return (
      <section id="order-form" className="max-w-lg mx-auto px-5 py-20">
        <div
          ref={receiptRef}
          className="bg-black text-white px-8 py-10 text-center"
        >
          {/* Brand mark */}
          <span className="text-[18px] font-black tracking-[-0.04em] uppercase select-none">
            EMPRNTE
          </span>

          <div className="border-t border-gray-700 mt-6 pt-6">
            <div className="flex items-center justify-center gap-2.5 mb-4">
              <CheckCircle
                size={22}
                strokeWidth={2.5}
                className="text-white shrink-0"
                aria-hidden="true"
              />
              <h2 className="text-[20px] font-black tracking-[-0.02em] uppercase">
                Order Confirmed!
              </h2>
            </div>
            <p className="text-[14px] text-gray-200 leading-[1.75] mb-8">
              Thank you, <strong className="text-white">{form.name}</strong>.
              Your order has been received. We will call{" "}
              <strong className="text-white">{form.phone}</strong> shortly to
              confirm{" "}
              {shipping.deliveryType === "domicile"
                ? "delivery to"
                : "pickup in"}{" "}
              <strong className="text-white">
                {shipping.commune}, {shipping.wilaya}
              </strong>
              .
            </p>
          </div>

          {/* Order summary in success */}
          <div className="border border-gray-700 divide-y divide-gray-700 text-left mb-7">
            {cart.map((item) => (
              <div
                key={item.cartItemId}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <div>
                  <p className="text-[12px] font-bold text-white">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-gray-300 mt-0.5">
                    {item.colorLabel} · {item.size}
                  </p>
                </div>
                <p className="text-[12px] font-black text-white shrink-0 ml-4">
                  {formatPrice(item.price)}
                </p>
              </div>
            ))}
            {/* Shipping fee row */}
            <div className="flex items-center justify-between px-5 py-3.5">
              <p className="text-[11px] text-gray-300">
                Frais de livraison (
                {shipping.deliveryType === "domicile" ? "Domicile" : "Bureau"})
              </p>
              <p className="text-[12px] font-black text-white shrink-0 ml-4">
                {formatPrice(shipping.fee)}
              </p>
            </div>
            {/* Total row */}
            <div className="flex items-center justify-between px-5 py-4 bg-white/[0.06]">
              <p className="text-[11px] tracking-[0.14em] uppercase text-gray-200 font-bold">
                Total
              </p>
              <p className="text-[16px] font-black text-white">
                {formatPrice(total)}
              </p>
            </div>
          </div>

          <p className="text-[11px] font-bold text-white tracking-[0.18em] uppercase">
            Payment: Cash on Delivery
          </p>
        </div>

        {/* Download — kept outside the captured area, like the admin modal */}
        <button
          type="button"
          onClick={handleDownloadReceipt}
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
      </section>
    );
  }

  /* ── Form ── */
  return (
    <section id="order-form" className="border-t border-gray-200 bg-white">
      <div className="max-w-lg mx-auto px-5 py-16">
        {/* Header */}
        <p className="text-[10px] tracking-[0.22em] uppercase text-gray-400 mb-2">
          Final step
        </p>
        <h2 className="text-[28px] font-black tracking-[-0.03em] text-black mb-2">
          Your Order.
        </h2>
        <p className="text-[13px] text-gray-500 leading-[1.7] mb-10">
          Review your selection, fill in your details, and confirm. Pay only
          when your order arrives.
        </p>

        {/* ── Order Summary ── */}
        {cartEmpty ? (
          <div className="border border-dashed border-gray-300 px-6 py-10 text-center mb-10">
            <Package
              size={28}
              strokeWidth={1}
              className="mx-auto mb-3 text-gray-300"
              aria-hidden="true"
            />
            <p className="text-[12px] text-gray-400 leading-relaxed">
              Your order is empty. Scroll up and add a product first.
            </p>
          </div>
        ) : (
          <div className="border border-black mb-10">
            {/* Items */}
            <div className="divide-y divide-gray-200">
              {cart.map((item) => (
                <div
                  key={item.cartItemId}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-black truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {item.colorLabel} · Size {item.size}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4 shrink-0">
                    <p className="text-[13px] font-black text-black">
                      {formatPrice(item.price)}
                    </p>
                    {onRemoveItem && (
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.cartItemId)}
                        aria-label={`Remove ${item.name} (${item.colorLabel}, ${item.size}) from order`}
                        className="text-gray-300 hover:text-black transition-colors"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal + shipping + total */}
            <div className="border-t border-gray-200 divide-y divide-gray-200">
              {/* Subtotal */}
              <div className="flex items-center justify-between px-5 py-3">
                <p className="text-[11px] text-gray-400 tracking-[0.1em] uppercase">
                  Subtotal
                </p>
                <p className="text-[13px] font-black text-black">
                  {formatPrice(subtotal)}
                </p>
              </div>
              {/* Shipping */}
              <div className="flex items-center justify-between px-5 py-3">
                <p className="text-[11px] text-gray-400 tracking-[0.1em] uppercase">
                  Frais de livraison
                </p>
                <p className="text-[13px] font-black text-black">
                  {shipping.fee > 0 ? formatPrice(shipping.fee) : "—"}
                </p>
              </div>
              {/* Total */}
              <div className="flex items-center justify-between px-5 py-4 bg-black">
                <p className="text-[10px] tracking-[0.18em] uppercase text-gray-400 font-bold">
                  Total to Pay on Delivery
                </p>
                <p className="text-[16px] font-black text-white">
                  {formatPrice(total)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Customer Form ── */}
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Full Name */}
          <div>
            <label htmlFor="name" className={LABEL_BASE}>
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
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Your full name"
                value={form.name}
                onChange={handleChange}
                className={`${INPUT_BASE} pl-10`}
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className={LABEL_BASE}>
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
                id="phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="05XX XX XX XX"
                value={form.phone}
                onChange={handleChange}
                className={`${INPUT_BASE} pl-10`}
              />
            </div>
          </div>

          {/* ── Shipping Selector ── */}
          <div>
            <ShippingSelector
              onShippingChange={handleShippingChange}
              error={shippingError}
            />
          </div>

          {/* Error */}
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

          {/* COD notice */}
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

          {/* Submit */}
          <button
            type="submit"
            disabled={status === "loading" || cartEmpty}
            aria-busy={status === "loading"}
            className={`
              w-full font-black text-[12px] tracking-[0.2em] uppercase
              py-[20px]
              flex items-center justify-center gap-3
              border-2 border-black
              transition-all duration-150 active:scale-[0.99] mt-2
              ${
                cartEmpty
                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  : status === "loading"
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

          {cartEmpty && (
            <p className="text-center text-[11px] text-gray-400">
              Add at least one product above before confirming.
            </p>
          )}

          <p className="text-center text-[11px] text-gray-400 leading-[1.6]">
            By confirming you agree to our terms of service.
            <br />
            Your personal data is kept strictly private.
          </p>
        </form>
      </div>
    </section>
  );
}
