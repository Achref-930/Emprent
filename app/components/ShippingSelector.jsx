"use client";

/**
 * app/components/ShippingSelector.jsx
 * Step-by-step shipping selection:
 *   1. Choose delivery type (domicile / desk)
 *   2. Choose wilaya
 *   3. Choose commune
 *   4. See fee + running total
 */

import { useState } from "react";
import { WILAYAS, getShippingFee } from "../../lib/shipping";

const SELECT_CLASS =
  "w-full px-4 py-3.5 text-[14px] text-black bg-white " +
  "border border-black placeholder-gray-300 " +
  "outline-none focus:border-[2px] focus:border-black " +
  "transition-all duration-100 appearance-none cursor-pointer " +
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")] " +
  "bg-no-repeat bg-[right_1rem_center] pr-10";

const LABEL_BASE =
  "block text-[10px] font-black tracking-[0.18em] uppercase text-black mb-2";

export default function ShippingSelector({ onShippingChange, error }) {
  const [deliveryType, setDeliveryType] = useState(null); // "domicile" | "desk" | null
  const [selectedWilaya, setSelectedWilaya] = useState(null);
  const [selectedCommune, setSelectedCommune] = useState(null);

  function handleDeliveryType(type) {
    setDeliveryType(type);
    setSelectedWilaya(null);
    setSelectedCommune(null);
    onShippingChange({ wilaya: "", commune: "", deliveryType: type, fee: 0 });
  }

  function handleWilaya(e) {
    const code = e.target.value;
    if (!code) {
      setSelectedWilaya(null);
      setSelectedCommune(null);
      onShippingChange({ wilaya: "", commune: "", deliveryType, fee: 0 });
      return;
    }
    const wilaya = WILAYAS.find((w) => w.code === code);
    setSelectedWilaya(wilaya);
    setSelectedCommune(null);
    onShippingChange({
      wilaya: wilaya.name,
      commune: "",
      deliveryType,
      fee: 0,
    });
  }

  function handleCommune(e) {
    const name = e.target.value;
    if (!name) {
      setSelectedCommune(null);
      onShippingChange({
        wilaya: selectedWilaya.name,
        commune: "",
        deliveryType,
        fee: 0,
      });
      return;
    }
    const commune = selectedWilaya.communes.find((c) => c.name === name);
    setSelectedCommune(commune);
    const fee = getShippingFee(selectedWilaya.code, name, deliveryType);
    onShippingChange({
      wilaya: selectedWilaya.name,
      commune: name,
      deliveryType,
      fee,
    });
  }

  const currentFee =
    selectedWilaya && selectedCommune && deliveryType
      ? getShippingFee(selectedWilaya.code, selectedCommune.name, deliveryType)
      : null;

  return (
    <div className="space-y-5">
      {/* ── Step A: Delivery type ── */}
      <div>
        <p className={LABEL_BASE}>Mode de livraison</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleDeliveryType("domicile")}
            className={`
              py-4 text-[12px] font-black tracking-[0.14em] uppercase
              border-2 transition-all duration-150 active:scale-[0.98]
              ${
                deliveryType === "domicile"
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-black hover:bg-gray-100"
              }
            `}
          >
            🏠 Domicile
          </button>
          <button
            type="button"
            onClick={() => handleDeliveryType("desk")}
            className={`
              py-4 text-[12px] font-black tracking-[0.14em] uppercase
              border-2 transition-all duration-150 active:scale-[0.98]
              ${
                deliveryType === "desk"
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-black hover:bg-gray-100"
              }
            `}
          >
            🏢 Bureau
          </button>
        </div>
        {deliveryType === "domicile" && (
          <p className="mt-2 text-[11px] text-gray-400">
            Livré directement à votre adresse.
          </p>
        )}
        {deliveryType === "desk" && (
          <p className="mt-2 text-[11px] text-gray-400">
            Vous récupérez votre colis au bureau Maystro le plus proche.
          </p>
        )}
      </div>

      {/* ── Step B: Wilaya dropdown ── */}
      {deliveryType && (
        <div style={{ animation: "fadeSlideIn 0.2s ease" }}>
          <label className={LABEL_BASE}>Wilaya</label>
          <div className="relative">
            <select
              value={selectedWilaya?.code ?? ""}
              onChange={handleWilaya}
              className={SELECT_CLASS}
            >
              <option value="">Choisir une wilaya…</option>
              {WILAYAS.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Step C: Commune dropdown ── */}
      {selectedWilaya && (
        <div style={{ animation: "fadeSlideIn 0.2s ease" }}>
          <label className={LABEL_BASE}>Commune</label>
          <div className="relative">
            <select
              value={selectedCommune?.name ?? ""}
              onChange={handleCommune}
              className={SELECT_CLASS}
            >
              <option value="">Choisir une commune…</option>
              {selectedWilaya.communes.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Step D: Fee display ── */}
      {currentFee !== null && (
        <div
          className="border border-gray-200 bg-gray-100 px-5 py-4"
          style={{ animation: "fadeSlideIn 0.2s ease" }}
        >
          <p className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-500 mb-2">
            Frais de livraison
          </p>
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-gray-600">
              {deliveryType === "domicile"
                ? "Livraison à domicile"
                : "Retrait en bureau"}{" "}
              — {selectedCommune.name}
            </p>
            <p className="text-[15px] font-black text-black">
              {currentFee.toLocaleString("fr-DZ")} DA
            </p>
          </div>
        </div>
      )}

      {/* Validation error */}
      {error && <p className="text-[12px] text-red-700">{error}</p>}

      {/* Fade-in animation */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
