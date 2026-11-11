#!/usr/bin/env python3
"""Build the downloadable English CV from the public academic profile.

Requires reportlab. Run manually when updating cv.html; the PDF is checked in so
deployments do not need an additional PDF dependency.
"""
from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'assets' / 'Feier-Lyu-CV.pdf'
INK = colors.HexColor('#293443')
MUTED = colors.HexColor('#526176')
BODY = ParagraphStyle('Body', fontName='Helvetica', fontSize=10, leading=14,
                      textColor=INK, spaceAfter=6, alignment=TA_LEFT)
TITLE = ParagraphStyle('Name', parent=BODY, fontName='Helvetica-Bold',
                       fontSize=24, leading=29, spaceAfter=4)
SECTION = ParagraphStyle('Section', parent=BODY, fontName='Helvetica-Bold',
                         fontSize=11.5, leading=16, spaceBefore=12, spaceAfter=5)
ENTRY = ParagraphStyle('Entry', parent=BODY, fontName='Helvetica-Bold',
                       fontSize=10, leading=14, spaceAfter=3)
SMALL = ParagraphStyle('Small', parent=BODY, fontSize=9, leading=12, textColor=MUTED)

def clean(text):
    # ReportLab supports a small HTML subset; retain links, strong emphasis, and br.
    text = re.sub(r'<a[^>]*data-email-key[^>]*>.*?</a>', '', text, flags=re.S)
    text = re.sub(r'<span[^>]*>(.*?)</span>', r'\1', text, flags=re.S)
    text = text.replace('<strong>', '<b>').replace('</strong>', '</b>')
    text = text.replace('–', '-').replace('—', '-').replace('−', '-')
    text = text.replace('“', '"').replace('”', '"').replace('’', "'")
    text = re.sub(r'\s+(?:target|rel|class)="[^"]*"', '', text)
    text = re.sub(r'href="(?!https?://)([^"#][^"]*)"',
                  r'href="https://lyuf09.github.io/chronohaze/\1"', text)
    return text.strip()

source = (ROOT / 'cv.html').read_text()
start = source.index('<div data-lang-block="en" hidden>')
end = source.index('</main>', start)
profile = source[start:end]

story = [Paragraph('Feier Lyu <font size="15">(Fay Lyu)</font>', TITLE),
         Paragraph('Optimization theory and formal verification', BODY),
         Paragraph('<a href="https://lyuf09.github.io/chronohaze/cv.html?lang=en">Academic profile &amp; contact</a>'
                   '  |  <a href="https://github.com/lyuf09">GitHub</a>'
                   '  |  <a href="https://orcid.org/0009-0000-5670-8831">ORCID</a>', SMALL)]

for match in re.finditer(r'<(h2|h3|p)\b[^>]*>(.*?)</\1>', profile, re.S):
    tag, text = match.groups()
    # The name is already in the header; contact is linked above without exposing
    # the site's deliberately obfuscated email addresses in an indexed artifact.
    if tag == 'p' and text.startswith('<strong>Feier Lyu'):
        continue
    if tag == 'h2' and text == 'Contact':
        break
    text = clean(text)
    if tag == 'h2':
        story.append(Paragraph(text, SECTION))
    elif tag == 'h3':
        story.append(Paragraph(text, ENTRY))
    else:
        story.append(Paragraph(text, SMALL if 'href=' in text else BODY))

def footer(canvas, doc):
    canvas.setStrokeColor(colors.HexColor('#c1c9d3'))
    canvas.line(18*mm, 16*mm, A4[0]-18*mm, 16*mm)
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18*mm, 11*mm, 'Feier Lyu | Updated October 2026')
    canvas.drawRightString(A4[0]-18*mm, 11*mm, str(doc.page))

doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, leftMargin=18*mm,
                        rightMargin=18*mm, topMargin=17*mm, bottomMargin=21*mm,
                        title='Feier Lyu (Fay Lyu) - Curriculum Vitae',
                        author='Feier Lyu', pageCompression=1)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT)
