import { GoogleGenAI, Type } from '@google/genai';
import {
  Coupon,
  Order,
  Product,
  Refund,
  ReturnRequest,
  WebsiteContent,
} from '../src/types';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConciergeResponse {
  reply: string;
  intent: 'stylist' | 'support' | 'order_tracking';
  recommendedProducts: Product[];
  matchedOrder?: Order | null;
  suggestedFollowUps: string[];
  actionLink?: {
    label: string;
    url: string;
  } | null;
}

export async function generateConciergeResponse(params: {
  messages: ChatTurn[];
  mode: 'auto' | 'stylist' | 'support';
  products: Product[];
  websiteContent: WebsiteContent;
  coupons: Coupon[];
  userName?: string;
  userOrders: Order[];
  userReturns: ReturnRequest[];
  userRefunds: Refund[];
  allOrders: Order[];
}): Promise<ConciergeResponse> {
  const {
    messages,
    mode,
    products,
    websiteContent,
    coupons,
    userName,
    userOrders,
    userReturns,
    userRefunds,
    allOrders,
  } = params;

  const latestUserMessage =
    messages
      .slice()
      .reverse()
      .find((m) => m.role === 'user')?.content || '';

  // Check if the customer mentioned a specific Order ID like AHZ-2026-000001
  const orderIdMatch = latestUserMessage.match(/AHZ-\d{4}-\d{6}/i);
  let matchedOrder: Order | null = null;
  if (orderIdMatch) {
    const targetId = orderIdMatch[0].toUpperCase();
    matchedOrder =
      allOrders.find((o) => o.orderNumber.toUpperCase() === targetId) || null;
  } else if (
    /track|where is my order|order status|shipment|delivery|courier/i.test(
      latestUserMessage
    ) &&
    userOrders.length > 0
  ) {
    matchedOrder = userOrders[0];
  }

  const publishedProducts = products.filter((p) => p.status === 'Published');

  const catalogDigest = publishedProducts.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    gender: p.gender,
    categories: p.categories,
    fabric: p.fabric,
    price: p.price,
    discountPrice: p.discountPrice,
    colors: p.colors.map((c) => c.name),
    sizes: p.sizes,
    stock: p.stock,
  }));

  const activeCouponsDigest = coupons
    .filter((c) => c.isActive)
    .map(
      (c) =>
        `${c.code}: ${
          c.discountType === 'flat'
            ? `₹${c.discountValue} OFF`
            : `${c.discountValue}% OFF`
        } (Min order ₹${c.minOrderAmount}) - ${c.description}`
    );

  const apiKey = process.env.GEMINI_API_KEY;
  const hasValidKey =
    Boolean(apiKey) &&
    apiKey !== 'MY_GEMINI_API_KEY' &&
    apiKey!.trim().length > 10;

  // Human Support working hours check: 10:00 AM to 9:00 PM IST (UTC+5:30)
  const nowUtc = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(nowUtc.getTime() + istOffsetMs);
  const istHour = istTime.getUTCHours();
  const isWorkingHours = istHour >= 10 && istHour < 21; // 10:00 AM to 9:00 PM IST

  if (hasValidKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = `You are the official AHUZA Concierge — a unified AI Personal Fashion Stylist AND Customer Support Specialist for AHUZA ("Where Fashion Meets Passion"), an Indian everyday & casual fashion brand for women and men where every single product is priced at or under ₹2,000 INR.

Current Active Mode Preference: ${mode.toUpperCase()} (Even if a mode is selected, seamlessly answer both styling and customer support questions whenever asked).
Customer Name: ${userName || 'Guest Shopper'}

YOUR DUAL CAPABILITIES:
1. AI PERSONAL STYLIST:
   - Recommend outfits from the live AHUZA catalog below based on occasion (office, festive, college, travel, loungewear, nightwear, athleisure), gender (women/men), budget (Under ₹999, Under ₹1,499, Under ₹2,000), fabric preference, and color palette.
   - Provide helpful Indian sizing guidance (S, M, L, XL, XXL) and fabric care tips.
   - Guide shoppers on how to choose their exact fit using the interactive size charts and product details.
   - Always include 1 to 3 matching product IDs in "recommendedProductIds" when styling or product discovery is relevant.

2. CUSTOMER SUPPORT & ORDER CARE SPECIALIST:
   - Help customers track orders (e.g., AHZ-2026-000001, AHZ-2026-000002), check courier & AWB tracking numbers, understand the 15-stage order lifecycle, and request returns, exchanges, or pre-shipment cancellations.
   - Explain AHUZA's policies clearly:
     * Free Shipping Threshold: Free shipping across India on orders ≥ ₹${websiteContent.policies.freeShippingThreshold} (otherwise ₹79).
     * Return & Refund Policy: ${websiteContent.policies.returnWindowDays}-day easy returns. ${websiteContent.policies.returnRefundPolicy}
     * Cancellation Policy: ${websiteContent.policies.cancellationPolicy}
     * Direct Studio Care: info@ahuzawear.com | 9550582277 (Customer Support Timings: 10:00 AM – 9:00 PM IST).
   - Share active promo codes when helpful: ${activeCouponsDigest.join(' | ')}.

3. WEBSITE ROUTE GUIDANCE & DIRECT ANSWERS:
   - When a customer asks regarding anything on the website (e.g. order tracking, women collection, men collection, size chart, returns, style finder):
     * DIRECT THEM IMMEDIATELY to the exact answer they asked for!
     * SHOW THEM THE EXACT ROUTE and set "actionLinkLabel" and "actionLinkUrl":
       - Tracking order -> route: "/track-order", label: "Track Your Order (/track-order)"
       - Women's collection -> route: "/women", label: "Women's Collection (/women)"
       - Men's collection -> route: "/men", label: "Men's Collection (/men)"
       - Style Finder Quiz -> route: "/#style-finder", label: "Style Finder Quiz"
       - Returns & exchanges -> route: "/returns", label: "Easy Returns & Exchanges"
       - Shopping bag / Cart -> route: "/cart", label: "View Shopping Bag"
     * In your answer text, explicitly mention the route so they know where to go (e.g., 'You can track your order directly at route /track-order', 'Browse our Women Collection at route /women', or 'Explore our Men Collection at route /men').

4. INQUIRIES BEYOND THE WEBSITE & CUSTOMER SUPPORT ESCALATIONS:
   - Official Support Email: info@ahuzawear.com
   - Official Support Phone / WhatsApp: 9550582277
   - Official Customer Support Timings: 10:00 AM to 9:00 PM IST (Monday through Sunday).
   - Live Status Right Now: ${isWorkingHours ? 'ONLINE (Currently within 10:00 AM – 9:00 PM IST)' : 'OFFLINE (Currently outside 10:00 AM – 9:00 PM IST)'}.
   - CRITICAL REQUIREMENT: If the customer asks beyond the standard website features (e.g., questions requiring human intervention, bespoke tailoring, delivery complaints, payment disputes, or asking to talk to human support):
     * ALWAYS explicitly tell them our working hours: 10:00 AM to 9:00 PM IST.
     * ALWAYS tell them: "Our customer support will reach you within 24 hours of the issue."
     * Provide our direct contacts: Email: info@ahuzawear.com | Phone: 9550582277.
     * Offer to log their details right here in chat so an executive can contact them within 24 hours.

LIVE CATALOG (All prices in INR, strictly ≤ ₹2,000):
${JSON.stringify(catalogDigest)}

${
  matchedOrder
    ? `MATCHED ORDER DETAILS FOR THIS QUERY:
Order Number: ${matchedOrder.orderNumber}
Status: ${matchedOrder.status}
Total Amount: ₹${matchedOrder.totalAmount}
Payment: ${matchedOrder.payment.method} (${matchedOrder.payment.status})
Courier: ${matchedOrder.shipment.courierName} | Tracking Number: ${matchedOrder.shipment.trackingNumber}
Estimated Delivery: ${matchedOrder.shipment.estimatedDelivery}
Current Location: ${matchedOrder.shipment.currentLocation}
Items: ${matchedOrder.items.map((i) => `${i.productName} (${i.size}, ${i.color}) x${i.quantity}`).join(', ')}`
    : ''
}

${
  userOrders.length > 0
    ? `SIGNED-IN CUSTOMER ORDERS: ${JSON.stringify(
        userOrders.map((o) => ({
          orderNumber: o.orderNumber,
          status: o.status,
          totalAmount: o.totalAmount,
          courier: o.shipment.courierName,
          trackingNumber: o.shipment.trackingNumber,
          estimatedDelivery: o.shipment.estimatedDelivery,
        }))
      )}`
    : ''
}

${
  userReturns.length > 0
    ? `SIGNED-IN CUSTOMER RETURNS/REFUNDS: ${JSON.stringify(
        userReturns.map((r) => ({
          orderNumber: r.orderNumber,
          type: r.type,
          status: r.status,
          reason: r.reason,
        }))
      )} | Refunds: ${JSON.stringify(
        userRefunds.map((rf) => ({
          orderNumber: rf.orderNumber,
          amount: rf.amount,
          status: rf.status,
        }))
      )}`
    : ''
}

Respond concisely, warmly, and accurately in JSON matching the schema.`;

      const conversationPrompt = messages
        .slice(-10)
        .map((m) => `${m.role === 'user' ? 'Customer' : 'AHUZA Concierge'}: ${m.content}`)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: conversationPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description:
                  'Warm, helpful, well-structured response addressing styling advice or customer support.',
              },
              intent: {
                type: Type.STRING,
                description: 'One of: stylist, support, order_tracking',
              },
              recommendedProductIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  'Up to 3 product IDs from the catalog that match the customer request.',
              },
              suggestedFollowUps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 short follow-up questions or prompts the user can tap next.',
              },
              actionLinkLabel: {
                type: Type.STRING,
                description: 'Optional button label for a relevant page (e.g., Track Order, Request Return).',
              },
              actionLinkUrl: {
                type: Type.STRING,
                description:
                  'Optional internal route path (e.g., /track-order, /returns, /women, /men, /cart).',
              },
            },
            required: ['reply', 'intent', 'recommendedProductIds', 'suggestedFollowUps'],
          },
        },
      });

      const rawText = response.text;
      if (rawText) {
        const parsed = JSON.parse(rawText.trim());
        const recIds: string[] = Array.isArray(parsed.recommendedProductIds)
          ? parsed.recommendedProductIds
          : [];
        const recommendedProducts = recIds
          .map((id) => publishedProducts.find((p) => p.id === id))
          .filter((p): p is Product => Boolean(p))
          .slice(0, 3);

        const intentValue: ConciergeResponse['intent'] =
          parsed.intent === 'order_tracking' || parsed.intent === 'support'
            ? parsed.intent
            : 'stylist';

        return {
          reply: parsed.reply,
          intent: matchedOrder ? 'order_tracking' : intentValue,
          recommendedProducts,
          matchedOrder,
          suggestedFollowUps:
            Array.isArray(parsed.suggestedFollowUps) && parsed.suggestedFollowUps.length > 0
              ? parsed.suggestedFollowUps.slice(0, 3)
              : [
                  'Style me under ₹999',
                  'Track order AHZ-2026-000002',
                  'Show festive kurta sets',
                ],
          actionLink:
            parsed.actionLinkLabel && parsed.actionLinkUrl
              ? { label: parsed.actionLinkLabel, url: parsed.actionLinkUrl }
              : null,
        };
      }
    } catch (err) {
      console.warn('Gemini concierge fallback triggered:', err);
    }
  }

  // Deterministic Smart Fallback (when offline or API key not yet active)
  const lower = latestUserMessage.toLowerCase();

  // 1. Website Route: Order Tracking (/track-order)
  if (matchedOrder || /track|where is my|shipment|courier|awb/i.test(lower)) {
    if (matchedOrder) {
      return {
        reply: `I found your order **${matchedOrder.orderNumber}**! It is currently **${matchedOrder.status}** via **${matchedOrder.shipment.courierName}** (AWB: ${matchedOrder.shipment.trackingNumber}). Estimated delivery is **${matchedOrder.shipment.estimatedDelivery}** (${matchedOrder.shipment.currentLocation}).\n\nYou can track real-time milestones anytime at route **/track-order**.`,
        intent: 'order_tracking',
        recommendedProducts: [],
        matchedOrder,
        suggestedFollowUps: [
          'Track order AHZ-2026-000002',
          'Women collection (/women)',
          'Men collection (/men)',
        ],
        actionLink: {
          label: 'Track Order (/track-order)',
          url: '/track-order',
        },
      };
    }
    return {
      reply:
        'To track your order, visit our dedicated tracking route at **/track-order**! You can enter your Order ID (such as `AHZ-2026-000001` or `AHZ-2026-000002`) and your phone number to see live courier tracking and delivery stages.',
      intent: 'order_tracking',
      recommendedProducts: [],
      matchedOrder: null,
      suggestedFollowUps: [
        'Track order AHZ-2026-000002',
        'Women collection (/women)',
        'Men collection (/men)',
      ],
      actionLink: {
        label: 'Open Order Tracker (/track-order)',
        url: '/track-order',
      },
    };
  }

  // 2. Website Route: Women's Collection (/women)
  if (/(\bwomen\b|\bwomens\b|\bwoman\b|\bladies\b|\bkurti\b|\blehenga\b|\bfrock\b|\bdupatta\b)/i.test(lower) && !/\bmen\b|\bmens\b|\bboy\b/i.test(lower)) {
    const womenPicks = publishedProducts.filter((p) => p.gender === 'women').slice(0, 3);
    return {
      reply: `Our handcrafted **Women's Collection** is live at route **/women**!\n\nExplore pure Jaipur mulmul kurtis, festive Chanderi kurta sets with dupattas, and everyday breathable dresses—all strictly priced under ₹2,000 INR with free delivery over ₹999.`,
      intent: 'stylist',
      recommendedProducts: womenPicks,
      matchedOrder: null,
      suggestedFollowUps: [
        'Women kurtas under ₹999',
        'Men collection (/men)',
        'Track order (/track-order)',
      ],
      actionLink: {
        label: "Explore Women's Collection (/women)",
        url: '/women',
      },
    };
  }

  // 3. Website Route: Men's Collection (/men)
  if (/(\bmen\b|\bmens\b|\bman\b|\bboys\b|\bmen kurta\b|\bmens collection\b)/i.test(lower) && !/\bwomen\b|\bkurti\b/i.test(lower)) {
    const menPicks = publishedProducts.filter((p) => p.gender === 'men').slice(0, 3);
    return {
      reply: `Our curated **Men's Collection** is live at route **/men**!\n\nDiscover lightweight slub cotton kurtas, everyday relaxed loungewear, and breathable athleisure strictly under ₹2,000 INR.\n\n✨ *Tip:* If any limited handloom batch is low in stock, simply tap the **"Notify me when stock arrives"** button on the page to receive priority restock alerts!`,
      intent: 'stylist',
      recommendedProducts: menPicks,
      matchedOrder: null,
      suggestedFollowUps: [
        'Men casual kurtas under ₹1,499',
        'Women collection (/women)',
        'Track order (/track-order)',
      ],
      actionLink: {
        label: "Explore Men's Collection (/men)",
        url: '/men',
      },
    };
  }

  // 4. Website Route: Style Finder Quiz
  if (/style finder|quiz|find my style|style quiz/i.test(lower)) {
    return {
      reply: `Find your perfect fashion aesthetic with our interactive **Style Finder Quiz** on the homepage! Answer 4 quick questions about your occasion, fit, and palette, and our Gemini stylist will personalize an edit just for you under ₹2,000.`,
      intent: 'stylist',
      recommendedProducts: publishedProducts.slice(0, 2),
      matchedOrder: null,
      suggestedFollowUps: [
        'Women collection (/women)',
        'Men collection (/men)',
        'Track order (/track-order)',
      ],
      actionLink: {
        label: 'Take Style Finder Quiz',
        url: '/#style-finder',
      },
    };
  }

  // 5. Website Route: Returns, Cancellations, Refunds, Shipping Policies (/returns)
  if (/return|refund|cancel|exchange|shipping|delivery|coupon|discount|promo/i.test(lower)) {
    if (/coupon|discount|offer|promo/i.test(lower)) {
      return {
        reply: `Here are active AHUZA promo codes you can use at checkout:\n• ${activeCouponsDigest.join(
          '\n• '
        )}\nEvery piece is priced under ₹2,000 INR with free shipping on orders ≥ ₹${
          websiteContent.policies.freeShippingThreshold
        }!`,
        intent: 'support',
        recommendedProducts: publishedProducts.filter((p) => p.isBestSeller).slice(0, 2),
        matchedOrder: null,
        suggestedFollowUps: [
          'Women collection (/women)',
          'Men collection (/men)',
          'Track order (/track-order)',
        ],
        actionLink: {
          label: 'View Shopping Bag (/cart)',
          url: '/cart',
        },
      };
    }

    return {
      reply: `**AHUZA Customer Care & Policies:**\n• **Route:** Visit **/returns** to submit or manage 14-day returns & exchanges.\n• **Easy Returns:** ${websiteContent.policies.returnWindowDays}-day return window for unworn garments with original tags intact.\n• **Instant Pre-Shipment Cancellation:** 100% immediate refund before shipment dispatch.\n• **Support Timings:** 10:00 AM to 9:00 PM IST Daily (${isWorkingHours ? '🟢 Online' : '🌙 Offline'}).\n• **Direct Care:** info@ahuzawear.com | 9550582277.`,
      intent: 'support',
      recommendedProducts: [],
      matchedOrder: null,
      suggestedFollowUps: [
        'Track order (/track-order)',
        'Women collection (/women)',
        'Men collection (/men)',
      ],
      actionLink: {
        label: 'Manage Returns (/returns)',
        url: '/returns',
      },
    };
  }

  // 6. Customer Support Escalation / Inquiries Beyond Website Navigation
  if (
    /human|agent|person|representative|executive|call me|talk to|speak to|support|customer care|helpline|beyond|issue|complaint|damaged|dispute|problem|delay|not received|faulty|stuck|broken|contact/i.test(
      lower
    )
  ) {
    return {
      reply: isWorkingHours
        ? `🟢 **Customer Support is currently Online!**\n\nOur customer support timings are **10:00 AM to 9:00 PM IST** (Daily).\n\nIf your inquiry is beyond website self-service, our customer support will reach you **within 24 hours of reporting the issue**!\n\nYou can reach our human care specialists directly via:\n• **Email:** info@ahuzawear.com\n• **Phone / WhatsApp:** 9550582277\n\nYou can also leave your email, phone number, and issue details right here in the chat, and our executive will reach out to you within 24 hours.`
        : `🌙 **Customer Support is currently Offline for the evening.**\n\nOur customer support timings are **10:00 AM to 9:00 PM IST** (Daily).\n\nFor any questions or issues beyond the website, **our customer support will reach you within 24 hours of reporting the issue**!\n\n• **Email:** info@ahuzawear.com\n• **Phone / WhatsApp:** 9550582277\n\nPlease drop your contact number/email and order details here, and our customer care team will attend to your request promptly when desk opens at 10:00 AM IST!`,
      intent: 'support',
      recommendedProducts: [],
      matchedOrder: null,
      suggestedFollowUps: [
        'Track order (/track-order)',
        'Women collection (/women)',
        'Men collection (/men)',
      ],
      actionLink: {
        label: 'Email info@ahuzawear.com',
        url: 'mailto:info@ahuzawear.com',
      },
    };
  }

  // 7. Stylist & General Catalog Recommendation Fallback
  let filtered = publishedProducts;
  if (/999|budget|affordable|under 1000/i.test(lower)) {
    const budgetMatches = filtered.filter((p) => p.discountPrice <= 999);
    if (budgetMatches.length > 0) filtered = budgetMatches;
  } else if (/1499|under 1500/i.test(lower)) {
    const midMatches = filtered.filter((p) => p.discountPrice <= 1499);
    if (midMatches.length > 0) filtered = midMatches;
  }

  const picks = filtered.slice(0, 3);

  return {
    reply: `Here are quick links to guide you through AHUZA:\n• **Order Tracking:** Route **/track-order**\n• **Women's Collection:** Route **/women**\n• **Men's Collection:** Route **/men** (with restock notifications)\n• **Returns & Exchanges:** Route **/returns**\n\nFor any specific questions or assistance beyond the website, our Customer Support timings are **10:00 AM to 9:00 PM IST**, and our team will reach you **within 24 hours of reporting the issue** via **info@ahuzawear.com** or **9550582277**.`,
    intent: 'stylist',
    recommendedProducts: picks,
    matchedOrder: null,
    suggestedFollowUps: [
      'Track order (/track-order)',
      'Women collection (/women)',
      'Men collection (/men)',
    ],
    actionLink: {
      label: 'Explore Collections',
      url: '/women',
    },
  };
}
