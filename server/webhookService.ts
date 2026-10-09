import axios from 'axios';
import type { CheckoutOrderPayload, WebhookConfig, WebhookLog } from '../src/types';

export const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  googleAppsScriptUrl: process.env.GOOGLE_APPS_SCRIPT_URL || '',
  enabled: true,
};

export interface WebhookDispatchResult {
  success: boolean;
  skipped?: boolean;
  statusCode?: number;
  responseBody?: string;
  latencyMs?: number;
  error?: string;
  message: string;
  payloadSent?: CheckoutOrderPayload;
}

/**
 * Validates whether a given string is a valid HTTP/HTTPS URL
 */
export function isValidUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const url = new URL(urlString.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Forwards an order payload securely to the configured Google Apps Script Web App URL using axios.
 * Ensures the exact fields requested:
 * - customer_email
 * - order_id
 * - status
 * - is_delayed
 * - estimated_delivery_days
 * - sku
 * - quantity
 */
export async function forwardOrderToGoogleAppsScript(
  orderPayload: CheckoutOrderPayload,
  config: WebhookConfig,
  logStore: WebhookLog[]
): Promise<WebhookDispatchResult> {
  const targetUrl = (config.googleAppsScriptUrl || '').trim();

  // If webhook is disabled or not configured, log as SKIPPED
  if (!config.enabled || !targetUrl) {
    const skippedLog: WebhookLog = {
      id: `whlog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      event: 'order_created',
      targetUrl: targetUrl || '(not configured)',
      payload: orderPayload,
      status: 'SKIPPED',
      latencyMs: 0,
      error: !config.enabled ? 'Webhook integration is disabled' : 'Google Apps Script URL is empty',
    };
    logStore.unshift(skippedLog);
    if (logStore.length > 100) logStore.pop();

    return {
      success: true,
      skipped: true,
      message: !config.enabled
        ? 'Webhook is currently disabled in admin settings.'
        : 'Google Apps Script Web App URL is not configured yet. Order saved locally.',
      payloadSent: orderPayload,
    };
  }

  if (!isValidUrl(targetUrl)) {
    const invalidLog: WebhookLog = {
      id: `whlog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      event: 'order_created',
      targetUrl,
      payload: orderPayload,
      status: 'FAILED',
      latencyMs: 0,
      error: 'Invalid URL format',
    };
    logStore.unshift(invalidLog);
    if (logStore.length > 100) logStore.pop();

    return {
      success: false,
      error: 'Invalid Google Apps Script Web App URL format.',
      message: 'Failed to dispatch: Webhook URL must start with https://script.google.com/macros/s/...',
      payloadSent: orderPayload,
    };
  }

  // Exact payload specification strictly adhering to user brief
  const payload = {
    customer_email: orderPayload.customer_email,
    order_id: orderPayload.order_id,
    status: orderPayload.status || 'CONFIRMED',
    is_delayed: Boolean(orderPayload.is_delayed),
    estimated_delivery_days: Number(orderPayload.estimated_delivery_days) || 3,
    sku: orderPayload.sku,
    quantity: Number(orderPayload.quantity) || 1,
    // Supplemental e-commerce metadata
    product_name: orderPayload.product_name,
    unit_price: orderPayload.unit_price,
    total_amount: orderPayload.total_amount,
    currency: orderPayload.currency || 'INR',
    shipping_address: orderPayload.shipping_address,
    created_at: orderPayload.created_at || new Date().toISOString(),
    ahuza_source: 'web_checkout',
  };

  const startTime = Date.now();
  try {
    const response = await axios.post(targetUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Ahuza-ECommerce-Webhook/1.0',
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: () => true, // Capture all HTTP status codes
    });

    const latencyMs = Date.now() - startTime;
    const responseDataStr =
      typeof response.data === 'object'
        ? JSON.stringify(response.data)
        : String(response.data || '').substring(0, 500);

    const isHttpSuccess = response.status >= 200 && response.status < 400;

    const logEntry: WebhookLog = {
      id: `whlog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      event: 'order_created',
      targetUrl,
      payload,
      status: isHttpSuccess ? 'SUCCESS' : 'FAILED',
      statusCode: response.status,
      responseBody: responseDataStr,
      latencyMs,
      error: isHttpSuccess ? undefined : `HTTP Status ${response.status}`,
    };

    logStore.unshift(logEntry);
    if (logStore.length > 100) logStore.pop();

    return {
      success: isHttpSuccess,
      statusCode: response.status,
      responseBody: responseDataStr,
      latencyMs,
      message: isHttpSuccess
        ? `Successfully forwarded to Google Apps Script (HTTP ${response.status} in ${latencyMs}ms)`
        : `Google Apps Script returned HTTP ${response.status}`,
      payloadSent: payload,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err.message || 'Unknown network error';

    const failLog: WebhookLog = {
      id: `whlog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      event: 'order_created',
      targetUrl,
      payload,
      status: 'FAILED',
      latencyMs,
      error: errorMsg,
    };

    logStore.unshift(failLog);
    if (logStore.length > 100) logStore.pop();

    return {
      success: false,
      latencyMs,
      error: errorMsg,
      message: `Failed to forward order to Google Apps Script: ${errorMsg}`,
      payloadSent: payload,
    };
  }
}

