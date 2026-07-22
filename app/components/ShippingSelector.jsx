"use client";

/**
 * app/components/ShippingSelector.jsx
 * Step-by-step shipping selection:
 *   1. Choose delivery type (domicile / desk)
 *   2. Choose wilaya
 *   3. Add home address (domicile only)
 *   4. See fee
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
  const [deliveryType, setDeliveryType] = useState(null); // "domicile" | "stopDesk" | null
  const [selectedWilaya, setSelectedWilaya] = useState(null);
  const [homeAddress, setHomeAddress] = useState("");

  function handleDeliveryType(type) {
    setDeliveryType(type);
    setSelectedWilaya(null);
    setHomeAddress("");
    onShippingChange({
      wilaya: "",
      deliveryType: type,
      fee: 0,
      homeAddress: "",
    });
  }

  function handleWilaya(e) {
    const code = parseInt(e.target.value);
    if (!code) {
      setSelectedWilaya(null);
      onShippingChange({
        wilaya: "",
        deliveryType,
        fee: 0,
        homeAddress: "",
      });
      return;
    }

    const wilaya = WILAYAS.find((w) => w.code === code);
    if (!wilaya) {
      console.error("Wilaya not found:", code);
      return;
    }

    setSelectedWilaya(wilaya);
    const fee = getShippingFee(wilaya.code, deliveryType);

    onShippingChange({
      wilaya: wilaya.name,
      deliveryType,
      fee,
      homeAddress: deliveryType === "domicile" ? homeAddress : "",
    });
  }

  function handleHomeAddress(e) {
    const address = e.target.value;
    setHomeAddress(address);

    if (selectedWilaya) {
      const fee = getShippingFee(selectedWilaya.code, deliveryType);
      onShippingChange({
        wilaya: selectedWilaya.name,
        deliveryType,
        fee,
        homeAddress: address,
      });
    }
  }

  const currentFee =
    selectedWilaya && deliveryType
      ? getShippingFee(selectedWilaya.code, deliveryType)
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
            onClick={() => handleDeliveryType("stopDesk")}
            className={`
              py-4 text-[12px] font-black tracking-[0.14em] uppercase
              border-2 transition-all duration-150 active:scale-[0.98]
              ${
                deliveryType === "stopDesk"
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
        {deliveryType === "stopDesk" && (
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

      {/* ── Step C: Home Address (only for domicile) ── */}
      {deliveryType === "domicile" && selectedWilaya && (
        <div style={{ animation: "fadeSlideIn 0.2s ease" }}>
          <label className={LABEL_BASE}>Adresse du domicile</label>
          <input
            type="text"
            value={homeAddress}
            onChange={handleHomeAddress}
            placeholder="Ex: 45 Rue de la Paix, Apt 302"
            className={
              "w-full px-4 py-3.5 text-[14px] text-black bg-white " +
              "border border-black placeholder-gray-400 " +
              "outline-none focus:border-[2px] focus:border-black " +
              "transition-all duration-100"
            }
          />
          <p className="mt-2 text-[11px] text-gray-400">
            Veuillez entrer votre adresse complète pour une livraison efficace.
          </p>
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-gray-600">
                {deliveryType === "domicile"
                  ? "Livraison à domicile"
                  : "Retrait en bureau"}{" "}
                — {selectedWilaya.name}
              </p>
              <p className="text-[15px] font-black text-black">
                {currentFee.toLocaleString("fr-DZ")} DA
              </p>
            </div>
            {deliveryType === "domicile" && homeAddress && (
              <div className="pt-3 border-t border-gray-300">
                <p className="text-[11px] text-gray-500 mb-1">
                  Adresse de livraison:
                </p>
                <p className="text-[12px] font-semibold text-gray-800">
                  {homeAddress}
                </p>
              </div>
            )}
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
