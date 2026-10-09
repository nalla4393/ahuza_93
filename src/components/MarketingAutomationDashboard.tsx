import React, { useState, useEffect } from 'react';
import {
  Zap,
  TrendingUp,
  Mail,
  Share2,
  Bell,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Terminal,
  Clock,
  ArrowRight,
  Send,
  Eye,
  Sliders,
  ChevronDown,
  ChevronUp,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import type {
  AutomationChannelResult,
  AutomationConfig,
  AutomationExecutionLog,
  MarketingDecisionOutput,
} from '../types';

interface MarketingAutomationDashboardProps {
  token: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const MarketingAutomationDashboard: React.FC<MarketingAutomationDashboardProps> = ({
  token,
  showToast,
}) => {
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [logs, setLogs] = useState<AutomationExecutionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshingLogs, setRefreshingLogs] = useState(false);

  // Button Action Loading States
  const [runningAdsSync, setRunningAdsSync] = useState(false);
  const [runningEmailTest, setRunningEmailTest] = useState(false);
  const [runningSocialPost, setRunningSocialPost] = useState(false);
  const [runningFollowup, setRunningFollowup] = useState(false);
  const [runningAiPreview, setRunningAiPreview] = useState(false);

  // Active Filter for Logs
  const [logFilter, setLogFilter] = useState<'all' | 'google_ads' | 'gmail_email' | 'social_media' | 'internal_alerts'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Modal / Drawer states
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAiTestModal, setShowAiTestModal] = useState(false);
  const [aiPreviewData, setAiPreviewData] = useState<MarketingDecisionOutput | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Custom AI Test form state
  const [testCustomerName, setTestCustomerName] = useState('Ananya Sharma');
  const [testCustomerEmail, setTestCustomerEmail] = useState('ananya@example.com');
  const [testAmount, setTestAmount] = useState('1499');
  const [testItemName, setTestItemName] = useState('Ahuza Hand-Block Print Everyday Cotton Kurti');

  // Fetch initial status & logs
  const fetchStatusAndLogs = async () => {
    try {
      setRefreshingLogs(true);
      const res = await fetch('/api/automation/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setLogs(data.recentLogs || []);
      }
    } catch (err: any) {
      console.error('Failed to load automation status:', err);
    } finally {
      setRefreshingLogs(false);
    }
  };

  useEffect(() => {
    fetchStatusAndLogs();
  }, [token]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    showToast(`Copied ${label} to clipboard`, 'info');
    setTimeout(() => setCopiedText(null), 2500);
  };

  // 1. [Run Google Ads Campaign Sync]
  const handleRunGoogleAdsSync = async () => {
    try {
      setRunningAdsSync(true);
      const res = await fetch('/api/automation/google-ads-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Google Ads conversions synced successfully!', 'success');
        if (data.logEntry) {
          setLogs((prev) => [data.logEntry, ...prev]);
          setExpandedLogId(data.logEntry.id);
        }
        fetchStatusAndLogs();
      } else {
        showToast(data.error || 'Failed to sync Google Ads', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error syncing Google Ads', 'error');
    } finally {
      setRunningAdsSync(false);
    }
  };

  // 2. [Test Order & Email Alert]
  const handleTestEmailAlert = async () => {
    try {
      setRunningEmailTest(true);
      const res = await fetch('/api/automation/test-email-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerName: testCustomerName,
          recipientEmail: config?.gmailAlerts.alertRecipientEmail || 'nallagondarosy@gmail.com',
          amount: Number(testAmount) || 1499,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Gmail alert fired with AI-generated copy!', 'success');
        if (data.logEntry) {
          setLogs((prev) => [data.logEntry, ...prev]);
          setExpandedLogId(data.logEntry.id);
        }
        if (data.aiDecision) {
          setAiPreviewData(data.aiDecision);
        }
        fetchStatusAndLogs();
      } else {
        showToast(data.error || 'Failed to send test email alert', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error sending test email alert', 'error');
    } finally {
      setRunningEmailTest(false);
    }
  };

  // 3. [Trigger Social Media Auto-Post]
  const handleTriggerSocialPost = async () => {
    try {
      setRunningSocialPost(true);
      const res = await fetch('/api/automation/social-auto-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Social media auto-post dispatched!', 'success');
        if (data.logEntry) {
          setLogs((prev) => [data.logEntry, ...prev]);
          setExpandedLogId(data.logEntry.id);
        }
        if (data.aiDecision) {
          setAiPreviewData(data.aiDecision);
        }
        fetchStatusAndLogs();
      } else {
        showToast(data.error || 'Failed to trigger social media post', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error triggering social post', 'error');
    } finally {
      setRunningSocialPost(false);
    }
  };

  // 4. [Send Follow-up Alerts]
  const handleSendFollowupAlerts = async () => {
    try {
      setRunningFollowup(true);
      const res = await fetch('/api/automation/send-followup-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Customer follow-up alerts initiated!', 'success');
        fetchStatusAndLogs();
      } else {
        showToast(data.error || 'Failed to send follow-up alerts', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error sending follow-up alerts', 'error');
    } finally {
      setRunningFollowup(false);
    }
  };

  // Run direct AI decision test
  const handleRunAiDecisionTest = async () => {
    try {
      setRunningAiPreview(true);
      const res = await fetch('/api/automation/ai-decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order: {
            orderNumber: `AHZ-PREVIEW-${Math.floor(1000 + Math.random() * 9000)}`,
            customerName: testCustomerName,
            customerEmail: testCustomerEmail,
            totalAmount: Number(testAmount) || 1499,
            items: [
              {
                productName: testItemName,
                sku: 'AHZ-W-KRT-001',
                unitPrice: Number(testAmount) || 1499,
                quantity: 1,
              },
            ],
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.decision) {
        setAiPreviewData(data.decision);
        setShowAiTestModal(true);
        showToast('AI Marketing Decision generated with Gemini 3.8 Flash!', 'success');
      } else {
        showToast(data.error || 'Failed to run AI decision layer', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error in AI decision layer', 'error');
    } finally {
      setRunningAiPreview(false);
    }
  };

  // Clear Logs
  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all automation execution logs?')) return;
    try {
      const res = await fetch('/api/automation/logs', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setLogs([]);
        showToast('Automation logs cleared', 'info');
      }
    } catch (err: any) {
      showToast('Failed to clear logs', 'error');
    }
  };

  // Save Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    try {
      setLoading(true);
      const res = await fetch('/api/automation/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setShowConfigModal(false);
        showToast('Automation configuration updated successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to update configuration', 'error');
      }
    } catch (err: any) {
      showToast('Error saving configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (logFilter === 'all') return true;
    return log.channelResults.some((ch) => ch.channel === logFilter);
  });

  return (
    <div className="space-y-6">
      {/* 1. TOP HERO & CONTROLLER BANNER */}
      <div className="bg-gradient-to-br from-[#18181B] via-[#27272A] to-[#18181B] rounded-2xl p-6 sm:p-8 text-white border border-white/10 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#9A3412]/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Zapier-Alternative Active
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#9A3412]/30 text-amber-200 border border-[#9A3412]/40">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Gemini 3.8 Flash Decision Layer
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                AI Marketing Automation & Backend Controller
              </h1>
              <p className="text-sm text-[#D4D4D8] mt-1 max-w-2xl leading-relaxed">
                Autonomous e-commerce event router powered by Gemini logic. Coordinates Google Ads conversion signals, Gmail customer alerts, social promotional drops, and internal team operational tasks.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-medium flex items-center gap-2 border border-white/15 transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-300" />
                <span>Configure Channels</span>
              </button>
              <button
                type="button"
                onClick={fetchStatusAndLogs}
                disabled={refreshingLogs}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 border border-white/15 transition-colors cursor-pointer"
                title="Refresh Status & Logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingLogs ? 'animate-spin text-amber-400' : ''}`} />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* 4 Multi-Channel Metric Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
              <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  Google Ads Sync
                </span>
                <span className="w-2 h-2 rounded-full bg-blue-400" />
              </div>
              <div className="font-mono-num text-2xl font-bold text-white">
                {config?.googleAds.syncedConversionsCount || 0}
              </div>
              <div className="text-[11px] text-[#A1A1AA] truncate mt-0.5">
                Target ROAS Signal: 4.2x
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
              <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  Gmail / Email Alerts
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="font-mono-num text-2xl font-bold text-white">
                {config?.gmailAlerts.alertsSentCount || 0}
              </div>
              <div className="text-[11px] text-[#A1A1AA] truncate mt-0.5">
                Recipient: {config?.gmailAlerts.alertRecipientEmail || 'orders@ahuzawear.com'}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
              <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Share2 className="w-3.5 h-3.5 text-purple-400" />
                  Social Auto-Posts
                </span>
                <span className="w-2 h-2 rounded-full bg-purple-400" />
              </div>
              <div className="font-mono-num text-2xl font-bold text-white">
                {config?.socialMedia.postsPublishedCount || 0}
              </div>
              <div className="text-[11px] text-[#A1A1AA] truncate mt-0.5">
                {config?.socialMedia.targetPlatforms.join(', ') || 'Instagram, FB'}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
              <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  Internal Ops Tasks
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              </div>
              <div className="font-mono-num text-2xl font-bold text-white">
                {config?.internalAlerts.alertsCount || 0}
              </div>
              <div className="text-[11px] text-[#A1A1AA] truncate mt-0.5">
                Priority: VIP & Delayed Watch
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE CONTROL BUTTONS PANEL */}
      <div className="bg-white rounded-2xl p-6 border border-[#18181B]/10 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#18181B]/10">
          <div>
            <h2 className="text-base font-bold text-[#18181B] flex items-center gap-2">
              <Play className="w-4 h-4 text-[#9A3412]" />
              Interactive Control Operations
            </h2>
            <p className="text-xs text-[#71717A] mt-0.5">
              Trigger instant backend actions. Responses appear immediately in the live status logs below.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunAiDecisionTest}
            disabled={runningAiPreview}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF5F0] hover:bg-[#F5ECE3] text-[#9A3412] text-xs font-semibold rounded-lg border border-[#9A3412]/20 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Test Gemini Copy Generator</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Button 1: Run Google Ads Campaign Sync */}
          <div className="bg-[#FAF5F0] rounded-xl p-4 border border-[#9A3412]/15 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200">
                  Google Ads API
                </span>
              </div>
              <h3 className="font-semibold text-sm text-[#18181B]">Google Ads Sync</h3>
              <p className="text-xs text-[#71717A] mt-1 leading-relaxed">
                Sync active conversions, transaction values, and adjust target ROAS signals for paid campaigns.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunGoogleAdsSync}
              disabled={runningAdsSync}
              className="mt-4 w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              {runningAdsSync ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing Ads...</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>[Run Google Ads Campaign Sync]</span>
                </>
              )}
            </button>
          </div>

          {/* Button 2: Test Order & Email Alert */}
          <div className="bg-[#FAF5F0] rounded-xl p-4 border border-[#9A3412]/15 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  <Mail className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                  Gmail Alerts
                </span>
              </div>
              <h3 className="font-semibold text-sm text-[#18181B]">Test Order & Email Alert</h3>
              <p className="text-xs text-[#71717A] mt-1 leading-relaxed">
                Fires mock order payload to verify Gmail alerts with AI-generated personalized styling copy.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTestEmailAlert}
              disabled={runningEmailTest}
              className="mt-4 w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              {runningEmailTest ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Firing Mock Alert...</span>
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5" />
                  <span>[Test Order & Email Alert]</span>
                </>
              )}
            </button>
          </div>

          {/* Button 3: Trigger Social Media Auto-Post */}
          <div className="bg-[#FAF5F0] rounded-xl p-4 border border-[#9A3412]/15 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                  <Share2 className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-purple-50 text-purple-800 rounded border border-purple-200">
                  Social Endpoints
                </span>
              </div>
              <h3 className="font-semibold text-sm text-[#18181B]">Social Auto-Post</h3>
              <p className="text-xs text-[#71717A] mt-1 leading-relaxed">
                Sends promotional drop payload with AI-crafted storytelling caption and tags to social channels.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTriggerSocialPost}
              disabled={runningSocialPost}
              className="mt-4 w-full py-2.5 px-3 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-400 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              {runningSocialPost ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Posting Update...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>[Trigger Social Media Auto-Post]</span>
                </>
              )}
            </button>
          </div>

          {/* Button 4: Send Follow-up Alerts */}
          <div className="bg-[#FAF5F0] rounded-xl p-4 border border-[#9A3412]/15 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  <Bell className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-amber-50 text-amber-900 rounded border border-amber-200">
                  Engagement Scheduler
                </span>
              </div>
              <h3 className="font-semibold text-sm text-[#18181B]">Send Follow-up Alerts</h3>
              <p className="text-xs text-[#71717A] mt-1 leading-relaxed">
                Initiates scheduled customer engagement alerts & internal ops tasks for recent orders.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSendFollowupAlerts}
              disabled={runningFollowup}
              className="mt-4 w-full py-2.5 px-3 bg-[#9A3412] hover:bg-[#7C2D12] disabled:bg-[#9A3412]/50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              {runningFollowup ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Initiating Alerts...</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>[Send Follow-up Alerts]</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. EVENT ROUTER WORKFLOW VISUALIZER */}
      <div className="bg-[#18181B] rounded-2xl p-5 text-white border border-white/10">
        <div className="flex items-center justify-between mb-3 text-xs text-[#A1A1AA]">
          <span className="font-semibold text-white flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Active Automation Architecture Pipeline
          </span>
          <span className="hidden sm:inline text-[11px]">Auto-triggered on /api/checkout & Manual Controls</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-[#A1A1AA] text-[10px] font-semibold uppercase">Trigger Source</div>
            <div className="font-bold text-white mt-1">1. E-Commerce Webhook</div>
            <p className="text-[11px] text-[#A1A1AA] mt-1">
              Ingests <code>order.created</code>, <code>order.paid</code>, or button payload.
            </p>
          </div>

          <div className="bg-[#9A3412]/20 rounded-xl p-3 border border-[#9A3412]/30">
            <div className="text-amber-300 text-[10px] font-semibold uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI Decision Layer
            </div>
            <div className="font-bold text-white mt-1">2. Gemini 3.8 Flash</div>
            <p className="text-[11px] text-[#D4D4D8] mt-1">
              Classifies segment, predicts churn score, writes custom email & social hooks.
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-[#A1A1AA] text-[10px] font-semibold uppercase">Event Router</div>
            <div className="font-bold text-white mt-1">3. Channel Dispatcher</div>
            <p className="text-[11px] text-[#A1A1AA] mt-1">
              Evaluates rules and dispatches asynchronously in parallel.
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-[#A1A1AA] text-[10px] font-semibold uppercase">Execution Endpoints</div>
            <div className="font-bold text-white mt-1">4. Multi-Channel Output</div>
            <p className="text-[11px] text-[#A1A1AA] mt-1">
              Google Ads API, Gmail SMTP, Meta Webhooks, Slack Ops.
            </p>
          </div>
        </div>
      </div>

      {/* 4. REAL-TIME STATUS LOGS CONTAINER */}
      <div className="bg-white rounded-2xl p-6 border border-[#18181B]/10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-[#18181B]/10">
          <div>
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#9A3412]" />
              <h2 className="text-base font-bold text-[#18181B]">Real-Time Status Logs Container</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#FAF5F0] text-[#9A3412] text-xs font-mono font-semibold border border-[#9A3412]/20">
                {logs.length} events
              </span>
            </div>
            <p className="text-xs text-[#71717A] mt-0.5">
              Live response feeds with HTTP latency, payloads, and Gemini marketing decisions.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter buttons */}
            <div className="flex items-center p-1 bg-[#FAF5F0] rounded-lg border border-[#18181B]/5 text-xs font-medium">
              {[
                { id: 'all', label: 'All' },
                { id: 'google_ads', label: 'Google Ads' },
                { id: 'gmail_email', label: 'Email' },
                { id: 'social_media', label: 'Social' },
                { id: 'internal_alerts', label: 'Internal' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setLogFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs ${
                    logFilter === f.id
                      ? 'bg-[#9A3412] text-white shadow-xs font-semibold'
                      : 'text-[#71717A] hover:text-[#18181B]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleClearLogs}
              disabled={logs.length === 0}
              className="px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors cursor-pointer flex items-center gap-1"
              title="Clear all logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        {/* Logs Feed */}
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-[#71717A] border-2 border-dashed border-[#18181B]/10 rounded-xl">
            <Terminal className="w-8 h-8 text-[#A1A1AA] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-[#18181B]">No automation logs recorded yet</p>
            <p className="text-xs text-[#71717A] mt-1 max-w-sm mx-auto">
              Click any of the action buttons above or place a test order through the checkout form to watch live logs stream in.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const hasAi = Boolean(log.aiDecision);

              return (
                <div
                  key={log.id}
                  className={`rounded-xl border transition-all ${
                    log.overallStatus === 'SUCCESS'
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : log.overallStatus === 'PARTIAL'
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-red-200 bg-red-50/20'
                  }`}
                >
                  {/* Log Summary Header */}
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-black/[0.02]"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <span className="mt-0.5 sm:mt-0">
                        {log.overallStatus === 'SUCCESS' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : log.overallStatus === 'PARTIAL' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </span>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-[#18181B]">
                            {log.eventType}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-[#18181B]/10 text-[#71717A]">
                            via {log.triggerSource}
                          </span>
                          {log.orderId && (
                            <span className="text-[10px] font-mono font-medium text-[#9A3412] bg-[#FAF5F0] px-1.5 py-0.5 rounded">
                              {log.orderId}
                            </span>
                          )}
                          {hasAi && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                              <Sparkles className="w-2.5 h-2.5" />
                              AI Decision
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-[#71717A] mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span>•</span>
                          <span>{log.channelResults.length} channels triggered</span>
                          <span>•</span>
                          <span className="font-mono">{log.totalLatencyMs}ms latency</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <div className="flex items-center gap-1.5">
                        {log.channelResults.map((ch, i) => (
                          <span
                            key={i}
                            title={`${ch.channelName}: ${ch.message}`}
                            className={`w-2 h-2 rounded-full ${
                              ch.success ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-[#71717A] ml-2">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details View */}
                  {isExpanded && (
                    <div className="border-t border-[#18181B]/10 p-4 bg-white rounded-b-xl space-y-4">
                      {/* AI Decision Summary if available */}
                      {log.aiDecision && (
                        <div className="bg-[#FAF5F0] rounded-xl p-4 border border-[#9A3412]/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-[#9A3412] flex items-center gap-1.5 uppercase tracking-wide">
                              <Sparkles className="w-3.5 h-3.5" />
                              Gemini Marketing Decision Layer Analysis
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full border border-amber-300">
                              Segment: {log.aiDecision.customerSegment}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-2">
                            <div className="space-y-1">
                              <div className="text-[11px] font-semibold text-[#71717A]">Personalized Subject Line:</div>
                              <div className="font-medium text-[#18181B] bg-white p-2 rounded border border-[#18181B]/10">
                                {log.aiDecision.personalizedFollowupCopy.emailSubject}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-[11px] font-semibold text-[#71717A]">Next-Best-Offer Recommendation:</div>
                              <div className="font-medium text-[#18181B] bg-white p-2 rounded border border-[#18181B]/10">
                                {log.aiDecision.nextBestOfferName} ({log.aiDecision.nextBestOfferSku})
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 text-xs">
                            <div className="text-[11px] font-semibold text-[#71717A]">Internal CX & Ops Task:</div>
                            <div className="text-[#18181B] italic bg-white p-2 rounded border border-[#18181B]/10 mt-0.5">
                              [{log.aiDecision.internalAlertNotice.team}] {log.aiDecision.internalAlertNotice.taskSummary}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Channel Results Breakdown */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-[#18181B] uppercase tracking-wide">
                          Channel Dispatches & Responses
                        </div>

                        {log.channelResults.map((ch, idx) => (
                          <div
                            key={idx}
                            className="bg-[#F9F8F6] rounded-xl p-3 border border-[#18181B]/10 text-xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 font-semibold text-[#18181B]">
                                {ch.success ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                                )}
                                <span>{ch.channelName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] font-mono text-[#71717A]">
                                <span>HTTP {ch.statusCode || (ch.success ? 200 : 500)}</span>
                                <span>•</span>
                                <span>{ch.latencyMs}ms</span>
                              </div>
                            </div>

                            <p className="text-xs text-[#52525B] mt-1">{ch.message}</p>

                            {ch.endpointUrl && (
                              <div className="text-[11px] font-mono text-[#71717A] truncate mt-1">
                                Endpoint: {ch.endpointUrl}
                              </div>
                            )}

                            {ch.responsePreview && (
                              <div className="mt-2">
                                <details className="cursor-pointer">
                                  <summary className="text-[11px] text-[#9A3412] hover:underline font-medium">
                                    View Response Payload
                                  </summary>
                                  <pre className="mt-1.5 p-2 bg-[#18181B] text-[#D4D4D8] rounded-lg text-[10px] font-mono overflow-x-auto max-h-40">
                                    {JSON.stringify(ch.responsePreview, null, 2)}
                                  </pre>
                                </details>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. AI DECISION INSPECTOR MODAL */}
      {showAiTestModal && aiPreviewData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-[#18181B]/15">
            <div className="flex items-center justify-between pb-4 border-b border-[#18181B]/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#9A3412]" />
                <h3 className="font-bold text-lg text-[#18181B]">Gemini AI Marketing Decision Layer</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAiTestModal(false)}
                className="text-[#71717A] hover:text-[#18181B] text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-[#FAF5F0] p-4 rounded-xl border border-[#9A3412]/20">
                <div>
                  <span className="text-[#71717A]">Customer Segment:</span>
                  <div className="font-bold text-sm text-[#9A3412]">{aiPreviewData.customerSegment}</div>
                </div>
                <div>
                  <span className="text-[#71717A]">Predicted Churn Risk:</span>
                  <div className="font-bold text-sm text-emerald-700">{aiPreviewData.churnRiskScore}%</div>
                </div>
              </div>

              <div>
                <span className="font-bold text-[#18181B] block mb-1">Personalized Email Copy:</span>
                <div className="bg-[#F9F8F6] p-4 rounded-xl border border-[#18181B]/10 space-y-2">
                  <div className="font-semibold text-sm text-[#18181B]">
                    Subject: {aiPreviewData.personalizedFollowupCopy.emailSubject}
                  </div>
                  <div className="text-[11px] text-[#71717A]">
                    Preheader: {aiPreviewData.personalizedFollowupCopy.emailPreviewText}
                  </div>
                  <div
                    className="p-3 bg-white rounded border border-[#18181B]/10 text-xs text-[#27272A] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: aiPreviewData.personalizedFollowupCopy.emailBodyHtml }}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(aiPreviewData.personalizedFollowupCopy.emailBodyHtml, 'Email Copy')}
                      className="px-2.5 py-1 text-[11px] bg-[#FAF5F0] hover:bg-[#F5ECE3] text-[#9A3412] rounded flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      {copiedText === 'Email Copy' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>Copy HTML</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <span className="font-bold text-[#18181B] block mb-1">Social Promo Caption & Hashtags:</span>
                <div className="bg-[#F9F8F6] p-4 rounded-xl border border-[#18181B]/10 space-y-2">
                  <div className="font-semibold text-[#18181B]">{aiPreviewData.socialPromoDraft.headline}</div>
                  <p className="text-xs text-[#52525B] leading-relaxed whitespace-pre-line">
                    {aiPreviewData.socialPromoDraft.caption}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {aiPreviewData.socialPromoDraft.hashtags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <span className="font-bold text-[#18181B] block mb-1">Google Ads Campaign Signal:</span>
                <div className="bg-[#F9F8F6] p-3 rounded-xl border border-[#18181B]/10 space-y-1">
                  <div>Audience: <strong className="text-[#18181B]">{aiPreviewData.googleAdsOptimization.audienceSignal}</strong></div>
                  <div>Suggested Bid: <strong className="text-blue-700">{aiPreviewData.googleAdsOptimization.suggestedBidAdjustment}</strong></div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAiTestModal(false)}
                className="px-4 py-2 bg-[#18181B] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. CONFIGURE CHANNELS MODAL */}
      {showConfigModal && config && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-[#18181B]/15">
            <div className="flex items-center justify-between pb-4 border-b border-[#18181B]/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#9A3412]" />
                <h3 className="font-bold text-lg text-[#18181B]">Configure Automation Channels</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-[#71717A] hover:text-[#18181B] text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-5 mt-4 text-xs">
              {/* Google Ads */}
              <div className="p-3.5 bg-[#FAF5F0] rounded-xl border border-[#9A3412]/15 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#18181B] flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Google Ads Settings
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.googleAds.enabled}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          googleAds: { ...config.googleAds, enabled: e.target.checked },
                        })
                      }
                      className="rounded accent-[#9A3412]"
                    />
                    <span className="text-[11px] font-semibold text-[#18181B]">Enabled</span>
                  </label>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#71717A] mb-1">
                    Conversion Action Tag ID:
                  </label>
                  <input
                    type="text"
                    value={config.googleAds.conversionActionId}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        googleAds: { ...config.googleAds, conversionActionId: e.target.value },
                      })
                    }
                    className="w-full p-2 bg-white rounded border border-[#18181B]/15 font-mono text-xs"
                    placeholder="AW-1149203948/purchase_conv"
                  />
                </div>
              </div>

              {/* Gmail Alerts */}
              <div className="p-3.5 bg-[#FAF5F0] rounded-xl border border-[#9A3412]/15 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#18181B] flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-emerald-600" />
                    Gmail / Email Alert Settings
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.gmailAlerts.enabled}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          gmailAlerts: { ...config.gmailAlerts, enabled: e.target.checked },
                        })
                      }
                      className="rounded accent-[#9A3412]"
                    />
                    <span className="text-[11px] font-semibold text-[#18181B]">Enabled</span>
                  </label>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#71717A] mb-1">
                    Alert Recipient Email (Owner / Store Manager):
                  </label>
                  <input
                    type="email"
                    value={config.gmailAlerts.alertRecipientEmail}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        gmailAlerts: { ...config.gmailAlerts, alertRecipientEmail: e.target.value },
                      })
                    }
                    className="w-full p-2 bg-white rounded border border-[#18181B]/15 text-xs font-medium"
                    placeholder="nallagondarosy@gmail.com"
                  />
                </div>
              </div>

              {/* Social Media */}
              <div className="p-3.5 bg-[#FAF5F0] rounded-xl border border-[#9A3412]/15 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#18181B] flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-purple-600" />
                    Social Media Endpoints
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.socialMedia.enabled}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          socialMedia: { ...config.socialMedia, enabled: e.target.checked },
                        })
                      }
                      className="rounded accent-[#9A3412]"
                    />
                    <span className="text-[11px] font-semibold text-[#18181B]">Enabled</span>
                  </label>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#71717A] mb-1">
                    External Social Webhook URL:
                  </label>
                  <input
                    type="url"
                    value={config.socialMedia.webhookEndpoint || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        socialMedia: { ...config.socialMedia, webhookEndpoint: e.target.value },
                      })
                    }
                    className="w-full p-2 bg-white rounded border border-[#18181B]/15 font-mono text-xs"
                    placeholder="https://api.ahuzawear.com/webhooks/social-auto-post"
                  />
                </div>
              </div>

              {/* Internal Alerts */}
              <div className="p-3.5 bg-[#FAF5F0] rounded-xl border border-[#9A3412]/15 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#18181B] flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-amber-700" />
                    Internal Ops Slack / Webhook
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.internalAlerts.enabled}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          internalAlerts: { ...config.internalAlerts, enabled: e.target.checked },
                        })
                      }
                      className="rounded accent-[#9A3412]"
                    />
                    <span className="text-[11px] font-semibold text-[#18181B]">Enabled</span>
                  </label>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#71717A] mb-1">
                    Internal Ops Webhook URL:
                  </label>
                  <input
                    type="url"
                    value={config.internalAlerts.webhookUrl || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        internalAlerts: { ...config.internalAlerts, webhookUrl: e.target.value },
                      })
                    }
                    className="w-full p-2 bg-white rounded border border-[#18181B]/15 font-mono text-xs"
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 border border-[#18181B]/15 text-[#18181B] rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#9A3412] hover:bg-[#7C2D12] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
