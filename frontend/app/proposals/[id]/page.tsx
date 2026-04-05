"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { proposalsAPI } from "@/lib/api";
import type { Proposal, ProposalSection, RefinementResponse } from "@/lib/types";
import {
  FileText,
  Send,
  Download,
  Sparkles,
  Pencil,
  Save,
  X,
  MessageSquare,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  viewed: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-500",
};

interface ConversationMessage {
  id: string;
  user_message: string;
  ai_response: string;
  section_modified: string | null;
  created_at: string;
}

export default function ProposalEditorPage() {
  const params = useParams();
  const id = params.id as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingSection, setSavingSection] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingDiagrams, setGeneratingDiagrams] = useState(false);
  const [sending, setSending] = useState(false);

  // Chat refinement
  const [chatMessage, setChatMessage] = useState("");
  const [chatSection, setChatSection] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationMessage[]>([]);
  const [coherenceWarning, setCoherenceWarning] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll tracking for sidebar highlight
  const [activeSection, setActiveSection] = useState<string>("");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    async function load() {
      try {
        const [p, convos] = await Promise.all([
          proposalsAPI.get(id),
          proposalsAPI.conversations(id).catch(() => []),
        ]);
        setProposal(p);
        setConversations(convos);
        if (p.sections.length > 0) {
          setActiveSection(p.sections[0].section_type);
        }
      } catch {
        toast.error("Failed to load proposal");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations]);

  function scrollToSection(sectionType: string) {
    const el = sectionRefs.current[sectionType];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(sectionType);
    }
  }

  function startEdit(section: ProposalSection) {
    setEditingSection(section.section_type);
    setEditContent(section.content);
  }

  function cancelEdit() {
    setEditingSection(null);
    setEditContent("");
  }

  async function saveSection(sectionType: string) {
    if (!proposal) return;
    setSavingSection(true);
    try {
      await proposalsAPI.updateSection(proposal.id, sectionType, editContent);
      setProposal((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map((s) =>
            s.section_type === sectionType
              ? { ...s, content: editContent, updated_at: new Date().toISOString() }
              : s
          ),
        };
      });
      setEditingSection(null);
      setEditContent("");
      toast.success("Section saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save section");
    } finally {
      setSavingSection(false);
    }
  }

  async function handleGenerateDraft() {
    if (!proposal) return;
    setGenerating(true);
    try {
      const url = proposalsAPI.generateDraft(proposal.id);
      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === "completed") {
            eventSource.close();
            proposalsAPI.get(id).then((p) => {
              setProposal(p);
              setGenerating(false);
              toast.success("Draft generated successfully");
            });
          }
        } catch {
          // partial data
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        // Attempt to reload in case generation succeeded
        proposalsAPI
          .get(id)
          .then((p) => {
            setProposal(p);
            toast.success("Draft generated");
          })
          .catch(() => {
            toast.error("Draft generation failed");
          })
          .finally(() => setGenerating(false));
      };
    } catch {
      toast.error("Failed to start draft generation");
      setGenerating(false);
    }
  }

  async function handleGenerateDiagrams() {
    if (!proposal) return;
    setGeneratingDiagrams(true);
    try {
      const result = await proposalsAPI.generateDiagrams(proposal.id);
      const updated = await proposalsAPI.get(id);
      setProposal(updated);
      toast.success(`Generated ${result.generated} diagram(s)`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to generate diagrams"
      );
    } finally {
      setGeneratingDiagrams(false);
    }
  }

  async function handleSend() {
    if (!proposal) return;
    setSending(true);
    try {
      await proposalsAPI.send(proposal.id);
      const updated = await proposalsAPI.get(id);
      setProposal(updated);
      toast.success("Proposal sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send proposal");
    } finally {
      setSending(false);
    }
  }

  async function handleChatSubmit() {
    if (!chatMessage.trim() || !proposal) return;
    setChatLoading(true);
    setCoherenceWarning(null);
    const message = chatMessage;
    setChatMessage("");
    try {
      const result: RefinementResponse = await proposalsAPI.refine(proposal.id, {
        message,
        section_type: chatSection || undefined,
      });

      // Update the modified section
      if (result.section_modified) {
        setProposal((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            sections: prev.sections.map((s) =>
              s.section_type === result.section_modified
                ? {
                    ...s,
                    content: result.refined_content,
                    updated_at: new Date().toISOString(),
                  }
                : s
            ),
          };
        });
      }

      if (result.coherence_warning) {
        setCoherenceWarning(result.coherence_warning);
      }

      // Add to conversations
      setConversations((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          user_message: message,
          ai_response: result.refined_content.slice(0, 200) + "...",
          section_modified: result.section_modified,
          created_at: new Date().toISOString(),
        },
      ]);

      toast.success(
        `Refined ${result.section_modified ?? "content"}`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refinement failed");
    } finally {
      setChatLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-[600px] w-64" />
          <Skeleton className="h-[600px] flex-1" />
          <Skeleton className="h-[600px] w-80" />
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="py-12 text-center text-gray-500">
        <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="text-lg font-medium">Proposal not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold truncate max-w-xs">
            {proposal.title}
          </h1>
          <Badge
            variant="secondary"
            className={statusColors[proposal.status] ?? ""}
          >
            {proposal.status}
          </Badge>
          <span className="text-sm text-gray-400 font-mono">
            {proposal.proposal_number}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleGenerateDraft}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {generating ? "Generating..." : "Generate Draft"}
          </Button>
          <Button
            variant="outline"
            onClick={handleGenerateDiagrams}
            disabled={generatingDiagrams}
          >
            {generatingDiagrams ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="mr-2 h-4 w-4" />
            )}
            {generatingDiagrams ? "Generating..." : "Generate Diagrams"}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(proposalsAPI.exportPDF(proposal.id), "_blank")}
          >
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(proposalsAPI.exportDOCX(proposal.id), "_blank")}
          >
            <Download className="mr-2 h-4 w-4" />
            Export DOCX
          </Button>
          <Button
            className="bg-blue-800 hover:bg-blue-900"
            onClick={handleSend}
            disabled={sending || proposal.status !== "draft"}
          >
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send
          </Button>
        </div>
      </div>

      {/* Three-column Layout */}
      <div className="flex gap-4 items-start">
        {/* Left Sidebar — Section Outline */}
        <Card className="w-64 shrink-0 sticky top-20">
          <CardHeader>
            <CardTitle className="text-sm">Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {proposal.sections.length === 0 ? (
              <p className="text-sm text-gray-400">
                No sections yet. Generate a draft to get started.
              </p>
            ) : (
              proposal.sections
                .sort((a, b) => a.order_index - b.order_index)
                .map((section) => (
                  <button
                    key={section.section_type}
                    onClick={() => scrollToSection(section.section_type)}
                    className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                      activeSection === section.section_type
                        ? "bg-blue-50 text-blue-800 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {section.title}
                  </button>
                ))
            )}
            {proposal.diagrams.length > 0 && (
              <>
                <Separator className="my-2" />
                <button
                  onClick={() => scrollToSection("__diagrams")}
                  className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                    activeSection === "__diagrams"
                      ? "bg-blue-50 text-blue-800 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Diagrams
                </button>
              </>
            )}
            <Separator className="my-2" />
            <button
              onClick={() => scrollToSection("__pricing")}
              className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                activeSection === "__pricing"
                  ? "bg-blue-50 text-blue-800 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Pricing
            </button>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {proposal.sections.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Sparkles className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-lg font-medium text-gray-600">
                  No content yet
                </p>
                <p className="mt-1 text-sm">
                  Click &quot;Generate Draft&quot; to create proposal content with AI.
                </p>
              </CardContent>
            </Card>
          )}

          {proposal.sections
            .sort((a, b) => a.order_index - b.order_index)
            .map((section) => (
              <Card
                key={section.section_type}
                ref={(el) => {
                  sectionRefs.current[section.section_type] = el;
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{section.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    {section.is_ai_generated && (
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="mr-1 h-3 w-3" />
                        AI
                      </Badge>
                    )}
                    {editingSection === section.section_type ? (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={cancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-blue-800 hover:bg-blue-900"
                          onClick={() => saveSection(section.section_type)}
                          disabled={savingSection}
                        >
                          {savingSection ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="mr-1 h-3 w-3" />
                          )}
                          Save
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => startEdit(section)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {editingSection === section.section_type ? (
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={12}
                      className="font-mono text-sm"
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
                      {section.content || (
                        <span className="italic text-gray-400">
                          No content
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

          {/* Diagrams Section */}
          {proposal.diagrams.length > 0 && (
            <Card
              ref={(el) => {
                sectionRefs.current["__diagrams"] = el;
              }}
            >
              <CardHeader>
                <CardTitle>Diagrams</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {proposal.diagrams.map((diagram) => (
                  <div key={diagram.id} className="space-y-2">
                    {diagram.title && (
                      <h4 className="text-sm font-medium text-gray-700">
                        {diagram.title}
                      </h4>
                    )}
                    {diagram.svg_output ? (
                      <div
                        className="overflow-x-auto rounded-lg border bg-white p-4"
                        dangerouslySetInnerHTML={{
                          __html: diagram.svg_output,
                        }}
                      />
                    ) : (
                      <pre className="overflow-x-auto rounded-lg border bg-gray-50 p-3 text-xs">
                        {diagram.mermaid_syntax}
                      </pre>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Pricing Table */}
          <Card
            ref={(el) => {
              sectionRefs.current["__pricing"] = el;
            }}
          >
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              {proposal.pricing_items.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No pricing items yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposal.pricing_items.map((item, i) => (
                      <TableRow key={item.id ?? i}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{item.name}</span>
                            {item.description && (
                              <p className="text-xs text-gray-400">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.item_type}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          ${item.unit_price.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${item.total_price.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-semibold">
                        Subtotal
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${proposal.total_amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                    {proposal.discount_percentage > 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-right text-red-600">
                          Discount ({proposal.discount_percentage}%)
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          -$
                          {(
                            proposal.total_amount - proposal.final_amount
                          ).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell colSpan={4} className="text-right text-lg font-bold">
                        Total
                      </TableCell>
                      <TableCell className="text-right text-lg font-bold">
                        ${proposal.final_amount.toLocaleString()}{" "}
                        <span className="text-sm font-normal text-gray-400">
                          {proposal.currency}
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar — Chat Refinement */}
        <Card className="w-80 shrink-0 sticky top-20 flex flex-col" style={{ maxHeight: "calc(100vh - 8rem)" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4" />
              Refinement Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
            {/* Conversation History */}
            <div className="flex-1 overflow-y-auto px-4 space-y-3">
              {conversations.length === 0 && (
                <p className="py-8 text-center text-xs text-gray-400">
                  Ask the AI to refine specific sections or improve the overall
                  proposal.
                </p>
              )}
              {conversations.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  <div className="flex justify-end">
                    <div className="rounded-lg bg-blue-800 px-3 py-2 text-xs text-white max-w-[85%]">
                      {msg.user_message}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700 max-w-[85%]">
                      {msg.ai_response}
                      {msg.section_modified && (
                        <p className="mt-1 text-[10px] text-blue-600">
                          Modified: {msg.section_modified}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-gray-100 px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Coherence Warning */}
            {coherenceWarning && (
              <div className="mx-4 mt-2 flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-800">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{coherenceWarning}</span>
              </div>
            )}

            {/* Chat Input */}
            <div className="border-t p-3 space-y-2">
              {proposal.sections.length > 0 && (
                <select
                  value={chatSection}
                  onChange={(e) => setChatSection(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs text-gray-600"
                >
                  <option value="">All sections</option>
                  {proposal.sections.map((s) => (
                    <option key={s.section_type} value={s.section_type}>
                      {s.title}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex gap-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Refine this section..."
                  className="text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSubmit();
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="bg-blue-800 hover:bg-blue-900 shrink-0"
                  onClick={handleChatSubmit}
                  disabled={chatLoading || !chatMessage.trim()}
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
