#!/usr/bin/env python3
"""Build the public English technical note on network localization."""

from __future__ import annotations

import shutil
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "network_localization_structural_certificates.pdf"
PUBLISH_COPY = ROOT / "notes" / "network_localization_structural_certificates.pdf"

INK = colors.HexColor("#1D2633")
MUTED = colors.HexColor("#5B687A")
ACCENT = colors.HexColor("#526C98")
PALE = colors.HexColor("#EEF2F7")
PALE_BLUE = colors.HexColor("#E8EEF7")
LINE = colors.HexColor("#CAD3DF")
PAPER = colors.HexColor("#FBFCFE")


def build_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=25,
            leading=29,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=7,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=12.2,
            leading=17,
            textColor=MUTED,
            spaceAfter=15,
        ),
        "page_title": ParagraphStyle(
            "PageTitle",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=19,
            leading=23,
            textColor=INK,
            spaceAfter=12,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12.4,
            leading=15.5,
            textColor=ACCENT,
            spaceBefore=8,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.6,
            leading=14.2,
            textColor=INK,
            spaceAfter=6,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.4,
            leading=12,
            textColor=MUTED,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.3,
            leading=13.8,
            leftIndent=12,
            firstLineIndent=-8,
            bulletIndent=2,
            textColor=INK,
            spaceAfter=4,
        ),
        "equation": ParagraphStyle(
            "Equation",
            parent=base["Code"],
            fontName="Courier",
            fontSize=8.7,
            leading=12.5,
            leftIndent=7,
            rightIndent=7,
            textColor=INK,
            spaceBefore=3,
            spaceAfter=3,
        ),
        "box_title": ParagraphStyle(
            "BoxTitle",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9.2,
            leading=12,
            textColor=ACCENT,
            spaceAfter=3,
        ),
        "box_body": ParagraphStyle(
            "BoxBody",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.9,
            leading=13.2,
            textColor=INK,
        ),
    }


def paragraph(text: str, style):
    return Paragraph(text, style)


def bullet(text: str, styles):
    return Paragraph("- " + text, styles["bullet"])


def callout(title: str, body: str, styles, background=PALE):
    table = Table(
        [[paragraph(title, styles["box_title"])], [paragraph(body, styles["box_body"])]],
        colWidths=[174 * mm],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("LINEBELOW", (0, 0), (-1, 0), 0.4, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def draw_page(canvas, doc):
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.45)
    canvas.line(18 * mm, height - 15 * mm, width - 18 * mm, height - 15 * mm)
    canvas.setFont("Helvetica", 7.6)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, height - 11.2 * mm, "CHRONOHAZE TECHNICAL NOTE  |  NETWORK LOCALIZATION")
    canvas.drawRightString(width - 18 * mm, height - 11.2 * mm, "FEIER LYU  |  JULY 2026")
    canvas.line(18 * mm, 14 * mm, width - 18 * mm, 14 * mm)
    canvas.drawString(18 * mm, 9.7 * mm, "chronohaze.space  |  feier530@icloud.com")
    canvas.drawRightString(width - 18 * mm, 9.7 * mm, f"{doc.page} / 4")
    canvas.restoreState()


