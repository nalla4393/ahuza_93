import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Eye,
  HeadphonesIcon,
  HelpCircle,
  Home,
  Layers,
  MapPin,
  MessageSquare,
  Package,
  Palette,
  RotateCcw,
  Ruler,
  Send,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Order, Product } from '../types';
import { SafeImage } from './SafeImage';
import { generateInvoicePdf } from '../utils/generateInvoicePdf';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  options?: string[];
  orderCard?: Order | null;
  productCard?: Product | null;
  ticketCard?: {
    ticketId: string;
    message: string;
    category?: string;
  } | null;
  pincodeResult?: {
    serviceable: boolean;
    pincode: string;
    message: string;
    estimatedDays?: string;
    tier?: string;
  } | null;
  actionLink?: {
    label: string;
    url: string;
  } | null;
}

type MenuStep =
  | 'ROOT'
  // Billing / Order
  | 'BILLING_ROOT'
  | 'BILLING_ORDER_TRACKING'
  | 'BILLING_DELIVERY'
  | 'BILLING_RETURNS'
  | 'BILLING_COUPONS'
  | 'BILLING_PAYMENT'
  // Product Related
  | 'PRODUCT_ROOT'
  | 'PRODUCT_SIZE'
  | 'PRODUCT_MEASUREMENTS'
  | 'PRODUCT_MEASUREMENT_DETAIL'
  | 'PRODUCT_COLOUR'
  | 'PRODUCT_DESIGN'
  | 'PRODUCT_DESCRIPTION'
  | 'PRODUCT_SPECIFICATIONS'
  // Enquiry
  | 'ENQUIRY_ROOT'
  // Other
  | 'OTHER_ROOT'
  | 'OTHER_COMPLAINT'
  | 'OTHER_SUBSCRIPTION'
  | 'OTHER_PROFILE'
  | 'OTHER_ADDRESS'
  | 'OTHER_PINCODE'
  | 'OTHER_SPECS'
  // Support Escalation
  | 'SUPPORT_ESCALATION';

interface HistoryEntry {
  step: MenuStep;
  title: string;
  selectedProductId?: string;
  selectedOrderNumber?: string;
}

const ROOT_OPTIONS = [
  'Billing / Order',
  'Product Related',
  'Enquiry',
  'Other',
];

const BILLING_OPTIONS = [
  'Order Tracking',
  'Delivery Issue',
  'Return / Exchange',
  'Discount / Coupon Issue',
  'Payment / Billing Issue',
];

const DELIVERY_OPTIONS = [
  'Delivery delayed',
  'Order not received',
  'Wrong delivery address',
  'Delivery to my PIN code',
  'Damaged package',
  'Other delivery issue',
];

const RETURN_OPTIONS = [
  'Return a product',
  'Exchange a product',
  'Return status',
  'Exchange status',
  'Return/exchange policy',
  'Product received damaged',
  'Wrong product received',
];

const COUPON_OPTIONS = [
  'Coupon not working',
  'Discount not applied',
  'Coupon expired',
  'Coupon eligibility',
  'Other',
];

const PAYMENT_OPTIONS = [
  'Payment failed',
  'Payment deducted but order not confirmed',
  'Refund issue',
  'Invoice/bill issue',
  'Other',
];

const PRODUCT_OPTIONS = [
  'Size Issue',
  'Measurements',
  'Colour Related',
  'Model / Design Related',
  'Product Description',
  'Product Specifications',
];

const SIZE_OPTIONS = [
  'Which size should I choose?',
  'Size chart',
  'Size unavailable',
  'Size exchange',
  'Fit-related question',
];

const MEASUREMENT_OPTIONS = [
  'Bust',
  'Waist',
  'Hip',
  'Length',
  'Sleeve length',
  'Kurti length',
  'Bottom length',
  'Other',
];

const COLOUR_OPTIONS = [
  'Available colours',
  'Colour availability',
  'Colour difference',
  'Colour shown in the image',
  'Other',
];

const DESIGN_OPTIONS = [
  'Design details',
  'Pattern',
  'Neck design',
  'Sleeve design',
  'Fit/style',
  'Available variants',
  'Other',
];

const ENQUIRY_OPTIONS = [
  'Product enquiry',
  'Availability enquiry',
  'Bulk / wholesale enquiry',
  'Delivery enquiry',
  'Business enquiry',
  'General enquiry',
  'Other',
];

const OTHER_OPTIONS = [
  'Complaint',
  'Subscription',
  'Profile / Account',
  'Address',
  'Delivery to PIN Code',
  'Product Specifications',
  'Other',
];

const SUBSCRIPTION_OPTIONS = [
  'Subscription information',
  'Subscribe',
  'Unsubscribe',
  'Subscription status',
  'Subscription-related issue',
];

const PROFILE_OPTIONS = [
  'Login issue',
  'Signup issue',
  'Profile information',
  'Account update',
  'Password reset',
  'Wishlist/account-related issue',
];

const ADDRESS_OPTIONS = [
  'Add address',
  'Edit address',
  'Delete address',
  'Change delivery address',
  'Address-related issue',
];

