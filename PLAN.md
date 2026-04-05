# Project 12: Client Proposal Generator
## Comprehensive Development Plan

**Project Owner:** Armando (305-ai.com)
**Subdomain:** proposals.305-ai.com
**Status:** Planning
**Estimated Duration:** 50-60 hours
**Last Updated:** 2026-04-01

---

## 1. PROJECT OVERVIEW

The Client Proposal Generator is a streamlined web application for Armando's AI consulting business (305-ai.com) that automates the creation of professional client proposals. The system follows an intelligent workflow: form submission → AI-powered draft generation → interactive chat refinement → professional PDF/DOCX export with full branding.

**Core Value Proposition:**
- Generate polished proposals in minutes instead of hours
- Maintain consistency and professional quality across all proposals
- Track client relationships and proposal history
- Manage pricing configurations flexibly (packages, hourly, custom)
- Support multiple proposal types (web dev, AI/ML consulting, custom templates)

**Target User:** Single user (Armando) — no multi-user authentication required

---

## 2. TECH STACK

### Backend
- **Framework:** FastAPI (async-first)
- **ORM:** SQLAlchemy 2.0 (async)
- **Database Driver:** asyncpg
- **Database:** PostgreSQL 16
- **Package Manager:** uv
- **Python Version:** 3.11+

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS + Shadcn/UI
- **API Client:** fetch (built-in) + axios for streaming
- **State Management:** React hooks + context API
- **Form Handling:** React Hook Form + Zod validation

### AI & Content Generation
- **Primary LLM:** Claude Haiku (cost-effective, fast)
- **Secondary LLM:** Claude Sonnet (toggle for complex proposals)
- **SDK:** Anthropic Python SDK
- **Diagram Generation:** Mermaid CLI (mmdc) for server-side SVG rendering

### Document Export
- **PDF Generation:** WeasyPrint (HTML/CSS → PDF with precise styling)
- **DOCX Generation:** python-docx (XML-based document creation)
- **Mermaid Rendering:** mermaid-cli (mmdc binary for SVG output)

### Deployment & Infrastructure
- **Containerization:** Docker + Docker Compose
- **Reverse Proxy:** Traefik (automatic HTTPS, routing)
- **Hosting:** Hostinger VPS (Ubuntu 22.04 LTS)
- **CI/CD:** GitHub Actions (lint, test, deploy)

### Testing
- **Backend:** pytest + pytest-asyncio
- **Frontend:** vitest + React Testing Library
- **Coverage:** >80% for critical paths

---

## 3. DATABASE SCHEMA

### Full Schema with SQL CREATE TABLE Statements

