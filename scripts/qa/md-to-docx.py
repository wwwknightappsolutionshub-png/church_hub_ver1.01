"""Convert docs/qa/outreach-establishment-cells-usecase-scenarios.md to .docx."""
from __future__ import annotations

import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.text import WD_BREAK
from docx.shared import Inches, Pt
from docx.oxml.ns import qn
from docx.oxml import OxmlElement


def set_cell_shading(cell, fill: str) -> None:
    shading = OxmlElement("w:shd")
    shading.set(qn("w:fill"), fill)
    cell._tc.get_or_add_tcPr().append(shading)


def add_formatted_paragraph(doc: Document, text: str, style: str | None = None) -> None:
    p = doc.add_paragraph(style=style)
    parts = re.split(r"(\*\*[^*]+\*\*)", text)
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            run = p.add_run(part[2:-2])
            run.bold = True
        else:
            p.add_run(part)


def is_table_row(line: str) -> bool:
    s = line.strip()
    return s.startswith("|") and s.endswith("|")


def is_separator_row(line: str) -> bool:
    s = line.strip()
    if not is_table_row(s):
        return False
    inner = s.strip("|").replace(" ", "")
    return bool(inner) and set(inner) <= {"|", "-", ":"}


def parse_table_row(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def convert(md_path: Path, docx_path: Path) -> None:
    lines = md_path.read_text(encoding="utf-8").splitlines()
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(0.75)
    section.bottom_margin = Inches(0.75)
    section.left_margin = Inches(0.9)
    section.right_margin = Inches(0.9)

    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if stripped == "---":
            p = doc.add_paragraph()
            p.add_run().add_break(WD_BREAK.PAGE)
            i += 1
            continue

        if stripped.startswith("# "):
            doc.add_heading(stripped[2:].strip(), level=0)
            i += 1
            continue
        if stripped.startswith("## "):
            doc.add_heading(stripped[3:].strip(), level=1)
            i += 1
            continue
        if stripped.startswith("### "):
            doc.add_heading(stripped[4:].strip(), level=2)
            i += 1
            continue

        if is_table_row(stripped):
            table_lines: list[str] = []
            while i < len(lines) and is_table_row(lines[i].strip()):
                if not is_separator_row(lines[i]):
                    table_lines.append(lines[i])
                i += 1
            if not table_lines:
                continue
            rows = [parse_table_row(r) for r in table_lines]
            cols = max(len(r) for r in rows)
            table = doc.add_table(rows=len(rows), cols=cols)
            table.style = "Table Grid"
            for ri, row in enumerate(rows):
                for ci in range(cols):
                    cell_text = row[ci] if ci < len(row) else ""
                    table.rows[ri].cells[ci].text = cell_text
                    if ri == 0:
                        set_cell_shading(table.rows[ri].cells[ci], "E8E8E8")
            doc.add_paragraph()
            continue

        if stripped == "":
            i += 1
            continue

        if stripped.startswith("- "):
            add_formatted_paragraph(doc, stripped[2:], style="List Bullet")
            i += 1
            continue

        if re.match(r"^\d+\.\s", stripped):
            add_formatted_paragraph(doc, re.sub(r"^\d+\.\s", "", stripped), style="List Number")
            i += 1
            continue

        add_formatted_paragraph(doc, stripped)
        i += 1

    docx_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(docx_path))
    print(f"Wrote {docx_path}")


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    md = root / "docs" / "qa" / "outreach-establishment-cells-usecase-scenarios.md"
    out = root / "docs" / "qa" / "outreach-establishment-cells-usecase-scenarios.docx"
    if len(sys.argv) >= 2:
        md = Path(sys.argv[1])
    if len(sys.argv) >= 3:
        out = Path(sys.argv[2])
    if not md.is_file():
        print(f"Missing: {md}", file=sys.stderr)
        return 1
    convert(md, out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())