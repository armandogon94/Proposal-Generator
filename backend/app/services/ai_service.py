import re
from collections.abc import AsyncGenerator

from anthropic import AsyncAnthropic

from app.config import settings

SYSTEM_PROMPT = """You are a senior business consultant at 305 AI (305-ai.com), an AI consulting firm.
You generate professional, persuasive client proposals.

## Writing Guidelines
- Use a confident, professional tone — not salesy
- Be specific with technical details; avoid vague claims
- Quantify benefits wherever possible (e.g., "reduce processing time by 40%")
- Tailor language to the client's industry
- Each section should be self-contained but reference other sections naturally

## Section Format
Output each section with a clear markdown heading (## Section Title) followed by the content.
Sections to generate:
1. ## Executive Summary (150-200 words)
2. ## About 305 AI (100-150 words)
3. ## Project Scope (200-300 words)
4. ## Deliverables (structured list with descriptions and timelines)
5. ## Project Timeline (phases with durations)
6. ## Terms & Conditions (standard consulting terms, revision policy)

## Formatting
- Use clean, scannable prose — short paragraphs, bullet points for lists
- Maintain consistency in tense and voice throughout
"""

REFINEMENT_PROMPT = """You are refining a specific section of a business proposal for 305 AI.

## Rules
1. Return ONLY the refined section content — no preamble, no explanation, no section headers
2. Maintain the same professional tone and formatting style as the original
3. Preserve any specific numbers, dates, or client details unless explicitly asked to change them
4. If the request would create an inconsistency with other sections, note it in [NOTE: ...]
5. Keep approximately the same length unless asked to expand or shorten
"""

SECTION_DEPENDENCIES = {
    "timeline": ["pricing", "deliverables"],
    "project_scope": ["deliverables", "timeline", "executive_summary"],
    "deliverables": ["timeline", "pricing"],
    "pricing": ["executive_summary"],
    "executive_summary": [],
    "about": [],
    "terms": [],
}


class AIService:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def generate_proposal_stream(
        self,
        proposal,
        model: str | None = None,
        project_scope: str | None = None,
        services: list[str] | None = None,
        duration_weeks: int | None = None,
    ) -> AsyncGenerator[str, None]:
        model = model or settings.default_ai_model
        client_name = proposal.client.name if proposal.client else "the client"
        client_company = proposal.client.company if proposal.client else ""

        user_message = f"""Generate a proposal for:
- Client: {client_name} ({client_company})
- Project Type: {proposal.proposal_type}
- Project Title: {proposal.title}
- Scope: {project_scope or proposal.project_scope or 'General consulting engagement'}
- Services: {', '.join(services) if services else 'AI consulting and development'}
- Duration: {duration_weeks or 8} weeks
- Budget: ${proposal.total_amount:,.2f}
- Payment Terms: {proposal.payment_terms or 'Net 30'}"""

        async with self.client.messages.stream(
            model=model,
            max_tokens=8192,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            async for text in stream.text_stream:
                yield text

    def parse_proposal_sections(self, full_text: str) -> list[dict]:
        section_pattern = r"## (.+?)(?=\n## |\Z)"
        matches = re.findall(section_pattern, full_text, re.DOTALL)

        section_types = {
            "executive summary": "executive_summary",
            "about 305 ai": "about",
            "about": "about",
            "project scope": "project_scope",
            "scope": "project_scope",
            "deliverables": "deliverables",
            "project timeline": "timeline",
            "timeline": "timeline",
            "terms & conditions": "terms",
            "terms and conditions": "terms",
            "terms": "terms",
        }

        sections = []
        parts = re.split(r"## ", full_text)
        for part in parts[1:]:  # Skip text before first heading
            lines = part.strip().split("\n", 1)
            if len(lines) < 2:
                continue
            title = lines[0].strip()
            content = lines[1].strip()

            section_type = section_types.get(
                title.lower(), title.lower().replace(" ", "_")
            )

            sections.append({
                "type": section_type,
                "title": title,
                "content": content,
            })

        return sections

    async def refine_section(
        self,
        proposal,
        user_message: str,
        section_type: str | None = None,
        model: str | None = None,
    ) -> dict:
        model = model or settings.enhanced_ai_model

        # Find the target section
        target_section = None
        if section_type:
            for s in proposal.sections:
                if s.section_type == section_type:
                    target_section = s
                    break

        if not target_section and proposal.sections:
            # Try to infer which section the user is talking about
            target_section = proposal.sections[0]
            section_type = target_section.section_type

        if not target_section:
            return {
                "refined_content": "No sections found to refine.",
                "section_modified": None,
                "affected_sections": [],
                "coherence_warning": None,
            }

        # Build context from other sections
        context_parts = []
        for s in proposal.sections:
            if s.section_type != section_type:
                summary = s.content[:200] + "..." if len(s.content) > 200 else s.content
                context_parts.append(f"[{s.section_type}]: {summary}")

        context = "\n".join(context_parts) if context_parts else "No other sections yet."

        response = await self.client.messages.create(
            model=model,
            max_tokens=4096,
            system=REFINEMENT_PROMPT,
            messages=[{
                "role": "user",
                "content": f"""## Proposal Context (other sections summary)
{context}

## Current Section: {target_section.title}
{target_section.content}

## Refinement Request
{user_message}""",
            }],
        )

        refined_content = response.content[0].text
        affected = SECTION_DEPENDENCIES.get(section_type, [])

        coherence_warning = None
        if affected:
            coherence_warning = (
                f"Changing '{section_type}' may affect: {', '.join(affected)}. "
                f"Would you like me to review and update those sections as well?"
            )

        return {
            "refined_content": refined_content,
            "section_modified": section_type,
            "affected_sections": affected,
            "coherence_warning": coherence_warning,
        }
