// FITBAT Arcade Battle Arena & Real-Time Peer Video Controller

class BattleArena {
    constructor() {
        this.ws = null;
        this.currentExercise = "pushups";
        this.currentAgeGroup = "Prime (20-29)";
        this.userReps = 0;
        this.oppReps = 0;
        this.userCombo = 0;
        this.oppCombo = 0;
        this.timer = 45;
        this.timerInterval = null;
        this.isBattleActive = false;
        this.opponentName = "Opponent";
        this.peerConnection = null;
        this.isInitiator = false;
        this.roomCode = null;
        this.isCreator = false;
    }

    async startBattle(exerciseId, ageGroup, forceAi = false, roomCode = null, isCreator = false) {
        // Clean up any previous session before starting a fresh one
        this.cleanupSession();

        this.currentExercise = exerciseId;
        this.currentAgeGroup = ageGroup;
        this.userReps = 0;
        this.oppReps = 0;
        this.userCombo = 0;
        this.oppCombo = 0;
        this.timer = 45;
        this.roomCode = roomCode;
        this.isCreator = isCreator;

        this.updatePlayerHUD();
        this.updateOpponentHUD();

        if (window.soundEngine) window.soundEngine.playCountdown(true);

        const token = localStorage.getItem("fitbat_token") || "";
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        let wsUrl = `${protocol}//${window.location.host}/ws/battle?token=${encodeURIComponent(token)}&exercise_id=${exerciseId}&age_group=${encodeURIComponent(ageGroup)}&force_ai=${forceAi}`;
        if (roomCode) {
            wsUrl += `&room_code=${encodeURIComponent(roomCode)}`;
        }

        // 1. Initialize Local Camera / Pose Tracker FIRST so video tracks are immediately available for WebRTC
        const video = document.getElementById("battle-user-video");
        const canvas = document.getElementById("battle-user-canvas");

        window.poseTracker.setExercise(exerciseId);
        try {
            await window.poseTracker.init(
                video,
                canvas,
                this.onPlayerRep.bind(this),
                this.onPlayerFeedback.bind(this)
            );
        } catch (e) {
            console.warn("Error initializing pose tracker camera:", e);
        }

        // 2. Now connect to Battle WebSocket
        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log("Connected to Battle Arena WebSocket.");
            };

