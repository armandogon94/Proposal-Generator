import re

import httpx
from anthropic import AsyncAnthropic

from app.config import settings

ARCHITECTURE_PROMPT = """Generate a Mermaid architecture diagram for this project.

## Project Description
{project_scope}

## STRICT Mermaid Syntax Rules
- Use `graph TD` for top-down layout
- ALWAYS wrap node labels in double quotes: A["Label Text"]
- Use only ASCII characters — no smart quotes, em dashes, or unicode
- One statement per line
- Never use "end" as a node ID (reserved); use "endNode" or "finish"
- Node IDs must be alphanumeric (no spaces, no special chars)
- Arrow syntax: `-->` for solid, `-.->` for dotted
- Edge labels: `A -->|"label"| B`

## Requirements
- Show frontend, backend, database, and external services
- Group related components in subgraphs
- Show data flow with arrows
- Keep labels concise (max 4 words)

Return ONLY the Mermaid code. No markdown fences, no explanation."""

GANTT_PROMPT = """Generate a Mermaid Gantt chart for this project timeline.

## Project Details
- Total duration: {total_weeks} weeks
- Phases: {phases}

## STRICT Gantt Syntax Rules
- Start with `gantt` on the first line
- `dateFormat YYYY-MM-DD`
- `title Project Timeline`
- Section headers: `section Phase Name`
- Tasks: `Task Name :taskId, start_date, duration`
- Duration units: `1d` (days), `1w` (weeks)
- Use `after taskId` for dependencies
- NO special characters in task names

Return ONLY the Mermaid code. No markdown fences, no explanation."""


def validate_and_fix_mermaid(mermaid_code: str) -> tuple[str, list[str]]:
    fixes = []
    code = mermaid_code.strip()

    # Remove markdown fences if present
    if code.startswith("```"):
        code = re.sub(r"^```\w*\n?", "", code)
        code = re.sub(r"\n?```$", "", code)
        code = code.strip()
        fixes.append("Removed markdown fences")

    # Replace smart quotes
    smart_quotes = {"\u201c": '"', "\u201d": '"', "\u2018": "'", "\u2019": "'"}
    for smart, ascii_q in smart_quotes.items():
        if smart in code:
            code = code.replace(smart, ascii_q)
            fixes.append("Replaced smart quotes")

    # Replace em/en dashes
    if "\u2014" in code or "\u2013" in code:
        code = code.replace("\u2014", "-").replace("\u2013", "-")
        fixes.append("Replaced em/en dashes")

    # Fix single-% comments
    code = re.sub(r"^(\s*)% ", r"\1%% ", code, flags=re.MULTILINE)

    return code, fixes


class MermaidService:
    def __init__(self):
        self.ai_client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.kroki_url = settings.kroki_url

    async def generate_diagrams(self, proposal) -> list[dict]:
        scope = proposal.project_scope or proposal.title
        diagrams = []

        # Architecture diagram
        arch_mermaid = await self._generate_mermaid(
            ARCHITECTURE_PROMPT.format(project_scope=scope)
        )
        if arch_mermaid:
            svg = await self._render_svg(arch_mermaid)
            diagrams.append({
                "diagram_type": "architecture",
                "mermaid_syntax": arch_mermaid,
                "svg_output": svg,
                "title": "System Architecture",
            })

        # Gantt timeline
        timeline_info = proposal.timeline or {}
        phases = ", ".join(
            p.get("phase", "Phase") for p in timeline_info
        ) if isinstance(timeline_info, list) else "Design, Development, Testing, Deployment"

        gantt_mermaid = await self._generate_mermaid(
            GANTT_PROMPT.format(
                total_weeks=8,
                phases=phases,
            )
        )
        if gantt_mermaid:
            svg = await self._render_svg(gantt_mermaid)
            diagrams.append({
                "diagram_type": "timeline",
                "mermaid_syntax": gantt_mermaid,
                "svg_output": svg,
                "title": "Project Timeline",
            })

        return diagrams

    async def _generate_mermaid(self, prompt: str) -> str | None:
        try:
            response = await self.ai_client.messages.create(
                model=settings.default_ai_model,
                max_tokens=2048,
                messages=[{"role": "user", "content": prompt}],
            )
            code = response.content[0].text
            fixed_code, _ = validate_and_fix_mermaid(code)
            return fixed_code
        except Exception:
            return None

    async def _render_svg(self, mermaid_code: str) -> str | None:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{self.kroki_url}/mermaid/svg",
                    content=mermaid_code,
                    headers={"Content-Type": "text/plain"},
                )
                if response.status_code == 200:
                    return response.text
        except Exception:
            pass
        return None
