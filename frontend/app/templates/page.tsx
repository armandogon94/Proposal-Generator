"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { templatesAPI } from "@/lib/api";
import type { Template } from "@/lib/types";
import { Plus, BookTemplate, Trash2 } from "lucide-react";
import { toast } from "sonner";

const typeLabels: Record<string, string> = {
  web_development: "Web Development",
  ai_ml_consulting: "AI/ML Consulting",
  custom: "Custom",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    proposal_type: "web_development",
    description: "",
    default_payment_terms: "Net 30",
    default_terms: "",
  });

  async function loadTemplates() {
    try {
      setTemplates(await templatesAPI.list());
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTemplates(); }, []);

  async function handleCreate() {
    try {
      await templatesAPI.create(form);
      toast.success("Template created");
      setDialogOpen(false);
      setForm({ name: "", proposal_type: "web_development", description: "", default_payment_terms: "Net 30", default_terms: "" });
      loadTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create template");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      await templatesAPI.delete(id);
      toast.success("Template deleted");
      loadTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button className="bg-blue-800 hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" /> New Template</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div>
                <Label>Type *</Label>
                <select className="flex h-10 w-full rounded-md border px-3 py-2 text-sm" value={form.proposal_type}
                  onChange={(e) => setForm({ ...form, proposal_type: e.target.value })}>
                  <option value="web_development">Web Development</option>
                  <option value="ai_ml_consulting">AI/ML Consulting</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Payment Terms</Label><Input value={form.default_payment_terms} onChange={(e) => setForm({ ...form, default_payment_terms: e.target.value })} /></div>
              <div><Label>Default Terms & Conditions</Label><Textarea value={form.default_terms} onChange={(e) => setForm({ ...form, default_terms: e.target.value })} rows={4} /></div>
              <Button onClick={handleCreate} className="w-full bg-blue-800 hover:bg-blue-900" disabled={!form.name}>Create Template</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <BookTemplate className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p>No templates yet. Create one to speed up proposal creation.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant="secondary" className="mt-1">{typeLabels[t.proposal_type] ?? t.proposal_type}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </CardHeader>
              <CardContent>
                {t.description && <p className="text-sm text-gray-500">{t.description}</p>}
                <p className="mt-2 text-xs text-gray-400">Payment: {t.default_payment_terms ?? "Not set"}</p>
                {t.is_default && <Badge className="mt-2 bg-blue-100 text-blue-800">Default</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