```sql
-- Clients table: Store client information
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    company VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    country VARCHAR(100) DEFAULT 'USA',
    website VARCHAR(255),
    industry VARCHAR(100),
    contact_person VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Proposal Templates: Store reusable proposal structures
CREATE TABLE proposal_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    proposal_type VARCHAR(100) NOT NULL, -- 'web_development', 'ai_ml_consulting', 'custom'
    description TEXT,
    sections JSONB, -- Array of section templates
    default_terms TEXT,
    default_payment_terms VARCHAR(100), -- 'Net 30', 'Net 60', etc.
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Proposals table: Main proposal records
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    template_id UUID REFERENCES proposal_templates(id),
    title VARCHAR(500) NOT NULL,
    proposal_number VARCHAR(50) UNIQUE NOT NULL, -- Format: PROP-2026-001
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, sent, viewed, accepted, rejected, expired
    proposal_type VARCHAR(100) NOT NULL, -- 'web_development', 'ai_ml_consulting', etc.

    -- Core content
    executive_summary TEXT,
    client_overview TEXT,
    project_scope TEXT,
    deliverables JSONB, -- Array of deliverable objects
    timeline JSONB, -- Array of milestone objects with dates

    -- Pricing
    total_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    discount_reason VARCHAR(255),
    final_amount DECIMAL(12, 2) NOT NULL,
    payment_terms VARCHAR(100),

    -- Metadata
    validity_days INTEGER DEFAULT 30,
    valid_until DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP,
    accepted_at TIMESTAMP,
    expires_at TIMESTAMP,

    -- AI refinement tracking
    ai_model_used VARCHAR(50) DEFAULT 'haiku', -- 'haiku' or 'sonnet'
    refinement_count INTEGER DEFAULT 0,
    last_ai_refinement_at TIMESTAMP,

    created_by VARCHAR(100) DEFAULT 'armando'
);

-- Proposal Sections: Individual sections of a proposal (for structured editing)
CREATE TABLE proposal_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    section_type VARCHAR(100) NOT NULL, -- 'executive_summary', 'scope', 'deliverables', etc.
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    is_ai_generated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proposal_id, section_type)
);

-- Pricing Items: Line items for proposal pricing
CREATE TABLE pricing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    item_type VARCHAR(100) NOT NULL, -- 'package', 'hourly', 'custom', 'addon'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    category VARCHAR(100), -- 'development', 'design', 'consultation', 'maintenance'
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pricing Packages: Predefined pricing tiers
CREATE TABLE pricing_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    proposal_type VARCHAR(100), -- NULL = applies to all types
    base_price DECIMAL(12, 2) NOT NULL,
    includes JSONB, -- Array of features/deliverables
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Proposal Status History: Track changes to proposal status
CREATE TABLE proposal_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mermaid Diagrams: Store auto-generated diagrams
CREATE TABLE proposal_diagrams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    diagram_type VARCHAR(100) NOT NULL, -- 'architecture', 'timeline', 'workflow'
    mermaid_syntax TEXT NOT NULL,
    svg_output TEXT, -- Cached SVG rendering
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Chat Refinements: Track user-AI conversations for refinement
CREATE TABLE refinement_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    section_modified VARCHAR(100), -- Which section(s) were modified
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indices for performance
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_proposals_client_id ON proposals(client_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);
CREATE INDEX idx_proposal_sections_proposal_id ON proposal_sections(proposal_id);
CREATE INDEX idx_pricing_items_proposal_id ON pricing_items(proposal_id);
```

---

## 4. AI PIPELINE

### 4.1 Proposal Generation Prompt Template

```python
PROPOSAL_GENERATION_PROMPT = """
You are an expert AI consultant helping generate professional business proposals for {company_name}.

Generate a comprehensive proposal with the following details:
- Client: {client_name} ({client_company})
- Project Type: {project_type}
- Project Scope: {project_scope}
- Duration: {duration_weeks} weeks
- Services: {services_list}

Create a proposal with these sections:

1. EXECUTIVE SUMMARY (150-200 words)
   - Brief overview of the project and its value
   - Key outcomes and benefits

2. ABOUT {COMPANY_NAME} (100-150 words)
   - Company overview and expertise
   - Relevant experience in this domain

3. PROJECT SCOPE (200-300 words)
   - Detailed breakdown of what will be delivered
   - What's included and excluded
   - Success criteria

4. DELIVERABLES (structured list)
   - List each deliverable with description
   - Timeline for each
   - Success metrics

5. PROJECT TIMELINE (Gantt format)
   - Phases: Design, Development, Testing, Deployment
   - Duration in weeks
   - Key milestones

6. PRICING (structured format)
   - Package breakdown: {pricing_breakdown}
   - Total: {total_price}
   - Payment terms: {payment_terms}

7. TERMS & CONDITIONS
   - Standard consulting terms
   - Revision policy (included revisions)
   - Support and maintenance options

Format all output as clean, professional text suitable for a proposal document.
Use clear headings and bullet points for readability.
"""

REFINEMENT_PROMPT = """
You are refining a proposal section based on user feedback.

Current proposal section:
{current_section}

User request: {user_request}

Modify the section to address the user's feedback while maintaining professional tone and consistency.
Return only the refined section text, no explanations.
"""

MERMAID_ARCHITECTURE_PROMPT = """
Based on this project scope: {project_scope}

Generate a Mermaid diagram showing the system architecture:
- Include frontend, backend, database components
- Show API connections
- Include third-party services if mentioned
- Use clear labeling

Return only valid Mermaid syntax (graph TD or similar).
"""

MERMAID_GANTT_PROMPT = """
Based on this project timeline: {timeline_description}

Generate a Mermaid Gantt chart showing:
- Phases: {phases}
- Duration: {total_weeks} weeks
- Key milestones
- Dependencies between tasks

Return only valid Mermaid Gantt syntax.
"""
```

