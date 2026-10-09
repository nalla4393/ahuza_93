import React, { useState, useEffect } from 'react';
import {
  Webhook,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Trash2,
  Activity,
  Layers,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import type { WebhookConfig, WebhookLog } from '../types';

interface AdminWebhookSettingsPanelProps {
  token: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AdminWebhookSettingsPanel: React.FC<AdminWebhookSettingsPanelProps> = ({
  token,
  showToast,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    statusCode?: number;
    latencyMs?: number;
    responseBody?: string;
    message: string;
    payloadSent?: any;
  } | null>(null);

  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [selectedLogPayload, setSelectedLogPayload] = useState<any | null>(null);

  // Sample Google Apps Script code snippet for the user to copy-paste
  const googleAppsScriptSnippet = `/**
 * Google Apps Script Webhook Handler for AHUZA E-Commerce
 * Deploy as Web App -> Execute as: Me -> Who has access: Anyone
 */
function doPost(e) {
  try {
    var rawContents = e.postData.contents;
    var data = JSON.parse(rawContents);

    // Get or create active spreadsheet
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Auto-create headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "Order ID",
        "Customer Email",
        "SKU",
        "Quantity",
        "Status",
        "Estimated Delivery Days",
        "Is Delayed",
        "Total Amount (INR)",
        "Raw JSON"
      ]);
      sheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#F4F3EF");
    }

    // Append received order payload row
    sheet.appendRow([
      new Date(),
      data.order_id || "",
      data.customer_email || "",
      data.sku || "",
      data.quantity || 1,
      data.status || "CONFIRMED",
      data.estimated_delivery_days || 3,
      data.is_delayed ? "Yes" : "No",
      data.total_amount || 0,
      rawContents
    ]);

    // Return successful JSON response
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        order_id: data.order_id,
        received_at: new Date().toISOString()
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  // Fetch current Webhook config and recent logs from server
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/webhook/config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.config) {
        setWebhookUrl(data.config.googleAppsScriptUrl || '');
        setEnabled(data.config.enabled !== false);
        if (Array.isArray(data.recentLogs)) {
          setLogs(data.recentLogs);
        }
      }
    } catch {
      showToast('Error loading webhook configuration.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchConfig();
    }
  }, [token]);

  // Save Webhook URL & enable flag
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/webhook/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          googleAppsScriptUrl: webhookUrl.trim(),
          enabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to save webhook settings.', 'error');
        return;
      }

      showToast(data.message || 'Google Apps Script Webhook URL saved successfully!');
      await fetchConfig();
    } catch {
      showToast('Network error while saving webhook configuration.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Fire mock order payload to test connection
  const handleTestConnection = async () => {
    const trimmedUrl = webhookUrl.trim();
    if (!trimmedUrl) {
      showToast('Please enter your Google Apps Script Web App URL first.', 'error');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/webhook/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = await res.json();

      if (data.result) {
        setTestResult(data.result);
        if (data.success) {
          showToast('Webhook test succeeded! Google Apps Script responded.', 'success');
        } else {
          showToast(data.result.message || 'Webhook test failed', 'error');
        }
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Server returned an error.',
        });
        showToast(data.error || 'Webhook test failed', 'error');
      }

      await fetchConfig();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error reaching testing endpoint.',
      });
      showToast('Network error testing webhook', 'error');
    } finally {
      setTesting(false);
    }
  };

  // Clear audit logs
  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear the webhook dispatch logs?')) return;
    try {
      const res = await fetch('/api/admin/webhook/logs', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setLogs([]);
        showToast('Webhook logs cleared.');
      }
    } catch {
      showToast('Failed to clear logs.', 'error');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(googleAppsScriptSnippet);
    setCopiedCode(true);
    showToast('Google Apps Script code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 3000);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-[#52525B] flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-[#9A3412]" />
        <span>Loading Webhook Integration Settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#18181B]/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-3xl font-semibold text-[#18181B]">
              Google Apps Script Webhook Integration
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300">
              Active Suite
            </span>
          </div>
          <p className="text-xs text-[#52525B] mt-1 max-w-3xl">
            Configure, manage, and test server-to-server webhook forwarding from Ahuza checkout (<code>/api/checkout</code>) directly to your Google Apps Script Web App URL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchConfig}
            className="py-2 px-3 bg-white border border-[#18181B]/15 hover:bg-[#F9F8F6] rounded-lg text-xs font-semibold text-[#18181B] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSaveConfig} className="bg-white border border-[#18181B]/15 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#18181B]/10 pb-3">
              <h3 className="font-display text-xl font-semibold text-[#18181B] flex items-center gap-2">
                <Webhook className="w-5 h-5 text-[#9A3412]" />
                <span>Webhook URL Settings</span>
              </h3>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-[#9A3412] focus:ring-[#9A3412]"
                />
                <span className={enabled ? 'text-emerald-700' : 'text-[#71717A]'}>
                  {enabled ? 'Integration Enabled' : 'Integration Paused'}
                </span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18181B] mb-1.5">
                Google Apps Script Web App URL *
              </label>
              <input
                type="url"
                required
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="w-full px-3.5 py-3 bg-[#F9F8F6] border border-[#18181B]/20 rounded-xl text-xs font-mono-num text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-hidden focus:border-[#9A3412] focus:bg-white transition-colors"
              />
              <p className="text-[11px] text-[#71717A] mt-1.5">
                Must be deployed as a <strong>Web App</strong> with access set to <em>"Anyone"</em>.
              </p>
            </div>

            {/* Action Buttons: Save & Test Webhook Connection */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 px-5 bg-[#18181B] hover:bg-[#27272A] disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving URL...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save Webhook URL</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !webhookUrl.trim()}
                className="py-2.5 px-5 bg-[#9A3412] hover:bg-[#7C2D12] disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Firing Mock Order Payload...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Test Webhook Connection</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Test Connection Result Banner */}
          {testResult && (
            <div
              className={`p-5 rounded-2xl border transition-all ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-red-50 border-red-300 text-red-950'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm">
                      {testResult.success
                        ? 'Webhook Test Passed!'
                        : 'Webhook Test Failed'}
                    </h4>
                    <p className="text-xs opacity-90">{testResult.message}</p>
                    {testResult.statusCode && (
                      <div className="flex items-center gap-3 font-mono-num text-xs pt-1">
                        <span>HTTP Status: <strong>{testResult.statusCode}</strong></span>
                        {testResult.latencyMs !== undefined && (
                          <span>Response Time: <strong>{testResult.latencyMs}ms</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded text-[11px] font-mono-num font-bold uppercase ${
                    testResult.success
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-red-200 text-red-900'
                  }`}
                >
                  {testResult.success ? '200 OK' : 'ERROR'}
                </span>
              </div>

              {testResult.responseBody && (
                <div className="mt-3 pt-3 border-t border-black/10">
                  <span className="text-[10px] font-mono uppercase tracking-wider block opacity-75">
                    Response Body from Google Apps Script:
                  </span>
                  <pre className="text-[11px] font-mono bg-white/70 p-2.5 rounded-lg mt-1 overflow-x-auto max-h-32">
                    {testResult.responseBody}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Payload Field Specification Box */}
          <div className="bg-white border border-[#18181B]/15 rounded-2xl p-6 space-y-4">
            <h4 className="font-display text-lg font-semibold text-[#18181B] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#9A3412]" />
              <span>Forwarded Order JSON Payload Schema</span>
            </h4>
            <p className="text-xs text-[#52525B]">
              Every order submitted via <code>/api/checkout</code> or standard checkout forwards these fields:
            </p>

            <div className="bg-[#18181B] text-[#F9F8F6] p-4 rounded-xl text-xs font-mono overflow-x-auto">
              <pre>{`{
  "customer_email": "ananya.sharma@example.com",
  "order_id": "AHZ-2026-000003",
  "status": "CONFIRMED",
  "is_delayed": false,
  "estimated_delivery_days": 3,
  "sku": "AHZ-W-KRT-001",
  "quantity": 1,
  "product_name": "Ahuza Pure Cotton Hand-Block Print Kurti",
  "total_amount": 799,
  "currency": "INR"
}`}</pre>
            </div>
          </div>
        </div>

        {/* Right Column: Google Apps Script Setup Guide & Copy Code */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#18181B]/15 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold text-[#18181B] flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Google Apps Script Code</span>
              </h3>
              <button
                type="button"
                onClick={handleCopyCode}
                className="py-1.5 px-3 bg-[#F2EFE9] hover:bg-[#E5DFD5] text-[#18181B] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Script</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-[#52525B] leading-relaxed">
              Create a new <strong>Google Sheet</strong> → Click <strong>Extensions → Apps Script</strong> → Paste this snippet and click <strong>Deploy → New deployment → Web app</strong>.
            </p>

            <div className="relative">
              <pre className="p-3.5 bg-[#F9F8F6] border border-[#18181B]/10 rounded-xl text-[11px] font-mono text-[#18181B] max-h-80 overflow-y-auto leading-relaxed">
                {googleAppsScriptSnippet}
              </pre>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Important Deployment Settings:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
                <li>Execute as: <strong>Me (your email)</strong></li>
                <li>Who has access: <strong>Anyone</strong> (even anonymous)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Webhook Dispatch Audit Logs Table */}
      <div className="bg-white border border-[#18181B]/15 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-semibold text-[#18181B] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#9A3412]" />
              <span>Recent Webhook Dispatch History ({logs.length})</span>
            </h3>
            <p className="text-xs text-[#52525B] mt-0.5">
              Real-time audit log of all order webhook dispatches and test pings sent from this Ahuza store.
            </p>
          </div>

          {logs.length > 0 && (
            <button
              type="button"
              onClick={handleClearLogs}
              className="py-1.5 px-3 text-[#71717A] hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="py-10 text-center text-[#71717A] text-xs">
            No webhook dispatch events recorded yet. Click "Test Webhook Connection" or place an order via the checkout form.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#18181B]/10 text-[#71717A] font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Event</th>
                  <th className="py-3 px-3">Order / SKU</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">HTTP Code</th>
                  <th className="py-3 px-3">Latency</th>
                  <th className="py-3 px-3 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181B]/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="py-3 px-3 font-mono-num text-[#52525B] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3 font-mono-num font-semibold">
                      {log.event === 'test_ping' ? (
                        <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                          TEST PING
                        </span>
                      ) : (
                        <span className="text-blue-800 bg-blue-100 px-2 py-0.5 rounded text-[10px]">
                          ORDER FORWARD
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono-num">
                      <strong className="text-[#18181B] block">
                        {log.payload?.order_id || 'N/A'}
                      </strong>
                      <span className="text-[10px] text-[#71717A]">
                        {log.payload?.sku ? `SKU: ${log.payload.sku} (Qty: ${log.payload.quantity})` : ''}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {log.status === 'SUCCESS' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono-num font-bold text-[10px]">
                          SUCCESS
                        </span>
                      ) : log.status === 'SKIPPED' ? (
                        <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-mono-num text-[10px]">
                          SKIPPED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-mono-num font-bold text-[10px]">
                          FAILED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono-num">
                      {log.statusCode || '—'}
                    </td>
                    <td className="py-3 px-3 font-mono-num text-[#71717A]">
                      {log.latencyMs !== undefined ? `${log.latencyMs}ms` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLogPayload(log.payload)}
                        className="text-[#9A3412] hover:underline font-mono text-[11px] cursor-pointer"
                      >
                        View JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Payload Modal */}
      {selectedLogPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-[#18181B]/15 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#18181B]/10 pb-3">
              <h4 className="font-display text-lg font-semibold text-[#18181B]">
                Dispatched Webhook Payload
              </h4>
              <button
                type="button"
                onClick={() => setSelectedLogPayload(null)}
                className="text-[#71717A] hover:text-[#18181B] font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <pre className="p-3 bg-[#F9F8F6] border border-[#18181B]/10 rounded-xl text-xs font-mono max-h-80 overflow-y-auto">
              {JSON.stringify(selectedLogPayload, null, 2)}
            </pre>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogPayload(null)}
                className="py-2 px-4 bg-[#18181B] text-white text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
