export interface ShippingRule {
  id: string;
  name: string;
  zone: string;
  pincodePrefixes: string[];
  pincodeRanges?: { start: number; end: number }[];
  deliveryCharge: number; // strictly within ₹70 – ₹150
  estimatedDays: string;
  serviceable: boolean;
}

export const INITIAL_SHIPPING_RULES: ShippingRule[] = [
  {
    id: 'ship-rule-mumbai',
    name: 'Mumbai & MMR Local Hub',
    zone: 'Mumbai Metro & Western Hub',
    pincodePrefixes: ['400', '401', '410'],
    deliveryCharge: 75,
    estimatedDays: '1–2 business days',
    serviceable: true,
  },
  {
    id: 'ship-rule-maharashtra',
    name: 'Maharashtra & Pune Region',
    zone: 'Western Regional Hub',
    pincodePrefixes: ['411', '412', '413', '414', '415', '416', '421', '422', '423', '424', '425', '431', '440'],
    deliveryCharge: 85,
    estimatedDays: '2–3 business days',
    serviceable: true,
  },
  {
    id: 'ship-rule-delhi-ncr',
    name: 'Delhi NCR & Northern Metros',
    zone: 'Delhi NCR Capital Zone',
    pincodePrefixes: ['110', '121', '122', '201'],
    deliveryCharge: 90,
    estimatedDays: '3–4 business days',
    serviceable: true,
  },
  {
    id: 'ship-rule-south-metros',
    name: 'Bengaluru, Hyderabad & Chennai',
    zone: 'Southern Metro Corridors',
    pincodePrefixes: ['560', '500', '600', '682', '570'],
    deliveryCharge: 95,
    estimatedDays: '3–4 business days',
    serviceable: true,
  },
  {
    id: 'ship-rule-gujarat-central',
    name: 'Gujarat, MP & Rajasthan',
    zone: 'Central & Western Trade Corridor',
    pincodePrefixes: ['380', '390', '395', '452', '462', '302', '342'],
    deliveryCharge: 100,
    estimatedDays: '3–5 business days',
    serviceable: true,
  },
  {
    id: 'ship-rule-kolkata-east',
    name: 'Kolkata, Odisha & Eastern Hubs',
    zone: 'Eastern Regional Zone',
    pincodePrefixes: ['700', '711', '751', '800'],
    deliveryCharge: 110,
    estimatedDays: '4–5 business days',
    serviceable: true,
  },
  {
    id: 'ship-rule-tier2-national',
    name: 'National Tier-2 & Regional Towns',
    zone: 'National Surface Network',
    pincodePrefixes: [
      '12', '13', '14', '15', '16', '21', '22', '24', '26', '27',
      '31', '32', '33', '47', '48', '49', '51', '52', '53', '57',
      '58', '61', '62', '63', '64', '67', '76', '77', '81', '82', '83'
    ],
    deliveryCharge: 125,
    estimatedDays: '4–6 business days',
    serviceable: true,
  },
  {
    id: 'ship-rule-remote-special',
    name: 'Special Terrains, Hills & North-East',
    zone: 'North-East & Special Logistics Hub',
    pincodePrefixes: ['18', '19', '73', '78', '79'],
    deliveryCharge: 145,
    estimatedDays: '5–7 business days',
    serviceable: true,
  },
];

export interface PincodeCalculationResult {
  pincode: string;
  serviceable: boolean;
  deliveryCharge: number;
  zone: string;
  estimatedDays: string;
  ruleName: string;
  message?: string;
}

/**
 * Calculates delivery charges dynamically based on customer's pincode.
 * Enforces rule: ₹70 – ₹150 range depending on location/zone.
 */
export function calculateDeliveryForPincode(
  pincodeRaw: string,
  rules: ShippingRule[] = INITIAL_SHIPPING_RULES
): PincodeCalculationResult {
  const cleanPincode = (pincodeRaw || '').trim().replace(/\D/g, '');

  if (cleanPincode.length !== 6) {
    return {
      pincode: cleanPincode,
      serviceable: false,
      deliveryCharge: 90,
      zone: 'Invalid PIN Code',
      estimatedDays: 'N/A',
      ruleName: 'None',
      message: 'Please enter a valid 6-digit Indian PIN code to calculate delivery charges.',
    };
  }

  const pincodeNum = parseInt(cleanPincode, 10);
  if (pincodeNum < 100000 || pincodeNum > 999999) {
    return {
      pincode: cleanPincode,
      serviceable: false,
      deliveryCharge: 90,
      zone: 'Non-Serviceable PIN Code',
      estimatedDays: 'N/A',
      ruleName: 'None',
      message: 'PIN code is outside standard Indian postal ranges (100000–999999).',
    };
  }

  // 1. Check for specific prefix matches (longest prefix first)
  const sortedRules = [...rules].sort((a, b) => {
    const maxPrefixA = Math.max(...a.pincodePrefixes.map((p) => p.length), 0);
    const maxPrefixB = Math.max(...b.pincodePrefixes.map((p) => p.length), 0);
    return maxPrefixB - maxPrefixA;
  });

  for (const rule of sortedRules) {
    // Check prefix
    const matchesPrefix = rule.pincodePrefixes.some((prefix) => cleanPincode.startsWith(prefix));
    if (matchesPrefix) {
      const charge = Math.min(150, Math.max(70, rule.deliveryCharge));
      return {
        pincode: cleanPincode,
        serviceable: rule.serviceable,
        deliveryCharge: charge,
        zone: rule.zone,
        estimatedDays: rule.estimatedDays,
        ruleName: rule.name,
        message: rule.serviceable
          ? `Standard delivery to ${rule.zone} (${rule.estimatedDays}).`
          : `PIN code ${cleanPincode} is temporarily not serviceable.`,
      };
    }

    // Check ranges if defined
    if (rule.pincodeRanges && rule.pincodeRanges.length > 0) {
      const inRange = rule.pincodeRanges.some(
        (r) => pincodeNum >= r.start && pincodeNum <= r.end
      );
      if (inRange) {
        const charge = Math.min(150, Math.max(70, rule.deliveryCharge));
        return {
          pincode: cleanPincode,
          serviceable: rule.serviceable,
          deliveryCharge: charge,
          zone: rule.zone,
          estimatedDays: rule.estimatedDays,
          ruleName: rule.name,
          message: `Standard delivery to ${rule.zone} (${rule.estimatedDays}).`,
        };
      }
    }
  }

  // Fallback dynamic rate for other serviceable Indian PIN codes (strictly within ₹70–₹150)
  const defaultCharge = 115;
  return {
    pincode: cleanPincode,
    serviceable: true,
    deliveryCharge: defaultCharge,
    zone: 'Standard All-India Express Zone',
    estimatedDays: '4–6 business days',
    ruleName: 'All-India Standard Postal',
    message: `Delivery charges calculated for PIN code ${cleanPincode}. Estimated transit: 4–6 business days.`,
  };
}