def build_story(styles):
    story = []

    # Page 1 - framing and assumptions.
    story.extend(
        [
            Spacer(1, 5 * mm),
            paragraph("Dual Collapse, Projected Edge Budgets, and Saddle Certificates", styles["title"]),
            paragraph(
                "A four-page technical note on structural scoring under translation invariance in network localization",
                styles["subtitle"],
            ),
        ]
    )
    metadata = Table(
        [
            ["Author", "Feier Lyu (Fay Lyu)"],
            ["Area", "Nonconvex optimization / network localization / graph structure"],
            ["Status", "Ongoing collaboration with Prof. Shoham Sabach; public technical summary"],
            ["Companion", "Chinese research essay retained at chronohaze.space"],
        ],
        colWidths=[29 * mm, 145 * mm],
    )
    metadata.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), PALE_BLUE),
                ("BACKGROUND", (1, 0), (1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.4),
                ("TEXTCOLOR", (0, 0), (0, -1), ACCENT),
                ("TEXTCOLOR", (1, 0), (1, -1), INK),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.extend(
        [
            metadata,
            Spacer(1, 5 * mm),
            callout(
                "Purpose and claim discipline",
                "This note separates identities that follow from the stated model from research directions that remain open. The projector score, exact-realizability characterization, stationary-witness identity, and Hessian factorization are presented as derived results. Cycle-rank bounds, local escape constructions, and algorithmic uses of the score are presented as open programs rather than finished theorems.",
                styles,
            ),
            paragraph("1. Model and assumptions", styles["h2"]),
            paragraph(
                "Let G=(V,E) be an oriented measurement graph with N vertices and m edges. Positions live in R^d. The lifted incidence operator B maps a stacked position vector x in R^(Nd) to its edge-displacement vector y=Bx in R^(md); B_l x denotes the block for edge l.",
                styles["body"],
            ),
            paragraph("F(x) = sum_l ( ||B_l x|| - delta_l )^2,     delta_l > 0.", styles["equation"]),
            bullet("The objective is invariant under global translation; no anchor is used in the score derivation.", styles),
            bullet("P is the orthogonal projector onto Range(B), the realizable edge-displacement subspace.", styles),
            bullet("The edge-budget set is V_delta = {u : ||u_l|| &lt;= 2 delta_l for every edge l}.", styles),
            bullet("Stationary-point identities are restricted to differentiable configurations: B_l x is nonzero for every measured edge.", styles),
            bullet("Second-order statements concern the Hessian on node-space directions h, equivalently edge perturbations Bh in Range(B).", styles),
            paragraph("Research question", styles["h2"]),
            paragraph(
                "When ordinary Lagrangian routes collapse to the trivial lower bound because of gauge freedom, can the surviving projection geometry still quantify instance inconsistency and rule out classes of non-minimizing stationary points?",
                styles["body"],
            ),
        ]
    )

    # Page 2 - score and first-order results.
    story.extend(
        [
            PageBreak(),
            paragraph("2. Results I - Static score and stationary witness", styles["page_title"]),
            paragraph("2.1 Projected edge-budget score", styles["h2"]),
            paragraph(
                "The conjugate-based calculation leaves a projector quantity even when the ordinary dual lower bound is uninformative:",
                styles["body"],
            ),
            paragraph(
                "S_dual(B,delta) = sum_l delta_l^2 - (1/4) max_{u in V_delta} ||P u||^2.",
                styles["equation"],
            ),
            bullet("Nonnegativity: projection is nonexpansive and every feasible block satisfies ||u_l|| &lt;= 2 delta_l.", styles),
            bullet("Instance level: S_dual depends on the graph operator and prescribed distances, not on an iterate x.", styles),
            bullet("Cycles matter through Range(B): forests have no edge-space cycle constraint and therefore yield S_dual=0; cyclic graphs can yield a positive score when the budgets are incompatible.", styles),
            callout(
                "Proposition A - Exact realizability",
                "S_dual(B,delta)=0 if and only if there exists x with ||B_l x||=delta_l for every edge. In one direction, u=2Bx is feasible, lies in Range(B), and saturates every block. Conversely, equality in both projection and budget bounds produces a saturated u in Range(B); taking Bx=u/2 realizes all prescribed distances.",
                styles,
                PALE_BLUE,
            ),
            paragraph("2.2 Saturated witness at differentiable stationary points", styles["h2"]),
            paragraph(
                "For a differentiable configuration define the blockwise saturated witness",
                styles["body"],
            ),
            paragraph("u_l(x) = 2 delta_l (B_l x / ||B_l x||).", styles["equation"]),
            paragraph(
                "Stationarity gives B^T(2Bx-u(x))=0. Since 2Bx lies in Range(B) and the residual is orthogonal to Range(B), projection isolates the realizable component:",
                styles["body"],
            ),
            paragraph("P u(x) = 2 Bx.", styles["equation"]),
            callout(
                "Proposition B - Pointwise stationary value identity",
                "At every differentiable stationary point, F(x)=sum_l delta_l^2-(1/4)||P u(x)||^2. Thus the static score optimizes over all feasible budgets, whereas a stationary point supplies one distinguished saturated budget.",
                styles,
            ),
            paragraph("2.3 A nonnegative comparison gap", styles["h2"]),
            paragraph(
                "Define Gap_stat(x)=F(x)-S_dual(B,delta). Using Proposition B, this is one quarter of the difference between the maximum projected budget energy and the energy of the stationary witness. It is nonnegative, but it is not yet a classifier of local minima: points with the same value gap may have different Hessian geometry.",
                styles["body"],
            ),
        ]
    )

    # Page 3 - retention and second order.
    story.extend(
        [
            PageBreak(),
            paragraph("3. Results II - Retention and second-order structure", styles["page_title"]),
            paragraph("3.1 Projected retention", styles["h2"]),
            paragraph(
                "The blockwise distance ratio becomes a dual-side retention ratio at a differentiable stationary point:",
                styles["body"],
            ),
            paragraph(
                "rho_l(x) = ||B_l x|| / delta_l = ||(P u(x))_l|| / ||u_l(x)||.",
                styles["equation"],
            ),
            paragraph(
                "A block with rho_l&lt;1 is under-retained: after the saturated budget is projected into the realizable subspace, that edge loses norm. This translates edge-length screening into a statement about how Range(B) redistributes the budget witness.",
                styles["body"],
            ),
            paragraph("3.2 Hessian factorization", styles["h2"]),
            paragraph(
                "Write q_l=B_l x/||B_l x|| and r_l=||B_l x||. On the differentiable region, the edge-space Hessian block is",
                styles["body"],
            ),
            paragraph(
                "M_l(x) = q_l q_l^T + (1 - delta_l/r_l)(I - q_l q_l^T),",
                styles["equation"],
            ),
            paragraph("and the node-space Hessian factors as", styles["body"]),
            paragraph("H(x) = 2 B^T M(x) B.", styles["equation"]),
            bullet("The radial eigenvalue of M_l is 1.", styles),
            bullet("Each transverse eigenvalue is 1-delta_l/r_l and is negative exactly when r_l&lt;delta_l.", styles),
            bullet("Negative edge curvature is not sufficient by itself: an admissible edge perturbation must equal Bh and therefore lie in Range(B).", styles),
            callout(
                "Conditional strict-saddle certificate",
                "If there exists a node direction h such that (Bh)^T M(x)(Bh)&lt;0, then h^T H(x)h&lt;0 and x is a strict saddle. The unresolved work is to replace this existential condition by checkable graph-level criteria involving under-retained edges, cycle constraints, and neighboring positive curvature.",
                styles,
                PALE_BLUE,
            ),
            paragraph("3.3 Structural reductions under study", styles["h2"]),
            bullet("Cycle-rank accounting: quantify how many transverse negative directions can be removed by edge compatibility constraints.", styles),
            bullet("Signed-Laplacian reduction: restrict to rank-one ambient perturbations and compress the quadratic form to vertex scalars.", styles),
            bullet("Cluster-cut directions: construct perturbations supported on a vertex subset and compare a target negative edge against affected boundary edges.", styles),
            bullet("Local escape mechanism: turn one negative-retention edge into a realizable node-space descent direction with a controlled curvature margin.", styles),
            paragraph("Limitations", styles["h2"]),
            paragraph(
                "The analysis excludes zero-length measured edges at the evaluation point, does not yet provide a complete local-minimum characterization, and does not establish that S_dual predicts algorithmic runtime. These boundaries are deliberate: the score is currently a structural diagnostic, not a surrogate objective.",
                styles["body"],
            ),
        ]
    )

    # Page 4 - open questions and collaboration.
    story.extend(
        [
            PageBreak(),
            paragraph("4. Open questions and collaboration", styles["page_title"]),
            paragraph("4.1 Open mathematical questions", styles["h2"]),
            bullet("Can the negative index of H(x) be bounded below using the number and arrangement of under-retained edges minus an explicit cycle-space correction?", styles),
            bullet("Which graph classes admit a purely combinatorial strict-saddle test derived from projected retention?", styles),
            bullet("Can Gap_stat and the retention profile be combined without overclaiming a full local-optimality classifier?", styles),
            bullet("What changes at nondifferentiable configurations where one or more B_l x vanish? Is a Clarke-type formulation useful, or should those points be separated geometrically?", styles),
            bullet("Can the global score be localized to subgraphs or cuts while retaining an exact-realizability interpretation?", styles),
            paragraph("4.2 Algorithmic questions", styles["h2"]),
            bullet("Use the score or a local variant to choose restarts, escape neighborhoods, or edge-focused perturbations.", styles),
            bullet("Compare score, cycle rank, stress, and observed convergence behavior across synthetic and sensor-network instances.", styles),
            bullet("Design a certified escape step whose decrease estimate includes every edge affected by the chosen node perturbation.", styles),
            bullet("Determine whether score computation or approximation can exploit sparse projectors, Laplacian solvers, or cycle bases.", styles),
            paragraph("4.3 Collaboration sought", styles["h2"]),
            callout(
                "Concrete entry points",
                "I would especially welcome collaboration on: (i) rigorous negative-inertia or cycle-rank bounds; (ii) rigidity and localization interpretations of Range(B); (iii) sparse numerical experiments that test whether projected retention predicts bad stationary geometry; and (iv) a theorem-level escape construction that can later be formalized. Useful backgrounds include nonconvex optimization, spectral graph theory, distance geometry, rigidity, and numerical linear algebra.",
                styles,
            ),
            paragraph("4.4 Reproducible scope", styles["h2"]),
            paragraph(
                "This note is an English technical summary of an ongoing research line. The companion Chinese essays preserve the chronological derivation and informal intuition. Future revisions will keep three labels separate: established identities, conditional certificates, and open conjectures.",
                styles["body"],
            ),
            paragraph("Public materials", styles["h2"]),
            paragraph(
                "Technical note: chronohaze.space/notes/network_localization_structural_certificates.html<br/>"
                "Companion essay: chronohaze.space/post/dual-score-saddle-certificates.html<br/>"
                "Derivation history: chronohaze.space/post/what-i-really-got-when-a-dual-route-failed.html<br/>"
                "Contact: feier530@icloud.com",
                styles["body"],
            ),
            Spacer(1, 4 * mm),
            paragraph(
                "Suggested citation: Feier Lyu, \"Dual Collapse, Projected Edge Budgets, and Saddle Certificates,\" Chronohaze Technical Note, July 2026.",
                styles["small"],
            ),
        ]
    )
    return story


def main() -> int:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    PUBLISH_COPY.parent.mkdir(parents=True, exist_ok=True)
    styles = build_styles()
    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=19 * mm,
        bottomMargin=18 * mm,
        title="Dual Collapse, Projected Edge Budgets, and Saddle Certificates",
        author="Feier Lyu",
        subject="Network localization, duality, invariance, and saddle certificates",
    )
    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
        id="technical-note-frame",
    )
    doc.addPageTemplates(PageTemplate(id="technical-note", frames=[frame], onPage=draw_page))
    doc.build(build_story(styles))
    shutil.copyfile(OUTPUT, PUBLISH_COPY)
    print(f"Wrote {OUTPUT}")
    print(f"Wrote {PUBLISH_COPY}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
