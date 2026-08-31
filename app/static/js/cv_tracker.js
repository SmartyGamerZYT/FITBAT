// FITBAT Computer Vision Pose Tracker Engine
// Real-time Pose Angle Trigonometry & Rep State Machine for 12 Exercises

class PoseTracker {
    constructor() {
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        this.camera = null;
        this.pose = null;
        this.currentExercise = "pushups";
        this.repCount = 0;
        this.stage = "up"; // "up" or "down"
        this.lastAngle = 0;
        this.formFeedback = "Get Ready!";
        this.formScore = 1.0;
        this.onRepCallback = null;
        this.onFeedbackCallback = null;
        this.plankTimer = 0;
        this.lastPlankCheck = 0;
        this.isTracking = false;
        this.simulationMode = false;
        this.animFrameId = null;
    }

    setExercise(exerciseId) {
        this.currentExercise = exerciseId;
        this.repCount = 0;
        this.stage = "up";
        this.plankTimer = 0;
        this.formFeedback = "Ready!";
    }

    async init(videoElement, canvasElement, onRep, onFeedback) {
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.canvasCtx = canvasElement.getContext('2d');
        this.onRepCallback = onRep;
        this.onFeedbackCallback = onFeedback;
        this.isTracking = true;

        try {
            // Check if MediaPipe is available
            if (window.Pose) {
                this.pose = new window.Pose({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
                });

                this.pose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    smoothSegmentation: false,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                this.pose.onResults(this.onResults.bind(this));

                if (window.Camera && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    this.camera = new window.Camera(this.videoElement, {
                        onFrame: async () => {
                            if (this.isTracking && this.pose) {
                                await this.pose.send({ image: this.videoElement });
                            }
                        },
                        width: 640,
                        height: 480
                    });
                    await this.camera.start();
                    console.log("MediaPipe Pose & Camera successfully initialized.");
                    return true;
                }
            }
        } catch (e) {
            console.warn("Camera or MediaPipe initialization encountered:", e);
        }

        // Fallback to motion capture / simulation
        console.log("Enabling Adaptive CV Fallback mode.");
        this.enableFallbackSimulation();
        return true;
    }

    enableFallbackSimulation() {
        this.simulationMode = true;
        this.renderFallbackLoop();
    }

    renderFallbackLoop() {
        if (!this.isTracking) return;
        const ctx = this.canvasCtx;
        const w = this.canvasElement.width = this.videoElement.videoWidth || 640;
        const h = this.canvasElement.height = this.videoElement.videoHeight || 480;

        ctx.clearRect(0, 0, w, h);
        
        // Draw cyber scanner grid
        ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.strokeRect(w * 0.15, h * 0.15, w * 0.7, h * 0.7);

        // Draw animated scanning line
        const scanY = ((Date.now() % 2500) / 2500) * (h * 0.7) + (h * 0.15);
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.15, scanY);
        ctx.lineTo(w * 0.85, scanY);
        ctx.stroke();

