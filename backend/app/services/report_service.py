import io
import csv
from datetime import datetime
from typing import List, Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

class ReportService:
    @staticmethod
    def generate_csv(headers: List[str], rows: List[List[Any]]) -> str:
        """
        Generates a standard RFC 4180 CSV string.
        """
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        for row in rows:
            writer.writerow(row)
        return output.getvalue()

    @staticmethod
    def generate_pdf(
        title: str,
        subtitle: str,
        headers: List[str],
        data_rows: List[List[Any]],
        summary_stats: Dict[str, Any] = None
    ) -> bytes:
        """
        Generates a professional tabular PDF document using ReportLab.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#166534') # Forest Green
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#4b5563')
        )
        body_style = styles['Normal']

        story = []

        # Title & Subtitle
        story.append(Paragraph("AgriSense AI – Agricultural Decision Support Ecosystem", title_style))
        story.append(Spacer(1, 4))
        story.append(Paragraph(f"{title} | {subtitle} (Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')})", subtitle_style))
        story.append(Spacer(1, 14))

        # Summary KPIs if provided
        if summary_stats:
            kpi_data = [[f"<b>{k}</b>", str(v)] for k, v in summary_stats.items()]
            kpi_table = Table([[Paragraph(k[0], body_style), Paragraph(k[1], body_style)] for k in kpi_data], colWidths=[200, 300])
            kpi_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fdf4')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#86efac')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#bbf7d0')),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(kpi_table)
            story.append(Spacer(1, 14))

        # Data Table
        table_content = [[Paragraph(f"<b>{h}</b>", styles['Normal']) for h in headers]]
        for row in data_rows:
            table_content.append([Paragraph(str(cell), styles['Normal']) for cell in row])

        col_width = (doc.width) / max(1, len(headers))
        table = Table(table_content, colWidths=[col_width] * len(headers))
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#15803d')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ]))

        story.append(table)
        story.append(Spacer(1, 14))
        story.append(Paragraph("Confidential & Proprietary • AgriSense AI Agricultural Decision Support Platform", subtitle_style))

        doc.build(story)
        pdf_data = buffer.getvalue()
        buffer.close()
        return pdf_data
