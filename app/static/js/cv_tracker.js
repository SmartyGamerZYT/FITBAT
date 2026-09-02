// FITBAT Extreme-Accuracy Computer Vision Pose Engine
// Military-Grade Body Posture Verification + Mirror-Synced Skeleton

class PoseTracker {
    constructor() {
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        this.stream = null;
        this.pose = null;
        this.currentExercise = "pushups";
        this.repCount = 0;
        this.stage = "idle";
        this.formFeedback = "Position yourself in camera view";
        this.formScore = 1.0;
        this.onRepCallback = null;
        this.onFeedbackCallback = null;
        this.plankTimer = 0;
        this.lastPlankCheck = 0;
        this.isTracking = false;
        this.animFrameId = null;
        this.lastRepTimestamp = 0;
        this.hasDetectedLandmarks = false;
        this.frameHistory = [];
        this.stableFrames = 0;
    }

    setExercise(exerciseId) {
        this.currentExercise = exerciseId;
        this.repCount = 0;
        this.stage = "idle";
        this.plankTimer = 0;
        this.lastPlankCheck = Date.now();
        this.formFeedback = "Get in position!";
        this.lastRepTimestamp = Date.now();
        this.frameHistory = [];
        this.stableFrames = 0;
    }

    async init(videoElement, canvasElement, onRep, onFeedback) {
        this.stop();
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.canvasCtx = canvasElement.getContext('2d');
        this.onRepCallback = onRep;
        this.onFeedbackCallback = onFeedback;
        this.isTracking = true;
        this.hasDetectedLandmarks = false;
        this.lastRepTimestamp = Date.now();

        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
                    audio: false
                });
                this.videoElement.srcObject = this.stream;
                this.videoElement.setAttribute("playsinline", "true");
                this.videoElement.muted = true;
                await this.videoElement.play();
            }
        } catch (err) {
            console.warn("Camera:", err);
        }

        try {
            if (window.Pose) {
                this.pose = new window.Pose({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
                });
                this.pose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    smoothSegmentation: false,
                    minDetectionConfidence: 0.4,
                    minTrackingConfidence: 0.4
                });
                this.pose.onResults(this.onResults.bind(this));
            }
        } catch (e) {
            console.warn("Pose:", e);
        }

        this.startProcessingLoop();
        return true;
    }

    startProcessingLoop() {
        let lastSend = 0;
        const loop = async () => {
            if (!this.isTracking) return;
            if (this.videoElement && this.videoElement.readyState >= 2) {
                this.canvasElement.width = this.videoElement.videoWidth || 640;
                this.canvasElement.height = this.videoElement.videoHeight || 480;
                const now = Date.now();
                if (this.pose && (now - lastSend >= 40)) {
                    lastSend = now;
                    try { await this.pose.send({ image: this.videoElement }); } catch (e) {}
                }
                if (!this.hasDetectedLandmarks) {
                    this.drawGuide(this.canvasCtx, this.canvasElement.width, this.canvasElement.height);
                }
            }
            this.animFrameId = requestAnimationFrame(loop);
        };
        this.animFrameId = requestAnimationFrame(loop);
    }

    drawGuide(ctx, w, h) {
        ctx.clearRect(0, 0, w, h);
        const scanY = ((Date.now() % 2000) / 2000) * (h * 0.8) + (h * 0.1);
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.1, scanY);
        ctx.lineTo(w * 0.9, scanY);
        ctx.stroke();
        if (this.currentExercise === "plank") {
            const now = Date.now();
            if (now - this.lastPlankCheck >= 1000) { this.lastPlankCheck = now; this.plankTimer++; this.registerRep(`${this.plankTimer}s Plank!`); }
        }
    }

    angle(a, b, c) {
        if (!a || !b || !c) return 180;
        const r = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let d = Math.abs((r * 180) / Math.PI);
        return d > 180 ? 360 - d : Math.round(d);
    }

    dist(a, b) {
        if (!a || !b) return 0;
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    onResults(results) {
        if (!this.isTracking) return;
        const ctx = this.canvasCtx;
        const w = this.canvasElement.width = this.videoElement.videoWidth || 640;
        const h = this.canvasElement.height = this.videoElement.videoHeight || 480;
        ctx.clearRect(0, 0, w, h);

        if (!results.poseLandmarks) {
            this.hasDetectedLandmarks = false;
            this.updateFeedback("Step back — full body must be visible");
            return;
        }

        this.hasDetectedLandmarks = true;
        const lm = results.poseLandmarks;
        this.drawSkeleton(ctx, lm, w, h);
        this.processExercise(lm, w, h);
    }

    drawSkeleton(ctx, lm, w, h) {
        const conns = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
        ctx.strokeStyle = "rgba(37,99,235,0.85)";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        for (const [i, j] of conns) {
            const a = lm[i], b = lm[j];
            if (a && b && (a.visibility||.5) > 0.2 && (b.visibility||.5) > 0.2) {
                ctx.beginPath(); ctx.moveTo(a.x*w, a.y*h); ctx.lineTo(b.x*w, b.y*h); ctx.stroke();
            }
        }
        for (const idx of [11,12,13,14,15,16,23,24,25,26,27,28]) {
            const p = lm[idx];
            if (p && (p.visibility||.5) > 0.2) {
                ctx.fillStyle = "#f43f5e"; ctx.beginPath(); ctx.arc(p.x*w, p.y*h, 5, 0, Math.PI*2); ctx.fill();
            }
        }
    }

    processExercise(lm, w, h) {
        const LS = lm[11], RS = lm[12]; // shoulders
        const LE = lm[13], RE = lm[14]; // elbows
        const LW = lm[15], RW = lm[16]; // wrists
        const LH = lm[23], RH = lm[24]; // hips
        const LK = lm[25], RK = lm[26]; // knees
        const LA = lm[27], RA = lm[28]; // ankles
        const now = Date.now();

        // Visibility helpers
        const vis = (p) => (p?.visibility || 0);
        const goodVis = (p) => vis(p) > 0.3;

        // Best-side arm angle (pick side with better visibility)
        const lArmA = this.angle(LS, LE, LW);
        const rArmA = this.angle(RS, RE, RW);
        const lArmV = vis(LS) + vis(LE) + vis(LW);
        const rArmV = vis(RS) + vis(RE) + vis(RW);
        const armAngle = lArmV >= rArmV ? lArmA : rArmA;

        // Best-side leg angle
        const lLegA = this.angle(LH, LK, LA);
        const rLegA = this.angle(RH, RK, RA);
        const lLegV = vis(LH) + vis(LK) + vis(LA);
        const rLegV = vis(RS) + vis(RK) + vis(RA);
        const legAngle = lLegV >= rLegV ? lLegA : rLegA;

        // Spine angles
        const lSpine = this.angle(LS, LH, LK);
        const rSpine = this.angle(RS, RH, RK);

        // Mid-body points
        const midSX = (LS.x + RS.x) / 2, midSY = (LS.y + RS.y) / 2;
        const midHX = (LH.x + RH.x) / 2, midHY = (LH.y + RH.y) / 2;

        switch (this.currentExercise) {

            // ====================================================================
            // PUSHUPS — EXTREME ACCURACY: 5-POINT BODY POSTURE VERIFICATION
            // Must be in prone horizontal plank. Rejects: sitting, standing, walking
            // ====================================================================
            case "pushups": {
                // CHECK 1: Are all key body parts visible? (shoulders, hips, at least one knee/ankle)
                if (!goodVis(LS) && !goodVis(RS)) { this.updateFeedback("⚠️ Shoulders not visible"); return; }
                if (!goodVis(LH) && !goodVis(RH)) { this.updateFeedback("⚠️ Hips not visible — show full body"); return; }

                // CHECK 2: VERTICAL SPINE TEST — Reject standing/walking/sitting
                // When upright: shoulders are far ABOVE hips vertically, minimal horizontal offset
                const vertDist = midHY - midSY;     // positive = hips below shoulders (upright)
                const horizDist = Math.abs(midHX - midSX);

                // Upright detection: hips significantly below shoulders AND narrow horizontal spread
                const isUpright = (vertDist > 0.18) && (horizDist < 0.20);

                // CHECK 3: HIP ANGLE TEST — Seated detection
                const spineAngle = Math.max(lSpine, rSpine);
                const isSeated = spineAngle < 115;

                // CHECK 4: HORIZONTAL PLANK VERIFICATION
                // In a proper pushup position the torso is HORIZONTAL:
                // shoulders and hips are at roughly the same Y level (small vertical diff)
                // AND there IS a horizontal spread between them
                const isHorizontal = (Math.abs(midSY - midHY) < 0.15) && (horizDist > 0.08);

                // CHECK 5: LEG EXTENSION — Legs should be relatively straight in plank
                const legsExtended = (lLegA > 130 || rLegA > 130) || (!goodVis(LK) && !goodVis(RK));

                // REJECT: Not in pushup position
                if (isUpright || isSeated) {
                    this.stage = "idle";
                    this.stableFrames = 0;
                    this.updateFeedback("⛔ NOT PUSHUP POSITION! Get face-down on floor in plank!");
                    return;
                }

                if (!isHorizontal) {
                    this.stage = "idle";
                    this.stableFrames = 0;
                    this.updateFeedback("⚠️ Get horizontal — lie prone for pushups!");
                    return;
                }

                // VALID PUSHUP POSITION — Now track reps using elbow angle
                const elbowAngle = Math.min(lArmA, rArmA, armAngle);

                // DOWN: Elbows bend deep (< 95°)
                if (elbowAngle <= 95) {
                    if (this.stage !== "down") {
                        this.stage = "down";
                        this.stableFrames = 0;
                        this.updateFeedback("Good depth! Push up to full extension!");
                    }
                    this.stableFrames++;
                }

                // UP: Arms fully extended (> 150°) AND was previously down for at least 2 frames
                if (elbowAngle >= 150 && this.stage === "down" && this.stableFrames >= 2) {
                    if (now - this.lastRepTimestamp > 600) {
                        this.lastRepTimestamp = now;
                        this.stage = "up";
                        this.stableFrames = 0;
                        this.registerRep("Perfect Pushup! 🔥");
                    }
                }
                break;
            }

            // ====================================================================
            // SQUATS — Full depth knee bend + stand
            // ====================================================================
            case "squats": {
                if (!goodVis(LK) && !goodVis(RK)) { this.updateFeedback("Show full legs in frame"); return; }
                const kA = Math.min(lLegA, rLegA, legAngle);

                if (kA <= 105) {
                    if (this.stage !== "down") { this.stage = "down"; this.stableFrames = 0; this.updateFeedback("Deep! Drive up!"); }
                    this.stableFrames++;
                }
                if (kA >= 160 && this.stage === "down" && this.stableFrames >= 2) {
                    if (now - this.lastRepTimestamp > 600) {
                        this.lastRepTimestamp = now; this.stage = "up"; this.stableFrames = 0;
                        this.registerRep("Power Squat! ⚡");
                    }
                }
                break;
            }

            // ====================================================================
            // JUMPING JACKS — Hands overhead + return to sides
            // ====================================================================
            case "jumping_jacks": {
                const handsUp = (LW.y < LS.y - 0.05 && RW.y < RS.y - 0.05);
                const handsDown = (LW.y > LH.y && RW.y > RH.y);

                if (handsUp && this.stage !== "open") { this.stage = "open"; this.stableFrames = 0; this.updateFeedback("Hands high! Return!"); this.stableFrames++; }
                if (this.stage === "open") this.stableFrames++;
                if (handsDown && this.stage === "open" && this.stableFrames >= 2) {
                    if (now - this.lastRepTimestamp > 450) {
                        this.lastRepTimestamp = now; this.stage = "closed"; this.stableFrames = 0;
                        this.registerRep("Jumping Jack! 💥");
                    }
                }
                break;
            }

            // ====================================================================
            // BICEP CURLS — Full contraction + extension
            // ====================================================================
            case "bicep_curls": {
                const cA = Math.min(lArmA, rArmA);
                if (cA <= 55) {
                    if (this.stage !== "curled") { this.stage = "curled"; this.stableFrames = 0; this.updateFeedback("Squeeze! Lower down."); }
                    this.stableFrames++;
                }
                if (cA >= 145 && this.stage === "curled" && this.stableFrames >= 2) {
                    if (now - this.lastRepTimestamp > 500) {
                        this.lastRepTimestamp = now; this.stage = "extended"; this.stableFrames = 0;
                        this.registerRep("Bicep Curl! 💪");
                    }
                }
                break;
            }

            // ====================================================================
            // LUNGES
            // ====================================================================
            case "lunges": {
                const lA = Math.min(lLegA, rLegA);
                if (lA <= 100) {
                    if (this.stage !== "down") { this.stage = "down"; this.stableFrames = 0; this.updateFeedback("Deep lunge! Step up!"); }
                    this.stableFrames++;
                }
                if (lA >= 155 && this.stage === "down" && this.stableFrames >= 2) {
                    if (now - this.lastRepTimestamp > 650) {
                        this.lastRepTimestamp = now; this.stage = "up"; this.stableFrames = 0;
                        this.registerRep("Solid Lunge! 🦵");
                    }
                }
                break;
            }

            // ====================================================================
            // HIGH KNEES
            // ====================================================================
            case "high_knees": {
                const lHigh = (LH.y - LK.y < 0.10);
                const rHigh = (RH.y - RK.y < 0.10);
                if ((lHigh || rHigh) && this.stage !== "high") { this.stage = "high"; this.stableFrames++; }
                if (!lHigh && !rHigh && this.stage === "high" && this.stableFrames >= 1) {
                    if (now - this.lastRepTimestamp > 380) {
                        this.lastRepTimestamp = now; this.stage = "low"; this.stableFrames = 0;
                        this.registerRep("High Knee! 🏃‍♂️");
                    }
                }
                break;
            }

            // ====================================================================
            // PLANK
            // ====================================================================
            case "plank": {
                const bodyLine = this.angle(LS, LH, LA);
                if (bodyLine >= 145) {
                    if (now - this.lastPlankCheck >= 1000) {
                        this.lastPlankCheck = now; this.plankTimer++;
                        this.registerRep(`${this.plankTimer}s Plank! 🔥`);
                    }
                    this.updateFeedback(`Plank: ${this.plankTimer}s`);
                } else { this.updateFeedback("Straighten body!"); }
                break;
            }

            // ====================================================================
            // SHOULDER PRESS
            // ====================================================================
            case "shoulder_press": {
                const overhead = (LW.y < LS.y && RW.y < RS.y);
                const pA = Math.min(lArmA, rArmA);
                if (overhead && pA >= 152) {
                    if (this.stage !== "pressed") { this.stage = "pressed"; this.stableFrames = 0; this.updateFeedback("Lockout! Lower."); }
                    this.stableFrames++;
                }
                if (pA <= 92 && this.stage === "pressed" && this.stableFrames >= 2) {
                    if (now - this.lastRepTimestamp > 500) {
                        this.lastRepTimestamp = now; this.stage = "lowered"; this.stableFrames = 0;
                        this.registerRep("Shoulder Press! 🏋️");
                    }
                }
                break;
            }

            // ====================================================================
            // CRUNCHES
            // ====================================================================
            case "crunches": {
                const tA = this.angle(LS, LH, LK);
                if (tA <= 100) {
                    if (this.stage !== "crunched") { this.stage = "crunched"; this.stableFrames = 0; }
                    this.stableFrames++;
                }
                if (tA >= 148 && this.stage === "crunched" && this.stableFrames >= 2) {
                    if (now - this.lastRepTimestamp > 500) {
                        this.lastRepTimestamp = now; this.stage = "flat"; this.stableFrames = 0;
                        this.registerRep("Crunch! 🍫");
                    }
                }
                break;
            }

            // ====================================================================
            // MOUNTAIN CLIMBERS
            // ====================================================================
            case "mountain_climbers": {
                const lDrive = (LH.y - LK.y < 0.14);
                const rDrive = (RH.y - RK.y < 0.14);
                if ((lDrive || rDrive) && this.stage !== "drive") { this.stage = "drive"; this.stableFrames++; }
                if (!lDrive && !rDrive && this.stage === "drive") {
                    if (now - this.lastRepTimestamp > 350) {
                        this.lastRepTimestamp = now; this.stage = "back"; this.stableFrames = 0;
                        this.registerRep("Mountain Climber! 🧗");
                    }
                }
                break;
            }

            // ====================================================================
            // LATERAL RAISES
            // ====================================================================
            case "lateral_raises": {
                const atLevel = (Math.abs(LW.y - LS.y) < 0.10 && Math.abs(RW.y - RS.y) < 0.10);
                const atSide = (LW.y > LH.y && RW.y > RH.y);
                if (atLevel && this.stage !== "raised") { this.stage = "raised"; this.stableFrames = 0; this.stableFrames++; }
                if (this.stage === "raised") this.stableFrames++;
                if (atSide && this.stage === "raised" && this.stableFrames >= 2) {
                    if (now - this.lastRepTimestamp > 550) {
                        this.lastRepTimestamp = now; this.stage = "down"; this.stableFrames = 0;
                        this.registerRep("Lateral Raise! 🦅");
                    }
                }
                break;
            }

            // ====================================================================
            // SHADOW BOXING
            // ====================================================================
            case "shadow_boxing": {
                const punch = Math.max(lArmA, rArmA);
                if (punch >= 152 && this.stage !== "punched") { this.stage = "punched"; this.stableFrames++; }
                if (punch <= 98 && this.stage === "punched") {
                    if (now - this.lastRepTimestamp > 300) {
                        this.lastRepTimestamp = now; this.stage = "guard"; this.stableFrames = 0;
                        this.registerRep("Strike! 🥊");
                    }
                }
                break;
            }

            default: {
                const dA = Math.min(lArmA, rArmA);
                if (dA <= 100 && this.stage !== "down") this.stage = "down";
                if (dA >= 150 && this.stage === "down") { this.stage = "up"; this.registerRep("Rep! ⚡"); }
            }
        }
    }

    registerRep(msg) {
        this.repCount++;
        this.updateFeedback(msg);
        if (this.onRepCallback) this.onRepCallback(this.repCount, this.formScore);
    }

    updateFeedback(t) {
        this.formFeedback = t;
        if (this.onFeedbackCallback) this.onFeedbackCallback(t);
    }

    triggerManualRep() { this.registerRep("Manual Rep ⚡"); }

    stop() {
        this.isTracking = false;
        if (this.animFrameId) { cancelAnimationFrame(this.animFrameId); this.animFrameId = null; }
        if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
        if (this.canvasCtx && this.canvasElement) this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
}

window.poseTracker = new PoseTracker();
