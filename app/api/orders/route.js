/**
 * app/api/orders/route.js
 * Saves incoming COD orders to MongoDB.
 */

import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import Order from "../../../lib/models/Order";
import { getOrderAddress, validateOrderPayload } from "../../../lib/orderData.mjs";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name,
      phone,
      wilaya,
      deliveryType,
      shippingFee,
      address,
      items,
      subtotal,
      total,
    } = body;

    // ── Validate ───────────────────────────────────────────
    const errors = validateOrderPayload({
      name,
      phone,
      wilaya,
      deliveryType,
      shippingFee,
      address,
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
      deliveryType,
      shippingFee,
      address: getOrderAddress({ address }),
      products: (items || []).map((item) => ({
        productId: item.productId ?? "",
        name: item.name,
        quantity: item.quantity ?? 1,
        price: item.price,
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
