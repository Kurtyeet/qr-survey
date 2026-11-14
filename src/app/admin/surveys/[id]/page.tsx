'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { SurveyData, SubmissionData } from '@/types/survey';
import { packSurvey } from '@/lib/surveyPacker';
import {
  ArrowLeft,
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  FileSpreadsheet,
  Users,
  WifiOff,
  Wifi,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  FileEdit,
  User,
  Camera,
} from 'lucide-react';
import OfflineQrScannerModal from '@/components/OfflineQrScannerModal';

export default function SurveyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params?.id as string;

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const qrCanvasRef = useRef<HTMLDivElement>(null);

  const [surveyUrl, setSurveyUrl] = useState('');
  const [networkIps, setNetworkIps] = useState<{ iface: string; ip: string }[]>([]);
  const [selectedHost, setSelectedHost] = useState('');
  const [serverPort, setServerPort] = useState('3000');

  const activeQrUrl = React.useMemo(() => {
    if (!survey) return '';
    const host = selectedHost || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
    const portPart = serverPort && serverPort !== '80' && serverPort !== '443' ? `:${serverPort}` : '';
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
    return `${protocol}//${host}${portPart}/s/${survey.id}`;
  }, [survey, selectedHost, serverPort]);

  useEffect(() => {
    if (typeof window !== 'undefined' && surveyId) {
      setSurveyUrl(activeQrUrl);
    }
  }, [activeQrUrl, surveyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [surveyRes, subRes] = await Promise.all([
        fetch(`/api/admin/surveys/${surveyId}`),
        fetch(`/api/admin/surveys/${surveyId}/submissions`),
      ]);

      if (surveyRes.ok) {
        const sData = await surveyRes.json();
        setSurvey(sData);
      }
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubmissions(subData);
      }

      // Auto-detect local hotspot IP
      fetch('/api/admin/network')
        .then((r) => r.json())
        .then((net) => {
          if (net.ips && net.ips.length > 0) setNetworkIps(net.ips);
          if (net.defaultIp) setSelectedHost((prev) => prev || net.defaultIp);
          if (net.port) setServerPort(String(net.port));
        })
        .catch(console.warn);
    } catch (err) {
      console.error('Failed to load survey data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (surveyId) loadData();
  }, [surveyId]);

  const handleCopyLink = () => {
    if (!surveyUrl) return;
    navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQR = () => {
    const canvas = qrCanvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `${survey?.slug || 'survey'}-qr-code.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handlePrintFlyer = () => {
    window.print();
  };

  const offlineSubmissionsCount = submissions.filter((s) => s.isOfflineSubmission).length;

  if (loading && !survey) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-slate-100 p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800">Survey not found</h2>
        <Link href="/admin" className="text-blue-600 text-sm mt-2 inline-block">
          Return to Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            All Surveys
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setScannerOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition"
              title="Scan respondent transfer QR code"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Scan Respondent QR</span>
              <span className="sm:hidden">Scan QR</span>
            </button>

            <Link
              href={`/admin/new?edit=${surveyId}`}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition"
            >
              <FileEdit className="w-4 h-4" />
              <span>Edit</span>
            </Link>

            <a
              href={`/api/admin/surveys/${surveyId}/export`}
              download
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export CSV</span>
            </a>

            <Link
              href={`/s/${survey.id}`}
              target="_blank"
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <span>Test Survey</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Survey Info Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-6 print:hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-md">
                Active Survey
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
                {survey.title}
              </h1>
              {survey.description && (
                <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
                  {survey.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-center">
                <span className="text-xs text-slate-400 font-medium">Submissions</span>
                <p className="text-2xl font-bold text-slate-900">{submissions.length}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-center">
                <span className="text-xs text-slate-400 font-medium">Saved Offline</span>
                <p className="text-2xl font-bold text-amber-600">{offlineSubmissionsCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Presentation Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Printable Flyer / QR Card */}
          <div className="lg:col-span-1 print-area">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-center flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Scan With Phone Camera
              </span>
              <h3 className="text-base font-bold text-slate-900 mb-4 px-2">
                {survey.title}
              </h3>

              {/* Hotspot IP Selector */}
              <div className="mb-4 w-full print:hidden">
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-center gap-1">
                  <Wifi className="w-3.5 h-3.5 text-blue-600" />
                  <span>Surveyor Hotspot IP:</span>
                </label>
                {networkIps.length > 0 ? (
                  <select
                    value={selectedHost}
                    onChange={(e) => setSelectedHost(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 text-center"
                  >
                    {networkIps.map((net) => (
                      <option key={net.ip} value={net.ip}>
                        {net.ip} ({net.iface})
                      </option>
                    ))}
                    {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && (
                      <option value={window.location.hostname}>
                        {window.location.hostname} (Current Domain)
                      </option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedHost}
                    onChange={(e) => setSelectedHost(e.target.value)}
                    placeholder="e.g. 192.168.43.1"
                    className="w-full text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center"
                  />
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  Connect respondent to your Hotspot, then scan.
                </p>
              </div>

              {/* QR Code Canvas (for PNG export) and SVG (for crisp rendering) */}
              <div className="p-4 bg-white border-2 border-slate-900 rounded-2xl shadow-inner mb-4 inline-block">
                {activeQrUrl && (
                  <QRCodeSVG
                    value={activeQrUrl}
                    size={220}
                    level="M"
                    includeMargin={false}
                  />
                )}
              </div>

              {/* Hidden canvas element used to export high-res PNG */}
              <div ref={qrCanvasRef} className="hidden">
                {activeQrUrl && (
                  <QRCodeCanvas
                    value={activeQrUrl}
                    size={600}
                    level="M"
                    includeMargin={true}
                  />
                )}
              </div>

              <p className="text-xs text-slate-500 font-mono bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg max-w-full truncate mb-4">
                {activeQrUrl}
              </p>

              {/* Action buttons (hidden when printing) */}
              <div className="w-full space-y-2 print:hidden">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activeQrUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                  }}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Link Copied to Clipboard!' : 'Copy Survey Link'}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleDownloadQR}
                    className="py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
                  </button>

                  <button
                    onClick={handlePrintFlyer}
                    className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Flyer
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Offline Sync Architecture & Details */}
          <div className="lg:col-span-2 space-y-4 print:hidden">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-blue-600" />
                How the Surveyor Local Hotspot Works
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Enable field surveying for any new phone with <strong>0% internet access</strong>:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="font-bold text-slate-800 block mb-1">1. Surveyor Hotspot</span>
                  <span className="text-slate-500">Surveyor turns on Personal Hotspot (no cellular data needed). Respondents connect to this Wi-Fi.</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="font-bold text-slate-800 block mb-1">2. Scan Local QR</span>
                  <span className="text-slate-500">Respondent scans this QR code with their camera. The survey loads directly from your server over Wi-Fi.</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="font-bold text-slate-800 block mb-1">3. Direct Local Save</span>
                  <span className="text-slate-500">Responses transmit directly to your database over the local hotspot network with zero internet required.</span>
                </div>
              </div>
            </div>

            {/* Questions Summary */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-3">
                Survey Questions ({survey.questions.length})
              </h3>
              <div className="space-y-2">
                {survey.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-3 bg-slate-50 rounded-xl text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-600">{idx + 1}.</span>
                      <span className="font-medium text-slate-800">{q.title}</span>
                      {q.required && <span className="text-red-500 font-bold">*</span>}
                    </div>
                    <span className="text-slate-400 capitalize bg-white px-2 py-0.5 rounded border border-slate-200">
                      {q.type.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Responses / Submissions Table */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm print:hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recorded Responses</h2>
              <p className="text-xs text-slate-500">
                Live feed of synced submissions from respondents
              </p>
            </div>

            <button
              onClick={loadData}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No responses received yet.</p>
              <p className="text-slate-400 mt-1">Scan the QR code above or test the survey to see responses appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => {
                const isExpanded = expandedSubId === sub.id;
                const dateStr = sub.submittedAtClient
                  ? new Date(sub.submittedAtClient).toLocaleString()
                  : 'Unknown';

                return (
                  <div
                    key={sub.id}
                    className="border border-slate-200 rounded-2xl overflow-hidden transition"
                  >
                    <div
                      onClick={() => setExpandedSubId(isExpanded ? null : sub.id)}
                      className="p-4 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-slate-900 text-xs flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                          {sub.respondentName || 'Anonymous'}
                        </span>

                        {sub.respondentRole && (
                          <span className="bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {sub.respondentRole}
                          </span>
                        )}

                        {sub.isOfflineSubmission ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <WifiOff className="w-3 h-3" />
                            Offline
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <Wifi className="w-3 h-3" />
                            Online
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {dateStr}
                        </span>

                        <div className="flex items-center gap-1 text-blue-600 font-semibold">
                          <span>{isExpanded ? 'Hide' : 'View Answers'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-slate-200 space-y-3 text-xs">
                        {survey.questions.map((q) => {
                          const ans = sub.answers[q.id];
                          const displayAns =
                            ans === undefined || ans === null || ans === ''
                              ? '<No Answer>'
                              : Array.isArray(ans)
                              ? ans.join(', ')
                              : String(ans);

                          return (
                            <div key={q.id} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                              <span className="font-semibold text-slate-800 block mb-0.5">
                                {q.title}
                              </span>
                              <span className="text-slate-600 bg-slate-50 px-2.5 py-1 rounded inline-block">
                                {displayAns}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <OfflineQrScannerModal
        isOpen={scannerOpen}
        onClose={() => {
          setScannerOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
