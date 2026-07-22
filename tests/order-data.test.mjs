import test from "node:test";
import assert from "node:assert/strict";
import { validateOrderPayload, getOrderAddress } from "../lib/orderData.mjs";

test("requires an address for domicile delivery", () => {
  const errors = validateOrderPayload({
    name: "Ali",
    phone: "0555555555",
    wilaya: "Alger",
    deliveryType: "domicile",
    shippingFee: 500,
    address: "",
  });

  assert.ok(errors.includes("Address is required for domicile delivery."));
});

test("prefers the new address field and falls back to legacy values", () => {
  assert.equal(getOrderAddress({ address: "12 Rue de la Paix" }), "12 Rue de la Paix");
  assert.equal(getOrderAddress({ homeAddress: "Apt 3" }), "Apt 3");
  assert.equal(getOrderAddress({ commune: "Hadjout" }), "Hadjout");
});
