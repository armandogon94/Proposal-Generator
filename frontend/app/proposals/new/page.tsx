"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { clientsAPI, templatesAPI, proposalsAPI } from "@/lib/api";
import type { ClientListItem, Template } from "@/lib/types";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  User,
  FileText,
  DollarSign,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";

interface PricingLineItem {
  name: string;
  item_type: string;
  quantity: number;
  unit_price: number;
}

interface WizardData {
  // Step 1 — Client
  client_id: string;
  new_client: { name: string; email: string; company: string };
  create_new_client: boolean;
  // Step 2 — Project
  title: string;
  proposal_type: string;
  project_scope: string;
  template_id: string;
  // Step 3 — Pricing
  pricing_items: PricingLineItem[];
}

const steps = [
  { label: "Client", icon: User },
  { label: "Project Details", icon: FileText },
  { label: "Pricing", icon: DollarSign },
  { label: "Review", icon: ClipboardCheck },
];

const proposalTypes = [
  { value: "web_development", label: "Web Development" },
  { value: "ai_ml_consulting", label: "AI/ML Consulting" },
  { value: "custom", label: "Custom" },
];

const itemTypes = [
  { value: "package", label: "Package" },
  { value: "hourly", label: "Hourly" },
  { value: "fixed", label: "Fixed" },
  { value: "addon", label: "Add-on" },
];

const emptyLineItem: PricingLineItem = {
  name: "",
  item_type: "fixed",
  quantity: 1,
  unit_price: 0,
};

