// lib/shipping.js

const WILAYAS = [
  { code: 1, name: "Adrar", domicile: 1100, stopDesk: 750 },
  { code: 2, name: "Chlef", domicile: 700, stopDesk: 400 },
  { code: 3, name: "Laghouat", domicile: 900, stopDesk: 500 },
  {
    code: 4,
    name: "Oum El Bouaghi",
    domicile: 850,
    stopDesk: 450,
  },
  { code: 5, name: "Batna", domicile: 850, stopDesk: 450 },
  { code: 6, name: "Béjaïa", domicile: 800, stopDesk: 450 },
  { code: 7, name: "Biskra", domicile: 900, stopDesk: 550 },
  { code: 8, name: "Béchar", domicile: 1000, stopDesk: 700 },
  { code: 9, name: "Blida", domicile: 600, stopDesk: 350 },
  { code: 10, name: "Bouira", domicile: 750, stopDesk: 450 },
  {
    code: 11,
    name: "Tamanrasset",
    domicile: 1550,
    stopDesk: 1100,
  },
  { code: 12, name: "Tébessa", domicile: 850, stopDesk: 450 },
  { code: 13, name: "Tlemcen", domicile: 600, stopDesk: 400 },
  { code: 14, name: "Tiaret", domicile: 750, stopDesk: 400 },
  { code: 15, name: "Tizi Ouzou", domicile: 700, stopDesk: 450 },
  { code: 16, name: "Alger", domicile: 500, stopDesk: 350 },
  { code: 17, name: "Djelfa", domicile: 900, stopDesk: 550 },
  { code: 18, name: "Jijel", domicile: 800, stopDesk: 450 },
  { code: 19, name: "Sétif", domicile: 800, stopDesk: 450 },
  { code: 20, name: "Saïda", domicile: 800, stopDesk: 400 },
  { code: 21, name: "Skikda", domicile: 750, stopDesk: 450 },
  {
    code: 22,
    name: "Sidi Bel Abbès",
    domicile: 600,
    stopDesk: 400,
  },
  { code: 23, name: "Annaba", domicile: 800, stopDesk: 450 },
  { code: 24, name: "Guelma", domicile: 900, stopDesk: 450 },
  { code: 25, name: "Constantine", domicile: 800, stopDesk: 450 },
  { code: 26, name: "Médéa", domicile: 700, stopDesk: 400 },
  { code: 27, name: "Mostaganem", domicile: 600, stopDesk: 400 },
  { code: 28, name: "M'Sila", domicile: 900, stopDesk: 550 },
  { code: 29, name: "Mascara", domicile: 650, stopDesk: 400 },
  { code: 30, name: "Ouargla", domicile: 950, stopDesk: 550 },
  { code: 31, name: "Oran", domicile: 500, stopDesk: 300 },
  { code: 32, name: "El Bayadh", domicile: 950, stopDesk: 700 },
  { code: 33, name: "Illizi", domicile: 1550, stopDesk: 1100 },
  {
    code: 34,
    name: "Bordj Bou Arreridj",
    domicile: 800,
    stopDesk: 450,
  },
  { code: 35, name: "Boumerdès", domicile: 700, stopDesk: 400 },
  { code: 36, name: "El Tarf", domicile: 900, stopDesk: 450 },
  { code: 37, name: "Tindouf", domicile: 1300, stopDesk: 800 },
  { code: 38, name: "Tissemsilt", domicile: 800, stopDesk: 400 },
  { code: 39, name: "El Oued", domicile: 1000, stopDesk: 600 },
  { code: 40, name: "Khenchela", domicile: 900, stopDesk: 500 },
  { code: 41, name: "Souk Ahras", domicile: 900, stopDesk: 500 },
  { code: 42, name: "Tipaza", domicile: 700, stopDesk: 400 },
  { code: 43, name: "Mila", domicile: 750, stopDesk: 450 },
  { code: 44, name: "Aïn Defla", domicile: 700, stopDesk: 400 },
  { code: 45, name: "Naâma", domicile: 950, stopDesk: 550 },
  {
    code: 46,
    name: "Aïn Témouchent",
    domicile: 600,
    stopDesk: 400,
  },
  { code: 47, name: "Ghardaïa", domicile: 1000, stopDesk: 500 },
  { code: 48, name: "Relizane", domicile: 700, stopDesk: 400 },
  { code: 49, name: "Timimoun", domicile: 1100, stopDesk: 750 },
  {
    code: 51,
    name: "Ouled Djellal",
    domicile: 900,
    stopDesk: 550,
  },
  { code: 52, name: "Beni Abbes", domicile: 1100, stopDesk: 800 },
  { code: 53, name: "In Salah", domicile: 1450, stopDesk: 1000 },
  { code: 55, name: "Touggourt", domicile: 1000, stopDesk: 550 },
  { code: 56, name: "Djanet", domicile: 2200, stopDesk: 1550 },
  { code: 57, name: "El M'Ghair", domicile: 950, stopDesk: 650 },
  { code: 58, name: "El Meniaa", domicile: 1000, stopDesk: 500 },
];

/**
 * Get shipping fee for a wilaya
 * @param {number} wilayaCode - Wilaya code
 * @param {string} deliveryType - "domicile" or "stopDesk"
 * @returns {number} - Shipping fee in DA
 */
export function getShippingFee(wilayaCode, deliveryType) {
  const wilaya = WILAYAS.find((w) => w.code === parseInt(wilayaCode));

  if (!wilaya) {
    console.error("Wilaya not found:", wilayaCode);
    return 0;
  }

  return wilaya[deliveryType] || 0;
}

export function getWilayaByCode(code) {
  return WILAYAS.find((w) => w.code === parseInt(code));
}

export function getAllDeliveryFees() {
  return WILAYAS;
}

export { WILAYAS };
export default WILAYAS;
