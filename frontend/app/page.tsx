"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardAPI } from "@/lib/api";
import type { DashboardStats, ProposalListItem } from "@/lib/types";
import {
  FileText,
  Send,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Plus,
} from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  viewed: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-500",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, recentData] = await Promise.all([
          dashboardAPI.stats(),
          dashboardAPI.recentProposals(),
        ]);
        setStats(statsData);
        setRecent(recentData);
      } catch {
        // API not available yet
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back, Armando</p>
        </div>
        <Link href="/proposals/new">
          <Button className="bg-blue-800 hover:bg-blue-900">
            <Plus className="mr-2 h-4 w-4" />
            New Proposal
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Proposals</CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_proposals ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Response</CardTitle>
            <Send className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sent_count ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.accepted_count ?? 0}</div>
            <p className="text-xs text-gray-500">{stats?.acceptance_rate ?? 0}% rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats?.total_pipeline_value ?? 0).toLocaleString()}</div>
            <p className="text-xs text-gray-500">Avg ${(stats?.avg_proposal_value ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Proposals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Proposals</CardTitle>
          <Link href="/proposals">
            <Button variant="ghost" size="sm">
              View all <TrendingUp className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p>No proposals yet.</p>
              <Link href="/proposals/new">
                <Button variant="link" className="text-blue-800">Create your first proposal</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((p) => (
                <Link key={p.id} href={`/proposals/${p.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.title}</span>
                      <Badge variant="secondary" className={statusColors[p.status] ?? ""}>{p.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">{p.proposal_number} &mdash; {p.client_name ?? "No client"}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${p.final_amount.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">{new Date(p.updated_at).toLocaleDateString()}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
