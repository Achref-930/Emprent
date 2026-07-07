/**
 * lib/stockLogic.js
 * Single source of truth for how order status changes affect product stock.
 *
 * The rule that makes every transition "just work" without a giant
 * lookup table: stock is deducted if and only if the order is currently
 * "confirmed" or "shipped". Those two statuses are the "deducted set" —
 * pending and cancelled are the "not-deducted set".
 *
 * Whenever a transition crosses from the not-deducted set into the
 * deducted set, we deduct. Whenever it crosses back out, we restore.
 * Moving between two statuses inside the same set (confirmed↔shipped,
 * or pending↔cancelled) never touches stock, because it was already
 * deducted (or never was) on both sides.
 *
 * This reproduces every case in the spec:
 *   pending   → confirmed  : deduct   (not-deducted → deducted)
 *   pending   → shipped    : deduct   (not-deducted → deducted)
 *   pending   → cancelled  : none     (not-deducted → not-deducted)
 *   confirmed → shipped    : none     (deducted → deducted)
 *   confirmed → pending    : restore  (deducted → not-deducted)
 *   confirmed → cancelled  : restore  (deducted → not-deducted)
 *   shipped   → confirmed  : none     (deducted → deducted)
 *   shipped   → pending    : restore  (deducted → not-deducted)
 *   shipped   → cancelled  : restore  (deducted → not-deducted)
 *   cancelled → confirmed  : deduct   (not-deducted → deducted)
 *   cancelled → shipped    : deduct   (not-deducted → deducted)
 *   cancelled → pending    : none     (not-deducted → not-deducted)
 */

const DEDUCTED_STATUSES = new Set(["confirmed", "shipped"]);

export function isDeductedStatus(status) {
  return DEDUCTED_STATUSES.has(status);
}

/**
 * Returns "deduct" | "restore" | "none" for a given status transition.
 */
export function getStockAction(oldStatus, newStatus) {
  if (oldStatus === newStatus) return "none";
  const wasDeducted = isDeductedStatus(oldStatus);
  const willBeDeducted = isDeductedStatus(newStatus);
  if (!wasDeducted && willBeDeducted) return "deduct";
  if (wasDeducted && !willBeDeducted) return "restore";
  return "none";
}
