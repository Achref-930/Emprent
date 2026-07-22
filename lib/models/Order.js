/**
 * lib/models/Order.js
 * Mongoose schema for orders.
 * Shape matches MOCK_ORDERS exactly so the admin dashboard
 * works without any changes when USE_MOCK is flipped to false.
 */

import mongoose from "mongoose";

const ProductLineSchema = new mongoose.Schema(
  {
    // References Product.productId (e.g. "design-1"). Used to deduct/
    // restore stock when the order's status changes. Empty for legacy
    // orders placed before products were tracked individually — those
    // are simply skipped by the stock logic.
    productId: { type: String, default: "" },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    // Kept for legacy orders that recorded a color. New orders leave
    // this empty since each design is now a single color.
    color: { type: String, default: "" },
    size: { type: String, default: "" },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    // Auto-incrementing human-readable order number (1, 2, 3 …)
    // Set on creation via pre-save hook below.
    orderNumber: { type: Number, unique: true },

    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    wilaya: { type: String, required: true, trim: true },

    deliveryType: {
      type: String,
      enum: ["domicile", "desk", "stopDesk"],
      required: true,
    },
    shippingFee: { type: Number, required: true, min: 0 },
    address: { type: String, default: "" },

    products: { type: [ProductLineSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "cancelled"],
      default: "pending",
    },

    notes: { type: String, default: "" },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  },
);

// Auto-increment orderNumber before saving a new document
OrderSchema.pre("save", async function () {
  if (this.isNew) {
    const last = await this.constructor
      .findOne({}, { orderNumber: 1 })
      .sort({ orderNumber: -1 })
      .lean();
    this.orderNumber = last ? last.orderNumber + 1 : 1;
  }
});

// Avoid recompiling the model on every hot reload in dev
const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);

export default Order;
