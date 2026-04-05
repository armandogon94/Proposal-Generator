"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { clientsAPI, proposalsAPI } from "@/lib/api";
import type { Client, ProposalListItem } from "@/lib/types";
import { ArrowLeft, Edit2, Save, Plus, FileText } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  viewed: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-500",
};

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [client, setClient] = useState<Client | null>(null);
  const [proposals, setProposals] = useState<ProposalListItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Client>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [clientData, proposalData] = await Promise.all([
          clientsAPI.get(clientId),
          proposalsAPI.list({ client_id: clientId }),
        ]);
        setClient(clientData);
        setForm(clientData);
        setProposals(proposalData);
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientId]);

  async function handleSave() {
    try {
      const updated = await clientsAPI.update(clientId, form);
      setClient(updated);
      setEditing(false);
      toast.success("Client updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-48" /><Skeleton className="h-64" /></div>;
  if (!client) return <p>Client not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/clients"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button></Link>
        <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Client Info */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Client Info</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
              {editing ? "Cancel" : <><Edit2 className="mr-1 h-4 w-4" /> Edit</>}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Company</Label><Input value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Industry</Label><Input value={form.industry ?? ""} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></div>
                <div><Label>Website</Label><Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
                <div><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button onClick={handleSave} className="w-full bg-blue-800 hover:bg-blue-900"><Save className="mr-2 h-4 w-4" /> Save</Button>
              </>
            ) : (
              <dl className="space-y-3 text-sm">
                <div><dt className="text-gray-500">Email</dt><dd>{client.email}</dd></div>
                {client.company && <div><dt className="text-gray-500">Company</dt><dd>{client.company}</dd></div>}
                {client.phone && <div><dt className="text-gray-500">Phone</dt><dd>{client.phone}</dd></div>}
                {client.industry && <div><dt className="text-gray-500">Industry</dt><dd>{client.industry}</dd></div>}
                {client.website && <div><dt className="text-gray-500">Website</dt><dd>{client.website}</dd></div>}
                {client.address && <div><dt className="text-gray-500">Address</dt><dd>{client.address}{client.city && `, ${client.city}`}{client.state && `, ${client.state}`}</dd></div>}
                {client.notes && <><Separator /><div><dt className="text-gray-500">Notes</dt><dd className="whitespace-pre-wrap">{client.notes}</dd></div></>}
              </dl>
            )}
          </CardContent>
        </Card>

        {/* Proposals */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Proposals ({proposals.length})</CardTitle>
            <Link href={`/proposals/new?client_id=${clientId}`}>
              <Button size="sm" className="bg-blue-800 hover:bg-blue-900"><Plus className="mr-1 h-4 w-4" /> New Proposal</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {proposals.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p>No proposals for this client yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {proposals.map((p) => (
                  <Link key={p.id} href={`/proposals/${p.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.title}</span>
                        <Badge variant="secondary" className={statusColors[p.status]}>{p.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-500">{p.proposal_number} &middot; {p.proposal_type}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${p.final_amount.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString()}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
