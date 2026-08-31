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
    }

    async startBattle(exerciseId, ageGroup, forceAi = false, roomCode = null) {
        this.currentExercise = exerciseId;
        this.currentAgeGroup = ageGroup;
        this.userReps = 0;
        this.oppReps = 0;
        this.userCombo = 0;
        this.oppCombo = 0;
        this.timer = 45;
        this.roomCode = roomCode;

        if (window.soundEngine) window.soundEngine.playCountdown(true);

        const token = localStorage.getItem("fitbat_token");
        if (!token) {
            alert("Please login first to enter the Battle Arena!");
            return;
        }

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        let wsUrl = `${protocol}//${window.location.host}/ws/battle?token=${token}&exercise_id=${exerciseId}&age_group=${encodeURIComponent(ageGroup)}&force_ai=${forceAi}`;
        if (roomCode) {
            wsUrl += `&room_code=${encodeURIComponent(roomCode)}`;
        }

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log("Connected to Battle Arena WebSocket.");
        };

        this.ws.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            await this.handleServerMessage(data);
        };

        this.ws.onclose = () => {
            console.log("Battle WebSocket closed.");
        };

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

        if (roomCode) {
            this.showWaitingForFriendModal(roomCode);
        }
    }

    async handleServerMessage(data) {
        switch (data.type) {
            case "ROOM_CREATED":
                this.roomCode = data.room_code;
                this.showWaitingForFriendModal(data.room_code);
                break;

            case "MATCH_START":
                this.hideWaitingForFriendModal();
                this.isBattleActive = true;
                this.opponentName = data.opponent.username;
                this.isInitiator = data.is_initiator || false;
                
                document.getElementById("opp-name-display").textContent = this.opponentName;
                document.getElementById("battle-exercise-display").textContent = data.exercise_id.replace("_", " ").toUpperCase();
                document.getElementById("battle-age-display").textContent = data.age_group;
                
                this.showBattleOverlay("MATCH CONNECTED! 3... 2... 1... FIGHT!");
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
        if (modal) modal.classList.remove("open");
    }

    copyArenaId() {
        const code = document.getElementById("display-arena-id").textContent;
        navigator.clipboard.writeText(code);
        alert(`Arena ID ${code} copied to clipboard! Share it with your friend.`);
    }

    // --- WebRTC Real Camera Streaming with Friends ---
    async initWebRTCPeerConnection() {
        const config = {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" }
            ]
        };
        this.peerConnection = new RTCPeerConnection(config);

        const localVideo = document.getElementById("battle-user-video");
        if (localVideo && localVideo.srcObject) {
            localVideo.srcObject.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, localVideo.srcObject);
            });
        }

        this.peerConnection.ontrack = (event) => {
            const oppVideo = document.getElementById("battle-opp-video");
            const oppPlaceholder = document.getElementById("battle-opp-placeholder");
            if (oppVideo && event.streams[0]) {
                oppVideo.srcObject = event.streams[0];
                oppVideo.classList.remove("hidden");
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
            const offer = await this.peerConnection.createOffer();
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
            this.spawnCombatEffect("player", "+1 REP! ⚡", false);
        }

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

        const el = document.createElement("div");
        el.className = `combat-popup ${isCrit ? "crit-popup" : "normal-popup"}`;
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
        this.isBattleActive = false;
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.ws) this.ws.close();
        if (this.peerConnection) this.peerConnection.close();
        window.poseTracker.stop();
        this.hideWaitingForFriendModal();

        document.getElementById("battle-result-modal").classList.remove("open");
        if (window.app) window.app.showView("dashboard");
    }
}

window.battleArena = new BattleArena();