export default function NewProposalPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const [data, setData] = useState<WizardData>({
    client_id: "",
    new_client: { name: "", email: "", company: "" },
    create_new_client: false,
    title: "",
    proposal_type: "web_development",
    project_scope: "",
    template_id: "",
    pricing_items: [{ ...emptyLineItem }],
  });

  useEffect(() => {
    async function load() {
      try {
        const [c, t] = await Promise.all([
          clientsAPI.list(),
          templatesAPI.list(),
        ]);
        setClients(c);
        setTemplates(t);
      } catch {
        // API not available
      } finally {
        setLoadingClients(false);
      }
    }
    load();
  }, []);

  function update(patch: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function updateLineItem(index: number, patch: Partial<PricingLineItem>) {
    setData((prev) => {
      const items = [...prev.pricing_items];
      items[index] = { ...items[index], ...patch };
      return { ...prev, pricing_items: items };
    });
  }

  function addLineItem() {
    setData((prev) => ({
      ...prev,
      pricing_items: [...prev.pricing_items, { ...emptyLineItem }],
    }));
  }

  function removeLineItem(index: number) {
    setData((prev) => ({
      ...prev,
      pricing_items: prev.pricing_items.filter((_, i) => i !== index),
    }));
  }

  const runningTotal = data.pricing_items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  function canProceed(): boolean {
    switch (step) {
      case 0:
        if (data.create_new_client) {
          return !!data.new_client.name && !!data.new_client.email;
        }
        return !!data.client_id;
      case 1:
        return !!data.title && !!data.proposal_type;
      case 2:
        return data.pricing_items.some((item) => item.name && item.unit_price > 0);
      case 3:
        return true;
      default:
        return false;
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      let clientId = data.client_id;

      if (data.create_new_client) {
        const newClient = await clientsAPI.create(data.new_client);
        clientId = newClient.id;
      }

      const pricingItems = data.pricing_items
        .filter((item) => item.name && item.unit_price > 0)
        .map((item, index) => ({
          name: item.name,
          item_type: item.item_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
          description: null,
          category: null,
          is_optional: false,
          is_selected: true,
          order_index: index,
        }));

      const proposal = await proposalsAPI.create({
        client_id: clientId,
        template_id: data.template_id || null,
        title: data.title,
        proposal_type: data.proposal_type,
        project_scope: data.project_scope || null,
        pricing_items: pricingItems,
      });

      toast.success("Proposal created successfully");
      router.push(`/proposals/${proposal.id}`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to create proposal"
      );
      setSubmitting(false);
    }
  }

  const selectedClient = clients.find((c) => c.id === data.client_id);
  const selectedTemplate = templates.find((t) => t.id === data.template_id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Proposal</h1>
        <p className="text-sm text-gray-500">
          Create a new proposal in a few steps
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isCompleted = i < step;
          return (
            <div key={s.label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                    isCompleted
                      ? "border-blue-800 bg-blue-800 text-white"
                      : isActive
                        ? "border-blue-800 bg-white text-blue-800"
                        : "border-gray-300 bg-white text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isActive || isCompleted
                      ? "text-blue-800"
                      : "text-gray-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`mx-2 h-px flex-1 ${
                    i < step ? "bg-blue-800" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 1: Client */}
          {step === 0 && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle>Select or Create a Client</CardTitle>
              </CardHeader>

              <div className="flex gap-4">
                <Button
                  variant={!data.create_new_client ? "default" : "outline"}
                  className={!data.create_new_client ? "bg-blue-800 hover:bg-blue-900" : ""}
                  onClick={() => update({ create_new_client: false })}
                >
                  Existing Client
                </Button>
                <Button
                  variant={data.create_new_client ? "default" : "outline"}
                  className={data.create_new_client ? "bg-blue-800 hover:bg-blue-900" : ""}
                  onClick={() => update({ create_new_client: true })}
                >
                  New Client
                </Button>
              </div>

              {!data.create_new_client ? (
                <div className="space-y-2">
                  <Label>Client</Label>
                  {loadingClients ? (
                    <div className="h-8 animate-pulse rounded-lg bg-gray-100" />
                  ) : (
                    <Select
                      value={data.client_id}
                      onValueChange={(val) => update({ client_id: val ?? "" })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                            {c.company ? ` (${c.company})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={data.new_client.name}
                      onChange={(e) =>
                        update({
                          new_client: {
                            ...data.new_client,
                            name: e.target.value,
                          },
                        })
                      }
                      placeholder="Client name"
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={data.new_client.email}
                      onChange={(e) =>
                        update({
                          new_client: {
                            ...data.new_client,
                            email: e.target.value,
                          },
                        })
                      }
                      placeholder="client@example.com"
                    />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input
                      value={data.new_client.company}
                      onChange={(e) =>
                        update({
                          new_client: {
                            ...data.new_client,
                            company: e.target.value,
                          },
                        })
                      }
                      placeholder="Company name"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Project Details */}
          {step === 1 && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle>Project Details</CardTitle>
              </CardHeader>

              <div>
                <Label>Title *</Label>
                <Input
                  value={data.title}
                  onChange={(e) => update({ title: e.target.value })}
                  placeholder="Proposal title"
                />
              </div>

              <div>
                <Label>Proposal Type *</Label>
                <Select
                  value={data.proposal_type}
                  onValueChange={(val) => update({ proposal_type: val ?? "web_development" })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {proposalTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Project Scope</Label>
                <Textarea
                  value={data.project_scope}
                  onChange={(e) => update({ project_scope: e.target.value })}
                  placeholder="Describe the project scope, goals, and deliverables..."
                  rows={5}
                />
              </div>

              <div>
                <Label>Template (optional)</Label>
                <Select
                  value={data.template_id}
                  onValueChange={(val) =>
                    update({ template_id: val === "none" || val === null ? "" : val })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Pricing */}
          {step === 2 && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle>Pricing</CardTitle>
              </CardHeader>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-32">Unit Price</TableHead>
                    <TableHead className="w-32 text-right">Total</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pricing_items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={item.name}
                          onChange={(e) =>
                            updateLineItem(index, { name: e.target.value })
                          }
                          placeholder="Item name"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.item_type}
                          onValueChange={(val) =>
                            updateLineItem(index, { item_type: val ?? "fixed" })
                          }
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {itemTypes.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(index, {
                              quantity: Number(e.target.value) || 1,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unit_price}
                          onChange={(e) =>
                            updateLineItem(index, {
                              unit_price: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(item.quantity * item.unit_price).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {data.pricing_items.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeLineItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-semibold">
                      Total
                    </TableCell>
                    <TableCell className="text-right text-lg font-bold">
                      ${runningTotal.toLocaleString()}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>

              <Button variant="outline" onClick={addLineItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Line Item
              </Button>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 3 && (
            <div className="space-y-5">
              <CardHeader className="p-0">
                <CardTitle>Review Proposal</CardTitle>
              </CardHeader>

              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Client
                </h3>
                {data.create_new_client ? (
                  <div className="text-sm">
                    <p className="font-medium">{data.new_client.name}</p>
                    <p className="text-gray-500">{data.new_client.email}</p>
                    {data.new_client.company && (
                      <p className="text-gray-500">{data.new_client.company}</p>
                    )}
                    <p className="mt-1 text-xs text-blue-600">
                      New client will be created
                    </p>
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="font-medium">
                      {selectedClient?.name ?? "Unknown"}
                    </p>
                    <p className="text-gray-500">{selectedClient?.email}</p>
                    {selectedClient?.company && (
                      <p className="text-gray-500">{selectedClient.company}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Project
                </h3>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="font-medium">Title:</span> {data.title}
                  </p>
                  <p>
                    <span className="font-medium">Type:</span>{" "}
                    {proposalTypes.find((t) => t.value === data.proposal_type)
                      ?.label ?? data.proposal_type}
                  </p>
                  {data.project_scope && (
                    <p>
                      <span className="font-medium">Scope:</span>{" "}
                      {data.project_scope}
                    </p>
                  )}
                  {selectedTemplate && (
                    <p>
                      <span className="font-medium">Template:</span>{" "}
                      {selectedTemplate.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Pricing
                </h3>
                <div className="space-y-1 text-sm">
                  {data.pricing_items
                    .filter((item) => item.name)
                    .map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <span>
                          {item.name}{" "}
                          <span className="text-gray-400">
                            ({item.item_type}) x{item.quantity}
                          </span>
                        </span>
                        <span className="font-medium">
                          $
                          {(item.quantity * item.unit_price).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  <Separator />
                  <div className="flex items-center justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>${runningTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {step < steps.length - 1 ? (
          <Button
            className="bg-blue-800 hover:bg-blue-900"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="bg-blue-800 hover:bg-blue-900"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create Proposal"}
            {!submitting && <Check className="ml-2 h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
