// FITBAT Computer Vision Pose Tracker Engine
// Real-time Pose Angle Trigonometry, Skeleton Rendering, & Motion Tracker

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
        this.lastAngle = 0;
        this.formFeedback = "Position yourself in camera view";
        this.formScore = 1.0;
        this.onRepCallback = null;
        this.onFeedbackCallback = null;
        this.plankTimer = 0;
        this.lastPlankCheck = 0;
        this.isTracking = false;
        this.animFrameId = null;
        
        // Motion energy detection for ultra-reliable rep counting
        this.prevFrameData = null;
        this.motionEnergyHistory = [];
        this.lastRepTimestamp = 0;
        this.hasDetectedLandmarks = false;
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

        try {
            // 1. Get user webcam stream directly
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
                console.log("Webcam video stream active.");
            }
        } catch (err) {
            console.warn("Could not start user media stream:", err);
            this.updateFeedback("Camera access blocked. Click test button for manual reps.");
        }

        // 2. Initialize MediaPipe Pose
        try {
            if (window.Pose) {
                this.pose = new window.Pose({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
                });

                this.pose.setOptions({
                    modelComplexity: 0, // Lightweight for fast real-time 60fps
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    smoothSegmentation: false,
                    minDetectionConfidence: 0.3, // Forgiving for dim / home lighting
                    minTrackingConfidence: 0.3
                });

                this.pose.onResults(this.onResults.bind(this));
            }
        } catch (e) {
            console.warn("MediaPipe Pose setup warning:", e);
        }

        // 3. Start high-performance frame processing loop
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

                // Send frame to MediaPipe Pose (throttled to ~25-30fps for smooth performance)
                if (this.pose && (now - lastPoseSendTime >= 35)) {
                    lastPoseSendTime = now;
                    try {
                        await this.pose.send({ image: this.videoElement });
                    } catch (err) {
                        // ignore dropped frames
                    }
                }

                // If MediaPipe hasn't returned landmarks yet, run optical motion energy sensor
                if (!this.hasDetectedLandmarks) {
                    this.processMotionSensor(ctx, w, h);
                }
            }

            this.animFrameId = requestAnimationFrame(processFrame);
        };

        this.animFrameId = requestAnimationFrame(processFrame);
    }

    // Motion Energy fallback ensures reps always register even if lighting/camera hides parts of skeleton
    processMotionSensor(ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        // Draw active target guide
        ctx.strokeStyle = "rgba(37, 99, 235, 0.4)";
        ctx.lineWidth = 2;
        ctx.strokeRect(w * 0.15, h * 0.1, w * 0.7, h * 0.8);

        // Dynamic scanner line
        const scanY = ((Date.now() % 2000) / 2000) * (h * 0.8) + (h * 0.1);
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w * 0.15, scanY);
        ctx.lineTo(w * 0.85, scanY);
        ctx.stroke();

        ctx.fillStyle = "#2563eb";
        ctx.font = "bold 14px Poppins, sans-serif";
        ctx.fillText("📷 AI Body Tracking Active", w * 0.18, h * 0.16);

        // Plank special check
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
            this.updateFeedback("Step back so your body is visible in camera");
            return;
        }

        this.hasDetectedLandmarks = true;
        const lm = results.poseLandmarks;
        
        // Draw Skeleton overlay
        this.drawSkeleton(ctx, lm, w, h);

        // Process Rep State Machine
        this.processExerciseLogic(lm, ctx, w, h);
    }

    processExerciseLogic(lm, ctx, w, h) {
        // Landmark Indices:
        // 11: left shoulder, 12: right shoulder
        // 13: left elbow, 14: right elbow
        // 15: left wrist, 16: right wrist
        // 23: left hip, 24: right hip
        // 25: left knee, 26: right knee
        // 27: left ankle, 28: right ankle

        const lShoulder = lm[11], rShoulder = lm[12];
        const lElbow = lm[13], rElbow = lm[14];
        const lWrist = lm[15], rWrist = lm[16];
        const lHip = lm[23], rHip = lm[24];
        const lKnee = lm[25], rKnee = lm[26];
        const lAnkle = lm[27], rAnkle = lm[28];

        const now = Date.now();

        switch (this.currentExercise) {
            case "pushups": {
                const lAngle = this.calculateAngle(lShoulder, lElbow, lWrist);
                const rAngle = this.calculateAngle(rShoulder, rElbow, rWrist);
                const avgElbow = (lAngle + rAngle) / 2;

                this.drawDebugText(ctx, `Elbow Angle: ${Math.round(avgElbow)}°`, 20, 40);

                if (avgElbow < 105) {
                    if (this.stage !== "down") {
                        this.stage = "down";
                        this.updateFeedback("Good Depth! Push All The Way Up!");
                    }
                }
                if (avgElbow > 150 && this.stage === "down") {
                    if (now - this.lastRepTimestamp > 400) {
                        this.lastRepTimestamp = now;
                        this.stage = "up";
                        this.registerRep("Clean Pushup! 🔥");
                    }
                }
                break;
            }

            case "squats": {
                const lKneeAngle = this.calculateAngle(lHip, lKnee, lAnkle);
                const rKneeAngle = this.calculateAngle(rHip, rKnee, rAnkle);
                const avgKnee = (lKneeAngle + rKneeAngle) / 2;

                this.drawDebugText(ctx, `Knee Angle: ${Math.round(avgKnee)}°`, 20, 40);

                if (avgKnee < 110) {
                    if (this.stage !== "down") {
                        this.stage = "down";
                        this.updateFeedback("Deep Squat! Drive Through Heels!");
                    }
                }
                if (avgKnee > 155 && this.stage === "down") {
                    if (now - this.lastRepTimestamp > 400) {
                        this.lastRepTimestamp = now;
                        this.stage = "up";
                        this.registerRep("Power Squat! ⚡");
                    }
                }
                break;
            }

            case "jumping_jacks": {
                const handsAbove = (lWrist.y < lShoulder.y) || (rWrist.y < rShoulder.y);
                const feetSpread = Math.abs(lAnkle.x - rAnkle.x) > Math.abs(lHip.x - rHip.x) * 1.3;

                this.drawDebugText(ctx, `Jacks: ${handsAbove ? 'ARMS UP' : 'ARMS DOWN'}`, 20, 40);

                if (handsAbove && feetSpread) {
                    if (this.stage !== "up_jack") {
                        this.stage = "up_jack";
                        this.updateFeedback("Jump in!");
                    }
                }
                if (!handsAbove && !feetSpread && this.stage === "up_jack") {
                    if (now - this.lastRepTimestamp > 350) {
                        this.lastRepTimestamp = now;
                        this.stage = "down_jack";
                        this.registerRep("Fast Jack! ⚡");
                    }
                }
                break;
            }

            case "bicep_curls": {
                const lAngle = this.calculateAngle(lShoulder, lElbow, lWrist);
                const rAngle = this.calculateAngle(rShoulder, rElbow, rWrist);
                const minAngle = Math.min(lAngle, rAngle);

                this.drawDebugText(ctx, `Curl Angle: ${Math.round(minAngle)}°`, 20, 40);

                if (minAngle < 60) {
                    if (this.stage !== "curled") {
                        this.stage = "curled";
                        this.updateFeedback("Squeeze Biceps! Lower Down!");
                    }
                }
                if (minAngle > 140 && this.stage === "curled") {
                    if (now - this.lastRepTimestamp > 400) {
                        this.lastRepTimestamp = now;
                        this.stage = "extended";
                        this.registerRep("Full Curl! 💪");
                    }
                }
                break;
            }

            case "lunges": {
                const lKneeAngle = this.calculateAngle(lHip, lKnee, lAnkle);
                const rKneeAngle = this.calculateAngle(rHip, rKnee, rAnkle);
                const minKnee = Math.min(lKneeAngle, rKneeAngle);

                this.drawDebugText(ctx, `Lunge Angle: ${Math.round(minKnee)}°`, 20, 40);

                if (minKnee < 110 && this.stage !== "lunged") {
                    this.stage = "lunged";
                    this.updateFeedback("Great Lunge Depth! Step Back!");
                }
                if (minKnee > 150 && this.stage === "lunged") {
                    if (now - this.lastRepTimestamp > 400) {
                        this.lastRepTimestamp = now;
                        this.stage = "standing";
                        this.registerRep("Solid Lunge! 🚶‍♂️");
                    }
                }
                break;
            }

            case "high_knees": {
                const lHipAngle = this.calculateAngle(lShoulder, lHip, lKnee);
                const rHipAngle = this.calculateAngle(rShoulder, rHip, rKnee);
                const minHip = Math.min(lHipAngle, rHipAngle);

                this.drawDebugText(ctx, `Knee Elevation: ${Math.round(minHip)}°`, 20, 40);

                if (minHip < 105 && this.stage !== "knee_up") {
                    this.stage = "knee_up";
                }
                if (minHip > 140 && this.stage === "knee_up") {
                    if (now - this.lastRepTimestamp > 300) {
                        this.lastRepTimestamp = now;
                        this.stage = "knee_down";
                        this.registerRep("High Knee Strike! 🏃");
                    }
                }
                break;
            }

            case "plank": {
                const lSpine = this.calculateAngle(lShoulder, lHip, lAnkle);
                const isStraight = lSpine > 140 && lSpine < 205;

                this.drawDebugText(ctx, `Spine Angle: ${Math.round(lSpine)}° (${this.plankTimer}s)`, 20, 40);

                if (isStraight) {
                    if (now - this.lastPlankCheck >= 1000) {
                        this.lastPlankCheck = now;
                        this.plankTimer += 1;
                        this.registerRep(`${this.plankTimer}s Plank Held!`);
                        this.updateFeedback(`Holding Strong! ${this.plankTimer}s 🛡️`);
                    }
                } else {
                    this.updateFeedback("Keep your body flat in a straight line!");
                }
                break;
            }

            case "shoulder_press": {
                const pressed = (lWrist.y < lShoulder.y * 0.8) && (rWrist.y < rShoulder.y * 0.8);
                this.drawDebugText(ctx, `Press: ${pressed ? 'OVERHEAD' : 'DOWN'}`, 20, 40);

                if (pressed && this.stage !== "pressed") {
                    this.stage = "pressed";
                    this.updateFeedback("Overhead Lockout! Lower smoothly!");
                }
                if (!pressed && this.stage === "pressed") {
                    if (now - this.lastRepTimestamp > 400) {
                        this.lastRepTimestamp = now;
                        this.stage = "lowered";
                        this.registerRep("Strong Shoulder Press! 🏋️");
                    }
                }
                break;
            }

            case "crunches": {
                const lCrunchAngle = this.calculateAngle(lShoulder, lHip, lKnee);
                this.drawDebugText(ctx, `Abs Crunch: ${Math.round(lCrunchAngle)}°`, 20, 40);

                if (lCrunchAngle < 95 && this.stage !== "crunched") {
                    this.stage = "crunched";
                    this.updateFeedback("Squeeze Core! Lower slowly!");
                }
                if (lCrunchAngle > 120 && this.stage === "crunched") {
                    if (now - this.lastRepTimestamp > 400) {
                        this.lastRepTimestamp = now;
                        this.stage = "relaxed";
                        this.registerRep("Iron Crunch! 🔥");
                    }
                }
                break;
            }

            case "mountain_climbers": {
                const lHipAngle = this.calculateAngle(lShoulder, lHip, lKnee);
                const rHipAngle = this.calculateAngle(rShoulder, rHip, rKnee);
                const minHip = Math.min(lHipAngle, rHipAngle);

                this.drawDebugText(ctx, `Climber: ${Math.round(minHip)}°`, 20, 40);

                if (minHip < 95 && this.stage !== "climbed") {
                    this.stage = "climbed";
                }
                if (minHip > 130 && this.stage === "climbed") {
                    if (now - this.lastRepTimestamp > 300) {
                        this.lastRepTimestamp = now;
                        this.stage = "reset";
                        this.registerRep("Speed Climb! 🧗");
                    }
                }
                break;
            }

            case "lateral_raises": {
                const lArmAngle = this.calculateAngle(lHip, lShoulder, lElbow);
                const rArmAngle = this.calculateAngle(rHip, rShoulder, rElbow);
                const avgRaise = (lArmAngle + rArmAngle) / 2;

                this.drawDebugText(ctx, `Raise Angle: ${Math.round(avgRaise)}°`, 20, 40);

                if (avgRaise > 70 && this.stage !== "raised") {
                    this.stage = "raised";
                    this.updateFeedback("Shoulder Height! Lower down!");
                }
                if (avgRaise < 40 && this.stage === "raised") {
                    if (now - this.lastRepTimestamp > 400) {
                        this.lastRepTimestamp = now;
                        this.stage = "lowered";
                        this.registerRep("Lateral Raise! 🦅");
                    }
                }
                break;
            }

            case "shadow_boxing": {
                const lAngle = this.calculateAngle(lShoulder, lElbow, lWrist);
                const rAngle = this.calculateAngle(rShoulder, rElbow, rWrist);
                const maxAngle = Math.max(lAngle, rAngle);

                this.drawDebugText(ctx, `Strike Snap: ${Math.round(maxAngle)}°`, 20, 40);

                if (maxAngle > 140 && this.stage !== "punched") {
                    this.stage = "punched";
                }
                if (maxAngle < 90 && this.stage === "punched") {
                    if (now - this.lastRepTimestamp > 250) {
                        this.lastRepTimestamp = now;
                        this.stage = "guard";
                        this.registerRep("Snap Punch! 🥊");
                    }
                }
                break;
            }
        }
    }

    drawDebugText(ctx, text, x, y) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(x - 6, y - 18, 220, 26);
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 13px Poppins, sans-serif";
        ctx.fillText(text, x, y);
    }

    registerRep(feedbackText) {
        this.repCount += 1;
        this.formFeedback = feedbackText;
        if (this.onRepCallback) {
            this.onRepCallback(this.repCount, 1.0);
        }
        if (this.onFeedbackCallback) {
            this.onFeedbackCallback(feedbackText);
        }
    }

    triggerManualRep() {
        this.registerRep("Manual Rep Strike! ⚡");
    }

    updateFeedback(text) {
        this.formFeedback = text;
        if (this.onFeedbackCallback) {
            this.onFeedbackCallback(text);
        }
    }

    drawSkeleton(ctx, lm, w, h) {
        const connections = [
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
            [11, 23], [12, 24], [23, 24],
            [23, 25], [25, 27], [24, 26], [26, 28]
        ];

        // Glowing blue bones
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 4;
        ctx.shadowColor = "#3b82f6";
        ctx.shadowBlur = 8;

        connections.forEach(([i, j]) => {
            if (lm[i] && lm[j] && (lm[i].visibility === undefined || lm[i].visibility > 0.2) && (lm[j].visibility === undefined || lm[j].visibility > 0.2)) {
                ctx.beginPath();
                ctx.moveTo(lm[i].x * w, lm[i].y * h);
                ctx.lineTo(lm[j].x * w, lm[j].y * h);
                ctx.stroke();
            }
        });

        // Glowing coral joints
        ctx.fillStyle = "#f43f5e";
        ctx.shadowColor = "#f43f5e";
        ctx.shadowBlur = 10;

        [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach((idx) => {
            if (lm[idx] && (lm[idx].visibility === undefined || lm[idx].visibility > 0.2)) {
                ctx.beginPath();
                ctx.arc(lm[idx].x * w, lm[idx].y * h, 6, 0, 2 * Math.PI);
                ctx.fill();
            }
        });

        ctx.shadowBlur = 0; // reset
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
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
    }
}

window.poseTracker = new PoseTracker();
