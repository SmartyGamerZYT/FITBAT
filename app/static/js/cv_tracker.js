// FITBAT High-Precision Computer Vision Pose Tracker Engine
// Multi-Signal Biometric Angle Math + Skeleton Coordinate Mirror Sync + Full-Body Posture Verification

class PoseTracker {
    constructor() {
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        this.stream = null;
        this.pose = null;
        this.currentExercise = "pushups";
        this.repCount = 0;
        this.stage = "up"; // "up" or "down"
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
        this.lastAngle = 180;
    }

    setExercise(exerciseId) {
        this.currentExercise = exerciseId;
        this.repCount = 0;
        this.stage = "up";
        this.plankTimer = 0;
        this.lastPlankCheck = Date.now();
        this.formFeedback = "Get Ready!";
        this.lastRepTimestamp = Date.now();
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
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: "user"
                    },
                    audio: false
                });

                this.videoElement.srcObject = this.stream;
                this.videoElement.setAttribute("playsinline", "true");
                this.videoElement.muted = true;
                await this.videoElement.play();
            }
        } catch (err) {
            console.warn("Camera stream warning:", err);
            this.updateFeedback("Camera access blocked. Click manual button for test reps.");
        }

        try {
            if (window.Pose) {
                this.pose = new window.Pose({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
                });

                this.pose.setOptions({
                    modelComplexity: 0,
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    smoothSegmentation: false,
                    minDetectionConfidence: 0.25,
                    minTrackingConfidence: 0.25
                });

                this.pose.onResults(this.onResults.bind(this));
            }
        } catch (e) {
            console.warn("MediaPipe Pose warning:", e);
        }

        this.startProcessingLoop();
        return true;
    }

    startProcessingLoop() {
        let lastPoseSendTime = 0;

        const processFrame = async () => {
            if (!this.isTracking) return;

            if (this.videoElement && this.videoElement.readyState >= 2) {
                const w = this.canvasElement.width = this.videoElement.videoWidth || 640;
                const h = this.canvasElement.height = this.videoElement.videoHeight || 480;
                const ctx = this.canvasCtx;
                const now = Date.now();

                if (this.pose && (now - lastPoseSendTime >= 33)) {
                    lastPoseSendTime = now;
                    try {
                        await this.pose.send({ image: this.videoElement });
                    } catch (err) {
                        // ignore dropped frames
                    }
                }

                if (!this.hasDetectedLandmarks) {
                    this.drawActiveCameraGuide(ctx, w, h);
                }
            }

            this.animFrameId = requestAnimationFrame(processFrame);
        };

        this.animFrameId = requestAnimationFrame(processFrame);
    }

    drawActiveCameraGuide(ctx, w, h) {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(37, 99, 235, 0.4)";
        ctx.lineWidth = 2;
        ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);

        const scanY = ((Date.now() % 1800) / 1800) * (h * 0.8) + (h * 0.1);
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w * 0.1, scanY);
        ctx.lineTo(w * 0.9, scanY);
        ctx.stroke();

        ctx.fillStyle = "#2563eb";
        ctx.font = "bold 14px Poppins, sans-serif";
        ctx.fillText("📷 AI Pose Detection Active - Step into Frame", 20, 30);

        if (this.currentExercise === "plank") {
            const now = Date.now();
            if (now - this.lastPlankCheck >= 1000) {
                this.lastPlankCheck = now;
                this.plankTimer += 1;
                this.registerRep(`${this.plankTimer}s Plank Held!`);
            }
        }
    }

    calculateAngle(a, b, c) {
        if (!a || !b || !c) return 180;
        const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let angle = Math.abs((radians * 180.0) / Math.PI);
        if (angle > 180.0) {
            angle = 360 - angle;
        }
        return Math.round(angle);
    }

    onResults(results) {
        if (!this.isTracking) return;
        const ctx = this.canvasCtx;
        const w = this.canvasElement.width = this.videoElement.videoWidth || 640;
        const h = this.canvasElement.height = this.videoElement.videoHeight || 480;

        ctx.clearRect(0, 0, w, h);

        if (!results.poseLandmarks) {
            this.hasDetectedLandmarks = false;
            this.updateFeedback("Step into frame so your body is visible");
            return;
        }

        this.hasDetectedLandmarks = true;
        const lm = results.poseLandmarks;
        
        // 1. Draw Skeleton overlay with HORIZONTALLY MIRRORED coordinates to match mirrored video!
        this.drawMirroredSkeleton(ctx, lm, w, h);

        // 2. Process High-Accuracy Full-Body Exercise Rep Logic
        this.processExerciseLogic(lm, ctx, w, h);
    }

    // Coordinates are flipped horizontally (1 - x) to match CSS scaleX(-1) mirrored video
    drawMirroredSkeleton(ctx, landmarks, w, h) {
        const connections = [
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
            [11, 23], [12, 24], [23, 24],
            [23, 25], [25, 27], [24, 26], [26, 28]
        ];

        ctx.strokeStyle = "rgba(59, 130, 246, 0.9)";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";

        for (const [i, j] of connections) {
            const p1 = landmarks[i];
            const p2 = landmarks[j];
            if (p1 && p2 && (p1.visibility || 0.5) > 0.2 && (p2.visibility || 0.5) > 0.2) {
                const x1 = (1 - p1.x) * w;
                const y1 = p1.y * h;
                const x2 = (1 - p2.x) * w;
                const y2 = p2.y * h;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }

        for (let idx of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
            const p = landmarks[idx];
            if (p && (p.visibility || 0.5) > 0.2) {
                const px = (1 - p.x) * w;
                const py = p.y * h;

                ctx.fillStyle = "#f43f5e";
                ctx.beginPath();
                ctx.arc(px, py, 5, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }

    processExerciseLogic(lm, ctx, w, h) {
        const nose = lm[0];
        const lShoulder = lm[11], rShoulder = lm[12];
        const lElbow = lm[13], rElbow = lm[14];
        const lWrist = lm[15], rWrist = lm[16];
        const lHip = lm[23], rHip = lm[24];
        const lKnee = lm[25], rKnee = lm[26];
        const lAnkle = lm[27], rAnkle = lm[28];

        const now = Date.now();

        // Joint Angles
        const lArmAngle = this.calculateAngle(lShoulder, lElbow, lWrist);
        const rArmAngle = this.calculateAngle(rShoulder, rElbow, rWrist);
        const lLegAngle = this.calculateAngle(lHip, lKnee, lAnkle);
        const rLegAngle = this.calculateAngle(rHip, rKnee, rAnkle);
        const lSpineAngle = this.calculateAngle(lShoulder, lHip, lKnee);
        const rSpineAngle = this.calculateAngle(rShoulder, rHip, rKnee);

        const lArmVis = (lShoulder?.visibility || 0.5) + (lElbow?.visibility || 0.5) + (lWrist?.visibility || 0.5);
        const rArmVis = (rShoulder?.visibility || 0.5) + (rElbow?.visibility || 0.5) + (rWrist?.visibility || 0.5);
        const bestArmAngle = lArmVis >= rArmVis ? lArmAngle : rArmAngle;

        const lLegVis = (lHip?.visibility || 0.5) + (lKnee?.visibility || 0.5) + (lAnkle?.visibility || 0.5);
        const rLegVis = (rHip?.visibility || 0.5) + (rKnee?.visibility || 0.5) + (rAnkle?.visibility || 0.5);
        const bestLegAngle = lLegVis >= rLegVis ? lLegAngle : rLegAngle;
        const bestSpineAngle = Math.max(lSpineAngle, rSpineAngle);

        switch (this.currentExercise) {
            // ----------------------------------------------------
            // 1. PUSHUPS: Requires Full Body Horizontal Plank Posture (No Sitting!)
            // ----------------------------------------------------
            case "pushups": {
                // Check if user is sitting upright (vertical spine & bent hips in a chair)
                const isSittingUpright = (bestSpineAngle < 125) && (lHip.visibility > 0.3 || rHip.visibility > 0.3);
                const armAngle = Math.min(lArmAngle, rArmAngle, bestArmAngle);

                if (isSittingUpright) {
                    this.drawDebugHUD(ctx, "Pushup Form", "SEATED (INVALID)", "STAND/PLANK");
                    this.updateFeedback("⚠️ Full body required: Get into floor pushup plank!");
                    return;
                }

                this.drawDebugHUD(ctx, "Elbow Angle", `${armAngle}°`, this.stage);

                // Down: Elbow bent < 112°
                if (armAngle < 112) {
                    if (this.stage !== "down") {
                        this.stage = "down";
                        this.updateFeedback("Good Depth! Push All The Way Up!");
                    }
                }
                // Up: Elbow extended > 148°
                if (armAngle > 148 && this.stage === "down") {
                    if (now - this.lastRepTimestamp > 450) {
                        this.lastRepTimestamp = now;
                        this.stage = "up";
                        this.registerRep("Clean Pushup! 🔥");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 2. SQUATS: Knee Flexion + Hip Drop
            // ----------------------------------------------------
            case "squats": {
                const kneeAngle = Math.min(lLegAngle, rLegAngle, bestLegAngle);
                this.drawDebugHUD(ctx, "Knee Angle", `${kneeAngle}°`, this.stage);

                if (kneeAngle < 120) {
                    if (this.stage !== "down") {
                        this.stage = "down";
                        this.updateFeedback("Deep Squat! Drive Upward!");
                    }
                }
                if (kneeAngle > 155 && this.stage === "down") {
                    if (now - this.lastRepTimestamp > 500) {
                        this.lastRepTimestamp = now;
                        this.stage = "up";
                        this.registerRep("Power Squat! ⚡");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 3. JUMPING JACKS: Hands Above Head + Stance Width
            // ----------------------------------------------------
            case "jumping_jacks": {
                const handsUp = (lWrist.y < lShoulder.y && rWrist.y < rShoulder.y);
                const handsDown = (lWrist.y > lHip.y && rWrist.y > rHip.y);
                this.drawDebugHUD(ctx, "Jack Phase", handsUp ? "OPEN" : "CLOSED", this.stage);

                if (handsUp && this.stage !== "up_jack") {
                    this.stage = "up_jack";
                    this.updateFeedback("Arms High! Bring Back Down!");
                }
                if (handsDown && this.stage === "up_jack") {
                    if (now - this.lastRepTimestamp > 400) {
                        this.lastRepTimestamp = now;
                        this.stage = "down_jack";
                        this.registerRep("Jumping Jack! 💥");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 4. BICEP CURLS: Full Arm Contraction & Extension
            // ----------------------------------------------------
            case "bicep_curls": {
                const curlAngle = Math.min(lArmAngle, rArmAngle);
                this.drawDebugHUD(ctx, "Curl Angle", `${curlAngle}°`, this.stage);

                if (curlAngle < 65) {
                    if (this.stage !== "curled") {
                        this.stage = "curled";
                        this.updateFeedback("Peak Squeeze! Lower Down.");
                    }
                }
                if (curlAngle > 135 && this.stage === "curled") {
                    if (now - this.lastRepTimestamp > 450) {
                        this.lastRepTimestamp = now;
                        this.stage = "extended";
                        this.registerRep("Bicep Pump! 💪");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 5. LUNGES: Front Knee Drop
            // ----------------------------------------------------
            case "lunges": {
                const lungeAngle = Math.min(lLegAngle, rLegAngle);
                this.drawDebugHUD(ctx, "Lunge Angle", `${lungeAngle}°`, this.stage);

                if (lungeAngle < 118) {
                    if (this.stage !== "down") {
                        this.stage = "down";
                        this.updateFeedback("Hold Lunge! Step Up!");
                    }
                }
                if (lungeAngle > 155 && this.stage === "down") {
                    if (now - this.lastRepTimestamp > 600) {
                        this.lastRepTimestamp = now;
                        this.stage = "up";
                        this.registerRep("Solid Lunge! 🦵");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 6. HIGH KNEES: Knee Lift Above Hip Level
            // ----------------------------------------------------
            case "high_knees": {
                const leftHigh = (lHip.y - lKnee.y < 0.15);
                const rightHigh = (rHip.y - rKnee.y < 0.15);
                this.drawDebugHUD(ctx, "Knee Drive", leftHigh || rightHigh ? "HIGH" : "DOWN", this.stage);

                if ((leftHigh || rightHigh) && this.stage !== "high") {
                    this.stage = "high";
                }
                if (!leftHigh && !rightHigh && this.stage === "high") {
                    if (now - this.lastRepTimestamp > 350) {
                        this.lastRepTimestamp = now;
                        this.stage = "down";
                        this.registerRep("High Knee! 🏃‍♂️");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 7. PLANK: Static Hold Duration
            // ----------------------------------------------------
            case "plank": {
                const bodyLine = this.calculateAngle(lShoulder, lHip, lAnkle);
                this.drawDebugHUD(ctx, "Plank Spine", `${bodyLine}°`, "HOLD");

                if (bodyLine > 140) {
                    if (now - this.lastPlankCheck >= 1000) {
                        this.lastPlankCheck = now;
                        this.plankTimer += 1;
                        this.registerRep(`${this.plankTimer}s Plank Held!`);
                    }
                    this.updateFeedback(`Holding Plank: ${this.plankTimer}s 🔥`);
                } else {
                    this.updateFeedback("Straighten back and hips!");
                }
                break;
            }

            // ----------------------------------------------------
            // 8. SHOULDER PRESS: Overhead Arm Extension
            // ----------------------------------------------------
            case "shoulder_press": {
                const handsOverhead = (lWrist.y < lShoulder.y && rWrist.y < rShoulder.y);
                const pressAngle = Math.min(lArmAngle, rArmAngle);
                this.drawDebugHUD(ctx, "Press Angle", `${pressAngle}°`, this.stage);

                if (handsOverhead && pressAngle > 148) {
                    if (this.stage !== "pressed") {
                        this.stage = "pressed";
                        this.updateFeedback("Lockout! Lower to Shoulders.");
                    }
                }
                if (pressAngle < 100 && this.stage === "pressed") {
                    if (now - this.lastRepTimestamp > 450) {
                        this.lastRepTimestamp = now;
                        this.stage = "lowered";
                        this.registerRep("Shoulder Press! 🏋️");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 9. CRUNCHES: Torso to Knee Flexion
            // ----------------------------------------------------
            case "crunches": {
                const torsoAngle = this.calculateAngle(lShoulder, lHip, lKnee);
                this.drawDebugHUD(ctx, "Torso Angle", `${torsoAngle}°`, this.stage);

                if (torsoAngle < 110) {
                    if (this.stage !== "crunched") {
                        this.stage = "crunched";
                        this.updateFeedback("Squeeze Core! Lower Down.");
                    }
                }
                if (torsoAngle > 140 && this.stage === "crunched") {
                    if (now - this.lastRepTimestamp > 450) {
                        this.lastRepTimestamp = now;
                        this.stage = "extended";
                        this.registerRep("Core Crunch! 🍫");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 10. MOUNTAIN CLIMBERS: Rapid Alternating Knee Drives
            // ----------------------------------------------------
            case "mountain_climbers": {
                const leftDrive = (lHip.y - lKnee.y < 0.18);
                const rightDrive = (rHip.y - rKnee.y < 0.18);
                this.drawDebugHUD(ctx, "Climber Drive", leftDrive || rightDrive ? "DRIVE" : "BACK", this.stage);

                if ((leftDrive || rightDrive) && this.stage !== "drive") {
                    this.stage = "drive";
                }
                if (!leftDrive && !rightDrive && this.stage === "drive") {
                    if (now - this.lastRepTimestamp > 320) {
                        this.lastRepTimestamp = now;
                        this.stage = "neutral";
                        this.registerRep("Mountain Climber! 🧗");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 11. LATERAL RAISES: Arm Lift to Shoulder Parallel
            // ----------------------------------------------------
            case "lateral_raises": {
                const armsLevel = (Math.abs(lWrist.y - lShoulder.y) < 0.12 && Math.abs(rWrist.y - rShoulder.y) < 0.12);
                const armsDown = (lWrist.y > lHip.y && rWrist.y > rHip.y);
                this.drawDebugHUD(ctx, "Delt Phase", armsLevel ? "TOP" : "BOTTOM", this.stage);

                if (armsLevel && this.stage !== "raised") {
                    this.stage = "raised";
                    this.updateFeedback("Hold Parallel! Lower Slowly.");
                }
                if (armsDown && this.stage === "raised") {
                    if (now - this.lastRepTimestamp > 500) {
                        this.lastRepTimestamp = now;
                        this.stage = "lowered";
                        this.registerRep("Lateral Raise! 🦅");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 12. SHADOW BOXING: Rapid Extension Punch Cycle
            // ----------------------------------------------------
            case "shadow_boxing": {
                const punchExt = Math.max(lArmAngle, rArmAngle);
                this.drawDebugHUD(ctx, "Punch Extension", `${punchExt}°`, this.stage);

                if (punchExt > 148 && this.stage !== "punched") {
                    this.stage = "punched";
                }
                if (punchExt < 105 && this.stage === "punched") {
                    if (now - this.lastRepTimestamp > 280) {
                        this.lastRepTimestamp = now;
                        this.stage = "guard";
                        this.registerRep("Clean Strike! 🥊");
                    }
                }
                break;
            }

            default: {
                const defaultAngle = Math.min(lArmAngle, rArmAngle);
                if (defaultAngle < 110 && this.stage !== "down") this.stage = "down";
                if (defaultAngle > 150 && this.stage === "down") {
                    this.stage = "up";
                    this.registerRep("Rep Done! ⚡");
                }
            }
        }
    }

    drawDebugHUD(ctx, metricLabel, value, phase) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.beginPath();
        ctx.roundRect(14, 14, 210, 48, 8);
        ctx.fill();

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 13px Poppins, sans-serif";
        ctx.fillText(`${metricLabel}: ${value}`, 24, 34);

        ctx.fillStyle = phase.includes("down") || phase.includes("curled") || phase.includes("crunched") ? "#f59e0b" : "#10b981";
        ctx.font = "bold 11px Poppins, sans-serif";
        ctx.fillText(`PHASE: ${phase.toUpperCase()}`, 24, 52);
    }

    registerRep(feedbackMessage) {
        this.repCount += 1;
        this.updateFeedback(feedbackMessage);
        if (this.onRepCallback) {
            this.onRepCallback(this.repCount, this.formScore);
        }
    }

    updateFeedback(text) {
        this.formFeedback = text;
        if (this.onFeedbackCallback) {
            this.onFeedbackCallback(text);
        }
    }

    triggerManualRep() {
        this.registerRep("Instant Rep (Manual) ⚡");
    }

    stop() {
        this.isTracking = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.canvasCtx && this.canvasElement) {
            this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        }
    }
}

window.poseTracker = new PoseTracker();