/**
 * Fires a mock order payload to test connection with Google Apps Script Web App URL
 */
export async function testGoogleAppsScriptWebhook(
  targetUrl: string,
  logStore: WebhookLog[]
): Promise<WebhookDispatchResult> {
  const trimmedUrl = (targetUrl || '').trim();

  if (!trimmedUrl) {
    return {
      success: false,
      error: 'Google Apps Script Web App URL cannot be empty.',
      message: 'Please provide a valid Web App URL (e.g. https://script.google.com/macros/s/.../exec)',
    };
  }

  if (!isValidUrl(trimmedUrl)) {
    return {
      success: false,
      error: 'Invalid URL format.',
      message: 'URL must start with http:// or https://',
    };
  }

  const mockPayload: CheckoutOrderPayload = {
    customer_email: 'test.customer@ahuzawear.com',
    order_id: `AHZ-TEST-ORD-${Math.floor(1000 + Math.random() * 9000)}`,
    status: 'TEST_CONFIRMED',
    is_delayed: false,
    estimated_delivery_days: 3,
    sku: 'AHZ-W-KRT-001',
    quantity: 1,
    product_name: 'Ahuza Hand-Block Print Everyday Cotton Kurti (Mock Test)',
    unit_price: 799,
    total_amount: 799,
    currency: 'INR',
    shipping_address: {
      full_name: 'Ananya Sharma',
      phone: '+91 98201 12026',
      line1: 'Flat 402, Gulmohar Terrace, Lower Parel',
      city: 'Mumbai',
      state: 'Maharashtra',
      postal_code: '400013',
    },
    created_at: new Date().toISOString(),
  };

  const startTime = Date.now();
  try {
    const response = await axios.post(trimmedUrl, mockPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Ahuza-ECommerce-Webhook-Tester/1.0',
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: () => true,
    });

    const latencyMs = Date.now() - startTime;
    const responseDataStr =
      typeof response.data === 'object'
        ? JSON.stringify(response.data)
        : String(response.data || '').substring(0, 500);

    const isHttpSuccess = response.status >= 200 && response.status < 400;

    const logEntry: WebhookLog = {
      id: `whlog_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      event: 'test_ping',
      targetUrl: trimmedUrl,
      payload: mockPayload,
      status: isHttpSuccess ? 'SUCCESS' : 'FAILED',
      statusCode: response.status,
      responseBody: responseDataStr,
      latencyMs,
      error: isHttpSuccess ? undefined : `HTTP Status ${response.status}`,
    };

    logStore.unshift(logEntry);
    if (logStore.length > 100) logStore.pop();

    return {
      success: isHttpSuccess,
      statusCode: response.status,
      responseBody: responseDataStr,
      latencyMs,
      message: isHttpSuccess
        ? `Connection verified! Google Apps Script returned HTTP ${response.status} in ${latencyMs}ms.`
        : `Connection responded with HTTP ${response.status}: ${responseDataStr.slice(0, 100)}`,
      payloadSent: mockPayload,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err.message || 'Network request failed';

    const failLog: WebhookLog = {
      id: `whlog_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      event: 'test_ping',
      targetUrl: trimmedUrl,
      payload: mockPayload,
      status: 'FAILED',
      latencyMs,
      error: errorMsg,
    };

    logStore.unshift(failLog);
    if (logStore.length > 100) logStore.pop();

    return {
      success: false,
      latencyMs,
      error: errorMsg,
      message: `Failed to reach Google Apps Script: ${errorMsg}`,
      payloadSent: mockPayload,
    };
  }
}
