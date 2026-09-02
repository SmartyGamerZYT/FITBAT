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

        // Initialize Local Pose Tracker with Camera
        const video = document.getElementById("battle-user-video");
        const canvas = document.getElementById("battle-user-canvas");

        window.poseTracker.setExercise(exerciseId);
        await window.poseTracker.init(
            video,
            canvas,
            this.onPlayerRep.bind(this),
            this.onPlayerFeedback.bind(this)
        );

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

                if (!data.opponent.is_ai) {
                    await this.initWebRTCPeerConnection();
                } else {
                    this.showAIOpponentView();
                }
                break;

            case "OPPONENT_REP":
                this.oppReps = data.reps;
                this.oppCombo = data.combo || (this.oppCombo + 1);
                this.updateOpponentHUD();
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
        const config = {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
                { urls: "stun:stun2.l.google.com:19302" }
            ]
        };
        this.peerConnection = new RTCPeerConnection(config);

        // Ensure we obtain camera tracks reliably
        let stream = (window.poseTracker && window.poseTracker.stream);
        const localVideo = document.getElementById("battle-user-video");
        if (!stream && localVideo && localVideo.srcObject) {
            stream = localVideo.srcObject;
        }

        // If camera stream is still initializing, wait up to 2.5s for it
        if (!stream) {
            for (let i = 0; i < 15; i++) {
                await new Promise(r => setTimeout(r, 150));
                stream = (window.poseTracker && window.poseTracker.stream) || (localVideo && localVideo.srcObject);
                if (stream) break;
            }
        }

        if (stream) {
            stream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, stream);
            });
        }

        this.peerConnection.ontrack = (event) => {
            const oppVideo = document.getElementById("battle-opp-video");
            const oppPlaceholder = document.getElementById("battle-opp-placeholder");
            if (oppVideo) {
                if (event.streams && event.streams[0]) {
                    oppVideo.srcObject = event.streams[0];
                } else if (event.track) {
                    if (!oppVideo.srcObject) oppVideo.srcObject = new MediaStream();
                    oppVideo.srcObject.addTrack(event.track);
                }
                oppVideo.classList.remove("hidden");
                oppVideo.setAttribute("playsinline", "true");
                oppVideo.muted = true;
                oppVideo.autoplay = true;
                oppVideo.play().catch(e => console.warn("Opponent video autoplay error:", e));
                if (oppPlaceholder) oppPlaceholder.classList.add("hidden");
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
            this.ws.send(JSON.stringify({
                type: "WEBRTC_OFFER",
                offer: offer
            }));
        }
    }

    async handleWebRTCOffer(offer) {
        if (!this.peerConnection) await this.initWebRTCPeerConnection();
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
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
        }
    }

    async handleWebRTCIceCandidate(candidate) {
        if (this.peerConnection) {
            try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.warn("Error adding ICE candidate:", e);
            }
        }
    }

    showAIOpponentView() {
        const oppVideo = document.getElementById("battle-opp-video");
        const oppPlaceholder = document.getElementById("battle-opp-placeholder");
        if (oppVideo) oppVideo.classList.add("hidden");
        if (oppPlaceholder) oppPlaceholder.classList.remove("hidden");
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