            this.ws.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data);
                    await this.handleServerMessage(data);
                } catch (e) {
                    console.error("Error parsing WebSocket message:", e);
                }
            };

            this.ws.onerror = (err) => {
                console.warn("WebSocket error:", err);
            };

            this.ws.onclose = () => {
                console.log("Battle WebSocket closed.");
            };
        } catch (e) {
            console.error("Failed to connect websocket:", e);
        }

        if (isCreator && roomCode) {
            this.showWaitingForFriendModal(roomCode);
        } else if (roomCode) {
            this.showBattleOverlay(`Connecting to Arena ${roomCode}...`);
        }
    }

    cleanupSession() {
        this.isBattleActive = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.oppAnimId) {
            cancelAnimationFrame(this.oppAnimId);
            this.oppAnimId = null;
        }
        this.hasPeerCamera = false;
        if (this.ws) {
            try { this.ws.close(); } catch (e) {}
            this.ws = null;
        }
        if (this.peerConnection) {
            try { this.peerConnection.close(); } catch (e) {}
            this.peerConnection = null;
        }
        if (window.poseTracker) {
            window.poseTracker.stop();
        }
        const oppVideo = document.getElementById("battle-opp-video");
        if (oppVideo) {
            oppVideo.srcObject = null;
        }
        const coachEl = document.getElementById("battle-cartoon-coach-container");
        if (coachEl) coachEl.innerHTML = "";
        this.hideWaitingForFriendModal();
    }

    async handleServerMessage(data) {
        console.log("[BattleArena] Received event:", data.type);

        switch (data.type) {
            case "ERROR":
                this.showBattleOverlay(data.message);
                break;

            case "ROOM_CREATED":
                this.roomCode = data.room_code;
                this.showWaitingForFriendModal(data.room_code);
                break;

            case "SEARCHING_OPPONENT":
                this.showMatchmakingModal(data.message, data.stage);
                break;

            case "MATCH_START":
                this.hideWaitingForFriendModal();
                this.hideMatchmakingModal();
                
                this.isBattleActive = true;
                this.opponentName = data.opponent.username;
                this.isInitiator = data.is_initiator || false;
                
                if (data.exercise_id) {
                    this.currentExercise = data.exercise_id;
                    window.poseTracker.setExercise(data.exercise_id);
                }
                
                document.getElementById("opp-name-display").textContent = this.opponentName;
                document.getElementById("battle-exercise-display").textContent = this.currentExercise.replace(/_/g, " ").toUpperCase();
                document.getElementById("battle-age-display").textContent = data.age_group;

                const EX_ANIMS = {
                    frog_jumps: { icon: "🐸", label: "FROG LEAP!", effectClass: "anim-frog", color: "#10b981", bg: "rgba(16,185,129,0.2)" },
                    pushups: { icon: "💪", label: "IRON PUMP!", effectClass: "anim-pushup", color: "#f97316", bg: "rgba(249,115,22,0.2)" },
                    squats: { icon: "🦵", label: "SEISMIC SQUAT!", effectClass: "anim-squat", color: "#eab308", bg: "rgba(234,179,8,0.2)" },
                    jumping_jacks: { icon: "⚡", label: "THUNDER JACK!", effectClass: "anim-jack", color: "#06b6d4", bg: "rgba(6,182,212,0.2)" },
                    bicep_curls: { icon: "💥", label: "BICEP SURGE!", effectClass: "anim-curl", color: "#ec4899", bg: "rgba(236,72,153,0.2)" },
                    shadow_boxing: { icon: "🥊", label: "LIGHTNING STRIKE!", effectClass: "anim-box", color: "#ef4444", bg: "rgba(239,68,68,0.2)" },
                    plank: { icon: "🛡️", label: "TITAN SHIELD!", effectClass: "anim-plank", color: "#3b82f6", bg: "rgba(59,130,246,0.2)" },
                    high_knees: { icon: "🏃", label: "SPRINT BLUR!", effectClass: "anim-frog", color: "#8b5cf6", bg: "rgba(139,92,246,0.2)" },
                    lunges: { icon: "🚶‍♂️", label: "POWER STRIDE!", effectClass: "anim-squat", color: "#14b8a6", bg: "rgba(20,184,166,0.2)" },
                    shoulder_press: { icon: "🏋️", label: "TITAN PRESS!", effectClass: "anim-pushup", color: "#f59e0b", bg: "rgba(245,158,11,0.2)" },
                    crunches: { icon: "🍫", label: "CORE CRUNCH!", effectClass: "anim-curl", color: "#f43f5e", bg: "rgba(244,63,94,0.2)" },
                    mountain_climbers: { icon: "🧗", label: "CLIFF BLITZ!", effectClass: "anim-jack", color: "#6366f1", bg: "rgba(99,102,241,0.2)" },
                    lateral_raises: { icon: "🦅", label: "EAGLE WING!", effectClass: "anim-plank", color: "#a855f7", bg: "rgba(168,85,247,0.2)" }
                };
                const theme = EX_ANIMS[this.currentExercise] || { icon: "⚡", label: "ARENA CLASH", color: "#2563eb", bg: "rgba(37,99,235,0.2)" };
                const tagEl = document.getElementById("battle-exercise-animation-tag");
                if (tagEl) {
                    tagEl.textContent = `${theme.icon} ${theme.label}`;
                    tagEl.style.color = theme.color;
                    tagEl.style.background = theme.bg;
                }

                // Render Cartoon Coach in bottom-right of player viewport
                if (window.cartoonCoach) {
                    window.cartoonCoach.render("battle-cartoon-coach-container", this.currentExercise);
                }
                
                this.showBattleOverlay(`MATCH CONNECTED! [${theme.icon} ${this.currentExercise.replace(/_/g, ' ').toUpperCase()}] 3... 2... 1... FIGHT!`);
                this.startTimer(data.duration || 45);

                // ALWAYS start the live opponent video stream
                this.hasPeerCamera = false;
                this.startOpponentVideoStream(this.currentExercise, this.opponentName);

                if (!data.opponent.is_ai) {
                    await this.initWebRTCPeerConnection();
                }
                break;

            case "OPPONENT_REP":
                this.oppReps = data.reps;
                this.oppCombo = data.combo || (this.oppCombo + 1);
                this.updateOpponentHUD();
                this.triggerOpponentRepBurst();
                this.spawnCombatEffect("opponent", data.is_critical ? "CRITICAL HIT!" : "+1 REP!", data.is_critical);
                if (window.soundEngine) window.soundEngine.playPunch();
                break;

            case "WEBRTC_OFFER":
                await this.handleWebRTCOffer(data.offer);
                break;

            case "WEBRTC_ANSWER":
                await this.handleWebRTCAnswer(data.answer);
                break;

            case "WEBRTC_ICE_CANDIDATE":
                await this.handleWebRTCIceCandidate(data.candidate);
                break;

            case "MATCH_FINISH":
                this.endBattle(data);
                break;
        }
    }

    showWaitingForFriendModal(code) {
        const modal = document.getElementById("private-arena-waiting-modal");
        if (modal) {
            document.getElementById("display-arena-id").textContent = code;
            modal.classList.add("open");
        }
    }

    hideWaitingForFriendModal() {
        const modal = document.getElementById("private-arena-waiting-modal");
        if (modal) {
            modal.classList.remove("open");
        }
    }

    copyArenaId() {
        const code = document.getElementById("display-arena-id").textContent;
        navigator.clipboard.writeText(code);
        alert(`Arena ID ${code} copied to clipboard! Send this code to your friend.`);
    }

    async initWebRTCPeerConnection() {
        if (this.peerConnection) return;
        const config = {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
                { urls: "stun:stun2.l.google.com:19302" }
            ]
        };
        this.peerConnection = new RTCPeerConnection(config);
        this.pendingIceCandidates = [];

        // Ensure transceiver is set so video can be received even if camera is starting
        try {
            this.peerConnection.addTransceiver('video', { direction: 'sendrecv' });
        } catch (e) {
            console.warn("addTransceiver error:", e);
        }

        // Obtain local camera stream
        let stream = (window.poseTracker && window.poseTracker.stream);
        const localVideo = document.getElementById("battle-user-video");
        if (!stream && localVideo && localVideo.srcObject) {
            stream = localVideo.srcObject;
        }

        if (!stream) {
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 100));
                stream = (window.poseTracker && window.poseTracker.stream) || (localVideo && localVideo.srcObject);
                if (stream) break;
            }
        }

        if (stream) {
            stream.getTracks().forEach(track => {
                try {
                    this.peerConnection.addTrack(track, stream);
                } catch (e) {
                    console.warn("Error adding local track to peerConnection:", e);
                }
            });
        }

        this.peerConnection.ontrack = (event) => {
            console.log("[WebRTC] Received remote opponent peer camera track!", event);
            this.hasPeerCamera = true;
            const oppVideo = document.getElementById("battle-opp-video");
            const oppCanvas = document.getElementById("battle-opp-canvas");

            if (oppVideo) {
                if (event.streams && event.streams[0]) {
                    oppVideo.srcObject = event.streams[0];
                } else if (event.track) {
                    if (!oppVideo.srcObject) oppVideo.srcObject = new MediaStream();
                    oppVideo.srcObject.addTrack(event.track);
                }
                oppVideo.style.display = "block";
                oppVideo.style.zIndex = "5";
                oppVideo.setAttribute("playsinline", "true");
                oppVideo.muted = true;
                oppVideo.autoplay = true;
                oppVideo.play().catch(e => console.warn("Opponent video autoplay error:", e));
            }
            if (oppCanvas) {
                oppCanvas.style.display = "none";
            }
        };

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: "WEBRTC_ICE_CANDIDATE",
                    candidate: event.candidate
                }));
            }
        };

        if (this.isInitiator) {
            const offer = await this.peerConnection.createOffer({
                offerToReceiveVideo: true,
                offerToReceiveAudio: false
            });
            await this.peerConnection.setLocalDescription(offer);
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: "WEBRTC_OFFER",
                    offer: offer
                }));
            }
        }
    }

    async handleWebRTCOffer(offer) {
        if (!this.peerConnection) await this.initWebRTCPeerConnection();
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        if (this.pendingIceCandidates) {
            for (const c of this.pendingIceCandidates) {
                try { await this.peerConnection.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
            }
            this.pendingIceCandidates = [];
        }
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        this.ws.send(JSON.stringify({
            type: "WEBRTC_ANSWER",
            answer: answer
        }));
    }

    async handleWebRTCAnswer(answer) {
        if (this.peerConnection) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            if (this.pendingIceCandidates) {
                for (const c of this.pendingIceCandidates) {
                    try { await this.peerConnection.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
                }
                this.pendingIceCandidates = [];
            }
        }
    }

    async handleWebRTCIceCandidate(candidate) {
        if (this.peerConnection && this.peerConnection.remoteDescription) {
            try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.warn("Error adding ICE candidate:", e);
            }
        } else {
            if (!this.pendingIceCandidates) this.pendingIceCandidates = [];
            this.pendingIceCandidates.push(candidate);
        }
    }

    triggerOpponentRepBurst() {
        this.oppRepBurst = 1.0;
    }

    // High-Definition Live Opponent Video Generator
    startOpponentVideoStream(exerciseId, opponentName) {
        const oppCanvas = document.getElementById("battle-opp-canvas");
        const oppVideo = document.getElementById("battle-opp-video");
        if (!oppCanvas) return;

        if (this.oppAnimId) {
            cancelAnimationFrame(this.oppAnimId);
            this.oppAnimId = null;
        }

        const ctx = oppCanvas.getContext("2d");
        oppCanvas.width = 640;
        oppCanvas.height = 480;
        oppCanvas.style.display = "block";

        // Unless we have confirmed live peer camera, keep canvas directly visible on top
        if (!this.hasPeerCamera) {
            oppCanvas.style.display = "block";
            oppCanvas.style.zIndex = "4";
            if (oppVideo) {
                oppVideo.style.display = "none";
                oppVideo.srcObject = null;
            }
        }

        let frame = 0;
        this.oppRepBurst = 0;

        const render = () => {
            if (!this.isBattleActive) return;
            frame++;
            if (this.oppRepBurst > 0) this.oppRepBurst -= 0.035;

            const w = oppCanvas.width;
            const h = oppCanvas.height;
            ctx.clearRect(0, 0, w, h);

            // 1. Gym Battle Octagon Stage
            const bgGrad = ctx.createRadialGradient(w / 2, h * 0.45, 40, w / 2, h * 0.45, w * 0.7);
            bgGrad.addColorStop(0, "#1d2238");
            bgGrad.addColorStop(0.6, "#101322");
            bgGrad.addColorStop(1, "#07080e");
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, w, h);

            // Octagon Ring Floor Lines
            const floorY = h * 0.82;
            ctx.strokeStyle = "rgba(239, 68, 68, 0.22)";
            ctx.lineWidth = 1.5;
            for (let x = -w * 0.4; x <= w * 1.4; x += 60) {
                ctx.beginPath();
                ctx.moveTo(x, floorY);
                ctx.lineTo(w / 2 + (x - w / 2) * 1.8, h);
                ctx.stroke();
            }

            // Glowing Red Mat Ring
            ctx.beginPath();
            ctx.ellipse(w / 2, floorY + 12, w * 0.36, 26, 0, 0, Math.PI * 2);
            ctx.fillStyle = this.oppRepBurst > 0 ? `rgba(239, 68, 68, ${0.15 + this.oppRepBurst * 0.3})` : "rgba(239, 68, 68, 0.12)";
            ctx.fill();
            ctx.stroke();

            // 2. Athletic Opponent Performing the Active Exercise
            this.drawOpponentAthlete(ctx, w, h, floorY, exerciseId, frame, this.oppRepBurst, opponentName);

            // 3. Live Video Overlay Badge
            ctx.fillStyle = "rgba(11, 13, 20, 0.88)";
            ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(14, 14, 215, 30, 8);
            ctx.fill();
            ctx.stroke();

            // Glowing Live Pulse Dot
            ctx.fillStyle = "#ef4444";
            ctx.shadowColor = "#ef4444";
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(28, 29, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.font = "bold 11px sans-serif";
            ctx.fillStyle = "#f8fafc";
            ctx.textAlign = "left";
            ctx.fillText(`LIVE RIVAL: ${opponentName.substring(0, 16).toUpperCase()}`, 38, 33);

            this.oppAnimId = requestAnimationFrame(render);
        };

        this.oppAnimId = requestAnimationFrame(render);
    }

    drawOpponentAthlete(ctx, w, h, floorY, exerciseId, frame, burst, name) {
        ctx.save();
        const cx = w / 2;
        const cy = floorY - 90;

        // Aura on Rep Burst
        if (burst > 0) {
            ctx.beginPath();
            ctx.arc(cx, cy, 110 * (1 + (1 - burst) * 0.4), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(239, 68, 68, ${burst * 0.8})`;
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Exercise-specific full body biomechanics
        if (exerciseId === "frog_jumps") {
            // 🐸 Frog Jump: Deep crouch -> Explosive vertical leap -> Landing
            const cycle = (frame * 0.07) % (Math.PI * 2);
            const isJumping = Math.sin(cycle) > 0;
            const leapY = isJumping ? -Math.sin(cycle) * 75 : 0;
            const squatDip = !isJumping ? Math.abs(Math.sin(cycle)) * 40 : 0;
            const currentY = floorY - 80 + leapY + squatDip;

            // Head & Torso
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(cx - 22, currentY - 60, 44, 55); // Athletic red tank
            ctx.beginPath(); ctx.arc(cx, currentY - 82, 18, 0, Math.PI * 2); ctx.fillStyle = "#fbcfe8"; ctx.fill(); // Head
            // Headband
            ctx.fillStyle = "#10b981"; ctx.fillRect(cx - 18, currentY - 92, 36, 7);

            // Legs
            ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.strokeStyle = "#1e293b";
            if (isJumping) {
                // Tucked in air
                ctx.beginPath(); ctx.moveTo(cx - 14, currentY - 10); ctx.lineTo(cx - 28, currentY + 15); ctx.lineTo(cx - 18, currentY + 30); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx + 14, currentY - 10); ctx.lineTo(cx + 28, currentY + 15); ctx.lineTo(cx + 18, currentY + 30); ctx.stroke();
            } else {
                // Deep crouch on floor
                ctx.beginPath(); ctx.moveTo(cx - 14, currentY - 10); ctx.lineTo(cx - 36, currentY + 20); ctx.lineTo(cx - 22, floorY); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx + 14, currentY - 10); ctx.lineTo(cx + 36, currentY + 20); ctx.lineTo(cx + 22, floorY); ctx.stroke();
            }

            // Arms reaching floor or reaching up in leap
            ctx.strokeStyle = "#fbcfe8"; ctx.lineWidth = 6;
            if (isJumping) {
                ctx.beginPath(); ctx.moveTo(cx - 20, currentY - 50); ctx.lineTo(cx - 35, currentY - 95); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx + 20, currentY - 50); ctx.lineTo(cx + 35, currentY - 95); ctx.stroke();
            } else {
                ctx.beginPath(); ctx.moveTo(cx - 20, currentY - 50); ctx.lineTo(cx - 30, floorY - 5); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx + 20, currentY - 50); ctx.lineTo(cx + 30, floorY - 5); ctx.stroke();
            }

        } else if (exerciseId === "pushups") {
            // 💪 Pushups: Horizontal prone plank on floor with chest dip
            const cycle = Math.sin(frame * 0.08);
            const dip = (cycle + 1) * 16; // 0 to 32px dip
            const pushY = floorY - 28 + dip;

            // Prone Body line
            ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 22; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(cx - 65, pushY - 8); ctx.lineTo(cx + 70, floorY - 12); ctx.stroke();

            // Head
            ctx.beginPath(); ctx.arc(cx - 85, pushY - 12, 16, 0, Math.PI * 2); ctx.fillStyle = "#fbcfe8"; ctx.fill();

            // Arms from shoulder to floor
            ctx.strokeStyle = "#fbcfe8"; ctx.lineWidth = 7;
            const elbowX = cx - 55 - (cycle * 12);
            ctx.beginPath(); ctx.moveTo(cx - 60, pushY - 4); ctx.lineTo(elbowX, pushY + 18); ctx.lineTo(cx - 50, floorY); ctx.stroke();

            // Feet planted on floor
            ctx.fillStyle = "#fff";
            ctx.fillRect(cx + 65, floorY - 10, 16, 8);

        } else if (exerciseId === "squats") {
            // 🦵 Squats: Sinking into 90° parallel squat and driving up
            const cycle = (Math.sin(frame * 0.075) + 1) * 0.5; // 0 to 1
            const squatY = floorY - 85 + (cycle * 48);

            // Torso & Head
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(cx - 20, squatY - 58, 40, 52);
            ctx.beginPath(); ctx.arc(cx, squatY - 78, 17, 0, Math.PI * 2); ctx.fillStyle = "#fbcfe8"; ctx.fill();

            // Arms extended forward for balance
            ctx.strokeStyle = "#fbcfe8"; ctx.lineWidth = 6; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(cx - 16, squatY - 45); ctx.lineTo(cx - 55, squatY - 45); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 16, squatY - 45); ctx.lineTo(cx + 55, squatY - 45); ctx.stroke();

            // Legs
            ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 8;
            const kneeOut = cycle * 24;
            ctx.beginPath(); ctx.moveTo(cx - 14, squatY - 8); ctx.lineTo(cx - 28 - kneeOut, squatY + 25); ctx.lineTo(cx - 20, floorY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 14, squatY - 8); ctx.lineTo(cx + 28 + kneeOut, squatY + 25); ctx.lineTo(cx + 20, floorY); ctx.stroke();

        } else if (exerciseId === "bicep_curls") {
            // 💥 Bicep Curls: Curling dumbbells
            const lCycle = Math.sin(frame * 0.09);
            const rCycle = Math.cos(frame * 0.09);
            const charY = floorY - 85;

            // Torso & Head
            ctx.fillStyle = "#ef4444"; ctx.fillRect(cx - 22, charY - 60, 44, 55);
            ctx.beginPath(); ctx.arc(cx, charY - 80, 18, 0, Math.PI * 2); ctx.fillStyle = "#fbcfe8"; ctx.fill();

            // Legs standing tall
            ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 8; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(cx - 12, charY - 5); ctx.lineTo(cx - 15, floorY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 12, charY - 5); ctx.lineTo(cx + 15, floorY); ctx.stroke();

            // Left & Right Curling Arms
            ctx.strokeStyle = "#fbcfe8"; ctx.lineWidth = 7;
            const lHandY = charY - 20 - (lCycle * 32);
            ctx.beginPath(); ctx.moveTo(cx - 22, charY - 50); ctx.lineTo(cx - 32, charY - 25); ctx.lineTo(cx - 26, lHandY); ctx.stroke();
            ctx.fillStyle = "#38bdf8"; ctx.fillRect(cx - 32, lHandY - 6, 12, 12); // Dumbbell

            const rHandY = charY - 20 - (rCycle * 32);
            ctx.beginPath(); ctx.moveTo(cx + 22, charY - 50); ctx.lineTo(cx + 32, charY - 25); ctx.lineTo(cx + 26, rHandY); ctx.stroke();
            ctx.fillStyle = "#38bdf8"; ctx.fillRect(cx + 20, rHandY - 6, 12, 12);

        } else if (exerciseId === "shadow_boxing") {
            // 🥊 Shadow Boxing: Punching combinations with boxing gloves
            const punchL = Math.max(0, Math.sin(frame * 0.12)) * 42;
            const punchR = Math.max(0, Math.cos(frame * 0.12)) * 42;
            const bounceY = Math.abs(Math.sin(frame * 0.15)) * 8;
            const charY = floorY - 85 - bounceY;

            // Torso
            ctx.fillStyle = "#ef4444"; ctx.fillRect(cx - 20, charY - 58, 40, 52);
            ctx.beginPath(); ctx.arc(cx, charY - 78, 17, 0, Math.PI * 2); ctx.fillStyle = "#fbcfe8"; ctx.fill();

            // Boxing Stance Legs
            ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 8; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(cx - 10, charY - 6); ctx.lineTo(cx - 26, floorY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 10, charY - 6); ctx.lineTo(cx + 24, floorY); ctx.stroke();

            // Punching Arms + Red Gloves
            ctx.strokeStyle = "#fbcfe8"; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(cx - 18, charY - 45); ctx.lineTo(cx - 25 - punchL, charY - 45); ctx.stroke();
            ctx.fillStyle = "#ff2a4b"; ctx.beginPath(); ctx.arc(cx - 28 - punchL, charY - 45, 10, 0, Math.PI * 2); ctx.fill();

            ctx.beginPath(); ctx.moveTo(cx + 18, charY - 45); ctx.lineTo(cx + 25 + punchR, charY - 45); ctx.stroke();
            ctx.fillStyle = "#ff2a4b"; ctx.beginPath(); ctx.arc(cx + 28 + punchR, charY - 45, 10, 0, Math.PI * 2); ctx.fill();

        } else if (exerciseId === "plank") {
            // 🛡️ Plank: Iron core static hold with cyan aura
            const vibe = Math.sin(frame * 0.6) * 1.5;
            const plankY = floorY - 28 + vibe;

            ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 20; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(cx - 65, plankY); ctx.lineTo(cx + 65, plankY - 5); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx - 80, plankY - 5, 16, 0, Math.PI * 2); ctx.fillStyle = "#fbcfe8"; ctx.fill();

            // Forearms on floor
            ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(cx - 55, plankY); ctx.lineTo(cx - 55, floorY); ctx.lineTo(cx - 40, floorY); ctx.stroke();

            // Core aura
            ctx.strokeStyle = "rgba(56, 189, 248, 0.4)"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(cx, plankY, 55, 16, 0, 0, Math.PI * 2); ctx.stroke();

        } else {
            // General energetic workout rep cycle (Jumping jacks, high knees, lunges, climbers)
            const cycle = Math.sin(frame * 0.1);
            const hopY = Math.abs(cycle) * 16;
            const charY = floorY - 85 - hopY;

            ctx.fillStyle = "#ef4444"; ctx.fillRect(cx - 20, charY - 58, 40, 52);
            ctx.beginPath(); ctx.arc(cx, charY - 78, 17, 0, Math.PI * 2); ctx.fillStyle = "#fbcfe8"; ctx.fill();

            ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 8; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(cx - 12, charY - 6); ctx.lineTo(cx - 22, floorY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 12, charY - 6); ctx.lineTo(cx + 22, floorY); ctx.stroke();

            ctx.strokeStyle = "#fbcfe8"; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(cx - 18, charY - 45); ctx.lineTo(cx - 42, charY - 65 - cycle * 15); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 18, charY - 45); ctx.lineTo(cx + 42, charY - 65 + cycle * 15); ctx.stroke();
        }

        ctx.restore();
    }

    startTimer(seconds) {
        this.timer = seconds;
        const timerEl = document.getElementById("battle-timer");
        timerEl.textContent = this.timer;

        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timer -= 1;
            timerEl.textContent = this.timer;

            if (this.timer <= 5 && this.timer > 0) {
                if (window.soundEngine) window.soundEngine.playCountdown(false);
            }

            if (this.timer <= 0) {
                clearInterval(this.timerInterval);
                this.finishRound();
            }
        }, 1000);
    }

    onPlayerRep(repCount, formScore) {
        if (!this.isBattleActive) return;
        this.userReps = repCount;
        this.userCombo += 1;

        if (this.userCombo % 3 === 0) {
            if (window.soundEngine) window.soundEngine.playCombo(this.userCombo);
            this.spawnCombatEffect("player", `COMBO x${this.userCombo}! 🔥`, true);
            this.screenShake();
        } else {
            if (window.soundEngine) window.soundEngine.playRep();
            const EX_LABELS = {
                frog_jumps: "🐸 LEAP!",
                pushups: "💪 PUSH!",
                squats: "🦵 STOMP!",
                jumping_jacks: "⚡ SURGE!",
                bicep_curls: "💥 PUMP!",
                shadow_boxing: "🥊 STRIKE!",
                plank: "🛡️ HOLD!",
                high_knees: "🏃 DASH!",
                lunges: "🚶‍♂️ DRIVE!",
                shoulder_press: "🏋️ PRESS!",
                crunches: "🍫 BURN!",
                mountain_climbers: "🧗 BLITZ!",
                lateral_raises: "🦅 FLY!"
            };
            const label = EX_LABELS[this.currentExercise] || "+1 REP!";
            this.spawnCombatEffect("player", `${label} ⚡`, false);
        }

        // Trigger cartoon coach motivational praise
        if (window.cartoonCoach) window.cartoonCoach.onRepPerformed();

        this.updatePlayerHUD();

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: "REP_PERFORMED",
                reps: this.userReps,
                form_score: formScore
            }));
        }
    }

    onPlayerFeedback(feedbackText) {
        const fbEl = document.getElementById("battle-form-feedback");
        if (fbEl) {
            fbEl.textContent = feedbackText;
        }
    }

    updatePlayerHUD() {
        document.getElementById("player-rep-count").textContent = this.userReps;
        document.getElementById("player-combo-count").textContent = `x${this.userCombo}`;
        
        const bar = document.getElementById("player-power-bar");
        if (bar) {
            const pct = Math.min(100, (this.userReps / 30) * 100);
            bar.style.width = `${pct}%`;
        }
    }

    updateOpponentHUD() {
        document.getElementById("opp-rep-count").textContent = this.oppReps;
        document.getElementById("opp-combo-count").textContent = `x${this.oppCombo}`;

        const bar = document.getElementById("opp-power-bar");
        if (bar) {
            const pct = Math.min(100, (this.oppReps / 30) * 100);
            bar.style.width = `${pct}%`;
        }
    }

    spawnCombatEffect(target, text, isCrit = false) {
        const container = document.getElementById(target === "player" ? "player-combat-effects" : "opp-combat-effects");
        if (!container) return;

        const EX_CLASSES = {
            frog_jumps: "anim-frog",
            pushups: "anim-pushup",
            squats: "anim-squat",
            jumping_jacks: "anim-jack",
            bicep_curls: "anim-curl",
            shadow_boxing: "anim-box",
            plank: "anim-plank",
            high_knees: "anim-frog",
            lunges: "anim-squat",
            shoulder_press: "anim-pushup",
            crunches: "anim-curl",
            mountain_climbers: "anim-jack",
            lateral_raises: "anim-plank"
        };
        const animClass = EX_CLASSES[this.currentExercise] || "normal-popup";

        const el = document.createElement("div");
        el.className = `combat-popup ${animClass} ${isCrit ? "crit-popup" : ""}`;
        el.textContent = text;
        container.appendChild(el);

        setTimeout(() => {
            el.remove();
        }, 1200);
    }

    screenShake() {
        const arena = document.getElementById("battle-arena-container");
        if (arena) {
            arena.classList.add("shake-animation");
            setTimeout(() => arena.classList.remove("shake-animation"), 400);
        }
    }

    showBattleOverlay(text) {
        const fbEl = document.getElementById("battle-form-feedback");
        if (fbEl) fbEl.textContent = text;
    }

    finishRound() {
        this.isBattleActive = false;
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "FINISH_ROUND" }));
        }
    }

    endBattle(resultData) {
        this.isBattleActive = false;
        if (this.timerInterval) clearInterval(this.timerInterval);
        window.poseTracker.stop();
        if (this.peerConnection) this.peerConnection.close();
        this.hideWaitingForFriendModal();

        const isVictory = resultData.outcome === "VICTORY";
        if (isVictory) {
            if (window.soundEngine) window.soundEngine.playVictory();
            this.spawnConfetti();
        } else {
            if (window.soundEngine) window.soundEngine.playDefeat();
        }

        const modal = document.getElementById("battle-result-modal");
        document.getElementById("result-outcome-title").textContent = resultData.outcome;
        document.getElementById("result-outcome-title").style.color = isVictory ? "var(--emerald)" : "var(--coral)";
        document.getElementById("result-user-reps").textContent = resultData.user_reps;
        document.getElementById("result-opp-reps").textContent = resultData.opponent_reps;
        document.getElementById("result-xp-earned").textContent = `+${resultData.xp_earned} XP`;
        
        modal.classList.add("open");

        if (window.app) {
            window.app.loadUserProfile();
            window.app.loadLeaderboards();
        }
    }

    spawnConfetti() {
        const container = document.getElementById("confetti-container");
        if (!container) return;
        container.innerHTML = "";
        const colors = ["#2563eb", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6"];

        for (let i = 0; i < 45; i++) {
            const p = document.createElement("div");
            p.className = "confetti-particle";
            p.style.left = `${Math.random() * 100}%`;
            p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            p.style.animationDelay = `${Math.random() * 0.8}s`;
            p.style.transform = `scale(${Math.random() * 0.8 + 0.4})`;
            container.appendChild(p);
        }

        setTimeout(() => { container.innerHTML = ""; }, 3000);
    }

    exitBattle() {
        this.cleanupSession();
        this.hideMatchmakingModal();
        document.getElementById("battle-result-modal").classList.remove("open");
        if (window.app) window.app.showView("dashboard");
    }

    showMatchmakingModal(message, stage) {
        const modal = document.getElementById("random-arena-matchmaking-modal");
        if (!modal) return;
        modal.classList.add("open");

        const statusEl = document.getElementById("random-matchmaking-status");
        if (statusEl) statusEl.textContent = message || "Searching for opponent...";

        const exBadge = document.getElementById("random-matchmaking-ex-badge");
        if (exBadge) exBadge.textContent = (this.currentExercise || "pushups").replace(/_/g, " ").toUpperCase();

        const timerBadge = document.getElementById("random-matchmaking-timer-badge");
        if (timerBadge) {
            if (stage === "ANY_AGE") {
                timerBadge.textContent = "🌍 Searching all divisions... AI rival incoming!";
            } else {
                timerBadge.textContent = "⚡ Quick Match in ~3s";
            }
        }
    }

    hideMatchmakingModal() {
        const modal = document.getElementById("random-arena-matchmaking-modal");
        if (modal) modal.classList.remove("open");
    }
}

window.battleArena = new BattleArena();
