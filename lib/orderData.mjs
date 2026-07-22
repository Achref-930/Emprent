export function validateOrderPayload(payload) {
  const errors = [];

  if (!payload?.name || payload.name.trim().length < 2) {
    errors.push("Full name must be at least 2 characters.");
  }

  const phoneClean = payload?.phone?.replace(/\s/g, "");
  if (!phoneClean || !/^(05|06|07)\d{8}$/.test(phoneClean)) {
    errors.push("Please enter a valid Algerian phone number (05XX XXXXXXXX).");
  }

  if (!payload?.wilaya || payload.wilaya.trim().length < 2) {
    errors.push("Wilaya is required.");
  }

  if (!['domicile', 'desk', 'stopDesk'].includes(payload?.deliveryType)) {
    errors.push("Delivery type must be domicile or desk.");
  }

  if (typeof payload?.shippingFee !== 'number' || payload.shippingFee < 0) {
    errors.push("Invalid shipping fee.");
  }

  if (payload?.deliveryType === 'domicile' && !getOrderAddress(payload)) {
    errors.push("Address is required for domicile delivery.");
  }

  return errors;
}

export function getOrderAddress(order) {
  return order?.address || order?.homeAddress || order?.commune || "";
}
