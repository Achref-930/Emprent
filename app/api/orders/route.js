/**
 * app/api/orders/route.js
 * Saves incoming COD orders to MongoDB.
 */

import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import Order from "../../../lib/models/Order";

function validateOrder({
  name,
  phone,
  wilaya,
  commune,
  deliveryType,
  shippingFee,
}) {
  const errors = [];

  if (!name || name.trim().length < 2)
    errors.push("Full name must be at least 2 characters.");

  const phoneClean = phone?.replace(/\s/g, "");
  if (!phoneClean || !/^(05|06|07)\d{8}$/.test(phoneClean))
    errors.push("Please enter a valid Algerian phone number (05XX XXXXXXXX).");

  if (!wilaya || wilaya.trim().length < 2) errors.push("Wilaya is required.");

  if (!commune || commune.trim().length < 2)
    errors.push("Commune is required.");

  if (!["domicile", "desk"].includes(deliveryType))
    errors.push("Delivery type must be domicile or desk.");

  if (typeof shippingFee !== "number" || shippingFee < 0)
    errors.push("Invalid shipping fee.");

  return errors;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name,
      phone,
      wilaya,
      commune,
      deliveryType,
      shippingFee,
      items,
      subtotal,
      total,
    } = body;

    // ── Validate ───────────────────────────────────────────
    const errors = validateOrder({
      name,
      phone,
      wilaya,
      commune,
      deliveryType,
      shippingFee,
    });
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: errors[0] },
        { status: 422 },
      );
    }

    // ── Save to MongoDB ────────────────────────────────────
    await connectDB();

    const order = await Order.create({
      customerName: name.trim(),
      phone: phone.trim(),
      wilaya: wilaya.trim(),
      commune: commune.trim(),
      deliveryType,
      shippingFee,
      products: (items || []).map((item) => ({
        name: item.name,
        quantity: item.quantity ?? 1,
        price: item.price,
        color: item.color ?? "",
        size: item.size ?? "",
      })),
      subtotal: subtotal ?? 0,
      totalPrice: total ?? 0,
      status: "pending",
      notes: "",
    });

    return NextResponse.json(
      { success: true, orderId: order._id },
      { status: 201 },
    );
  } catch (err) {
    console.error("[ORDER_ERROR]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
}
