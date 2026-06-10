"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import apiClient from "@/lib/api";
import type { BaseResponse } from "@/types/api";

interface UserStats {
  total: number;
  today: number;
}

interface ArticleStats {
  total: number;
  today: number;
  pending: number;
}

interface StatsData {
  users: UserStats;
  articles: ArticleStats;
  vehicles: { total: number };
  pending_mod: number;
  illegal_mod: number;
}

interface TrendItem {
  date: string;
  articles: number;
}

interface AuditLogItem {
  id: string;
  action: string | null;
  resource: string | null;
  detail: Record<string, unknown> | null;
  created_at: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE_ARTICLE: "创建文章",
  PUBLISH_ARTICLE: "发布文章",
  REJECT_ARTICLE: "驳回文章",
  DELETE_ARTICLE: "删除文章",
  UPDATE_ARTICLE: "编辑文章",
  PUBLISH_MOD: "通过改装方案",
  REJECT_MOD: "驳回改装方案",
  SUBMIT_MOD: "提交改装方案",
  CREATE_BRAND: "创建品牌",
  UPDATE_BRAND: "编辑品牌",
  CREATE_SERIES: "创建车系",
  CREATE_SKU: "创建车型",
  UPDATE_SKU: "编辑车型",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, trendsRes, logsRes] = await Promise.all([
          apiClient.get<BaseResponse<StatsData>>("/admin/stats"),
          apiClient.get<BaseResponse<TrendItem[]>>("/admin/trends"),
          apiClient.get<BaseResponse<AuditLogItem[]>>("/admin/audit-logs"),
        ]);
        setStats(statsRes.data.data || null);
        setTrends(trendsRes.data.data || []);
        setLogs(logsRes.data.data || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function getActionLabel(action: string | null): string {
    if (!action) return "未知操作";
    return ACTION_LABELS[action] || action;
  }

  function timeAgo(dateStr: string | null): string {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "刚刚";
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">控制台</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="用户总数"
          value={stats?.users.total ?? 0}
          sub={`今日新增 ${stats?.users.today ?? 0}`}
          color="blue"
        />
        <StatCard
          title="文章总数"
          value={stats?.articles.total ?? 0}
          sub={`今日发布 ${stats?.articles.today ?? 0}`}
          color="green"
        />
        <StatCard
          title="车型总数"
          value={stats?.vehicles.total ?? 0}
          color="purple"
        />
        <StatCard
          title="待处理"
          value={(stats?.articles.pending ?? 0) + (stats?.pending_mod ?? 0)}
          sub={`待审核文章 ${stats?.articles.pending ?? 0} · 待审核改装 ${stats?.pending_mod ?? 0}`}
          color="orange"
        />
      </div>

      {/* Pending & Alerts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pending Items */}
        <div className="rounded-xl border border-border p-5">
          <h2 className="mb-4 text-lg font-bold">待处理事项</h2>
          <div className="space-y-3">
            <Link
              href="/admin/content"
              className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-primary hover:bg-background transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">📝</span>
                <span className="text-sm">待审核文章</span>
              </div>
              <span className="rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-bold text-warning">
                {stats?.articles.pending ?? 0}
              </span>
            </Link>
            <Link
              href="/admin/mod"
              className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-primary hover:bg-background transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🔧</span>
                <span className="text-sm">待审核改装方案</span>
              </div>
              <span className="rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-bold text-warning">
                {stats?.pending_mod ?? 0}
              </span>
            </Link>
            {(stats?.illegal_mod ?? 0) > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-danger/40 bg-danger/5 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <span className="text-sm text-danger font-medium">违法改装方案</span>
                </div>
                <span className="rounded-full bg-danger/20 px-2.5 py-0.5 text-xs font-bold text-danger">
                  {stats?.illegal_mod}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content Trend Chart */}
        <div className="rounded-xl border border-border p-5">
          <h2 className="mb-4 text-lg font-bold">7 天内容趋势</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--color-muted)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--color-muted)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="articles"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="文章发布数"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="rounded-xl border border-border p-5">
        <h2 className="mb-4 text-lg font-bold">最近操作日志</h2>
        {logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">暂无操作日志</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="pb-2 font-medium">操作</th>
                  <th className="pb-2 font-medium">资源</th>
                  <th className="pb-2 font-medium hidden sm:table-cell">详情</th>
                  <th className="pb-2 font-medium text-right">时间</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/50">
                    <td className="py-2.5 pr-3">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-muted">{log.resource || "-"}</td>
                    <td className="py-2.5 pr-3 text-xs text-muted hidden sm:table-cell max-w-[200px] truncate">
                      {log.detail ? JSON.stringify(log.detail).slice(0, 60) : "-"}
                    </td>
                    <td className="py-2.5 text-right text-xs text-muted">
                      {timeAgo(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  color,
}: {
  title: string;
  value: number;
  sub?: string;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colorMap = {
    blue: "border-l-primary bg-primary/[0.03]",
    green: "border-l-green-500 bg-green-50 dark:bg-green-950/20",
    purple: "border-l-purple-500 bg-purple-50 dark:bg-purple-950/20",
    orange: "border-l-warning bg-warning/[0.05]",
  };

  return (
    <div className={`rounded-xl border border-border border-l-4 p-4 ${colorMap[color]}`}>
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-1 text-3xl font-bold">{value.toLocaleString()}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}