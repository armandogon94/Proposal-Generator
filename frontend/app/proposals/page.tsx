"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { proposalsAPI } from "@/lib/api";
import type { ProposalListItem } from "@/lib/types";
import { Plus, FileText } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  viewed: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-500",
};

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

const typeLabels: Record<string, string> = {
  web_development: "Web Development",
  ai_ml_consulting: "AI/ML Consulting",
  custom: "Custom",
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const filters =
          statusFilter !== "all" ? { status: statusFilter } : undefined;
        const data = await proposalsAPI.list(filters);
        setProposals(data);
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [statusFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-10 w-48" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
        <Link href="/proposals/new">
          <Button className="bg-blue-800 hover:bg-blue-900">
            <Plus className="mr-2 h-4 w-4" />
            New Proposal
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <Select
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val ?? "all")}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {proposals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-lg font-medium text-gray-600">
              No proposals found
            </p>
            <p className="mt-1 text-sm">
              {statusFilter !== "all"
                ? "Try a different filter or create a new proposal."
                : "Create your first proposal to get started."}
            </p>
            <Link href="/proposals/new">
              <Button variant="link" className="mt-2 text-blue-800">
                Create a proposal
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proposal #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        href={`/proposals/${p.id}`}
                        className="font-mono text-sm text-blue-800 hover:underline"
                      >
                        {p.proposal_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/proposals/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {p.client_name ?? "No client"}
                      {p.client_company && (
                        <span className="ml-1 text-gray-400">
                          ({p.client_company})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusColors[p.status] ?? ""}
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {typeLabels[p.proposal_type] ?? p.proposal_type}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${p.final_amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