### 4.2 AI Integration Flow

```
1. User submits form → FastAPI endpoint receives form data
2. Backend validates and stores proposal skeleton in DB (status: draft)
3. Trigger Claude API with PROPOSAL_GENERATION_PROMPT
4. Stream response to frontend in real-time
5. Parse response into proposal_sections table
6. Auto-generate Mermaid diagrams (architecture, timeline)
7. Render Mermaid SVGs server-side (mmdc CLI)
8. Return full proposal draft to frontend
9. User opens chat refinement interface
10. Each user message → REFINEMENT_PROMPT with updated section
11. Update proposal_sections + refinement_conversations table
12. User requests export → trigger PDF/DOCX generation
13. Embed branding, apply CSS styling, return file
```

---

## 5. API ENDPOINTS

### Clients
- `GET /api/clients` — List all clients
- `POST /api/clients` — Create new client
- `GET /api/clients/{client_id}` — Get client details + proposal history
- `PUT /api/clients/{client_id}` — Update client
- `DELETE /api/clients/{client_id}` — Archive client

### Proposals
- `POST /api/proposals` — Create new proposal from form
- `GET /api/proposals` — List all proposals (with filters: status, client, date)
- `GET /api/proposals/{proposal_id}` — Get proposal details
- `PUT /api/proposals/{proposal_id}` — Update proposal (title, metadata)
- `DELETE /api/proposals/{proposal_id}` — Archive proposal
- `POST /api/proposals/{proposal_id}/generate-draft` — Trigger AI draft generation (streaming)
- `POST /api/proposals/{proposal_id}/sections/{section_type}` — Update single section
- `POST /api/proposals/{proposal_id}/refine` — Chat refinement endpoint (streaming)
- `POST /api/proposals/{proposal_id}/export-pdf` — Generate PDF
- `POST /api/proposals/{proposal_id}/export-docx` — Generate DOCX
- `POST /api/proposals/{proposal_id}/diagrams` — Generate Mermaid diagrams
- `POST /api/proposals/{proposal_id}/send` — Mark as sent, update status_history

### Templates
- `GET /api/templates` — List templates
- `POST /api/templates` — Save as new template
- `GET /api/templates/{template_id}` — Get template
- `PUT /api/templates/{template_id}` — Update template
- `DELETE /api/templates/{template_id}` — Delete template

### Pricing
- `GET /api/pricing-packages` — List available packages
- `POST /api/pricing-packages` — Create package
- `PUT /api/proposals/{proposal_id}/pricing` — Recalculate pricing with items

### Dashboard
- `GET /api/dashboard/stats` — Summary: total proposals, avg value, pipeline, etc.
- `GET /api/dashboard/recent-proposals` — 5 most recent
- `GET /api/dashboard/clients-pipeline` — Proposals by status

---

## 6. FRONTEND PAGES

