export interface Client {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string;
  website: string | null;
  industry: string | null;
  contact_person: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  proposal_count: number;
}

export interface ClientListItem {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  proposal_count: number;
  last_proposal_date: string | null;
}

export interface PricingItem {
  id?: string;
  item_type: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  category: string | null;
  is_optional: boolean;
  is_selected: boolean;
  order_index: number;
}

export interface ProposalSection {
  id: string;
  section_type: string;
  title: string;
  content: string;
  order_index: number;
  is_ai_generated: boolean;
  updated_at: string;
}

export interface Diagram {
  id: string;
  diagram_type: string;
  mermaid_syntax: string;
  svg_output: string | null;
  title: string | null;
}

export interface StatusHistory {
  id: string;
  old_status: string | null;
  new_status: string;
  reason: string | null;
  created_at: string;
}

export interface Proposal {
  id: string;
  client_id: string;
  template_id: string | null;
  title: string;
  proposal_number: string;
  status: string;
  proposal_type: string;
  executive_summary: string | null;
  project_scope: string | null;
  total_amount: number;
  currency: string;
  discount_percentage: number;
  final_amount: number;
  payment_terms: string | null;
  validity_days: number;
  valid_until: string | null;
  ai_model_used: string;
  refinement_count: number;
  view_token: string;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  client_name: string | null;
  client_company: string | null;
  sections: ProposalSection[];
  pricing_items: PricingItem[];
  diagrams: Diagram[];
  status_history: StatusHistory[];
}

export interface ProposalListItem {
  id: string;
  title: string;
  proposal_number: string;
  status: string;
  proposal_type: string;
  total_amount: number;
  final_amount: number;
  client_name: string | null;
  client_company: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_proposals: number;
  draft_count: number;
  sent_count: number;
  accepted_count: number;
  total_pipeline_value: number;
  avg_proposal_value: number;
  acceptance_rate: number;
}

export interface Template {
  id: string;
  name: string;
  proposal_type: string;
  description: string | null;
  sections: Record<string, unknown> | null;
  default_terms: string | null;
  default_payment_terms: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface RefinementResponse {
  refined_content: string;
  section_modified: string;
  affected_sections: string[];
  coherence_warning: string | null;
}

export type ProposalStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired";
