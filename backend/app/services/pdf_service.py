import os
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from weasyprint.text.fonts import FontConfiguration

from app.config import settings

TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
ASSETS_DIR = Path(__file__).parent.parent.parent / "assets"


class PDFService:
    def __init__(self):
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape=True,
        )
        self.font_config = FontConfiguration()

    async def generate(self, proposal) -> str:
        os.makedirs(settings.exports_dir, exist_ok=True)

        template = self.jinja_env.get_template("pdf_template.html")

        branding = {
            "company_name": settings.company_name,
            "company_url": settings.company_url,
            "company_email": settings.company_email,
            "primary_color": settings.primary_color,
            "secondary_color": settings.secondary_color,
            "accent_color": settings.accent_color,
            "text_color": "#1F2937",
            "light_bg": "#F9FAFB",
            "font_family": "Inter, -apple-system, sans-serif",
            "logo_path": str(ASSETS_DIR / "images" / "logo.png"),
        }

        # Calculate pricing subtotals
        subtotal = sum(
            item.total_price
            for item in proposal.pricing_items
            if item.item_type != "discount" and (item.is_selected or not item.is_optional)
        )
        discount_total = sum(
            abs(item.total_price)
            for item in proposal.pricing_items
            if item.item_type == "discount" and item.is_selected
        )

        html_content = template.render(
            proposal=proposal,
            branding=branding,
            subtotal=subtotal,
            discount_total=discount_total,
        )

        filepath = os.path.join(
            settings.exports_dir, f"{proposal.proposal_number}.pdf"
        )

        HTML(
            string=html_content,
            base_url=str(ASSETS_DIR),
        ).write_pdf(
            filepath,
            font_config=self.font_config,
        )

        return filepath