### Layout
- **Navigation:** Top bar with logo, "New Proposal" button, Client list, Templates, Settings
- **Branding:** 305-ai.com color scheme (primary blue #1E40AF, accent #0369A1)

### Pages

#### 1. Dashboard (`/`)
- Welcome message
- Stats cards: Total proposals, pending responses, pipeline value, upcoming deadlines
- Recent proposals table (status, client, value, last updated)
- Quick actions: "New Proposal", "View Clients"

#### 2. Proposal Wizard (`/proposals/new`)
- **Step 1:** Client selection (existing or create new)
- **Step 2:** Project type selection (dropdown: Web Dev, AI/ML, Custom)
- **Step 3:** Project details (scope, services, duration)
- **Step 4:** Timeline (phases, start date, milestones)
- **Step 5:** Pricing setup (select packages, add custom items)
- **Step 6:** Review and submit

#### 3. Proposal Editor (`/proposals/{id}`)
- Left sidebar: Outline (all sections collapsible)
- Main content area: Full proposal preview with sections
- Right sidebar: Chat refinement interface
- Top actions: "Refine with AI", "Export PDF", "Export DOCX", "Send", "Save"
- Real-time preview updates as user refines

#### 4. Proposal View (`/proposals/{id}/view`)
- Read-only proposal display
- Status badge (draft, sent, accepted, etc.)
- Metadata: Created date, client, total value
- Export buttons
- Status history timeline

#### 5. Client List (`/clients`)
- Table: Name, Company, Email, Phone, Proposals Count, Last Proposal
- Search and filter
- "New Client" button
- Client detail button → Client detail page

#### 6. Client Detail (`/clients/{id}`)
- Client info card (all fields)
- Proposal history table
- "New Proposal for this Client" quick action
- Notes section

#### 7. Template Manager (`/templates`)
- List of templates by type
- Template preview modal
- "Create from Proposal" button (save current proposal as template)
- Delete/edit templates

#### 8. Settings (`/settings`)
- Company branding (logo upload, colors)
- Default payment terms
- Pricing packages management
- Export settings (PDF/DOCX styling)
- LLM preferences (Haiku vs Sonnet default)

---

## 7. PDF/DOCX EXPORT SPECIFICATIONS

### Branding Constants
```python
BRANDING = {
    "company_name": "305 AI",
    "company_url": "305-ai.com",
    "company_email": "hello@305-ai.com",
    "company_phone": "+1-XXX-XXX-XXXX",  # To be configured
    "logo_url": "/static/305ai-logo.png",
    "primary_color": "#1E40AF",  # Blue
    "secondary_color": "#0369A1",  # Darker blue
    "accent_color": "#FB923C",  # Orange
    "text_color": "#1F2937",  # Dark gray
    "light_bg": "#F9FAFB",  # Light gray
    "font_family": "Inter, -apple-system, sans-serif"
}
```

### PDF Structure (WeasyPrint HTML template)
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        @page {
            size: letter;
            margin: 0.75in;
            @top {
                content: string(header);
            }
            @bottom {
                content: string(footer);
            }
        }
        body {
            font-family: {{ branding.font_family }};
            color: {{ branding.text_color }};
            line-height: 1.6;
        }
        .header { string-set: header content(); }
        .footer { string-set: footer content(); }
        h1, h2, h3 { color: {{ branding.primary_color }}; margin-top: 1.5em; }
        .cover-page {
            page-break-after: always;
            text-align: center;
            padding: 3em 0;
        }
        .logo { max-width: 200px; margin-bottom: 2em; }
        .proposal-number { color: {{ branding.secondary_color }}; font-size: 0.9em; }
        table { width: 100%; border-collapse: collapse; margin: 1em 0; }
        th { background-color: {{ branding.light_bg }}; padding: 0.75em; text-align: left; }
        td { padding: 0.5em 0.75em; border-bottom: 1px solid #e5e7eb; }
        .pricing-table { margin: 2em 0; }
        .total-row { font-weight: bold; background-color: {{ branding.light_bg }}; }
        .signature-block { margin-top: 3em; }
    </style>
</head>
<body>
    <!-- Cover page -->
    <div class="cover-page">
        <img src="{{ branding.logo_url }}" alt="Logo" class="logo">
        <h1>Project Proposal</h1>
        <p class="proposal-number">{{ proposal.proposal_number }}</p>
        <p>{{ proposal.title }}</p>
        <p>{{ proposal.client.name }}</p>
    </div>

    <!-- Header/Footer -->
    <div class="header">
        <img src="{{ branding.logo_url }}" alt="Logo" style="height: 40px;">
        <span>{{ proposal.proposal_number }}</span>
    </div>
    <div class="footer">
        <p>{{ branding.company_url }} | Page <span class="page-number"></span></p>
    </div>

    <!-- Content sections -->
    {% for section in proposal.sections %}
    <h2>{{ section.title }}</h2>
    <div>{{ section.content | safe }}</div>
    {% endfor %}

    <!-- Diagrams -->
    {% for diagram in proposal.diagrams %}
    <div>
        <h3>{{ diagram.title }}</h3>
        {{ diagram.svg_output | safe }}
    </div>
    {% endfor %}

    <!-- Pricing -->
    <h2>Pricing</h2>
    <table class="pricing-table">
        <tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
        {% for item in proposal.pricing_items %}
        <tr>
            <td>{{ item.name }}</td>
            <td>{{ item.quantity }}</td>
            <td>${{ item.unit_price }}</td>
            <td>${{ item.total_price }}</td>
        </tr>
        {% endfor %}
        <tr class="total-row">
            <td colspan="3">Total</td>
            <td>${{ proposal.final_amount }}</td>
        </tr>
    </table>

    <!-- Terms -->
    <h2>Terms & Conditions</h2>
    <p>{{ proposal.payment_terms }}</p>

    <!-- Signature block -->
    <div class="signature-block">
        <p>_________________________</p>
        <p>Authorized by: {{ branding.company_name }}</p>
    </div>
</body>
</html>
```

### DOCX Structure (python-docx)
```python
# Key elements:
- Document header: company logo, proposal title, proposal number
- Title: Client name and project title
- Body: Numbered sections with proper formatting
- Tables: Pricing breakdown with borders and shading
- Diagrams: Embedded SVG/PNG images
- Footer: Company website, page numbers
- Color scheme: Apply primary_color to headings, tables
- Font: Calibri 11pt for body, 14pt for headings
```

---

## 8. PROJECT STRUCTURE

```
proposal-generator/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app
│   │   ├── config.py               # Settings (DB URL, API keys, etc.)
│   │   ├── dependencies.py         # Shared dependencies
│   │   ├── api/
│   │   │   ├── clients.py
│   │   │   ├── proposals.py
│   │   │   ├── templates.py
│   │   │   ├── pricing.py
│   │   │   └── dashboard.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── client.py
│   │   │   ├── proposal.py
│   │   │   ├── template.py
│   │   │   └── pricing.py
│   │   ├── schemas/
│   │   │   ├── client.py
│   │   │   ├── proposal.py
│   │   │   └── pagination.py
│   │   ├── services/
│   │   │   ├── ai_service.py       # Claude integration, prompt engineering
│   │   │   ├── pdf_service.py      # PDF generation (WeasyPrint)
│   │   │   ├── docx_service.py     # DOCX generation (python-docx)
│   │   │   ├── mermaid_service.py  # Diagram generation (mmdc)
│   │   │   └── proposal_service.py # Business logic
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   ├── session.py          # AsyncSession factory
│   │   │   └── migrations/         # Alembic migrations
│   │   └── templates/
│   │       ├── pdf_template.html
│   │       └── email_templates/
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_api/
│   │   ├── test_services/
│   │   └── fixtures/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── pyproject.toml              # uv package config
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx              # Root layout + navigation
│   │   ├── page.tsx                # Dashboard
│   │   ├── proposals/
│   │   │   ├── page.tsx            # Proposals list
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # Wizard (multi-step)
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Proposal editor
│   │   │       ├── view.tsx        # Read-only view
│   │   │       └── layout.tsx
│   │   ├── clients/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── templates/page.tsx
│   │   └── settings/page.tsx
│   ├── components/
│   │   ├── ClientForm.tsx
│   │   ├── ProposalWizard.tsx
│   │   ├── ProposalEditor.tsx
│   │   ├── ChatRefinement.tsx
│   │   ├── PricingCalculator.tsx
│   │   ├── DiagramPreview.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Table.tsx
│   │       └── ... (Shadcn components)
│   ├── lib/
│   │   ├── api.ts                  # API client
│   │   ├── hooks/
│   │   │   ├── useProposal.ts
│   │   │   ├── useClient.ts
│   │   │   └── useRefinement.ts
│   │   ├── utils.ts
│   │   └── constants.ts
│   ├── styles/
│   │   └── globals.css
│   ├── public/
│   │   ├── 305ai-logo.png
│   │   └── favicon.ico
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── docker-compose.yml
├── .github/workflows/
│   ├── lint.yml
│   ├── test.yml
│   └── deploy.yml
├── .env.example
└── README.md
```

---

## 9. DOCKER COMPOSE

**Note:** See PORT-MAP.md for the complete port allocation across all projects.

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: proposal_generator
      POSTGRES_USER: armando
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U armando"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql+asyncpg://armando:${DB_PASSWORD}@postgres:5432/proposal_generator
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      ENVIRONMENT: production
    ports:
      - "8120:8000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8120
    ports:
      - "3120:3000"
    depends_on:
      - backend

  traefik:
    image: traefik:v3
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./traefik.yml:/traefik.yml
      - ./acme.json:/acme.json
    environment:
      - TRAEFIK_PROVIDERS_DOCKER=true
      - TRAEFIK_ENTRYPOINTS_WEB_ADDRESS=:80
      - TRAEFIK_ENTRYPOINTS_WEBSECURE_ADDRESS=:443

volumes:
  postgres_data:

networks:
  default:
    name: proposal-network
```

---

## 10. PROJECT TIMELINE (50-60 hours)

| Phase | Task | Hours | Week |
|-------|------|-------|------|
| **Setup** | Project scaffold, Docker, DB migrations | 4 | 1 |
| | Implement SQLAlchemy models + async DB session | 3 | 1 |
| **Backend API** | Clients CRUD endpoints | 4 | 2 |
| | Proposals CRUD endpoints | 5 | 2 |
| | AI service (Claude integration, prompt engineering) | 6 | 3 |
| | PDF generation (WeasyPrint) | 4 | 3 |
| | DOCX generation (python-docx) | 4 | 3 |
| | Mermaid diagram generation + server-side rendering | 4 | 4 |
| | Chat refinement API endpoint | 3 | 4 |
| | Pricing service (package + custom items) | 3 | 4 |
| **Frontend** | Design system setup (TailwindCSS, Shadcn/UI) | 3 | 2 |
| | Dashboard page | 3 | 5 |
| | Proposal wizard (multi-step form) | 6 | 5-6 |
| | Proposal editor + chat refinement UI | 6 | 6 |
| | Client management (list, create, detail) | 4 | 6 |
| | Template manager page | 3 | 7 |
| | Settings page | 2 | 7 |
| **Testing** | Backend unit tests (pytest) | 4 | 7 |
| | Frontend component tests (vitest) | 3 | 8 |
| | End-to-end testing | 2 | 8 |
| **Deployment** | Traefik configuration, HTTPS setup | 2 | 8 |
| | Deploy to Hostinger VPS | 2 | 8 |
| **Buffer** | Refinements, bug fixes | 3 | 8 |
| **TOTAL** | | **55** | |

---

## 11. FUTURE IMPROVEMENTS

1. **Multi-user Support:** Add user accounts, role-based access (admin, proposal creator, viewer)
2. **Email Integration:** Auto-send proposals via email, track opens and views
3. **Digital Signatures:** Integrate DocuSign or HelloSign for proposal signing
4. **Custom Fields:** Allow Armando to define custom proposal fields per proposal type
5. **Analytics Dashboard:** Track proposal conversion rates, avg negotiation time, win/loss reasons
6. **Proposal Versioning:** Track changes to proposals, allow easy rollback
7. **Integration with CRM:** Sync clients and proposals with HubSpot or Pipedrive
8. **Bulk Operations:** Generate multiple proposals at once, batch export
9. **Mobile App:** React Native app for on-the-go proposal management
10. **AI-Powered Negotiation Assistant:** Suggest counter-offers based on market rates
11. **Contract Template Library:** Extend to generate contracts from proposals
12. **Time Tracking Integration:** Auto-populate timesheets from proposal deliverables

---

## 12. DEPLOYMENT CHECKLIST

- [ ] PostgreSQL 16 running on VPS
- [ ] Docker and Docker Compose installed
- [ ] Traefik configured with SSL certificates (Let's Encrypt)
- [ ] Environment variables set (.env file)
- [ ] Database migrations applied (`alembic upgrade head`)
- [ ] Backend Docker image built and running
- [ ] Frontend Docker image built and running
- [ ] Subdomain DNS configured (proposals.305-ai.com → VPS IP)
- [ ] HTTPS certificate active and auto-renewing
- [ ] GitHub Actions CI/CD pipeline configured
- [ ] Monitoring/logging setup (e.g., Docker logs)
- [ ] Backup strategy for PostgreSQL (daily dumps to S3)
- [ ] Performance testing: load test with 100 concurrent users
- [ ] Security audit: dependency scanning, code review
- [ ] User testing with Armando (all workflows)

---

**End of Plan**
