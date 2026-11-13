import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import {
  QrCode,
  WifiOff,
  CloudUpload,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  BarChart3,
  Zap,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const latestSurvey = await prisma.survey.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* ── Navigation ── */}
      <header className="border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-brand-sm">
              <QrCode className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-white tracking-tight">QR Survey</span>
            <span className="hidden sm:inline text-[11px] font-semibold text-blue-400 bg-blue-950/60 border border-blue-800/60 px-2.5 py-0.5 rounded-full tracking-wide">
              OFFLINE-FIRST
            </span>
          </div>

          <nav className="flex items-center gap-1">
            <Link
              href="/admin"
              className="px-3.5 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/new"
              className="ml-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-brand-sm transition"
            >
              Create Survey
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="flex-1 flex flex-col">
        <section className="max-w-5xl mx-auto px-5 sm:px-8 pt-20 pb-16 sm:pt-28 sm:pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] px-4 py-1.5 rounded-full text-xs font-medium text-slate-300 mb-8">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2.5} />
            100% offline-resilient · Zero app store friction
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.08] mb-6">
            Scan. Answer.{' '}
            <span className="text-blue-400">Auto-syncs</span>{' '}
            when back online.
          </h1>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto mb-10">
            Respondents scan your printed QR code with any phone camera. Even with zero signal, every answer auto-saves to the phone and silently uploads the moment connectivity returns.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20">
            <Link
              href="/admin"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm shadow-brand transition"
            >
              <BarChart3 className="w-4 h-4" />
              Open Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>

            {latestSurvey && (
              <Link
                href={`/s/${latestSurvey.id}`}
                target="_blank"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.1] text-white font-semibold rounded-xl text-sm transition"
              >
                <Smartphone className="w-4 h-4 text-blue-400" />
                Try Live Survey
              </Link>
            )}
          </div>

          {/* Feature trio */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {[
              {
                icon: QrCode,
                color: 'text-blue-400',
                bg: 'bg-blue-950/50 border-blue-900/60',
                title: 'Zero-install QR scan',
                body: "Any phone camera opens the survey straight in Safari or Chrome. No APK, no App Store — the link is the product.",
              },
              {
                icon: WifiOff,
                color: 'text-amber-400',
                bg: 'bg-amber-950/40 border-amber-900/50',
                title: 'Full offline auto-save',
                body: "Every keystroke commits to IndexedDB. Closing the tab, losing signal, running out of battery — none of it loses a character.",
              },
              {
                icon: CloudUpload,
                color: 'text-emerald-400',
                bg: 'bg-emerald-950/40 border-emerald-900/50',
                title: 'Background auto-sync',
                body: "The moment Wi-Fi or cellular returns, queued responses upload themselves — idempotent UUIDs prevent any duplicate rows.",
              },
            ].map(({ icon: Icon, color, bg, title, body }) => (
              <div
                key={title}
                className={`rounded-2xl p-6 border ${bg} backdrop-blur-sm`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-white/[0.05] border border-white/[0.08]`}>
                  <Icon className={`w-5 h-5 ${color}`} strokeWidth={2} />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] py-6 px-5 text-center text-xs text-slate-600">
        QR Survey Platform · Next.js 14 · Prisma SQLite · Dexie.js IndexedDB
      </footer>
    </div>
  );
}
