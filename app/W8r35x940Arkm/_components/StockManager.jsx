"use client";

import { useEffect, useState, useCallback } from "react";
import { Pencil } from "lucide-react";
import { fetchProductsRequest, updateProductRequest } from "./api";

export default function StockManager({ token, onLogout }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // Only one product can be in edit mode at a time.
  const [editingId, setEditingId] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { status, data } = await fetchProductsRequest(token);
      if (status === 401) {
        onLogout();
        return;
      }
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch {
      setLoadError("Couldn't load products. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => {
    queueMicrotask(() => fetchProducts());
  }, [fetchProducts]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg py-16 text-center text-gray-500">
        Loading products…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg py-16 text-center text-red-800">
        {loadError}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {products.map((product) => (
        <ProductEditor
          key={product.productId}
          product={product}
          token={token}
          onLogout={onLogout}
          isEditing={editingId === product.productId}
          onStartEdit={() => setEditingId(product.productId)}
          onCancelEdit={() => setEditingId(null)}
          onSaved={(updated) => {
            setProducts((prev) =>
              prev.map((p) =>
                p.productId === updated.productId ? updated : p,
              ),
            );
            setEditingId(null);
          }}
        />
      ))}
    </div>
  );
}

function buildStockState(product) {
  const initial = {};
  for (const size of product.sizes || []) {
    initial[size] = String(product.stock?.[size] ?? 0);
  }
  return initial;
}

function ProductEditor({
  product,
  token,
  onLogout,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaved,
}) {
  const [price, setPrice] = useState(String(product.price ?? ""));
  const [discountPrice, setDiscountPrice] = useState(
    product.discountPrice != null ? String(product.discountPrice) : "",
  );
  const [stock, setStock] = useState(() => buildStockState(product));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const displayTotalStock = Object.values(product.stock || {}).reduce(
    (sum, v) => sum + (Number(v) || 0),
    0,
  );

  function handleStartEdit() {
    // Re-seed the form from the latest saved values every time editing starts.
    setPrice(String(product.price ?? ""));
    setDiscountPrice(
      product.discountPrice != null ? String(product.discountPrice) : "",
    );
    setStock(buildStockState(product));
    setSaveError("");
    onStartEdit();
  }

  function handleCancel() {
    setSaveError("");
    onCancelEdit();
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    setSaved(false);

    const stockPayload = {};
    for (const size of product.sizes || []) {
      stockPayload[size] = Number(stock[size]) || 0;
    }

    try {
      const { status, data } = await updateProductRequest(
        token,
        product.productId,
        {
          price: Number(price),
          discountPrice: discountPrice === "" ? null : Number(discountPrice),
          stock: stockPayload,
        },
      );

      if (status === 401) {
        onLogout();
        return;
      }

      if (status !== 200) {
        setSaveError(data.message || "Couldn't save changes.");
        return;
      }

      onSaved(data.product);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Couldn't save changes. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  /* ── Read-only view ── */
  if (!isEditing) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-base">{product.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {displayTotalStock} unit{displayTotalStock !== 1 ? "s" : ""} in
              stock · {product.sold ?? 0} sold
            </p>
          </div>
          <button
            onClick={handleStartEdit}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-foreground px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
          >
            <Pencil size={14} strokeWidth={2} aria-hidden="true" />
            Edit
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="block text-xs font-medium text-gray-500 mb-1">
              Price (DA)
            </span>
            <p className="text-sm text-foreground px-3 py-2">
              {product.price ?? "—"}
            </p>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500 mb-1">
              Discount price (DA)
            </span>
            <p className="text-sm text-foreground px-3 py-2">
              {product.discountPrice != null ? product.discountPrice : "No discount"}
            </p>
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-gray-500 mb-2">
            Stock per size
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(product.sizes || []).map((size) => (
              <div key={size}>
                <span className="block text-[11px] text-gray-400 mb-1">
                  {size}
                </span>
                <p className="text-sm text-foreground px-2 py-1.5">
                  {product.stock?.[size] ?? 0}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Edit view ── */
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-5 ring-2 ring-gray-900/10">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-base">{product.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {displayTotalStock} unit{displayTotalStock !== 1 ? "s" : ""} in
            stock · {product.sold ?? 0} sold
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Price (DA)
          </label>
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Discount price (DA) — leave empty for no discount
          </label>
          <input
            type="number"
            min="0"
            placeholder="No discount"
            value={discountPrice}
            onChange={(e) => setDiscountPrice(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">
          Stock per size
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(product.sizes || []).map((size) => (
            <div key={size}>
              <span className="block text-[11px] text-gray-400 mb-1">
                {size}
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={stock[size] ?? ""}
                onChange={(e) =>
                  setStock((prev) => ({ ...prev, [size]: e.target.value }))
                }
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="bg-gray-100 hover:bg-gray-200 text-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40"
        >
          Cancel
        </button>
        {saved && (
          <span className="text-sm text-green-700 font-medium">Saved</span>
        )}
        {saveError && (
          <span className="text-sm text-red-800">{saveError}</span>
        )}
      </div>
    </div>
  );
}
