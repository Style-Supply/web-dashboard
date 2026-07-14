'use client';

import { useCallback, useEffect, useState } from 'react';
import { request } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemStats {
  timestamp: string;
  server: {
    status: string;
    uptime: string;
    uptimeSeconds: number;
    startedAt: string;
    nodeVersion: string;
    platform: string;
    arch: string;
    hostname: string;
    environment: string;
  };
  memory: {
    process: {
      heapUsed: string;
      heapTotal: string;
      rss: string;
      external: string;
      heapUsagePercent: number;
    };
    system: {
      total: string;
      free: string;
      used: string;
      usagePercent: number;
    };
  };
  cpu: {
    cores: number;
    model: string;
    speedMhz: number;
    loadAvg: { '1m': number; '5m': number; '15m': number };
  };
  database: {
    provider: string;
    region: string;
    url: string;
    connected: boolean;
    latencyMs: number | null;
    error: string | null;
    serverTime: string | null;
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GaugeMeter({ percent, label, color = '#7A021D' }: { percent: number; label: string; color?: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(percent, 100) / 100);
  const hue = percent < 60 ? '#10b981' : percent < 80 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle
            cx="44" cy="44" r={r} fill="none"
            stroke={hue}
            strokeWidth="8"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-neutral-800">{percent}%</span>
        </div>
      </div>
      <p className="text-xs font-medium text-neutral-500">{label}</p>
    </div>
  );
}

function StatCard({ label, value, sub, icon, accent = false }: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 border ${accent ? 'bg-[#7A021D] border-[#960225] text-white' : 'bg-white border-neutral-100'}`}>
      <div className={`flex items-center gap-2 mb-3 ${accent ? 'text-red-200' : 'text-neutral-400'}`}>
        {icon}
        <span className={`text-xs font-semibold uppercase tracking-wider ${accent ? 'text-red-200' : 'text-neutral-400'}`}>{label}</span>
      </div>
      <p className={`text-2xl font-bold tracking-tight ${accent ? 'text-white' : 'text-neutral-900'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-red-200' : 'text-neutral-400'}`}>{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-neutral-800">{title}</h2>
      <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>
    </div>
  );
}

function Row({ label, value, mono = false, badge }: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: 'green' | 'red' | 'amber';
}) {
  const badgeColor = {
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-neutral-50 last:border-0">
      <span className="text-sm text-neutral-500">{label}</span>
      {badge ? (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeColor[badge]}`}>{value}</span>
      ) : (
        <span className={`text-sm font-semibold text-neutral-800 ${mono ? 'font-mono' : ''}`}>{value}</span>
      )}
    </div>
  );
}

function LoadBar({ label, value, max = 1 }: { label: string; value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct < 50 ? 'bg-emerald-400' : pct < 80 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-neutral-500 w-6 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-neutral-600 w-8 text-right">{value.toFixed(2)}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await request<SystemStats>('/api/admin/system');
      setStats(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => { void load(); }, 15000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  return (
    <div className="p-6 lg:p-8 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            Live server diagnostics and database connection status
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setAutoRefresh(a => !a)}
              className={`relative w-9 h-5 rounded-full transition-colors ${autoRefresh ? 'bg-[#7A021D]' : 'bg-neutral-200'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoRefresh ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-neutral-500 font-medium">Auto-refresh 15s</span>
          </label>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Last refresh */}
      {lastRefresh && (
        <p className="text-xs text-neutral-400 -mt-5 mb-6">
          Last updated: {lastRefresh.toLocaleTimeString('en-IN')}
        </p>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-700 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-neutral-100 rounded-2xl" />
          ))}
        </div>
      ) : stats && (
        <div className="space-y-8">

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              accent
              label="Server"
              value={stats.server.status === 'running' ? '● Online' : '○ Offline'}
              sub={`Up for ${stats.server.uptime}`}
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M12 5l7 7-7 7" /></svg>}
            />
            <StatCard
              label="Database"
              value={stats.database.connected ? '● Connected' : '● Disconnected'}
              sub={stats.database.latencyMs != null ? `${stats.database.latencyMs}ms latency` : 'No connection'}
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7c0-1.657 3.582-3 8-3s8 1.343 8 3M4 7v10c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3" /></svg>}
            />
            <StatCard
              label="Node.js"
              value={stats.server.nodeVersion}
              sub={`${stats.server.platform} · ${stats.server.arch}`}
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>}
            />
            <StatCard
              label="Environment"
              value={stats.server.environment.toUpperCase()}
              sub={stats.server.hostname}
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
          </div>

          {/* ── Memory ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-neutral-100 p-6">
              <SectionHeader title="Memory Usage" subtitle="Process heap and system RAM" />
              <div className="flex items-center justify-around mb-6">
                <GaugeMeter percent={stats.memory.process.heapUsagePercent} label="Heap" />
                <GaugeMeter percent={stats.memory.system.usagePercent} label="System RAM" />
              </div>
              <div className="space-y-0">
                <Row label="Heap Used" value={stats.memory.process.heapUsed} />
                <Row label="Heap Total" value={stats.memory.process.heapTotal} />
                <Row label="RSS (total process)" value={stats.memory.process.rss} />
                <Row label="External" value={stats.memory.process.external} />
                <div className="mt-3 pt-3 border-t border-neutral-50">
                  <Row label="System Total" value={stats.memory.system.total} />
                  <Row label="System Used" value={stats.memory.system.used} />
                  <Row label="System Free" value={stats.memory.system.free} />
                </div>
              </div>
            </div>

            {/* ── CPU ── */}
            <div className="bg-white rounded-2xl border border-neutral-100 p-6">
              <SectionHeader title="CPU" subtitle="Cores and load averages" />
              <div className="grid grid-cols-3 gap-3 mb-6">
                {(['1m', '5m', '15m'] as const).map(period => (
                  <div key={period} className="text-center bg-neutral-50 rounded-xl p-3">
                    <p className="text-xl font-bold text-neutral-900">{stats.cpu.loadAvg[period]}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{period} avg</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2.5 mb-5">
                <LoadBar label="1m" value={stats.cpu.loadAvg['1m']} max={stats.cpu.cores} />
                <LoadBar label="5m" value={stats.cpu.loadAvg['5m']} max={stats.cpu.cores} />
                <LoadBar label="15m" value={stats.cpu.loadAvg['15m']} max={stats.cpu.cores} />
              </div>
              <div className="space-y-0">
                <Row label="CPU Cores" value={String(stats.cpu.cores)} />
                <Row label="Speed" value={`${stats.cpu.speedMhz} MHz`} />
                <Row label="Model" value={stats.cpu.model.split('@')[0].trim()} />
              </div>
            </div>
          </div>

          {/* ── Database ── */}
          <div className="bg-white rounded-2xl border border-neutral-100 p-6">
            <SectionHeader title="Database Connection" subtitle="Supabase PostgreSQL status and details" />

            {/* Live status banner */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-5 ${
              stats.database.connected
                ? 'bg-emerald-50 border border-emerald-100'
                : 'bg-red-50 border border-red-100'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${stats.database.connected ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
              <div>
                <p className={`text-sm font-semibold ${stats.database.connected ? 'text-emerald-700' : 'text-red-700'}`}>
                  {stats.database.connected ? 'Connected — database is healthy' : 'Disconnected — check credentials'}
                </p>
                {stats.database.error && (
                  <p className="text-xs text-red-500 mt-0.5">{stats.database.error}</p>
                )}
              </div>
              {stats.database.latencyMs != null && (
                <span className={`ml-auto text-sm font-bold tabular-nums ${
                  stats.database.latencyMs < 100 ? 'text-emerald-600' :
                  stats.database.latencyMs < 300 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {stats.database.latencyMs}ms
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <Row label="Provider" value={stats.database.provider} />
                <Row label="Region / Project" value={stats.database.region} mono />
                <Row label="Endpoint" value={stats.database.url} mono />
              </div>
              <div>
                <Row
                  label="Connection"
                  value={stats.database.connected ? 'Connected' : 'Failed'}
                  badge={stats.database.connected ? 'green' : 'red'}
                />
                <Row
                  label="Latency"
                  value={stats.database.latencyMs != null ? `${stats.database.latencyMs}ms` : '—'}
                  badge={
                    stats.database.latencyMs == null ? undefined :
                    stats.database.latencyMs < 100 ? 'green' :
                    stats.database.latencyMs < 300 ? 'amber' : 'red'
                  }
                />
                <Row label="Server Time" value={stats.database.serverTime ? new Date(stats.database.serverTime).toLocaleString('en-IN') : '—'} />
              </div>
            </div>
          </div>

          {/* ── Server Info ── */}
          <div className="bg-white rounded-2xl border border-neutral-100 p-6">
            <SectionHeader title="Server Info" subtitle="Runtime and deployment details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <Row label="Status" value="Running" badge="green" />
                <Row label="Uptime" value={stats.server.uptime} />
                <Row label="Started At" value={new Date(stats.server.startedAt).toLocaleString('en-IN')} />
                <Row label="Environment" value={stats.server.environment} badge={stats.server.environment === 'production' ? 'red' : 'amber'} />
              </div>
              <div>
                <Row label="Node.js" value={stats.server.nodeVersion} mono />
                <Row label="Platform" value={stats.server.platform} />
                <Row label="Architecture" value={stats.server.arch} />
                <Row label="Hostname" value={stats.server.hostname} mono />
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
