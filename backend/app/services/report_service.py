import io
from xml.sax.saxutils import escape

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

EXCEL_MAX_ROWS = 1_048_575


def dataframe_to_csv_bytes(df: pd.DataFrame) -> bytes:
    # utf-8-sig so Excel opens non-ASCII text correctly
    return df.to_csv(index=False).encode("utf-8-sig")


def dataframe_to_excel_bytes(df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Data")
    return buf.getvalue()


def _fmt(v) -> str:
    return "-" if v is None else f"{v:,.2f}"


def build_pdf_summary(filename, row_count, column_count, duplicate_rows, missing_cells, numeric_stats, categorical_stats) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=0.75 * inch, bottomMargin=0.75 * inch,
                            leftMargin=0.75 * inch, rightMargin=0.75 * inch, title="Azeel Analytics summary")
    styles = getSampleStyleSheet()
    title = ParagraphStyle("T", parent=styles["Title"], textColor=colors.HexColor("#2563EB"))
    h2 = ParagraphStyle("H", parent=styles["Heading2"], textColor=colors.HexColor("#0F172A"), spaceBefore=16, spaceAfter=8)
    cell = ParagraphStyle("C", parent=styles["Normal"], fontSize=8, leading=10)
    head = ParagraphStyle("Hd", parent=cell, textColor=colors.white, fontName="Helvetica-Bold")

    def P(text, style=cell):  # text is untrusted: escape before reportlab parses it as markup
        return Paragraph(escape(str(text)), style)

    def table(rows, widths):
        t = Table([[P(c, head) for c in rows[0]]] + [[P(c) for c in r] for r in rows[1:]], colWidths=widths, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        return t

    els = [Paragraph("Azeel Analytics AI", title), Paragraph("Automated data summary", styles["Normal"]), Spacer(1, 16),
           Paragraph(f"File: {escape(filename)}", styles["Normal"]), Spacer(1, 10),
           table([["Metric", "Value"], ["Rows", f"{row_count:,}"], ["Columns", f"{column_count:,}"],
                  ["Missing cells", f"{missing_cells:,}"], ["Duplicate rows", f"{duplicate_rows:,}"]], [250, 254])]
    if numeric_stats:
        els.append(Paragraph("Numeric columns", h2))
        rows = [["Column", "Mean", "Median", "Min", "Max", "Std dev", "Nulls"]]
        rows += [
            [s["column"], _fmt(s["mean"]), _fmt(s["median"]), _fmt(s["minimum"]), _fmt(s["maximum"]), _fmt(s["std_dev"]), s["nulls"]]
            for s in numeric_stats
        ]
        els.append(table(rows, [124, 62, 62, 62, 62, 62, 70]))
    if categorical_stats:
        els.append(Paragraph("Text and date columns", h2))
        rows = [["Column", "Unique values", "Nulls", "Type"]]
        rows += [[s["column"], f'{s["unique"]:,}', s["nulls"], s["dtype"]] for s in categorical_stats]
        els.append(table(rows, [214, 100, 90, 100]))
    doc.build(els)
    return buf.getvalue()
