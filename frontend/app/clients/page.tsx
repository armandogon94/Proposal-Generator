"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { clientsAPI } from "@/lib/api";
import type { ClientListItem } from "@/lib/types";
import { Plus, Search, Users, Mail, Building } from "lucide-react";
import { toast } from "sonner";

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", company: "", phone: "" });

  async function loadClients() {
    try {
      const data = await clientsAPI.list(search || undefined);
      setClients(data);
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadClients(); }, [search]);

  async function handleCreate() {
    try {
      await clientsAPI.create(newClient);
      toast.success("Client created");
      setDialogOpen(false);
      setNewClient({ name: "", email: "", company: "", phone: "" });
      loadClients();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create client");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button className="bg-blue-800 hover:bg-blue-900">
              <Plus className="mr-2 h-4 w-4" /> New Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
              </div>
              <div>
                <Label>Company</Label>
                <Input value={newClient.company} onChange={(e) => setNewClient({ ...newClient, company: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
              </div>
              <Button onClick={handleCreate} className="w-full bg-blue-800 hover:bg-blue-900"
                disabled={!newClient.name || !newClient.email}>
                Create Client
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input className="pl-10" placeholder="Search clients..." value={search}
          onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p>No clients yet. Add your first client to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="transition-colors hover:bg-gray-50 cursor-pointer">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{client.name}</span>
                      {client.company && (
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <Building className="h-3 w-3" /> {client.company}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {client.email}
                      </span>
                      {client.phone && <span>{client.phone}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{client.proposal_count} proposals</Badge>
                    {client.last_proposal_date && (
                      <p className="mt-1 text-xs text-gray-400">
                        Last: {new Date(client.last_proposal_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