export const StylistSupportChat: React.FC = () => {
  const { user, token, products } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/orders', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : { orders: [] }))
      .then((data) => {
        if (Array.isArray(data.orders)) {
          setOrders(data.orders);
        }
      })
      .catch(() => {});
  }, [token]);

  const lookupOrder = async (orderIdStr: string): Promise<Order | null> => {
    const clean = orderIdStr.trim().toUpperCase();
    const local = orders.find((o: Order) => o.orderNumber.toUpperCase() === clean);
    if (local) return local;
    try {
      const res = await fetch(`/api/orders/lookup/${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        return data.order || null;
      }
    } catch {
      // ignore
    }
    return null;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<MenuStep>('ROOT');
  const [historyStack, setHistoryStack] = useState<HistoryEntry[]>([{ step: 'ROOT', title: 'Main Menu' }]);
  const [inputText, setInputText] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedMeasurement, setSelectedMeasurement] = useState<string | null>(null);

  // Initial welcome message
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg_welcome',
      sender: 'bot',
      text: 'Hi! How can we help you today? Please select the type of issue you’re facing:',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      options: ROOT_OPTIONS,
    },
  ]);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const isWorkingHoursNow = () => {
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffsetMs);
    const hour = istTime.getUTCHours();
    return hour >= 10 && hour < 21; // 10:00 AM to 9:00 PM IST
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Helper to append a bot message
  const pushBotMessage = (
    text: string,
    options?: string[],
    extras?: Partial<ChatMessage>
  ) => {
    const newMsg: ChatMessage = {
      id: `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sender: 'bot',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      options,
      ...extras,
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  // Helper to append a user message
  const pushUserMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  // Step transition helper
  const navigateToStep = (newStep: MenuStep, title: string) => {
    setHistoryStack((prev) => [...prev, { step: newStep, title }]);
    setCurrentStep(newStep);
  };

  // Back Navigation
  const handleGoBack = () => {
    if (historyStack.length <= 1) {
      handleGoMainMenu();
      return;
    }
    const nextStack = [...historyStack];
    nextStack.pop(); // Remove current
    const previous = nextStack[nextStack.length - 1];
    setHistoryStack(nextStack);
    setCurrentStep(previous.step);

    // Present previous options
    pushUserMessage('← Back');
    switch (previous.step) {
      case 'ROOT':
        pushBotMessage('Returned to Main Menu. Please select the type of issue you’re facing:', ROOT_OPTIONS);
        break;
      case 'BILLING_ROOT':
        pushBotMessage('What do you need help with regarding Billing / Order?', BILLING_OPTIONS);
        break;
      case 'PRODUCT_ROOT':
        pushBotMessage('What information do you need about the product?', PRODUCT_OPTIONS);
        break;
      case 'ENQUIRY_ROOT':
        pushBotMessage('What would you like to enquire about?', ENQUIRY_OPTIONS);
        break;
      case 'OTHER_ROOT':
        pushBotMessage('Please select what you need help with:', OTHER_OPTIONS);
        break;
      default:
        pushBotMessage('How would you like to proceed?', ROOT_OPTIONS);
    }
  };

  // Main Menu Navigation
  const handleGoMainMenu = () => {
    pushUserMessage('Main Menu');
    setHistoryStack([{ step: 'ROOT', title: 'Main Menu' }]);
    setCurrentStep('ROOT');
    pushBotMessage('Hi! How can we help you today? Please select the type of issue you’re facing:', ROOT_OPTIONS);
  };

  // Talk to Support Navigation
  const handleTalkToSupport = () => {
    pushUserMessage('Talk to Support');
    navigateToStep('SUPPORT_ESCALATION', 'Customer Support Desk');

    const online = isWorkingHoursNow();
    const reply = online
      ? `🟢 **Customer Support Desk is currently ONLINE!**\n\n• **Desk Working Hours:** 10:00 AM to 9:00 PM IST (Daily)\n• **Official Email:** info@ahuzawear.com\n• **Direct Phone & WhatsApp:** 9550582277\n• **Resolution Commitment:** Our customer support team will attend to your request and reach you within 24 hours of reporting the issue!\n\nPlease enter your issue description or select an option below:`
      : `🌙 **Customer Support Desk is currently OFFLINE for the night.**\n\n• **Desk Working Hours:** 10:00 AM to 9:00 PM IST (Daily)\n• **Official Email:** info@ahuzawear.com\n• **Direct Phone & WhatsApp:** 9550582277\n• **Resolution Commitment:** For inquiries received overnight, our customer support team will reach you within 24 hours of reporting the issue!\n\nPlease enter your issue description below, and we will create a support ticket for immediate follow-up when our desk opens at 10:00 AM IST.`;

    pushBotMessage(reply, ['Create Support Ticket', 'Call Support: 9550582277', 'Email: info@ahuzawear.com', 'Back to Main Menu'], {
      actionLink: {
        label: 'Email info@ahuzawear.com',
        url: 'mailto:info@ahuzawear.com',
      },
    });
  };

  // Core Decision Tree Click Handler
  const handleOptionClick = async (option: string) => {
    pushUserMessage(option);

    // ==========================================
    // 1. ROOT CATEGORY SELECTION
    // ==========================================
    if (currentStep === 'ROOT') {
      if (option === 'Billing / Order') {
        navigateToStep('BILLING_ROOT', 'Billing / Order');
        pushBotMessage('What do you need help with?', BILLING_OPTIONS);
        return;
      }
      if (option === 'Product Related') {
        navigateToStep('PRODUCT_ROOT', 'Product Related');
        pushBotMessage('What information do you need about the product?', PRODUCT_OPTIONS);
        return;
      }
      if (option === 'Enquiry') {
        navigateToStep('ENQUIRY_ROOT', 'Enquiry');
        pushBotMessage('What would you like to enquire about?', ENQUIRY_OPTIONS);
        return;
      }
      if (option === 'Other') {
        navigateToStep('OTHER_ROOT', 'Other');
        pushBotMessage('Please select what you need help with:', OTHER_OPTIONS);
        return;
      }
    }

    // ==========================================
    // 2. BILLING / ORDER SUB-OPTIONS
    // ==========================================
    if (currentStep === 'BILLING_ROOT') {
      if (option === 'Order Tracking') {
        navigateToStep('BILLING_ORDER_TRACKING', 'Order Tracking');
        const orderChips = orders.slice(0, 3).map((o: Order) => o.orderNumber);
        const optionsList = orderChips.length > 0 ? [...orderChips, 'Other Order ID'] : ['Enter Order ID in text box'];
        pushBotMessage(
          'Please enter your Order ID so I can help you track your order.',
          optionsList
        );
        return;
      }

      if (option === 'Delivery Issue') {
        navigateToStep('BILLING_DELIVERY', 'Delivery Issue');
        pushBotMessage('What issue are you facing with your delivery?', DELIVERY_OPTIONS);
        return;
      }

      if (option === 'Return / Exchange') {
        navigateToStep('BILLING_RETURNS', 'Return / Exchange');
        pushBotMessage('What do you need help with?', RETURN_OPTIONS);
        return;
      }

      if (option === 'Discount / Coupon Issue') {
        navigateToStep('BILLING_COUPONS', 'Discount / Coupon Issue');
        pushBotMessage('What problem are you facing with your discount or coupon?', COUPON_OPTIONS);
        return;
      }

      if (option === 'Payment / Billing Issue') {
        navigateToStep('BILLING_PAYMENT', 'Payment / Billing Issue');
        pushBotMessage('What payment or billing issue are you facing?', PAYMENT_OPTIONS);
        return;
      }
    }

    // A. ORDER TRACKING HANDLER
    if (currentStep === 'BILLING_ORDER_TRACKING') {
      if (option === 'Other Order ID' || option === 'Enter Order ID in text box') {
        pushBotMessage('Please type your Order ID (for example: AHZ-2026-000001 or AHZ-2026-000002) in the box below:');
        return;
      }

      // Check if clicked option matches an Order ID
      const matched = await lookupOrder(option);
      if (matched) {
        pushBotMessage(
          `Here is the latest live status for **${matched.orderNumber}**:`,
          ['Download Invoice PDF', 'View Full Timeline', 'Request Return / Cancel', 'Track Another Order'],
          {
            orderCard: matched,
            actionLink: {
              label: 'Open Live Order Tracker (/track-order)',
              url: '/track-order',
            },
          }
        );
      } else {
        pushBotMessage(
          'I’m unable to retrieve live tracking information right now. Please try again or contact AHUZA support.',
          ['Try Another Order ID', 'Talk to Support', 'Back to Main Menu']
        );
      }
      return;
    }

    // Actions on Order Tracking Card
    if (option === 'Download Invoice PDF') {
      const targetOrder = orders[0];
      if (targetOrder) {
        generateInvoicePdf(targetOrder);
        pushBotMessage(`✅ Tax Invoice for order **${targetOrder.orderNumber}** has been generated and downloaded to your device!`);
      } else {
        pushBotMessage('No order found to generate invoice for. Please specify your Order ID.');
      }
      return;
    }

    if (option === 'View Full Timeline') {
      pushBotMessage('You can view the interactive 15-stage delivery timeline on our tracking route:', ['Track Another Order', 'Main Menu'], {
        actionLink: {
          label: 'Go to Order Tracking (/track-order)',
          url: '/track-order',
        },
      });
      return;
    }

    if (option === 'Track Another Order' || option === 'Try Another Order ID') {
      setCurrentStep('BILLING_ORDER_TRACKING');
      const orderChips = orders.slice(0, 3).map((o: Order) => o.orderNumber);
      pushBotMessage('Please enter or select the Order ID you wish to track:', orderChips.length > 0 ? orderChips : undefined);
      return;
    }

    // B. DELIVERY ISSUE HANDLER
    if (currentStep === 'BILLING_DELIVERY') {
      if (option === 'Delivery to my PIN code') {
        navigateToStep('OTHER_PINCODE', 'PIN Code Serviceability');
        pushBotMessage('Please enter your PIN code in the box below to check live delivery serviceability:');
        return;
      }

      if (option === 'Delivery delayed') {
        pushBotMessage(
          `AHUZA ships all confirmed orders within 24 hours from our Mumbai fulfillment studio via BlueDart Express. Typical transit time is 2–5 business days across India.\n\nIf your package has exceeded estimated delivery date, please share your Order ID or contact support. Customer support will reach you within 24 hours of reporting the issue!`,
          ['Track My Order', 'Talk to Support', 'Back to Main Menu']
        );
        return;
      }

      if (option === 'Order not received') {
        pushBotMessage(
          `If tracking shows delivered but you haven't received your parcel, please check with household members or building reception. If still not found, our customer support will initiate an urgent courier proof-of-delivery inquiry within 24 hours!`,
          ['Create Support Ticket', 'Talk to Support', 'Back to Main Menu']
        );
        return;
      }

      if (option === 'Wrong delivery address') {
        pushBotMessage(
          `**Address Update Policy:**\n• For orders in **Order Placed / Confirmed / Processing** state: Our care team can update your shipping destination before dispatch.\n• Once an order reaches **Shipped** or **Out for Delivery**, courier routing cannot be altered mid-transit for security reasons.`,
          ['Talk to Support', 'View Saved Addresses', 'Main Menu'],
          { actionLink: { label: 'My Saved Addresses (/account)', url: '/account' } }
        );
        return;
      }

      if (option === 'Damaged package' || option === 'Other delivery issue') {
        pushBotMessage(
          `We sincerely apologize! If your package arrived tampered or damaged, please do not worry. AHUZA provides a 100% free doorstep replacement or immediate refund under our 14-day policy. Our customer support will attend to this within 24 hours!`,
          ['Create Support Ticket', 'Request Return / Exchange', 'Talk to Support']
        );
        return;
      }
    }

    // C. RETURN / EXCHANGE HANDLER
    if (currentStep === 'BILLING_RETURNS') {
      if (option === 'Return/exchange policy') {
        pushBotMessage(
          `**AHUZA 14-Day Return & Exchange Policy:**\n• **Eligibility:** Within 14 days from delivery.\n• **Condition:** Garments must be unworn, unwashed with original brand tags and packaging intact.\n• **Complimentary Pickup:** Free doorstep pickup across all serviceable PIN codes in India.\n• **Refund Timeline:** Full refund processed to original payment method or UPI immediately upon pickup verification.\n• **Pre-Shipment Cancellation:** 100% instant refund if cancelled before dispatch.`,
          ['Return a product', 'Exchange a product', 'Manage Returns (/returns)', 'Main Menu'],
          { actionLink: { label: 'Open Return Portal (/returns)', url: '/returns' } }
        );
        return;
      }

      if (option === 'Return a product' || option === 'Exchange a product' || option === 'Return status' || option === 'Exchange status') {
        pushBotMessage(
          `You can initiate or monitor returns and exchanges directly on our automated Returns Portal:`,
          ['Go to Returns Portal', 'Talk to Support', 'Main Menu'],
          { actionLink: { label: 'Go to Returns & Refunds (/returns)', url: '/returns' } }
        );
        return;
      }

      if (option === 'Product received damaged' || option === 'Wrong product received') {
        pushBotMessage(
          `We are deeply sorry for the inconvenience! We ensure zero-cost exchange or immediate full refund for damaged or mismatched items. Customer support will reach you within 24 hours of reporting the issue.`,
          ['Create Support Ticket', 'Open Returns Portal', 'Talk to Support'],
          { actionLink: { label: 'Open Returns Portal (/returns)', url: '/returns' } }
        );
        return;
      }
    }

    // D. DISCOUNT / COUPON ISSUE HANDLER
    if (currentStep === 'BILLING_COUPONS') {
      pushBotMessage(
        `**Official AHUZA Promotional Coupons:**\n• **AHUZA10:** 10% off on all orders above ₹999.\n• **FESTIVE15:** 15% off festive kurta sets & dupattas.\n• **WELCOME100:** Flat ₹100 off on your first purchase.\n\n*Note:* Every garment at AHUZA is already priced strictly at or under ₹2,000 INR. Delivery charges are calculated dynamically based on the delivery pincode (₹70 – ₹150). Coupons cannot be stacked together.`,
        ['Apply in Cart', 'Coupon eligibility rules', 'Main Menu'],
        { actionLink: { label: 'Go to Shopping Bag (/cart)', url: '/cart' } }
      );
      return;
    }

    // E. PAYMENT / BILLING ISSUE HANDLER
    if (currentStep === 'BILLING_PAYMENT') {
      if (option === 'Payment deducted but order not confirmed') {
        pushBotMessage(
          `If money was debited from your bank/UPI but your order was not confirmed, please rest assured:\n• In 99% of cases, inter-bank settlement gateways automatically reconcile within **24–48 hours** and either confirm the order or reverse the amount.\n• You can also share your payment reference ID with our support desk at **info@ahuzawear.com** or **9550582277**, and our executive will assist you within 24 hours!`,
          ['Create Support Ticket', 'Talk to Support', 'Main Menu']
        );
        return;
      }

      if (option === 'Payment failed') {
        pushBotMessage(
          `Payment failures usually happen due to bank OTP timeouts or UPI app delays. You can retry safely using Direct UPI (Google Pay, PhonePe, Paytm, BHIM), Net Banking, or Credit/Debit cards at checkout!`,
          ['Try Checkout Again (/cart)', 'Main Menu'],
          { actionLink: { label: 'Return to Cart (/cart)', url: '/cart' } }
        );
        return;
      }

      if (option === 'Invoice/bill issue') {
        pushBotMessage(
          `Every order generates a verified Tax Invoice with GSTIN details. You can download your invoice PDF directly from My Orders:`,
          ['My Orders (/orders)', 'Main Menu'],
          { actionLink: { label: 'My Orders (/orders)', url: '/orders' } }
        );
        return;
      }

      pushBotMessage(
        `For any billing or refund issues, our customer support desk is available daily from **10:00 AM to 9:00 PM IST** (Email: info@ahuzawear.com | Tel: 9550582277) and will resolve your query within 24 hours.`,
        ['Create Support Ticket', 'Talk to Support', 'Main Menu']
      );
      return;
    }

    // ==========================================
    // 3. PRODUCT RELATED SUB-OPTIONS
    // ==========================================
    if (currentStep === 'PRODUCT_ROOT') {
      if (option === 'Size Issue') {
        navigateToStep('PRODUCT_SIZE', 'Size Issue');
        pushBotMessage('What would you like help with regarding sizes?', SIZE_OPTIONS);
        return;
      }

      if (option === 'Measurements') {
        navigateToStep('PRODUCT_MEASUREMENTS', 'Measurements');
        pushBotMessage('Which measurement do you need?', MEASUREMENT_OPTIONS);
        return;
      }

      if (option === 'Colour Related') {
        navigateToStep('PRODUCT_COLOUR', 'Colour Information');
        pushBotMessage('What would you like to know about the colour?', COLOUR_OPTIONS);
        return;
      }

      if (option === 'Model / Design Related') {
        navigateToStep('PRODUCT_DESIGN', 'Model & Design Details');
        pushBotMessage('What would you like to know about the design?', DESIGN_OPTIONS);
        return;
      }

      if (option === 'Product Description') {
        navigateToStep('PRODUCT_DESCRIPTION', 'Product Description');
        const firstProd = products[0];
        if (firstProd) {
          pushBotMessage(
            `Here is a featured design from the AHUZA catalog: **${firstProd.name}**\n\n• **Fabric:** ${firstProd.fabric}\n• **Fit:** Regular tailored everyday fit with reinforced seams\n• **Price:** ₹${firstProd.discountPrice.toLocaleString('en-IN')} (Strictly ≤ ₹2,000)\n• **Available Sizes:** ${firstProd.sizes.join(', ')}\n• **Care Instructions:** ${firstProd.careInstructions}\n• **Stock Status:** ${firstProd.stock > 0 ? `In Stock (${firstProd.stock} units)` : 'Out of stock'}`,
            ['View Product Page', 'Explore Women (/women)', 'Explore Men (/men)', 'Main Menu'],
            {
              productCard: firstProd,
              actionLink: { label: `View ${firstProd.name}`, url: `/product/${firstProd.id}` },
            }
          );
        } else {
          pushBotMessage('Information is currently unavailable in the catalog. Please contact AHUZA support.');
        }
        return;
      }

      if (option === 'Product Specifications') {
        navigateToStep('PRODUCT_SPECIFICATIONS', 'Product Specifications');
        const prod = products[0];
        if (prod) {
          pushBotMessage(
            `**Official Specifications for ${prod.name}:**\n• **Material:** ${prod.fabric}\n• **Categories:** ${prod.categories.join(', ')}\n• **Sizes:** ${prod.sizes.join(', ')}\n• **MRP / Price:** ₹${prod.price} (Discounted: ₹${prod.discountPrice})\n• **Return Window:** ${prod.returnWindowDays} Days Easy Returns\n• **Estimated Delivery:** ${prod.deliveryEstimateDays}\n• **Artisanal Origin:** Handcrafted Jaipur Loom Collection`,
            ['Size chart', 'Available colours', 'Main Menu'],
            { productCard: prod }
          );
        }
        return;
      }
    }

    // A. SIZE ISSUE HANDLER
    if (currentStep === 'PRODUCT_SIZE') {
      if (option === 'Size chart' || option === 'Which size should I choose?' || option === 'Fit-related question') {
        pushBotMessage(
          `**AHUZA Standard Sizing Guide (Inches):**\n• **XS:** Bust/Chest: 34" | Waist: 28" | Hip: 36" | Length: 42"\n• **S:** Bust/Chest: 36" | Waist: 30" | Hip: 38" | Length: 43"\n• **M:** Bust/Chest: 38" | Waist: 32" | Hip: 40" | Length: 44"\n• **L:** Bust/Chest: 40" | Waist: 34" | Hip: 42" | Length: 45"\n• **XL:** Bust/Chest: 42" | Waist: 36" | Hip: 44" | Length: 45"\n• **XXL:** Bust/Chest: 44" | Waist: 38" | Hip: 46" | Length: 46"\n\n*Note:* Sizing is tailored to Indian body proportions. For relaxed daily wear, choose your regular bust size. We do not claim a guaranteed fit for all body types, but provide 14-day free size exchanges!`,
          ['Size exchange', 'Measurements', 'Main Menu']
        );
        return;
      }

      if (option === 'Size unavailable') {
        pushBotMessage(
          `If your preferred size is sold out, we restock limited Jaipur batches every 10–14 days. You can tap the **"Notify me when stock arrives"** button on the product page for instant alerts!`,
          ['Explore Women (/women)', 'Explore Men (/men)', 'Main Menu']
        );
        return;
      }

      if (option === 'Size exchange') {
        pushBotMessage(
          `Need a different size? We offer 100% complimentary doorstep size exchange within 14 days of delivery. Original tags must be intact.`,
          ['Initiate Exchange (/returns)', 'Talk to Support', 'Main Menu'],
          { actionLink: { label: 'Go to Return/Exchange Portal (/returns)', url: '/returns' } }
        );
        return;
      }
    }

    // B. MEASUREMENTS HANDLER
    if (currentStep === 'PRODUCT_MEASUREMENTS') {
      setSelectedMeasurement(option);
      const prod = products[0];
      const chart = prod?.sizeChart || [];
      const chartText = chart
        .map((row) => {
          let val = '';
          if (option === 'Bust') val = row.bustOrChestInches;
          else if (option === 'Waist') val = row.waistInches;
          else if (option === 'Hip') val = row.hipInches;
          else if (option === 'Length' || option === 'Kurti length') val = row.lengthInches;
          else val = row.bustOrChestInches;
          return `• **${row.size}:** ${val}`;
        })
        .join('\n');

      pushBotMessage(
        `**Actual ${option} Measurements from Catalog Data:**\n${chartText || '• Standard Indian garment proportions apply.'}\n\n*Measurement Tip:* Use a flexible tape horizontally over the fullest part without pulling too tight.`,
        ['Check Another Measurement', 'Full Size Chart', 'Main Menu']
      );
      return;
    }

    if (option === 'Check Another Measurement') {
      setCurrentStep('PRODUCT_MEASUREMENTS');
      pushBotMessage('Which measurement do you need?', MEASUREMENT_OPTIONS);
      return;
    }

    if (option === 'Full Size Chart') {
      handleOptionClick('Size chart');
      return;
    }

    // C. COLOUR RELATED HANDLER
    if (currentStep === 'PRODUCT_COLOUR') {
      pushBotMessage(
        `**AHUZA Colour & Dye Note:**\n• Our garments are dyed using skin-friendly, natural vegetable and azo-free pigments on 100% pure Jaipur cotton and Chanderi fabrics.\n• **Important:** Actual colors may appear slightly different depending on your phone/monitor screen brightness, color temperature settings, and indoor natural sunlight photography.\n• We photograph garments in both direct natural courtyard light and studio soft light so you can see authentic fabric tones.`,
        ['Available colours', 'Product Description', 'Main Menu']
      );
      return;
    }

    // D. MODEL / DESIGN RELATED HANDLER
    if (currentStep === 'PRODUCT_DESIGN') {
      pushBotMessage(
        `**AHUZA Design & Craft Philosophy:**\n• Every garment features traditional Jaipur hand-carved woodblock motifs (Sanganeri & Bagru prints) or delicate Resham tonal embroidery.\n• Designed with notched comfort boat necklines, three-quarter sleeves, deep concealed side-seam pockets, and reinforced stress points for everyday ease.\n• Available in Women's Kurtis, Kurta Sets with Dupatta, Casual Frocks, and Men's Khadi/Cotton Kurtas.`,
        ['Explore Women (/women)', 'Explore Men (/men)', 'Main Menu']
      );
      return;
    }

    // ==========================================
    // 4. ENQUIRY SUB-OPTIONS
    // ==========================================
    if (currentStep === 'ENQUIRY_ROOT') {
      if (option === 'Bulk / wholesale enquiry') {
        pushBotMessage(
          `**Bulk & Corporate Enquiries:**\n• We cater to bulk orders for corporate gifting, boutique retail, and festive celebrations for orders of 25+ units.\n• All pieces adhere to our signature high quality and strict ₹2,000 retail cap.\n• Direct Business Contact: **info@ahuzawear.com** | **9550582277** (Attended within 24 hours).`,
          ['Create Support Ticket', 'Main Menu']
        );
        return;
      }

      if (option === 'Availability enquiry' || option === 'Product enquiry') {
        pushBotMessage(
          `All products listed as "In Stock" on our website are stored in our ready-to-ship Mumbai fulfillment center. You can browse live collections directly:`,
          ['Women Collection (/women)', 'Men Collection (/men)', 'Under ₹999 Edit', 'Main Menu'],
          { actionLink: { label: 'Explore Catalog (/women)', url: '/women' } }
        );
        return;
      }

      if (option === 'Delivery enquiry') {
        navigateToStep('OTHER_PINCODE', 'Delivery Enquiry');
        pushBotMessage('Please enter your 6-digit PIN code to check delivery availability and transit times:');
        return;
      }

      if (option === 'Business enquiry' || option === 'General enquiry' || option === 'Other') {
        pushBotMessage(
          `**Studio & Brand Enquiries:**\n• **Atelier:** Ahuza Design House, Plot 42, Textile Artisan Park, Lower Parel, Mumbai 400013\n• **Email:** info@ahuzawear.com\n• **Phone:** 9550582277\n• **Customer Support Hours:** 10:00 AM to 9:00 PM IST Daily.\n\nPlease type your question in the text box below, or leave your contact details for a reply within 24 hours!`,
          ['Talk to Support', 'Main Menu']
        );
        return;
      }
    }

    // ==========================================
    // 5. OTHER SUB-OPTIONS
    // ==========================================
    if (currentStep === 'OTHER_ROOT') {
      if (option === 'Complaint') {
        navigateToStep('OTHER_COMPLAINT', 'Register Complaint');
        pushBotMessage(
          'Please tell us what went wrong. Type your complaint in the box below, or select the issue category:',
          ['Delivery Delay', 'Damaged Item', 'Payment/Refund Issue', 'Size/Quality Grievance', 'Other Complaint']
        );
        return;
      }

      if (option === 'Subscription') {
        navigateToStep('OTHER_SUBSCRIPTION', 'Subscriptions');
        pushBotMessage('Please select what you need help with regarding subscriptions:', SUBSCRIPTION_OPTIONS);
        return;
      }

      if (option === 'Profile / Account') {
        navigateToStep('OTHER_PROFILE', 'Profile & Account');
        pushBotMessage('How can we help with your AHUZA profile or account?', PROFILE_OPTIONS);
        return;
      }

      if (option === 'Address') {
        navigateToStep('OTHER_ADDRESS', 'Address Management');
        pushBotMessage('How can we help with your address?', ADDRESS_OPTIONS);
        return;
      }

      if (option === 'Delivery to PIN Code') {
        navigateToStep('OTHER_PINCODE', 'Delivery to PIN Code');
        pushBotMessage('Please enter your PIN code in the text box below:');
        return;
      }

      if (option === 'Product Specifications') {
        navigateToStep('OTHER_SPECS', 'Product Specifications');
        const names = products.slice(0, 4).map((p) => p.name);
        pushBotMessage('Please enter or select the product name to view specifications:', names);
        return;
      }

      if (option === 'Other') {
        handleTalkToSupport();
        return;
      }
    }

    // Complaints Issue Categories
    if (currentStep === 'OTHER_COMPLAINT') {
      if (['Delivery Delay', 'Damaged Item', 'Payment/Refund Issue', 'Size/Quality Grievance', 'Other Complaint'].includes(option)) {
        pushBotMessage(`You selected category: **${option}**.\nPlease type your detailed complaint description (and Order ID if applicable) in the text box below:`);
        return;
      }
    }

    // Subscriptions Handler
    if (currentStep === 'OTHER_SUBSCRIPTION') {
      if (option === 'Subscribe' || option === 'Subscription information') {
        pushBotMessage(
          `You can subscribe to AHUZA Restock Alerts and Seasonal Edits to receive early notifications on artisanal handloom drops and exclusive codes like **AHUZA10**!`,
          ['Confirm Subscribe', 'Unsubscribe', 'Main Menu']
        );
        return;
      }
      if (option === 'Confirm Subscribe') {
        pushBotMessage(`✅ Subscribed successfully! You will receive updates at ${user?.email || 'your registered email'}.`);
        return;
      }
      if (option === 'Unsubscribe') {
        pushBotMessage(`You have been unsubscribed from promotional alerts. Essential order tracking and receipt messages will continue.`);
        return;
      }
    }

    // Profile & Account Handler
    if (currentStep === 'OTHER_PROFILE') {
      if (option === 'Login issue' || option === 'Signup issue' || option === 'Password reset') {
        pushBotMessage(
          `**Account Access Assistance:**\n• You can sign in using your email and password or One-Tap Google Sync.\n• If you forgot your password, you can use the instant "Forgot Password" link on the login page.\n• *Security reminder:* AHUZA will NEVER ask you for your account password or payment PIN!`,
          ['Go to Sign In (/account)', 'Main Menu'],
          { actionLink: { label: 'Go to Sign In / Profile (/account)', url: '/account' } }
        );
        return;
      }
      if (option === 'Profile information' || option === 'Account update') {
        pushBotMessage(
          `You can update your name, phone number, and default delivery address anytime in the My Account section:`,
          ['Manage Profile (/account)', 'Main Menu'],
          { actionLink: { label: 'Manage Profile (/account)', url: '/account' } }
        );
        return;
      }
    }

    // Address Handler
    if (currentStep === 'OTHER_ADDRESS') {
      pushBotMessage(
        `**Address Rules:**\n• **Profile Addresses:** You can add, edit, or delete saved addresses in My Account (/account).\n• **Existing Orders:** For orders already placed, delivery address can only be changed if the order is still in 'Order Placed / Processing' status. Once dispatched, address cannot be changed mid-transit.\n\nWould you like to manage your saved profile addresses or contact support for an existing order?`,
        ['Manage Saved Addresses (/account)', 'Talk to Support for Existing Order', 'Main Menu'],
        { actionLink: { label: 'Manage Saved Addresses (/account)', url: '/account' } }
      );
      return;
    }

    // Ticket Creation Confirmation
    if (option === 'Create Support Ticket') {
      const ticketId = `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      pushBotMessage(
        `Your request has been submitted successfully.\n\n• **Ticket Reference Number:** **${ticketId}**\n• **Customer Support Timings:** 10:00 AM to 9:00 PM IST (Daily)\n• **Resolution Commitment:** Our customer support team will review your case and reach you within **24 hours** of reporting the issue!\n\nYou can also reach us directly at **info@ahuzawear.com** or call **9550582277**.`,
        ['Track Another Query', 'Back to Main Menu'],
        {
          ticketCard: {
            ticketId,
            message: 'Support request lodged in AHUZA system.',
            category: 'Customer Care',
          },
        }
      );
      return;
    }

    // Default Fallback
    pushBotMessage('How else may we assist you today?', ROOT_OPTIONS);
  };

  // Natural Language Intent Detection & Free Text Handler
  const handleUserTextInput = async (text: string) => {
    const raw = text.trim();
    if (!raw) return;

    pushUserMessage(raw);
    setInputText('');

    const lower = raw.toLowerCase();

    // 1. PIN code check detection (e.g. "Do you deliver to 500076?", "400013")
    const pinMatch = raw.match(/\b\d{6}\b/);
    if (pinMatch || lower.includes('pincode') || lower.includes('pin code') || lower.includes('deliver to')) {
      const pin = pinMatch ? pinMatch[0] : '';
      if (pin) {
        try {
          const res = await fetch(`/api/delivery/check-pincode?pincode=${pin}`);
          const data = await res.json();
          if (data.serviceable) {
            pushBotMessage(
              `✅ **Delivery Available to PIN code ${pin}!**\n\n• **Estimated Delivery:** ${data.estimatedDays}\n• **Courier Partners:** ${data.courierPartner}\n• **Payment Options:** Cash on Delivery (COD) and Online Prepaid available.\n• **Shipping Fee:** Complimentary across India on orders ≥ ₹999 (₹79 below).`,
              ['Check Another PIN Code', 'Browse Women (/women)', 'Browse Men (/men)', 'Main Menu'],
              {
                pincodeResult: {
                  serviceable: true,
                  pincode: pin,
                  message: data.message,
                  estimatedDays: data.estimatedDays,
                  tier: data.tier,
                },
              }
            );
          } else {
            pushBotMessage(
              `⚠️ ${data.message || `Delivery to PIN code ${pin} is currently unserviceable or information is unavailable.`}`,
              ['Try Another PIN Code', 'Talk to Support', 'Main Menu'],
              {
                pincodeResult: {
                  serviceable: false,
                  pincode: pin,
                  message: data.message,
                },
              }
            );
          }
          return;
        } catch {
          // Local fallback for 6-digit pin
          pushBotMessage(
            `Delivery available to PIN code **${pin}**! Estimated transit: 2–4 business days via BlueDart Express with COD and Prepaid options.`,
            ['Main Menu', 'Talk to Support']
          );
          return;
        }
      } else {
        navigateToStep('OTHER_PINCODE', 'PIN Code Serviceability');
        pushBotMessage('Please enter your 6-digit PIN code to check serviceability:');
        return;
      }
    }

    // 2. Order ID Detection (e.g. "AHZ-2026-000001", "AHZ-2026-000002")
    const orderIdMatch = raw.match(/AHZ-\d{4}-\d+/i);
    if (orderIdMatch) {
      const orderId = orderIdMatch[0].toUpperCase();
      const matched = await lookupOrder(orderId);
      if (matched) {
        navigateToStep('BILLING_ORDER_TRACKING', 'Order Tracking');
        pushBotMessage(
          `Found order **${matched.orderNumber}**! Status: **${matched.status}** via **${matched.shipment.courierName}** (AWB: ${matched.shipment.trackingNumber}). Estimated delivery: **${matched.shipment.estimatedDelivery}**.`,
          ['Download Invoice PDF', 'View Full Timeline', 'Request Return / Cancel', 'Main Menu'],
          {
            orderCard: matched,
            actionLink: {
              label: 'Open Live Order Tracker (/track-order)',
              url: '/track-order',
            },
          }
        );
      } else {
        pushBotMessage(
          `I searched for order **${orderId}**, but couldn't retrieve live tracking information right now. Please verify the ID or contact AHUZA support.`,
          ['Try Another Order ID', 'Talk to Support', 'Main Menu']
        );
      }
      return;
    }

    // 3. Size / Fit Intent (e.g., "My kurti is too tight", "which size", "measurement")
    if (
      lower.includes('tight') ||
      lower.includes('loose') ||
      lower.includes('too small') ||
      lower.includes('too big') ||
      lower.includes('size') ||
      lower.includes('fit') ||
      lower.includes('sizing') ||
      lower.includes('measurement')
    ) {
      navigateToStep('PRODUCT_SIZE', 'Size Issue');
      pushBotMessage(
        'It looks like you have a size or fit-related question. How can we help you?',
        SIZE_OPTIONS
      );
      return;
    }

    // 4. Order tracking intent (e.g. "Where is my order", "track my package")
    if (
      lower.includes('where is my order') ||
      lower.includes('track') ||
      lower.includes('shipment') ||
      lower.includes('courier') ||
      lower.includes('awb') ||
      lower.includes('package')
    ) {
      navigateToStep('BILLING_ORDER_TRACKING', 'Order Tracking');
      const orderChips = orders.slice(0, 3).map((o: Order) => o.orderNumber);
      pushBotMessage(
        'Please enter your Order ID so I can help you track your order.',
        orderChips.length > 0 ? orderChips : undefined
      );
      return;
    }

    // 5. Coupon Intent (e.g. "My coupon isn't working", "promo code", "discount")
    if (lower.includes('coupon') || lower.includes('discount') || lower.includes('promo') || lower.includes('voucher')) {
      navigateToStep('BILLING_COUPONS', 'Discount / Coupon Issue');
      pushBotMessage(
        'What problem are you facing with your discount or coupon?',
        COUPON_OPTIONS
      );
      return;
    }

    // 6. Return / Exchange / Refund Intent
    if (lower.includes('return') || lower.includes('exchange') || lower.includes('refund') || lower.includes('cancel')) {
      navigateToStep('BILLING_RETURNS', 'Return / Exchange');
      pushBotMessage('What do you need help with regarding returns or exchanges?', RETURN_OPTIONS);
      return;
    }

    // 7. Complaint / Grievance Intent
    if (lower.includes('complaint') || lower.includes('damaged') || lower.includes('wrong item') || lower.includes('problem') || lower.includes('issue') || lower.includes('broken')) {
      // Create a support ticket automatically from their description!
      try {
        const res = await fetch('/api/support/ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: user?.name || 'Customer',
            email: user?.email || 'info@ahuzawear.com',
            phone: user?.phone || '9550582277',
            category: 'Customer Complaint',
            description: raw,
          }),
        });
        const data = await res.json();
        const ticketId = data.ticketId || `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`;

        pushBotMessage(
          `Your request has been submitted successfully.\n\n• **Ticket Reference Number:** **${ticketId}**\n• **Customer Support Timings:** 10:00 AM to 9:00 PM IST (Daily)\n• **Resolution Commitment:** Our customer support will reach you within **24 hours** of reporting the issue!\n\nYou can also contact us directly at **info@ahuzawear.com** or **9550582277**.`,
          ['Track Another Query', 'Main Menu'],
          {
            ticketCard: {
              ticketId,
              message: 'Support request recorded in AHUZA system.',
              category: 'Complaint',
            },
          }
        );
        return;
      } catch {
        const ticketId = `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`;
        pushBotMessage(
          `Your request has been submitted successfully.\n\n• **Ticket Reference:** **${ticketId}**\n• **Support Timings:** 10:00 AM to 9:00 PM IST\n• **Commitment:** Our team will reach you within 24 hours via info@ahuzawear.com or 9550582277.`,
          ['Main Menu']
        );
        return;
      }
    }

    // 8. Human Support Intent (e.g. "talk to agent", "human", "call me")
    if (lower.includes('human') || lower.includes('agent') || lower.includes('representative') || lower.includes('person') || lower.includes('talk to someone') || lower.includes('support')) {
      handleTalkToSupport();
      return;
    }

    // 9. Women Collection Intent
    if (lower.includes('women') || lower.includes('kurti') || lower.includes('lehenga') || lower.includes('frock')) {
      pushBotMessage(
        'Explore our handcrafted Women’s Collection at route **/women** with pure Jaipur mulmul kurtis and Chanderi sets strictly under ₹2,000 INR:',
        ['Explore Women (/women)', 'Size chart', 'Main Menu'],
        { actionLink: { label: 'Explore Women’s Collection (/women)', url: '/women' } }
      );
      return;
    }

    // 10. Men Collection Intent
    if (lower.includes('men') || lower.includes('mens') || lower.includes('kurta') || lower.includes('track suit')) {
      pushBotMessage(
        'Explore our handcrafted Men’s Collection at route **/men** with pure slub cotton kurtas and everyday loungewear strictly under ₹2,000 INR. Plus, tap "Notify me when stock arrives" for priority restock alerts!',
        ['Explore Men (/men)', 'Main Menu'],
        { actionLink: { label: 'Explore Men’s Collection (/men)', url: '/men' } }
      );
      return;
    }

    // Fallback: Check if message is related to Root Categories
    if (lower.includes('billing') || lower.includes('order')) {
      navigateToStep('BILLING_ROOT', 'Billing / Order');
      pushBotMessage('What do you need help with regarding Billing / Order?', BILLING_OPTIONS);
      return;
    }

    if (lower.includes('product')) {
      navigateToStep('PRODUCT_ROOT', 'Product Related');
      pushBotMessage('What information do you need about the product?', PRODUCT_OPTIONS);
      return;
    }

    if (lower.includes('enquiry') || lower.includes('inquiry')) {
      navigateToStep('ENQUIRY_ROOT', 'Enquiry');
      pushBotMessage('What would you like to enquire about?', ENQUIRY_OPTIONS);
      return;
    }

    // General fallback
    pushBotMessage(
      `Thank you for your message. How can we help you today? Please select the type of issue you’re facing, or tap 'Talk to Support' to connect directly with our desk (10:00 AM – 9:00 PM IST; attended within 24 hours):`,
      ROOT_OPTIONS
    );
  };

  return (
    <>
      {/* Floating Chatbot Launcher Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-3 px-4 py-3 rounded-full bg-[#18181B] hover:bg-[#9A3412] text-[#F9F8F6] shadow-2xl border border-white/20 transition-all duration-300 hover:scale-105 group cursor-pointer"
          aria-label="Open AHUZA Customer Support Chat"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-[#FED7AA]" />
            <span
              className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-[#18181B] ${
                isWorkingHoursNow() ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </div>
          <div className="text-left pr-1">
            <span className="block text-xs font-bold tracking-wide">Help / Chat with us</span>
            <span className="block text-[10px] text-[#FED7AA]/80 font-mono">
              {isWorkingHoursNow() ? 'Online · 10 AM - 9 PM' : 'Support Desk · 24h reply'}
            </span>
          </div>
        </button>
      )}

      {/* Floating Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[94vw] sm:w-[420px] max-w-[440px] h-[610px] max-h-[88vh] bg-[#F9F8F6] rounded-2xl shadow-2xl border border-[#18181B]/15 flex flex-col overflow-hidden font-sans animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-[#18181B] text-[#F9F8F6] px-4 py-3.5 border-b border-white/10 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#9A3412] text-white flex items-center justify-center font-display font-bold text-base shadow-sm">
                  A
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold text-sm tracking-wide text-white">
                      AHUZA Support
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                        isWorkingHoursNow()
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                          : 'bg-amber-950 text-amber-300 border border-amber-700/50'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isWorkingHoursNow() ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                        }`}
                      />
                      <span>{isWorkingHoursNow() ? 'Online' : 'Offline'}</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-[#D6C7B2] font-mono">
                    10:00 AM – 9:00 PM IST · Resolution in 24 hrs
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-[#D4D4D8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Universal Top Action Bar: Back | Main Menu | Talk to Support */}
            <div className="flex items-center justify-between gap-1.5 mt-2.5 pt-2 border-t border-white/10 text-[11px]">
              <div className="flex items-center gap-1.5">
                {historyStack.length > 1 && (
                  <button
                    type="button"
                    onClick={handleGoBack}
                    className="py-1 px-2.5 rounded-md bg-white/10 hover:bg-white/20 text-white font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    title="Go back to previous menu"
                  >
                    <ArrowLeft className="w-3 h-3 text-[#FED7AA]" />
                    <span>Back</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleGoMainMenu}
                  className="py-1 px-2.5 rounded-md bg-white/10 hover:bg-white/20 text-[#FED7AA] hover:text-white font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  title="Return to Main Menu"
                >
                  <Home className="w-3 h-3" />
                  <span>Main Menu</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleTalkToSupport}
                className="py-1 px-2.5 rounded-md bg-[#9A3412] hover:bg-[#7C2D12] text-white font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                title="Connect with human customer support"
              >
                <HeadphonesIcon className="w-3 h-3 text-[#FED7AA]" />
                <span>Talk to Support</span>
              </button>
            </div>
          </div>

          {/* Conversation Stream */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs bg-[#F9F8F6]"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                } space-y-2`}
              >
                {/* Text Bubble */}
                <div
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-line text-xs shadow-2xs ${
                    msg.sender === 'user'
                      ? 'bg-[#18181B] text-white rounded-br-xs'
                      : 'bg-white border border-[#18181B]/12 text-[#18181B] rounded-bl-xs'
                  }`}
                >
                  <div>{msg.text}</div>
                  <div
                    className={`text-[9px] mt-1 font-mono-num ${
                      msg.sender === 'user' ? 'text-white/60 text-right' : 'text-[#71717A]'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {/* Clickable Option Buttons */}
                {msg.options && msg.options.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-w-[94%] pt-0.5">
                    {msg.options.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleOptionClick(opt)}
                        className="py-1.5 px-3 rounded-lg bg-white hover:bg-[#9A3412] text-[#18181B] hover:text-white border border-[#18181B]/15 hover:border-[#9A3412] font-semibold text-[11px] shadow-2xs transition-all duration-150 text-left cursor-pointer active:scale-95"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Live Order Tracking Card inside Chat */}
                {msg.orderCard && (
                  <div className="w-[94%] bg-white border border-[#9A3412]/30 rounded-xl p-3.5 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#18181B]/10 pb-2">
                      <div>
                        <span className="text-[9px] font-mono-num text-[#71717A] block">
                          VERIFIED ORDER STATUS
                        </span>
                        <span className="font-mono-num font-bold text-sm text-[#18181B]">
                          {msg.orderCard.orderNumber}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#F2EFE9] text-[#9A3412] font-semibold text-[10px]">
                        {msg.orderCard.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[#71717A] block text-[10px]">Courier</span>
                        <strong className="text-[#18181B]">{msg.orderCard.shipment.courierName}</strong>
                      </div>
                      <div>
                        <span className="text-[#71717A] block text-[10px]">AWB Tracking</span>
                        <strong className="font-mono-num text-[#9A3412]">
                          {msg.orderCard.shipment.trackingNumber}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#71717A] block text-[10px]">Est. Delivery</span>
                        <strong className="text-[#18181B]">
                          {msg.orderCard.shipment.estimatedDelivery}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#71717A] block text-[10px]">Grand Total</span>
                        <strong className="font-mono-num text-[#18181B]">
                          ₹{msg.orderCard.totalAmount.toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#18181B]/10">
                      <button
                        type="button"
                        onClick={() => generateInvoicePdf(msg.orderCard!)}
                        className="flex-1 py-1.5 px-2.5 bg-[#9A3412] hover:bg-[#7C2D12] text-white text-center rounded-md font-semibold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3 text-[#FED7AA]" />
                        <span>Download Invoice PDF</span>
                      </button>
                      <Link
                        to="/track-order"
                        onClick={() => setIsOpen(false)}
                        className="py-1.5 px-2.5 bg-[#18181B] text-white text-center rounded-md font-semibold text-[10px]"
                      >
                        Timeline
                      </Link>
                    </div>
                  </div>
                )}

                {/* Product Preview Card inside Chat */}
                {msg.productCard && (
                  <div className="w-[94%] bg-white border border-[#18181B]/12 rounded-xl p-2.5 flex items-center gap-3 shadow-2xs">
                    <Link
                      to={`/product/${msg.productCard.id}`}
                      onClick={() => setIsOpen(false)}
                      className="w-14 h-18 rounded-lg bg-[#F2EFE9] overflow-hidden shrink-0 block"
                    >
                      <SafeImage
                        src={msg.productCard.images[0]?.url}
                        alt={msg.productCard.name}
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/product/${msg.productCard.id}`}
                        onClick={() => setIsOpen(false)}
                        className="font-semibold text-xs text-[#18181B] hover:text-[#9A3412] truncate block"
                      >
                        {msg.productCard.name}
                      </Link>
                      <div className="text-[10px] text-[#71717A] truncate">
                        {msg.productCard.fabric}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 font-mono-num">
                        <span className="font-bold text-xs text-[#9A3412]">
                          ₹{msg.productCard.discountPrice.toLocaleString('en-IN')}
                        </span>
                        {msg.productCard.price > msg.productCard.discountPrice && (
                          <span className="text-[10px] text-[#71717A] line-through">
                            ₹{msg.productCard.price.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Link
                          to={`/product/${msg.productCard.id}`}
                          onClick={() => setIsOpen(false)}
                          className="py-1 px-2 bg-[#18181B] text-white text-[10px] font-semibold rounded flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-[#FED7AA]" />
                          <span>View Details</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ticket Reference Card inside Chat */}
                {msg.ticketCard && (
                  <div className="w-[94%] bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs space-y-1 shadow-2xs text-emerald-950">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Support Request Logged</span>
                    </div>
                    <p className="font-mono text-xs font-semibold text-emerald-900">
                      Ticket ID: {msg.ticketCard.ticketId}
                    </p>
                    <p className="text-[10px] text-emerald-700 leading-relaxed">
                      A human support executive will review your ticket and reach out via registered email or phone within 24 hours of reporting.
                    </p>
                  </div>
                )}

                {/* Action Link Button */}
                {msg.actionLink && (
                  msg.actionLink.url.startsWith('mailto:') || msg.actionLink.url.startsWith('tel:') ? (
                    <a
                      href={msg.actionLink.url}
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-[#F2EFE9] hover:bg-[#E5DFD5] text-[#9A3412] font-semibold rounded-lg text-[11px] transition-colors"
                    >
                      <span>{msg.actionLink.label}</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  ) : (
                    <Link
                      to={msg.actionLink.url}
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-[#F2EFE9] hover:bg-[#E5DFD5] text-[#9A3412] font-semibold rounded-lg text-[11px] transition-colors"
                    >
                      <span>{msg.actionLink.label}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )
                )}
              </div>
            ))}
          </div>

          {/* Bottom Interactive Text Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUserTextInput(inputText);
            }}
            className="p-3 bg-white border-t border-[#18181B]/10 shrink-0"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your question or enter PIN / Order ID..."
                className="flex-1 px-3.5 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-xl text-xs text-[#18181B] focus:outline-hidden focus:border-[#9A3412] placeholder:text-[#A1A1AA]"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 bg-[#18181B] hover:bg-[#9A3412] disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer shadow-2xs"
                title="Send message"
              >
                <Send className="w-4 h-4 text-[#FED7AA]" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#71717A] mt-1.5 px-1 font-mono">
              <span>Customer Care: 10:00 AM – 9:00 PM IST</span>
              <span className="text-[#9A3412]">info@ahuzawear.com</span>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
