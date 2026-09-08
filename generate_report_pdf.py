import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Preformatted
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        # Do not draw header/footer on title page and inner title page
        if self._pageNumber > 2:
            self.saveState()
            self.setFont("Helvetica", 9)
            self.setFillColor(colors.HexColor("#64748b"))
            # Header
            self.drawString(54, 750, "FITBAT - Fitness Battles & AI Health Monitor")
            self.drawRightString(558, 750, "Project Report")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)
            # Footer
            self.line(54, 48, 558, 48)
            self.drawString(54, 34, "Fr. Agnel Polytechnic, Vashi - AI & ML Dept.")
            self.drawRightString(558, 34, f"Page {self._pageNumber} of {page_count}")
            self.restoreState()

def build_pdf(filename="FITBAT_Project_Report.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'MainTitle',
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        alignment=1, # Center
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=12
    )

    board_style = ParagraphStyle(
        'BoardTitle',
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=20,
        alignment=1,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=14,
        spaceAfter=10,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#2563eb"),
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=colors.HexColor("#334155"),
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        'BulletCustom',
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155"),
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'CodeSnippet',
        fontName='Courier',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0f172a")
    )

    story = []

    # =========================================================================
    # PAGE 1: OUTER TITLE PAGE
    # =========================================================================
    story.append(Spacer(1, 30))
    story.append(Paragraph("MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI", board_style))
    story.append(Spacer(1, 40))
    story.append(Paragraph("PROJECT REPORT ON", ParagraphStyle('SubSub', fontName='Helvetica-Bold', fontSize=13, alignment=1, textColor=colors.HexColor("#475569"))))
    story.append(Spacer(1, 10))
    story.append(Paragraph("FITBAT - Fitness Battles & AI Health Monitor", title_style))
    story.append(Spacer(1, 60))
    
    story.append(Paragraph("<b>SUBMITTED BY:</b>", ParagraphStyle('SubBy', fontName='Helvetica-Bold', fontSize=12, alignment=1, textColor=colors.HexColor("#1e293b"))))
    story.append(Spacer(1, 10))
    story.append(Paragraph("1. Kshitij Pawar (Roll No. 25942)<br/>2. Swaraj Kadam (Roll No. 25928)", ParagraphStyle('Names', fontName='Helvetica', fontSize=11, leading=16, alignment=1)))
    story.append(Spacer(1, 40))

    story.append(Paragraph("<b>GUIDED BY:</b>", ParagraphStyle('Guided', fontName='Helvetica-Bold', fontSize=12, alignment=1, textColor=colors.HexColor("#1e293b"))))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Prof. Neha S.", ParagraphStyle('GuideName', fontName='Helvetica', fontSize=11, alignment=1)))
    story.append(Spacer(1, 60))

    story.append(Paragraph("<b>DEPARTMENT OF ARTIFICIAL INTELLIGENCE & MACHINE LEARNING</b>", ParagraphStyle('Dept', fontName='Helvetica-Bold', fontSize=13, leading=16, alignment=1, textColor=colors.HexColor("#2563eb"))))
    story.append(Spacer(1, 12))
    story.append(Paragraph("Fr. Agnel Polytechnic, Vashi, Navi Mumbai - 400703<br/><b>ACADEMIC YEAR 2026-2027</b>", ParagraphStyle('Inst', fontName='Helvetica', fontSize=11, leading=16, alignment=1)))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: INNER TITLE PAGE
    # =========================================================================
    story.append(Spacer(1, 20))
    story.append(Paragraph("FR. AGNEL POLYTECHNIC VASHI, NAVI MUMBAI - 400703", board_style))
    story.append(Spacer(1, 30))
    story.append(Paragraph("PROJECT NAME:", ParagraphStyle('PN', fontName='Helvetica-Bold', fontSize=13, alignment=1, textColor=colors.HexColor("#475569"))))
    story.append(Spacer(1, 10))
    story.append(Paragraph("FITBAT - Fitness Battles & AI Health Monitor", title_style))
    story.append(Spacer(1, 60))

    name_table_data = [
        [Paragraph("<b>NAME</b>", ParagraphStyle('TH1', fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor("#2563eb"))),
         Paragraph("<b>ROLL NO</b>", ParagraphStyle('TH2', fontName='Helvetica-Bold', fontSize=11, alignment=1, textColor=colors.HexColor("#2563eb")))],
        [Paragraph("1. Kshitij Pawar", body_style), Paragraph("25942", ParagraphStyle('C1', fontName='Helvetica', alignment=1))],
        [Paragraph("2. Swaraj Kadam", body_style), Paragraph("25928", ParagraphStyle('C2', fontName='Helvetica', alignment=1))]
    ]
    t_names = Table(name_table_data, colWidths=[240, 160])
    t_names.setStyle(TableStyle([
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('LINEBELOW', (0,0), (-1,0), 1.5, colors.HexColor("#2563eb")),
        ('LINEBELOW', (0,-1), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    story.append(t_names)
    story.append(Spacer(1, 140))

    guide_table_data = [
        [Paragraph("<b>Prof. Neha S.</b>", ParagraphStyle('G1', fontName='Helvetica-Bold', fontSize=11, alignment=1)),
         Paragraph("<b>Prof. Neha S.</b>", ParagraphStyle('G2', fontName='Helvetica-Bold', fontSize=11, alignment=1))],
        [Paragraph("(SUBJECT TEACHER)", ParagraphStyle('S1', fontName='Helvetica', fontSize=10, alignment=1, textColor=colors.HexColor("#64748b"))),
         Paragraph("(PROJECT GUIDE)", ParagraphStyle('S2', fontName='Helvetica', fontSize=10, alignment=1, textColor=colors.HexColor("#64748b")))]
    ]
    t_guides = Table(guide_table_data, colWidths=[240, 240])
    story.append(t_guides)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: CONTENTS TABLE
    # =========================================================================
    story.append(Paragraph("Contents", h1_style))
    story.append(Spacer(1, 10))
    toc_data = [
        ["ACKNOWLEDGEMENT", "4"],
        ["FITBAT - Fitness Battles & AI Health Monitor Using Python", "5"],
        ["1. Introduction", "5"],
        ["2. Problem Statement", "6"],
        ["3. Objectives", "7"],
        ["4. Technologies Used", "8"],
        ["5. Hardware Requirements", "9"],
        ["6. Software Requirements", "10"],
        ["7. Working of the System", "11"],
        ["8. System Flow", "12"],
        ["9. CODE (Computer Vision Pose Estimation Engine)", "13"],
        ["10. Important Functions Used", "16"],
        ["11. Output & User Interface", "17"],
        ["12. Advantages", "18"],
        ["13. Limitations", "19"],
        ["14. Future Scope", "20"],
        ["15. Conclusion", "21"]
    ]
    toc_table = []
    for item in toc_data:
        dots = ". " * int((460 - len(item[0])*8) / 12)
        toc_table.append([Paragraph(f"<b>{item[0]}</b>", body_style), Paragraph(f"<b>{item[1]}</b>", ParagraphStyle('TR', fontName='Helvetica-Bold', alignment=2))])
    
    t_toc = Table(toc_table, colWidths=[430, 70])
    t_toc.setStyle(TableStyle([
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('LINEBELOW', (0,0), (-1,-1), 0.3, colors.HexColor("#e2e8f0")),
    ]))
    story.append(t_toc)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: ACKNOWLEDGEMENT
    # =========================================================================
    story.append(Paragraph("ACKNOWLEDGEMENT", h1_style))
    story.append(Spacer(1, 12))
    ack_text = (
        "We express our profound gratitude to our project guide, <b>Prof. Neha S.</b>, for her valuable guidance, "
        "constant encouragement, and constructive suggestions throughout the course of this project. Her expertise in Artificial "
        "Intelligence and Machine Learning proved invaluable in designing the real-time biometric pose estimation pipelines and architecture."
        "<br/><br/>"
        "We are also thankful to the <b>Department of Artificial Intelligence & Machine Learning</b> and <b>Fr. Agnel Polytechnic, Vashi</b> "
        "for providing us with state-of-the-art laboratory infrastructure, computational facilities, and continuous support to accomplish this project."
        "<br/><br/>"
        "Finally, we extend our heartfelt appreciation to our parents, faculty members, and peers whose encouragement and cooperation "
        "enabled us to successfully bring the <b>FITBAT</b> project to fruition."
    )
    story.append(Paragraph(ack_text, body_style))
    story.append(Spacer(1, 60))
    
    sig_data = [
        ["", "Kshitij Pawar (25942)"],
        ["", "Swaraj Kadam (25928)"],
        ["", "Department of AI & ML"]
    ]
    t_sig = Table(sig_data, colWidths=[280, 220])
    t_sig.setStyle(TableStyle([('ALIGN', (1,0), (1,-1), 'RIGHT')]))
    story.append(t_sig)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: 1. INTRODUCTION
    # =========================================================================
    story.append(Paragraph("FITBAT - Fitness Battles & AI Health Monitor Using Python", h1_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("1. Introduction", h2_style))
    intro_p1 = (
        "Physical inactivity and improper exercise postures are among the primary causes of musculoskeletal injuries and fitness stagnation "
        "globally. While traditional mobile fitness apps offer workout logging and video tutorials, they lack real-time computer vision biomechanical "
        "feedback, interactive multiplayer competitive incentives, and unified intelligent dietary coaching."
    )
    intro_p2 = (
        "<b>FITBAT</b> is an end-to-end, intelligent fitness battle platform and AI health monitor engineered with <b>Python, WebRTC, and Computer Vision</b>. "
        "By leveraging 3D landmark coordinate tracking via MediaPipe Pose, FITBAT transforms any standard webcam or smartphone camera into an automated, "
        "high-accuracy personal fitness referee. It provides real-time biomechanical repetition counting, cheat-prevention posture validation, "
        "low-latency peer-to-peer multiplayer fitness duels over WebSockets/WebRTC, automated GPS route breadcrumb mapping via OpenStreetMap, "
        "and an AI-powered conversational nutrition and hydration coach."
    )
    story.append(Paragraph(intro_p1, body_style))
    story.append(Paragraph(intro_p2, body_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Key Innovative Highlights:", h2_style))
    story.append(Paragraph("• <b>Computer Vision Pose Ref:</b> Biometric angle calculation across 13 core disciplines with anti-cheat validation.", bullet_style))
    story.append(Paragraph("• <b>Arcade Fitness Battles:</b> Real-time peer video streaming (WebRTC) and instant matchmaking duels.", bullet_style))
    story.append(Paragraph("• <b>AI Health Coach:</b> Conversational diet tracking with calorie, macro (P/C/F), and water hydration logging.", bullet_style))
    story.append(Paragraph("• <b>Open-Source GPS Tracker:</b> Multi-sport route mapping without third-party API keys or subscription fees.", bullet_style))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: 2. PROBLEM STATEMENT
    # =========================================================================
    story.append(Paragraph("2. Problem Statement", h1_style))
    story.append(Spacer(1, 8))
    prob_p1 = (
        "Traditional fitness tracking applications suffer from fundamental limitations that hinder user progress and engagement:"
    )
    story.append(Paragraph(prob_p1, body_style))
    story.append(Paragraph("<b>1. Absence of Real-Time Form Correction:</b> Exercising with incorrect biomechanics (such as sagging hips during pushups or shallow knee flexion during squats) leads to acute tendon strain and long-term joint injury. Standard video tutorials cannot provide corrective feedback.", bullet_style))
    story.append(Paragraph("<b>2. Lack of Social & Competitive Motivation:</b> Solo workouts suffer from high attrition rates. Existing apps rely on passive step counters rather than exciting, head-to-head competitive multiplayer gamification.", bullet_style))
    story.append(Paragraph("<b>3. Manual & Tedious Calorie Logging:</b> Traditional calorie counting requires manual barcode scanning and tedious gram lookups. Users frequently abandon tracking due to complexity.", bullet_style))
    story.append(Paragraph("<b>4. Expensive Hardware & Proprietary Map Paywalls:</b> Many wearable fitness ecosystems require expensive proprietary smartwatches and map APIs that mandate billing keys, restricting access for young athletes and students.", bullet_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Therefore, there is an urgent demand for an integrated, hardware-free fitness ecosystem that combines computer vision biomechanics, real-time peer battles, and automated AI nutrition assistance.", body_style))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 7: 3. OBJECTIVES
    # =========================================================================
    story.append(Paragraph("3. Objectives", h1_style))
    story.append(Spacer(1, 8))
    objs = [
        "<b>1. Develop Real-Time Computer Vision Exercise Tracking:</b> Implement mathematical joint angle analysis and spatial displacement algorithms to accurately count repetitions and assess posture across exercises (Pushups, Squats, Frog Jumps, Bicep Curls, etc.).",
        "<b>2. Build an Anti-Cheat Biomechanical Verification System:</b> Ensure users cannot cheat repetitions through shallow movement, seated posture, or camera nodding by applying horizontal torso and vertical spine validity checks.",
        "<b>3. Architect Low-Latency Peer-to-Peer Fitness Arena:</b> Enable real-time 1v1 fitness battles using WebRTC peer camera feeds and WebSocket synchronization for instant rep bursts, combo surges, and live scorecards.",
        "<b>4. Create AI-Powered Conversational Health Monitor:</b> Provide automated natural language meal calorie estimation, macronutrient breakdown (protein, carbs, fats), and hydration logging.",
        "<b>5. Deploy Hardware-Free Multi-Sport GPS Tracking:</b> Deliver outdoor cycling, running, and walking breadcrumb mapping with kilometer splits using 100% open-source OpenStreetMap layers without third-party API billing restrictions.",
        "<b>6. Gamify Fitness with Live Dynamic Leaderboards:</b> Maintain instant global and discipline-specific leaderboard rankings to incentivize continuous athletic progression."
    ]
    for obj in objs:
        story.append(Paragraph(obj, bullet_style))
        story.append(Spacer(1, 4))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 8: 4. TECHNOLOGIES USED
    # =========================================================================
    story.append(Paragraph("4. Technologies Used", h1_style))
    story.append(Spacer(1, 8))
    tech_data = [
        [Paragraph("<b>Component / Layer</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', textColor=colors.HexColor("#2563eb"))),
         Paragraph("<b>Technology / Framework</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', textColor=colors.HexColor("#2563eb"))),
         Paragraph("<b>Role in FITBAT Project</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', textColor=colors.HexColor("#2563eb")))],
        [Paragraph("Programming Language", body_style), Paragraph("Python 3.10+ / ES6 JavaScript", body_style), Paragraph("Backend server logic, REST APIs, WebSockets, client-side CV processing.", body_style)],
        [Paragraph("Backend Framework", body_style), Paragraph("FastAPI & Uvicorn ASGI", body_style), Paragraph("High-performance asynchronous REST endpoints, JWT auth, and WebSocket management.", body_style)],
        [Paragraph("Computer Vision Engine", body_style), Paragraph("MediaPipe Pose & Trigonometry", body_style), Paragraph("33 3D skeletal landmark detection, vector angle calculations, and rep classification.", body_style)],
        [Paragraph("Real-Time Communications", body_style), Paragraph("WebRTC & WebSockets", body_style), Paragraph("Peer-to-peer video streaming and millisecond-level rep data synchronization.", body_style)],
        [Paragraph("Database Layer", body_style), Paragraph("SQLite3 Relational DB", body_style), Paragraph("Persistent storage of user profiles, nutrition logs, exercise statistics, and match history.", body_style)],
        [Paragraph("AI Conversational Agent", body_style), Paragraph("OpenRouter API / Local Calorie DB", body_style), Paragraph("Intelligent health recommendations, meal decomposition, and coaching advice.", body_style)],
        [Paragraph("GPS & Map Engine", body_style), Paragraph("Leaflet.js & OpenStreetMap", body_style), Paragraph("Interactive live outdoor GPS route tracking without API key requirements.", body_style)]
    ]
    t_tech = Table(tech_data, colWidths=[120, 150, 230])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_tech)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 9: 5. HARDWARE REQUIREMENTS
    # =========================================================================
    story.append(Paragraph("5. Hardware Requirements", h1_style))
    story.append(Spacer(1, 10))
    hw_data = [
        [Paragraph("<b>Hardware Component</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', textColor=colors.HexColor("#2563eb"))),
         Paragraph("<b>Minimum Specification</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', textColor=colors.HexColor("#2563eb"))),
         Paragraph("<b>Recommended Specification</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', textColor=colors.HexColor("#2563eb")))],
        [Paragraph("Processor (CPU)", body_style), Paragraph("Dual Core 2.0 GHz Intel / AMD", body_style), Paragraph("Intel Core i5 / AMD Ryzen 5 or Apple Silicon M-series", body_style)],
        [Paragraph("Random Access Memory", body_style), Paragraph("4 GB RAM", body_style), Paragraph("8 GB - 16 GB DDR4/DDR5 RAM", body_style)],
        [Paragraph("Camera / Sensor", body_style), Paragraph("Standard 720p HD Webcam (30 FPS)", body_style), Paragraph("1080p FHD Webcam (60 FPS) with wide-angle FOV", body_style)],
        [Paragraph("Storage", body_style), Paragraph("2 GB available SSD/HDD storage", body_style), Paragraph("5 GB high-speed NVMe SSD", body_style)],
        [Paragraph("Network Connection", body_style), Paragraph("1 Mbps broadband internet", body_style), Paragraph("10+ Mbps stable broadband / 4G / 5G connection", body_style)],
        [Paragraph("Display Output", body_style), Paragraph("1280 x 720 resolution monitor", body_style), Paragraph("1920 x 1080 FHD IPS display", body_style)]
    ]
    t_hw = Table(hw_data, colWidths=[140, 180, 180])
    t_hw.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_hw)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 10: 6. SOFTWARE REQUIREMENTS
    # =========================================================================
    story.append(Paragraph("6. Software Requirements", h1_style))
    story.append(Spacer(1, 10))
    sw_data = [
        [Paragraph("<b>Software Environment</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', textColor=colors.HexColor("#2563eb"))),
         Paragraph("<b>Specification / Version</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', textColor=colors.HexColor("#2563eb")))],
        [Paragraph("Operating System", body_style), Paragraph("Windows 10 / 11, Linux (Ubuntu 20.04+), macOS Monterey+", body_style)],
        [Paragraph("Python Environment", body_style), Paragraph("Python 3.10, 3.11, or 3.12 (64-bit standard runtime)", body_style)],
        [Paragraph("Web Browser", body_style), Paragraph("Google Chrome 95+, Microsoft Edge 95+, Mozilla Firefox 90+", body_style)],
        [Paragraph("Web Server / ASGI", body_style), Paragraph("Uvicorn ASGI Server with FastAPI Framework", body_style)],
        [Paragraph("Client-Side Libraries", body_style), Paragraph("MediaPipe Pose JS, Leaflet.js, Web Audio API", body_style)],
        [Paragraph("Database Management", body_style), Paragraph("SQLite3 (Embedded, zero-configuration database engine)", body_style)],
        [Paragraph("Code Editor / IDE", body_style), Paragraph("Visual Studio Code, PyCharm, or Antigravity AI IDE", body_style)]
    ]
    t_sw = Table(sw_data, colWidths=[200, 300])
    t_sw.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_sw)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 11: 7. WORKING OF THE SYSTEM
    # =========================================================================
    story.append(Paragraph("7. Working of the System", h1_style))
    story.append(Spacer(1, 8))
    work_steps = [
        "<b>1. Video Acquisition & Skeletal Landmark Inference:</b> The user grants camera access via HTML5 getUserMedia. The video frames are processed at 30 FPS through the MediaPipe Pose neural pipeline, extracting 33 key landmark coordinates in normalized (X, Y, Z) space.",
        "<b>2. Joint Angle & Posture Vector Math:</b> The system computes 2D and 3D spatial vectors formed by adjacent limbs (e.g., Shoulder-Elbow-Wrist for arm exercises, Hip-Knee-Ankle for leg exercises) using the arc-tangent trigonometric formulation: &theta; = |arctan2(C_y - B_y, C_x - B_x) - arctan2(A_y - B_y, A_x - B_x)|.",
        "<b>3. Anti-Cheat Posture Verification:</b> Before allowing repetitions to increment, the system performs geometric validity checks. For instance, pushups require a horizontal torso (|Shoulder_y - Hip_y| < 0.16) and reject seated or standing postures.",
        "<b>4. State Machine Repetition Transition:</b> A finite state machine (e.g., IDLE &rarr; DOWN &rarr; UP &rarr; REP_COUNTED) monitors threshold crossings. Hysteresis thresholds prevent false double counts.",
        "<b>5. Real-Time Multiplayer Networking:</b> When entering the Battle Arena, WebSocket connections assign users into match rooms. WebRTC peer connections establish direct media streams for full-duplex video display.",
        "<b>6. GPS Tracking & Health Logging:</b> Outdoor activities record GPS breadcrumbs on an OpenStreetMap Leaflet layer. The conversational health monitor logs meals and computes calories, macronutrients, and hydration targets."
    ]
    for step in work_steps:
        story.append(Paragraph(step, bullet_style))
        story.append(Spacer(1, 4))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 12: 8. SYSTEM FLOW
    # =========================================================================
    story.append(Paragraph("8. System Flow", h1_style))
    story.append(Spacer(1, 8))
    flow_diagram = (
        "<b>[ USER CAMERA FEED ]</b><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&darr;<br/>"
        "<b>[ MEDIAPIPE POSE ESTIMATION ]</b> (Extracts 33 Landmark Points: (X, Y, Z))<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&darr;<br/>"
        "<b>[ BIOMETRIC ANGLE & VECTOR CALCULATION ]</b> (Joint Angle & Posture Math)<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&darr;<br/>"
        "<b>[ ANTI-CHEAT POSTURE VALIDATION ]</b> (Rejects improper body stances)<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&darr;<br/>"
        "<b>[ FINITE STATE MACHINE (FSM) ]</b> (Checks Hysteresis: Inflexion & Lockout)<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&darr;<br/>"
        "<b>[ REP REGISTERED & HUD BURST TRIGGERED ]</b><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&darr;<br/>"
        "<b>[ WEBSOCKET / WEBRTC PACKET TRANSMISSION ]</b> (Opponent Receives Score & Video)<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&darr;<br/>"
        "<b>[ SQLITE DATABASE COMMIT ]</b> (XP, Leaderboard Rank, Match History Updated)"
    )
    story.append(Paragraph(flow_diagram, ParagraphStyle('FlowBox', fontName='Helvetica', fontSize=10, leading=16, textColor=colors.HexColor("#0f172a"), backColor=colors.HexColor("#f8fafc"), borderColor=colors.HexColor("#cbd5e1"), borderWidth=1, borderPadding=12, spaceBefore=8, spaceAfter=12)))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 13 - 15: 9. CODE (COMPUTER VISION POSE ESTIMATION)
    # =========================================================================
    story.append(Paragraph("9. CODE (Computer Vision Pose Engine in Python)", h1_style))
    story.append(Paragraph("The following Python module represents the core Computer Vision Biometric Repetition Counting and Anti-Cheat Posture Verification Engine utilized in FITBAT:", body_style))
    story.append(Spacer(1, 6))

    # Read cv_pose_engine.py
    cv_code_path = "c:/Users/kshit/Desktop/FITBAT/FITBAT/app/cv_pose_engine.py"
    with open(cv_code_path, "r", encoding="utf-8") as f:
        code_text = f.read()

    # Split into chunks of ~60 lines for clean presentation across pages
    code_lines = code_text.splitlines()
    chunk_size = 58
    chunks = [code_lines[i:i + chunk_size] for i in range(0, len(code_lines), chunk_size)]

    for idx, chunk in enumerate(chunks):
        if idx > 0:
            story.append(PageBreak())
            story.append(Paragraph(f"9. CODE (Continued - Part {idx+1})", h1_style))
            story.append(Spacer(1, 6))
        
        pre = Preformatted("\n".join(chunk), code_style)
        t_code = Table([[pre]], colWidths=[504])
        t_code.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(t_code)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 16: 10. IMPORTANT FUNCTIONS USED
    # =========================================================================
    story.append(Paragraph("10. Important Functions Used", h1_style))
    story.append(Spacer(1, 8))
    fn_data = [
        [Paragraph("<b>Function / Method</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', textColor=colors.HexColor("#2563eb"))),
         Paragraph("<b>Module / Class</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', textColor=colors.HexColor("#2563eb"))),
         Paragraph("<b>Technical Description</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', textColor=colors.HexColor("#2563eb")))],
        [Paragraph("<code>calculate_angle(a, b, c)</code>", body_style), Paragraph("FitbatPoseCVEngine", body_style), Paragraph("Computes normalized interior angle using 2D arctangent difference across three landmarks.", body_style)],
        [Paragraph("<code>process_frame_landmarks()</code>", body_style), Paragraph("FitbatPoseCVEngine", body_style), Paragraph("Executes exercise-specific biomechanical checks, posture filters, and updates rep count.", body_style)],
        [Paragraph("<code>connect_player()</code>", body_style), Paragraph("BattleManager", body_style), Paragraph("Handles private arena code matching, random queue pooling, and AI fallback match initiation.", body_style)],
        [Paragraph("<code>forward_webrtc_signaling()</code>", body_style), Paragraph("BattleManager", body_style), Paragraph("Routes SDP offers, SDP answers, and ICE candidate packets between battle participants.", body_style)],
        [Paragraph("<code>finish_match()</code>", body_style), Paragraph("BattleManager", body_style), Paragraph("Calculates XP, records wins/losses, handles surrender events, and notifies both players.", body_style)],
        [Paragraph("<code>estimate_food_calories()</code>", body_style), Paragraph("FitnessCoachChatbot", body_style), Paragraph("Extracts food keywords and quantities from chat messages and calculates total macros.", body_style)],
        [Paragraph("<code>initMap()</code>", body_style), Paragraph("StravaTracker", body_style), Paragraph("Initializes Leaflet map using free OpenStreetMap tiles with GPS polyline rendering.", body_style)]
    ]
    t_fn = Table(fn_data, colWidths=[150, 120, 230])
    t_fn.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_fn)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 17: 11. OUTPUT & USER INTERFACE
    # =========================================================================
    story.append(Paragraph("11. Output & User Interface", h1_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph("The FITBAT system provides a unified, responsive single-page interface consisting of 6 core modules:", body_style))
    story.append(Paragraph("<b>1. Real-Time Split-Screen Battle Arena:</b> Displays simultaneous side-by-side feeds showing the user's camera on the left and the opponent's live WebRTC stream on the right. Both viewports feature persistent, non-occluded HUD overlays with live rep counts, combo multiplier gauges, and power bars.", bullet_style))
    story.append(Paragraph("<b>2. Automated Pose Tracker Overlay:</b> Overlays high-contrast skeletal joints and bone segments directly onto the user's live video, accompanied by dynamic feedback prompts (e.g., 'Deep Parallel Squat! Drive up!').", bullet_style))
    story.append(Paragraph("<b>3. Outdoor GPS Strava-Style Tracker:</b> Displays interactive live GPS route mapping on dark-mode OpenStreetMap tiles, live speed/pace gauges, kilometer split times, elevation ascent, and step pedometer metrics.", bullet_style))
    story.append(Paragraph("<b>4. Daily Health Monitor & AI Coach:</b> Renders interactive calorie progress rings, macronutrient breakdown progress cards (Protein, Carbs, Fats), daily hydration cups, and an AI conversational chatbot drawer.", bullet_style))
    story.append(Paragraph("<b>5. Dynamic Arena Leaderboards:</b> Renders global XP leaderboards alongside exercise-specific rankings (Wins, Max Reps in a Single Match, Win Rate) with instant cache-busting refresh buttons.", bullet_style))
    story.append(Paragraph("<b>6. Gym Beats Music Player:</b> Features an interactive multi-genre workout audio player with worldwide iTunes online music search, Web Audio synthesizer, and live spectrum equalizer.", bullet_style))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 18: 12. ADVANTAGES
    # =========================================================================
    story.append(Paragraph("12. Advantages", h1_style))
    story.append(Spacer(1, 8))
    advs = [
        "<b>1. Zero Hardware Cost:</b> Operates directly through standard webcams and mobile browsers without requiring expensive wearable sensors or proprietary fitness watches.",
        "<b>2. Biomechanically Accurate Form Validation:</b> Prevents false reps and injury through multi-point anatomical checks (e.g., verifying horizontal torso for pushups).",
        "<b>3. Low Latency Real-Time Multiplayer:</b> Direct peer-to-peer WebRTC video feeds enable immersive, lag-free competitive battles across different geographic locations.",
        "<b>4. Free, Unlimited Mapping:</b> Employs pure OpenStreetMap tile layers with automatic failover, eliminating expensive Google Maps / Mapbox API key paywalls.",
        "<b>5. Unified Holistic Health Solution:</b> Integrates workout battle gamification, outdoor cardio tracking, and automated dietary calorie monitoring into one platform."
    ]
    for adv in advs:
        story.append(Paragraph(adv, bullet_style))
        story.append(Spacer(1, 4))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 19: 13. LIMITATIONS
    # =========================================================================
    story.append(Paragraph("13. Limitations", h1_style))
    story.append(Spacer(1, 8))
    limits = [
        "<b>1. Camera Field of View Constraint:</b> Full-body exercises (e.g., Jumping Jacks, Frog Jumps) require the user to position the camera 6-8 feet away to maintain landmark visibility.",
        "<b>2. Lighting & Occlusion Dependency:</b> Dimly lit workout spaces or loose, baggy clothing can reduce landmark confidence scores below the 0.25 threshold.",
        "<b>3. WebRTC NAT Traversal:</b> While public STUN servers handle standard network configurations, symmetric corporate firewalls may require dedicated TURN relays.",
        "<b>4. Geolocation Drift:</b> Browser GPS accuracy relies on device hardware and satellite reception, which may fluctuate in dense urban high-rise areas."
    ]
    for limit in limits:
        story.append(Paragraph(limit, bullet_style))
        story.append(Spacer(1, 4))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 20: 14. FUTURE SCOPE
    # =========================================================================
    story.append(Paragraph("14. Future Scope", h1_style))
    story.append(Spacer(1, 8))
    futures = [
        "<b>1. Native Mobile Applications:</b> Porting the web application to native Android and iOS using Flutter or React Native with TensorFlow Lite for offline neural inference.",
        "<b>2. Wearable Smartwatch Integration:</b> Synchronizing real-time heart rate zones (BPM) and VO2 max metrics from Apple Watch and Wear OS devices during multiplayer battles.",
        "<b>3. Tournament Clan Battles:</b> Introducing 5v5 team fitness tournaments, bracket elimination leagues, and collegiate fitness championships.",
        "<b>4. Computer Vision Barbell / Dumbbell Tracking:</b> Incorporating object detection (YOLOv8) to track free-weight barbell trajectories and bar velocity for powerlifting.",
        "<b>5. Multi-Language Audio Coaching:</b> Adding localized Hindi, Marathi, and regional voice coaching synthesis for accessibility across rural and urban fitness communities."
    ]
    for fut in futures:
        story.append(Paragraph(fut, bullet_style))
        story.append(Spacer(1, 4))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 21: 15. CONCLUSION
    # =========================================================================
    story.append(Paragraph("15. Conclusion", h1_style))
    story.append(Spacer(1, 10))
    concl_p1 = (
        "The <b>FITBAT</b> project successfully addresses the prevailing challenges of exercise posture injuries, workout abandonment, "
        "and fragmented fitness tracking by uniting <b>Computer Vision Pose Estimation, Real-Time WebRTC Peer Battling, and AI Dietary Coaching</b> "
        "into an accessible, open-source software ecosystem."
    )
    concl_p2 = (
        "By implementing 3D skeletal joint mathematical algorithms in Python and JavaScript, FITBAT delivers instant, reliable rep counting "
        "and form validation with zero proprietary hardware requirements. The platform's real-time multiplayer arena proves that gamification and "
        "friendly competition significantly enhance athletic consistency and motivation. FITBAT establishes a robust foundation for next-generation "
        "digital sports training and automated biomechanical health monitoring."
    )
    story.append(Paragraph(concl_p1, body_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph(concl_p2, body_style))
    story.append(Spacer(1, 40))

    end_box = Paragraph("<b>*** END OF PROJECT REPORT ***</b>", ParagraphStyle('End', fontName='Helvetica-Bold', fontSize=11, alignment=1, textColor=colors.HexColor("#64748b")))
    story.append(end_box)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Project report successfully compiled: {filename}")

if __name__ == "__main__":
    build_pdf("FITBAT_Project_Report.pdf")
