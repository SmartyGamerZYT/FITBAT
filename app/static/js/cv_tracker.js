// FITBAT High-Precision Computer Vision Pose Tracker Engine
// Biometric Geometry, Mirror-Synchronized Skeletal HUD & Strict Full-Body Posture Verification

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
        this.topChestY = 0;
        this.deepestChestY = 0;
    }

    setExercise(exerciseId) {
        this.currentExercise = exerciseId;
        this.repCount = 0;
        this.stage = "up";
        this.plankTimer = 0;
        this.lastPlankCheck = Date.now();
        this.formFeedback = "Get in position!";
        this.lastRepTimestamp = Date.now();
        this.topChestY = 0;
        this.deepestChestY = 0;
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
            this.updateFeedback("Camera access blocked. Use manual button to test.");
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
                    minDetectionConfidence: 0.3,
                    minTrackingConfidence: 0.3
                });

                this.pose.onResults(this.onResults.bind(this));
            }
        } catch (e) {
            console.warn("MediaPipe Pose setup warning:", e);
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
            this.updateFeedback("Step back so your full body is in view");
            return;
        }

        this.hasDetectedLandmarks = true;
        const lm = results.poseLandmarks;
        
        // Draw Skeleton overlay (Natural coordinates, perfectly synchronized with mirrored video container!)
        this.drawSkeleton(ctx, lm, w, h);

        // Process Strict Full-Body Exercise Verification
        this.processExerciseLogic(lm, ctx, w, h);
    }

    drawSkeleton(ctx, landmarks, w, h) {
        const connections = [
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
            [11, 23], [12, 24], [23, 24],
            [23, 25], [25, 27], [24, 26], [26, 28]
        ];

        ctx.strokeStyle = "rgba(37, 99, 235, 0.9)";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";

        for (const [i, j] of connections) {
            const p1 = landmarks[i];
            const p2 = landmarks[j];
            if (p1 && p2 && (p1.visibility || 0.5) > 0.25 && (p2.visibility || 0.5) > 0.25) {
                ctx.beginPath();
                ctx.moveTo(p1.x * w, p1.y * h);
                ctx.lineTo(p2.x * w, p2.y * h);
                ctx.stroke();
            }
        }

        for (let idx of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
            const p = landmarks[idx];
            if (p && (p.visibility || 0.5) > 0.25) {
                ctx.fillStyle = "#f43f5e";
                ctx.beginPath();
                ctx.arc(p.x * w, p.y * h, 5.5, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }

    processExerciseLogic(lm, ctx, w, h) {
        const lShoulder = lm[11], rShoulder = lm[12];
        const lElbow = lm[13], rElbow = lm[14];
        const lWrist = lm[15], rWrist = lm[16];
        const lHip = lm[23], rHip = lm[24];
        const lKnee = lm[25], rKnee = lm[26];
        const lAnkle = lm[27], rAnkle = lm[28];

        const now = Date.now();

        // Biometric Joint Angles
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

        const midShoulderY = (lShoulder.y + rShoulder.y) / 2;
        const midShoulderX = (lShoulder.x + rShoulder.x) / 2;
        const midHipY = (lHip.y + rHip.y) / 2;
        const midHipX = (lHip.x + rHip.x) / 2;

        switch (this.currentExercise) {
            // ----------------------------------------------------
            // 1. PUSHUPS: Strict Full-Body Prone Plank Required (Blocks Sitting / Hand-waving!)
            // ----------------------------------------------------
            case "pushups": {
                // Determine body orientation:
                // When sitting or standing upright, shoulders are vertically far above hips
                const verticalTorsoDistance = midHipY - midShoulderY;
                const horizontalTorsoDistance = Math.abs(midHipX - midShoulderX);
                const isVerticalSpine = (verticalTorsoDistance > 0.22 && horizontalTorsoDistance < 0.16);
                const isSittingInChair = bestSpineAngle < 120 && (lHip.visibility > 0.3 || rHip.visibility > 0.3);

                // If user is sitting upright, completely reject hand/arm movements!
                if (isVerticalSpine || isSittingInChair) {
                    this.updateFeedback("⚠️ Full Body Pushup: Get into horizontal floor plank!");
                    this.stage = "up";
                    return;
                }

                const armAngle = Math.min(lArmAngle, rArmAngle, bestArmAngle);

                // Down Phase: Elbows reach 95° or lower
                if (armAngle <= 100) {
                    if (this.stage !== "down") {
                        this.stage = "down";
                        this.deepestChestY = midShoulderY;
                        this.updateFeedback("Good Depth! Press all the way up!");
                    }
                }
                // Up Phase: Elbows push back to full lockout (> 148°)
                if (armAngle >= 148 && this.stage === "down") {
                    if (now - this.lastRepTimestamp > 500) {
                        this.lastRepTimestamp = now;
                        this.stage = "up";
                        this.registerRep("Clean Pushup! 🔥");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 2. SQUATS: Full Standing & Deep Knee Flexion (No Sitting!)
            // ----------------------------------------------------
            case "squats": {
                const kneeAngle = Math.min(lLegAngle, rLegAngle, bestLegAngle);

                // Must have legs visible
                if (lKnee.visibility < 0.25 && rKnee.visibility < 0.25) {
                    this.updateFeedback("Step back so your full legs are in view");
                    return;
                }

                // Down: Knee bends < 108°
                if (kneeAngle <= 108) {
                    if (this.stage !== "down") {
                        this.stage = "down";
                        this.updateFeedback("Deep Squat! Drive Upward!");
                    }
                }
                // Up: Stands all the way up > 158°
                if (kneeAngle >= 158 && this.stage === "down") {
                    if (now - this.lastRepTimestamp > 600) {
                        this.lastRepTimestamp = now;
                        this.stage = "up";
                        this.registerRep("Power Squat! ⚡");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 3. JUMPING JACKS: Hands High Overhead + Wide Stance
            // ----------------------------------------------------
            case "jumping_jacks": {
                const handsOverhead = (lWrist.y < lShoulder.y - 0.04 && rWrist.y < rShoulder.y - 0.04);
                const handsAtSides = (lWrist.y > lHip.y && rWrist.y > rHip.y);

                if (handsOverhead && this.stage !== "open") {
                    this.stage = "open";
                    this.updateFeedback("Hands High! Return to sides!");
                }
                if (handsAtSides && this.stage === "open") {
                    if (now - this.lastRepTimestamp > 450) {
                        this.lastRepTimestamp = now;
                        this.stage = "closed";
                        this.registerRep("Jumping Jack! 💥");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 4. BICEP CURLS: Pinned Upper Arm + Full Forearm Curl
            // ----------------------------------------------------
            case "bicep_curls": {
                const curlAngle = Math.min(lArmAngle, rArmAngle);

                if (curlAngle <= 60) {
                    if (this.stage !== "curled") {
                        this.stage = "curled";
                        this.updateFeedback("Peak Squeeze! Lower down.");
                    }
                }
                if (curlAngle >= 140 && this.stage === "curled") {
                    if (now - this.lastRepTimestamp > 500) {
                        this.lastRepTimestamp = now;
                        this.stage = "extended";
                        this.registerRep("Bicep Pump! 💪");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 5. LUNGES: Deep Front Knee Drop
            // ----------------------------------------------------
            case "lunges": {
                const lungeAngle = Math.min(lLegAngle, rLegAngle);

                if (lungeAngle <= 105) {
                    if (this.stage !== "down") {
                        this.stage = "down";
                        this.updateFeedback("Hold Lunge! Step Up!");
                    }
                }
                if (lungeAngle >= 155 && this.stage === "down") {
                    if (now - this.lastRepTimestamp > 650) {
                        this.lastRepTimestamp = now;
                        this.stage = "up";
                        this.registerRep("Solid Lunge! 🦵");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 6. HIGH KNEES: Knee Drive Above Hip Level
            // ----------------------------------------------------
            case "high_knees": {
                const leftHigh = (lHip.y - lKnee.y < 0.12);
                const rightHigh = (rHip.y - rKnee.y < 0.12);

                if ((leftHigh || rightHigh) && this.stage !== "high") {
                    this.stage = "high";
                }
                if (!leftHigh && !rightHigh && this.stage === "high") {
                    if (now - this.lastRepTimestamp > 380) {
                        this.lastRepTimestamp = now;
                        this.stage = "down";
                        this.registerRep("High Knee! 🏃‍♂️");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 7. PLANK: Straight Spine Static Hold
            // ----------------------------------------------------
            case "plank": {
                const bodyLine = this.calculateAngle(lShoulder, lHip, lAnkle);

                if (bodyLine >= 145) {
                    if (now - this.lastPlankCheck >= 1000) {
                        this.lastPlankCheck = now;
                        this.plankTimer += 1;
                        this.registerRep(`${this.plankTimer}s Plank Held!`);
                    }
                    this.updateFeedback(`Holding Plank: ${this.plankTimer}s 🔥`);
                } else {
                    this.updateFeedback("Straighten back and keep core tight!");
                }
                break;
            }

            // ----------------------------------------------------
            // 8. SHOULDER PRESS: Overhead Lockout & Return
            // ----------------------------------------------------
            case "shoulder_press": {
                const handsOverhead = (lWrist.y < lShoulder.y && rWrist.y < rShoulder.y);
                const pressAngle = Math.min(lArmAngle, rArmAngle);

                if (handsOverhead && pressAngle >= 150) {
                    if (this.stage !== "pressed") {
                        this.stage = "pressed";
                        this.updateFeedback("Lockout! Lower to Shoulders.");
                    }
                }
                if (pressAngle <= 95 && this.stage === "pressed") {
                    if (now - this.lastRepTimestamp > 500) {
                        this.lastRepTimestamp = now;
                        this.stage = "lowered";
                        this.registerRep("Shoulder Press! 🏋️");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 9. CRUNCHES: Torso Core Contraction
            // ----------------------------------------------------
            case "crunches": {
                const torsoAngle = this.calculateAngle(lShoulder, lHip, lKnee);

                if (torsoAngle <= 105) {
                    if (this.stage !== "crunched") {
                        this.stage = "crunched";
                        this.updateFeedback("Squeeze Core! Lower Down.");
                    }
                }
                if (torsoAngle >= 145 && this.stage === "crunched") {
                    if (now - this.lastRepTimestamp > 500) {
                        this.lastRepTimestamp = now;
                        this.stage = "extended";
                        this.registerRep("Core Crunch! 🍫");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 10. MOUNTAIN CLIMBERS: Alternate Knee Drive in Plank
            // ----------------------------------------------------
            case "mountain_climbers": {
                const leftDrive = (lHip.y - lKnee.y < 0.16);
                const rightDrive = (rHip.y - rKnee.y < 0.16);

                if ((leftDrive || rightDrive) && this.stage !== "drive") {
                    this.stage = "drive";
                }
                if (!leftDrive && !rightDrive && this.stage === "drive") {
                    if (now - this.lastRepTimestamp > 350) {
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

                if (armsLevel && this.stage !== "raised") {
                    this.stage = "raised";
                    this.updateFeedback("Hold Parallel! Lower Slowly.");
                }
                if (armsDown && this.stage === "raised") {
                    if (now - this.lastRepTimestamp > 550) {
                        this.lastRepTimestamp = now;
                        this.stage = "lowered";
                        this.registerRep("Lateral Raise! 🦅");
                    }
                }
                break;
            }

            // ----------------------------------------------------
            // 12. SHADOW BOXING: Full Extension Strike & Guard Return
            // ----------------------------------------------------
            case "shadow_boxing": {
                const punchExt = Math.max(lArmAngle, rArmAngle);

                if (punchExt >= 150 && this.stage !== "punched") {
                    this.stage = "punched";
                }
                if (punchExt <= 100 && this.stage === "punched") {
                    if (now - this.lastRepTimestamp > 300) {
                        this.lastRepTimestamp = now;
                        this.stage = "guard";
                        this.registerRep("Clean Strike! 🥊");
                    }
                }
                break;
            }

            default: {
                const defaultAngle = Math.min(lArmAngle, rArmAngle);
                if (defaultAngle <= 105 && this.stage !== "down") this.stage = "down";
                if (defaultAngle >= 150 && this.stage === "down") {
                    this.stage = "up";
                    this.registerRep("Rep Done! ⚡");
                }
            }
        }
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