        this.animFrameId = requestAnimationFrame(this.renderFallbackLoop.bind(this));
    }

    calculateAngle(a, b, c) {
        if (!a || !b || !c) return 180;
        const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let angle = Math.abs((radians * 180.0) / Math.PI);
        if (angle > 180.0) {
            angle = 360 - angle;
        }
        return angle;
    }

    onResults(results) {
        if (!this.isTracking) return;
        const ctx = this.canvasCtx;
        const w = this.canvasElement.width = this.videoElement.videoWidth || 640;
        const h = this.canvasElement.height = this.videoElement.videoHeight || 480;

        ctx.clearRect(0, 0, w, h);

        if (!results.poseLandmarks) {
            this.updateFeedback("Position yourself in camera view");
            return;
        }

        const lm = results.poseLandmarks;
        this.drawSkeleton(ctx, lm, w, h);
        this.processExerciseLogic(lm);
    }

    processExerciseLogic(lm) {
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

        switch (this.currentExercise) {
            case "pushups": {
                const lAngle = this.calculateAngle(lShoulder, lElbow, lWrist);
                const rAngle = this.calculateAngle(rShoulder, rElbow, rWrist);
                const avgElbow = (lAngle + rAngle) / 2;

                if (avgElbow < 95) {
                    if (this.stage !== "down") {
                        this.stage = "down";
                        this.updateFeedback("Good Depth! Now Push Up!");
                    }
                }
                if (avgElbow > 155 && this.stage === "down") {
                    this.stage = "up";
                    this.registerRep("Clean Pushup!");
                }
                break;
            }

            case "squats": {
                const lKneeAngle = this.calculateAngle(lHip, lKnee, lAnkle);
                const rKneeAngle = this.calculateAngle(rHip, rKnee, rAnkle);
                const avgKnee = (lKneeAngle + rKneeAngle) / 2;

                if (avgKnee < 100) {
                    if (this.stage !== "down") {
                        this.stage = "down";
                        this.updateFeedback("Deep Squat! Drive Up!");
                    }
                }
                if (avgKnee > 160 && this.stage === "down") {
                    this.stage = "up";
                    this.registerRep("Power Squat!");
                }
                break;
            }

            case "jumping_jacks": {
                // Arms above head (wrist higher than shoulder)
                const handsAbove = (lWrist.y < lShoulder.y) && (rWrist.y < rShoulder.y);
                const feetSpread = Math.abs(lAnkle.x - rAnkle.x) > Math.abs(lHip.x - rHip.x) * 1.6;

                if (handsAbove && feetSpread) {
                    if (this.stage !== "up_jack") {
                        this.stage = "up_jack";
                    }
                }
                if (!handsAbove && !feetSpread && this.stage === "up_jack") {
                    this.stage = "down_jack";
                    this.registerRep("Fast Jack!");
                }
                break;
            }

            case "bicep_curls": {
                const lAngle = this.calculateAngle(lShoulder, lElbow, lWrist);
                const rAngle = this.calculateAngle(rShoulder, rElbow, rWrist);
                const avgAngle = Math.min(lAngle, rAngle);

                if (avgAngle < 50) {
                    if (this.stage !== "curled") {
                        this.stage = "curled";
                        this.updateFeedback("Squeeze Bicep!");
                    }
                }
                if (avgAngle > 145 && this.stage === "curled") {
                    this.stage = "extended";
                    this.registerRep("Full Curl!");
                }
                break;
            }

            case "lunges": {
                const lKneeAngle = this.calculateAngle(lHip, lKnee, lAnkle);
                const rKneeAngle = this.calculateAngle(rHip, rKnee, rAnkle);
                const minKnee = Math.min(lKneeAngle, rKneeAngle);

                if (minKnee < 100 && this.stage !== "lunged") {
                    this.stage = "lunged";
                    this.updateFeedback("Great Depth! Step Up!");
                }
                if (minKnee > 155 && this.stage === "lunged") {
                    this.stage = "standing";
                    this.registerRep("Solid Lunge!");
                }
                break;
            }

            case "high_knees": {
                const lHipAngle = this.calculateAngle(lShoulder, lHip, lKnee);
                const rHipAngle = this.calculateAngle(rShoulder, rHip, rKnee);
                const minHip = Math.min(lHipAngle, rHipAngle);

                if (minHip < 100 && this.stage !== "knee_up") {
                    this.stage = "knee_up";
                }
                if (minHip > 145 && this.stage === "knee_up") {
                    this.stage = "knee_down";
                    this.registerRep("Explosive Knee!");
                }
                break;
            }

            case "plank": {
                const lSpine = this.calculateAngle(lShoulder, lHip, lAnkle);
                const isStraight = lSpine > 150 && lSpine < 195;
                const now = Date.now();

                if (isStraight) {
                    if (now - this.lastPlankCheck >= 1000) {
                        this.lastPlankCheck = now;
                        this.plankTimer += 1;
                        this.registerRep(`${this.plankTimer}s Plank Held!`);
                        this.updateFeedback(`Hold Steady! ${this.plankTimer}s`);
                    }
                } else {
                    this.updateFeedback("Keep hips level and straight!");
                }
                break;
            }

            case "shoulder_press": {
                const lElbowY = lElbow.y;
                const lWristY = lWrist.y;
                const rWristY = rWrist.y;

                const pressed = (lWristY < lShoulder.y * 0.7) && (rWristY < rShoulder.y * 0.7);

                if (pressed && this.stage !== "pressed") {
                    this.stage = "pressed";
                }
                if (!pressed && this.stage === "pressed") {
                    this.stage = "lowered";
                    this.registerRep("Strong Press!");
                }
                break;
            }

            case "crunches": {
                const lCrunchAngle = this.calculateAngle(lShoulder, lHip, lKnee);
                if (lCrunchAngle < 90 && this.stage !== "crunched") {
                    this.stage = "crunched";
                    this.updateFeedback("Squeeze Abs!");
                }
                if (lCrunchAngle > 125 && this.stage === "crunched") {
                    this.stage = "relaxed";
                    this.registerRep("Iron Crunch!");
                }
                break;
            }

            case "mountain_climbers": {
                const lHipAngle = this.calculateAngle(lShoulder, lHip, lKnee);
                const rHipAngle = this.calculateAngle(rShoulder, rHip, rKnee);
                const minHip = Math.min(lHipAngle, rHipAngle);

                if (minHip < 90 && this.stage !== "climbed") {
                    this.stage = "climbed";
                }
                if (minHip > 135 && this.stage === "climbed") {
                    this.stage = "reset";
                    this.registerRep("Speed Climb!");
                }
                break;
            }

            case "lateral_raises": {
                const lArmAngle = this.calculateAngle(lHip, lShoulder, lElbow);
                const rArmAngle = this.calculateAngle(rHip, rShoulder, rElbow);
                const avgRaise = (lArmAngle + rArmAngle) / 2;

                if (avgRaise > 75 && this.stage !== "raised") {
                    this.stage = "raised";
                    this.updateFeedback("Hold Parallel!");
                }
                if (avgRaise < 35 && this.stage === "raised") {
                    this.stage = "lowered";
                    this.registerRep("Lateral Flare!");
                }
                break;
            }

            case "shadow_boxing": {
                const lAngle = this.calculateAngle(lShoulder, lElbow, lWrist);
                const rAngle = this.calculateAngle(rShoulder, rElbow, rWrist);
                const maxAngle = Math.max(lAngle, rAngle);

                if (maxAngle > 150 && this.stage !== "punched") {
                    this.stage = "punched";
                }
                if (maxAngle < 85 && this.stage === "punched") {
                    this.stage = "guard";
                    this.registerRep("Snap Strike!");
                }
                break;
            }
        }
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
        this.registerRep("Manual Rep Strike!");
    }

    updateFeedback(text) {
        this.formFeedback = text;
        if (this.onFeedbackCallback) {
            this.onFeedbackCallback(text);
        }
    }

    drawSkeleton(ctx, lm, w, h) {
        const connections = [
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Upper body
            [11, 23], [12, 24], [23, 24],                      // Torso
            [23, 25], [25, 27], [24, 26], [26, 28]             // Legs
        ];

        // Draw glowing neon lines
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 4;
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 10;

        connections.forEach(([i, j]) => {
            if (lm[i] && lm[j] && lm[i].visibility > 0.4 && lm[j].visibility > 0.4) {
                ctx.beginPath();
                ctx.moveTo(lm[i].x * w, lm[i].y * h);
                ctx.lineTo(lm[j].x * w, lm[j].y * h);
                ctx.stroke();
            }
        });

        // Draw joints
        ctx.fillStyle = "#ff0077";
        ctx.shadowColor = "#ff0077";
        ctx.shadowBlur = 12;

        [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach((idx) => {
            if (lm[idx] && lm[idx].visibility > 0.4) {
                ctx.beginPath();
                ctx.arc(lm[idx].x * w, lm[idx].y * h, 6, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
        
        ctx.shadowBlur = 0; // reset
    }

    stop() {
        this.isTracking = false;
        if (this.camera) {
            this.camera.stop();
        }
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
        }
    }
}

window.poseTracker = new PoseTracker();
