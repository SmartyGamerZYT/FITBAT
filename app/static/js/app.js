// FITBAT Main Application Controller

class FitbatApp {
    constructor() {
        this.currentUser = null;
        this.currentMetrics = null;
        this.exercises = [];
        this.selectedExercise = "frog_jumps";
        this.selectedAgeGroup = "Prime (20-29)";
        this.activeQuest = null;
        this.questReps = 0;
        this.isPedometerActive = false;
        this.pedometerStepsUnsynced = 0;
        this.lastStepTime = 0;
        this.recentStepTimes = [];
        this.motionHandler = null;
        this.liveSteps = 0;
        this.liveDistance = 0.0;
        this.liveCalories = 0.0;
        this.liveActiveMin = 0;
        this.lastAccMag = 9.8;
    }

    async init() {
        await this.loadExercises();
        
        // Always load tasks, activity, and leaderboards immediately!
        await this.loadDailyTasks();
        await this.loadTodayActivity();
        await this.loadLeaderboards();

        const token = localStorage.getItem("fitbat_token");
        if (token) {
            await this.loadUserProfile();
        } else {
            // If user is not logged in, show Auth modal
            this.showAuthModal("login");
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.querySelectorAll("[data-nav]").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const target = e.currentTarget.getAttribute("data-nav");
                this.showView(target);
            });
        });

        const chatInput = document.getElementById("chat-input-field");
        if (chatInput) {
            chatInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    window.chatbotWidget.sendMessage();
                }
            });
        }
    }

    showView(viewName) {
        document.querySelectorAll(".app-view").forEach(v => v.classList.remove("active"));
        document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));

        const targetView = document.getElementById(`view-${viewName}`);
        const targetNav = document.getElementById(`nav-${viewName}`);

        if (targetView) targetView.classList.add("active");
        if (targetNav) targetNav.classList.add("active");

        if (viewName === "tasks") {
            this.loadDailyTasks();
        } else if (viewName === "leaderboard") {
            this.loadLeaderboards();
        } else if (viewName === "activity") {
            this.loadTodayActivity();
        } else if (viewName === "health") {
            this.loadHealthMonitor();
        } else if (viewName === "battle_select") {
            this.renderBattleSelect();
        }
    }

    showAuthModal(tab = "login") {
        const modal = document.getElementById("auth-modal");
        if (modal) {
            modal.classList.add("open");
            this.switchAuthTab(tab);
        }
    }

    hideAuthModal() {
        const modal = document.getElementById("auth-modal");
        if (modal) modal.classList.remove("open");
    }

    switchAuthTab(tab) {
        document.getElementById("tab-btn-login").classList.toggle("active", tab === "login");
        document.getElementById("tab-btn-register").classList.toggle("active", tab === "register");
        document.getElementById("form-login").classList.toggle("hidden", tab !== "login");
        document.getElementById("form-register").classList.toggle("hidden", tab !== "register");
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById("login-username").value.trim();
        const password = document.getElementById("login-password").value;
        const errEl = document.getElementById("login-error");
        errEl.textContent = "";

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Login failed");

            localStorage.setItem("fitbat_token", data.token);
            this.currentUser = data.user;
            this.currentMetrics = data.user.metrics;
            this.hideAuthModal();
            this.updateHeaderUI();
            this.renderDashboard();
            this.loadDailyTasks();
            this.showView("dashboard");
        } catch (err) {
            errEl.textContent = err.message;
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById("reg-username").value.trim();
        const email = document.getElementById("reg-email").value.trim();
        const password = document.getElementById("reg-password").value;
        const age = parseInt(document.getElementById("reg-age").value);
        const gender = document.getElementById("reg-gender").value;
        const height_cm = parseFloat(document.getElementById("reg-height").value);
        const weight_kg = parseFloat(document.getElementById("reg-weight").value);
        const fitness_level = document.getElementById("reg-level").value;
        const primary_goal = document.getElementById("reg-goal").value;
        const activity_level = document.getElementById("reg-activity").value;
        const errEl = document.getElementById("reg-error");
        errEl.textContent = "";

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username, email, password, age, gender, height_cm, weight_kg,
                    fitness_level, primary_goal, activity_level
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Registration failed");

            localStorage.setItem("fitbat_token", data.token);
            await this.loadUserProfile();
            this.hideAuthModal();
            this.loadDailyTasks();
            this.showView("dashboard");
        } catch (err) {
            errEl.textContent = err.message;
        }
    }

    async loadUserProfile() {
        const token = localStorage.getItem("fitbat_token");
        if (!token) return;

        try {
            const res = await fetch("/api/auth/me", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) {
                localStorage.removeItem("fitbat_token");
                this.updateHeaderUI();
                return;
            }
            const data = await res.json();
            this.currentUser = { ...data.user, profile: data.profile };
            this.currentMetrics = data.metrics;
            this.updateHeaderUI();
            this.renderDashboard();
        } catch (e) {
            console.error("Failed to load user profile", e);
        }
    }

    logout() {
        localStorage.removeItem("fitbat_token");
        this.currentUser = null;
        this.currentMetrics = null;
        this.updateHeaderUI();
        this.showAuthModal("login");
    }

    updateHeaderUI() {
        const userBadge = document.getElementById("header-user-badge");
        const loginBtn = document.getElementById("header-login-btn");

        if (this.currentUser) {
            const totalXp = Math.max(this.currentUser.xp || 0, this.currentUser.points || 0);
            document.getElementById("header-username").textContent = this.currentUser.username;
            document.getElementById("header-points").textContent = `${totalXp.toLocaleString()} XP`;
            document.getElementById("header-coins").textContent = `${(this.currentUser.coins || 0).toLocaleString()} 🪙`;
            document.getElementById("header-streak").textContent = `🔥 ${this.currentUser.streak || 1}d`;
            if (userBadge) userBadge.classList.remove("hidden");
            if (loginBtn) loginBtn.classList.add("hidden");
        } else {
            if (userBadge) userBadge.classList.add("hidden");
            if (loginBtn) loginBtn.classList.remove("hidden");
        }
    }

    renderDashboard() {
        if (!this.currentUser || !this.currentMetrics) return;
        const m = this.currentMetrics;
        const p = this.currentUser.profile || {};

        document.getElementById("dash-user-greeting").textContent = `Welcome, ${this.currentUser.username}! 👋`;
        document.getElementById("dash-fitness-score").textContent = m.fitness_score;
        document.getElementById("dash-bmi").textContent = m.bmi;
        document.getElementById("dash-bmi-cat").textContent = m.bmi_category;
        document.getElementById("dash-bmr").textContent = `${m.bmr} kcal`;
        document.getElementById("dash-tdee").textContent = `${m.tdee} kcal`;
        document.getElementById("dash-bodyfat").textContent = `${m.body_fat_pct}%`;
        document.getElementById("dash-calorie-target").textContent = `${m.daily_calorie_target} kcal`;

        document.getElementById("dash-age-bracket").textContent = m.suggestions.age_bracket;
        document.getElementById("dash-age-badge").textContent = m.suggestions.age_badge;
        document.getElementById("dash-age-advice").textContent = m.suggestions.age_guidance;
        document.getElementById("dash-water-target").textContent = `${m.suggestions.water_intake_liters} L / day`;

        const mb = m.suggestions.macro_breakdown;
        document.getElementById("dash-macro-protein").textContent = `${mb.protein_g}g`;
        document.getElementById("dash-macro-carbs").textContent = `${mb.carbs_g}g`;
        document.getElementById("dash-macro-fats").textContent = `${mb.fat_g}g`;

        if (p.age) {
            if (p.age < 20) this.selectedAgeGroup = "Junior (13-19)";
            else if (p.age < 30) this.selectedAgeGroup = "Prime (20-29)";
            else if (p.age < 46) this.selectedAgeGroup = "Master (30-45)";
            else this.selectedAgeGroup = "Legend (46+)";
        }
    }

    async loadExercises() {
        try {
            const res = await fetch("/api/exercises");
            const data = await res.json();
            this.exercises = data.exercises || [];
        } catch (e) {
            console.error("Failed to load exercises", e);
        }
    }

    renderBattleSelect() {
        const container = document.getElementById("exercises-grid-container");
        if (!container || this.exercises.length === 0) return;

        const ageContainer = document.getElementById("age-group-pills");
        const ageGroups = ["Junior (13-19)", "Prime (20-29)", "Master (30-45)", "Legend (46+)"];
        ageContainer.innerHTML = ageGroups.map(ag => `
            <button class="age-pill ${ag === this.selectedAgeGroup ? 'active' : ''}" onclick="window.app.selectAgeGroup('${ag}')">
                ${ag}
            </button>
        `).join("");

        container.innerHTML = this.exercises.map(ex => `
            <div class="exercise-card ${ex.id === this.selectedExercise ? 'selected' : ''}" onclick="window.app.selectExercise('${ex.id}')">
                <div class="ex-icon">${ex.icon}</div>
                <div class="ex-info">
                    <h3>${ex.name}</h3>
                    <span class="ex-category-badge">${ex.category}</span>
                    <p class="ex-desc">${ex.instructions.substring(0, 85)}...</p>
                </div>
            </div>
        `).join("");
    }

    selectAgeGroup(ageGroup) {
        this.selectedAgeGroup = ageGroup;
        this.renderBattleSelect();
    }

    selectExercise(exerciseId) {
        this.selectedExercise = exerciseId;
        window.poseTracker.setExercise(exerciseId);
        this.renderBattleSelect();
    }

    // 1. Random Arena
    startRandomArena() {
        this.showView("battle_arena");
        window.battleArena.startBattle(this.selectedExercise, this.selectedAgeGroup, false, null, false);
    }

    // 2. Private Arena (Creator)
    createPrivateArena() {
        const randomId = "ARENA-" + Math.floor(100 + Math.random() * 900);
        this.showView("battle_arena");
        window.battleArena.startBattle(this.selectedExercise, this.selectedAgeGroup, false, randomId, true);
    }

    // 3. Enter Arena ID (Joiner)
    joinWithArenaId() {
        const codeInput = document.getElementById("enter-arena-id-input");
        const code = codeInput ? codeInput.value.trim().toUpperCase() : "";
        if (!code) {
            alert("Please enter the Arena ID sent by your friend (e.g. ARENA-450)!");
            return;
        }
        this.showView("battle_arena");
        window.battleArena.startBattle(this.selectedExercise, this.selectedAgeGroup, false, code, false);
    }

    // --- DAILY QUESTS & INTERACTIVE CAMERA TRACKING ---
    async loadDailyTasks() {
        const token = localStorage.getItem("fitbat_token");
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};

        try {
            const res = await fetch("/api/tasks/daily", { headers });
            const data = await res.json();
            const container = document.getElementById("daily-tasks-list");
            if (!container) return;

            container.innerHTML = data.tasks.map(t => {
                const pct = Math.min(100, Math.round((t.progress / t.target_value) * 100));
                return `
                    <div class="task-card ${t.completed ? 'completed' : ''}" onclick="window.app.startQuestCamera(${JSON.stringify(t).replace(/"/g, '&quot;')})">
                        <div class="task-header">
                            <div>
                                <h4 style="font-size: 1.1rem; color: var(--text-primary); font-family: var(--font-heading);">${t.title}</h4>
                                <span class="task-category-pill">${t.category.toUpperCase()}</span>
                            </div>
                            <div style="display: flex; gap: 0.4rem;">
                                <span class="task-category-pill" style="background: var(--blue-light); color: var(--blue);">+${t.xp_reward} XP</span>
                                <span class="task-category-pill" style="background: var(--amber-light); color: var(--amber);">+${t.coin_reward} 🪙</span>
                            </div>
                        </div>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">${t.description}</p>
                        <div class="task-progress-bar-wrap">
                            <div class="task-progress-fill" style="width: ${pct}%"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-secondary);">${t.progress} / ${t.target_value} ${t.unit}</span>
                            ${t.completed 
                                ? `<span class="task-claimed-badge">✅ Completed</span>`
                                : `<button class="btn-task-action">📹 Start Quest</button>`}
                        </div>
                    </div>
                `;
            }).join("");
        } catch (e) {
            console.error("Failed to load daily tasks", e);
        }
    }

    async startQuestCamera(task) {
        if (task.completed) {
            alert("You have already completed this quest today! Great job!");
            return;
        }

        if (task.category === "walking") {
            this.simulateWalking(1000);
            return;
        }

        this.activeQuest = task;
        this.questReps = task.progress || 0;

        const modal = document.getElementById("quest-camera-modal");
        document.getElementById("quest-modal-title").textContent = task.title;
        document.getElementById("quest-modal-desc").textContent = task.description;
        document.getElementById("quest-target-display").textContent = `${this.questReps} / ${task.target_value} ${task.unit}`;
        
        const initPct = Math.min(100, Math.round((this.questReps / task.target_value) * 100));
        document.getElementById("quest-modal-progress-bar").style.width = `${initPct}%`;
        document.getElementById("quest-feedback-text").textContent = "Position yourself in front of camera";
        
        modal.classList.add("open");

        const exId = task.exercise_id || "pushups";
        const video = document.getElementById("quest-video-feed");
        const canvas = document.getElementById("quest-canvas-feed");

        window.poseTracker.setExercise(exId);
        await window.poseTracker.init(
            video,
            canvas,
            this.onQuestRep.bind(this),
            this.onQuestFeedback.bind(this)
        );
    }

    async onQuestRep(repCount, formScore) {
        if (!this.activeQuest) return;
        this.questReps = repCount;
        const target = this.activeQuest.target_value;

        document.getElementById("quest-target-display").textContent = `${this.questReps} / ${target} ${this.activeQuest.unit}`;
        
        const pct = Math.min(100, Math.round((this.questReps / target) * 100));
        const fill = document.getElementById("quest-modal-progress-bar");
        if (fill) fill.style.width = `${pct}%`;

        if (window.soundEngine) window.soundEngine.playRep();

        if (this.questReps >= target) {
            if (window.soundEngine) window.soundEngine.playVictory();
            window.battleArena.spawnConfetti();
            
            const taskToComplete = this.activeQuest;
            this.activeQuest = null;
            window.poseTracker.stop();

            document.getElementById("quest-feedback-text").textContent = "🎉 QUEST COMPLETED! EXCELLENT WORK!";
            document.getElementById("quest-feedback-text").style.color = "var(--emerald)";

            await this.progressTask(taskToComplete.id, target);

            setTimeout(() => {
                this.closeQuestModal();
            }, 2200);
        }
    }

    onQuestFeedback(feedback) {
        const el = document.getElementById("quest-feedback-text");
        if (el && this.activeQuest) {
            el.textContent = feedback;
        }
    }

    closeQuestModal() {
        this.activeQuest = null;
        window.poseTracker.stop();
        document.getElementById("quest-camera-modal").classList.remove("open");
        this.loadDailyTasks();
    }

    async progressTask(taskId, targetValue) {
        const token = localStorage.getItem("fitbat_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        try {
            const res = await fetch("/api/tasks/complete", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ task_id: taskId, progress: targetValue })
            });
            const data = await res.json();
            if (data.completed) {
                alert(`🎯 Quest Claimed! Earned +${data.xp_awarded} XP and +${data.coins_awarded} Coins!`);
            }
            await this.loadUserProfile();
            this.loadDailyTasks();
        } catch (e) {
            console.error(e);
        }
    }

    async loadTodayActivity() {
        const token = localStorage.getItem("fitbat_token");
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};

        try {
            const res = await fetch("/api/activity/today", { headers });
            const act = await res.json();
            
            this.liveSteps = act.steps || 0;
            this.liveDistance = act.distance_km || 0.0;
            this.liveCalories = act.calories_burned || 0.0;
            this.liveActiveMin = act.active_minutes || 0;

            this.updateActivityUI();
        } catch (e) {
            console.error("Failed to load activity", e);
        }
    }

    updateActivityUI() {
        const stepsEl = document.getElementById("act-steps-count");
        const distEl = document.getElementById("act-distance");
        const calEl = document.getElementById("act-calories");
        const minEl = document.getElementById("act-active-min");
        const pctEl = document.getElementById("act-step-pct");
        const fillEl = document.getElementById("step-progress-bar");

        if (stepsEl) stepsEl.textContent = this.liveSteps.toLocaleString();
        if (distEl) distEl.textContent = `${this.liveDistance.toFixed(2)} km`;
        if (calEl) calEl.textContent = `${Math.round(this.liveCalories)} kcal`;
        if (minEl) minEl.textContent = `${this.liveActiveMin} min`;

        const target = 8000;
        const pct = Math.min(100, Math.round((this.liveSteps / target) * 100));
        if (pctEl) pctEl.textContent = `${pct}% of 8,000 daily goal`;
        if (fillEl) fillEl.style.width = `${pct}%`;
    }

    async toggleRealtimePedometer() {
        if (this.isPedometerActive) {
            this.stopRealtimePedometer();
        } else {
            await this.startRealtimePedometer();
        }
    }

    async startRealtimePedometer() {
        // Request motion sensor permission for iOS 13+ devices
        if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
            try {
                const response = await DeviceMotionEvent.requestPermission();
                if (response !== "granted") {
                    alert("Permission to access motion sensors was denied. You can still log steps using the quick walk buttons.");
                    return;
                }
            } catch (err) {
                console.warn("DeviceMotionEvent permission request error:", err);
            }
        }

        this.isPedometerActive = true;
        this.pedometerStepsUnsynced = 0;
        this.recentStepTimes = [];
        this.lastStepTime = Date.now();

        const badge = document.getElementById("pedometer-badge");
        const btn = document.getElementById("btn-toggle-pedometer");
        if (badge) {
            badge.textContent = "🟢 Live Sensor Active";
            badge.style.background = "#dcfce7";
            badge.style.color = "#15803d";
        }
        if (btn) {
            btn.textContent = "⏸️ Pause Real-Time Sensor";
            btn.style.background = "var(--coral)";
        }

        this.motionHandler = (event) => this.handleDeviceMotion(event);
        window.addEventListener("devicemotion", this.motionHandler);

        console.log("[Pedometer] Real-time accelerometer step tracker started.");
    }

    stopRealtimePedometer() {
        this.isPedometerActive = false;
        if (this.motionHandler) {
            window.removeEventListener("devicemotion", this.motionHandler);
            this.motionHandler = null;
        }

        const badge = document.getElementById("pedometer-badge");
        const btn = document.getElementById("btn-toggle-pedometer");
        const cadEl = document.getElementById("act-cadence");
        if (badge) {
            badge.textContent = "⚪ Sensor Standby";
            badge.style.background = "#f1f5f9";
            badge.style.color = "var(--text-secondary)";
        }
        if (btn) {
            btn.textContent = "▶️ Start Real-Time Sensor";
            btn.style.background = "";
        }
        if (cadEl) cadEl.textContent = "0 steps/min";

        // Flush any unsynced steps to the database
        if (this.pedometerStepsUnsynced > 0) {
            this.syncStepsToDatabase();
        }

        console.log("[Pedometer] Real-time accelerometer step tracker stopped.");
    }

    handleDeviceMotion(event) {
        if (!this.isPedometerActive) return;

        const acc = event.accelerationIncludingGravity || event.acceleration;
        if (!acc) return;

        const x = acc.x || 0;
        const y = acc.y || 0;
        const z = acc.z || 0;
        const mag = Math.sqrt(x * x + y * y + z * z);

        const now = Date.now();

        // Walking produces periodic spikes above 11.4 m/s²
        // With debounce of 300ms (max ~200 steps/min)
        if (mag > 11.4 && (mag - this.lastAccMag > 1.2) && (now - this.lastStepTime > 300)) {
            this.lastStepTime = now;
            this.registerRealtimeStep();
        }

        this.lastAccMag = mag;
    }

    registerRealtimeStep() {
        this.liveSteps++;
        this.pedometerStepsUnsynced++;
        this.liveDistance += 0.00075;
        this.liveCalories += 0.04;

        const now = Date.now();
        this.recentStepTimes.push(now);
        if (this.recentStepTimes.length > 6) {
            this.recentStepTimes.shift();
        }

        if (this.recentStepTimes.length >= 2) {
            const timeSpanSec = (this.recentStepTimes[this.recentStepTimes.length - 1] - this.recentStepTimes[0]) / 1000;
            if (timeSpanSec > 0) {
                const cadence = Math.round(((this.recentStepTimes.length - 1) / timeSpanSec) * 60);
                const cadEl = document.getElementById("act-cadence");
                if (cadEl) cadEl.textContent = `${cadence} steps/min`;
            }
        }

        // Pulse the step circle visually
        const circle = document.getElementById("step-pulse-circle");
        if (circle) {
            circle.style.transform = "scale(1.05)";
            setTimeout(() => { circle.style.transform = "scale(1)"; }, 120);
        }

        this.updateActivityUI();

        // Auto-sync to database every 5 steps
        if (this.pedometerStepsUnsynced >= 5) {
            this.syncStepsToDatabase();
        }
    }

    async syncStepsToDatabase() {
        if (this.pedometerStepsUnsynced <= 0) return;

        const stepsToSend = this.pedometerStepsUnsynced;
        this.pedometerStepsUnsynced = 0;

        const token = localStorage.getItem("fitbat_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const dist = stepsToSend * 0.00075;
        const cals = stepsToSend * 0.04;
        const mins = Math.max(1, Math.round(stepsToSend / 100));

        try {
            await fetch("/api/activity/log", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    steps: stepsToSend,
                    distance_km: dist,
                    calories_burned: cals,
                    active_minutes: mins
                })
            });
            this.loadDailyTasks();
        } catch (e) {
            console.warn("Step sync error:", e);
        }
    }

    async simulateWalking(stepsToAdd = 500) {
        const token = localStorage.getItem("fitbat_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const distanceKm = stepsToAdd * 0.00075;
        const caloriesBurned = stepsToAdd * 0.04;
        const activeMinutes = Math.round(stepsToAdd / 100);

        try {
            await fetch("/api/activity/log", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    steps: stepsToAdd,
                    distance_km: distanceKm,
                    calories_burned: caloriesBurned,
                    active_minutes: activeMinutes
                })
            });
            if (window.soundEngine) window.soundEngine.playRep();
            await this.loadTodayActivity();
            this.loadDailyTasks();
        } catch (e) {
            console.error(e);
        }
    }

    async loadLeaderboards() {
        this.loadGlobalLeaderboard();
        this.renderExerciseLeaderboardSelect();
        this.loadExerciseLeaderboard(this.selectedExercise);
    }

    async loadGlobalLeaderboard() {
        try {
            const res = await fetch("/api/leaderboard/global");
            const data = await res.json();
            const tbody = document.getElementById("global-leaderboard-tbody");
            if (!tbody) return;

            tbody.innerHTML = data.leaderboard.map(u => {
                let medal = `#${u.rank}`;
                if (u.rank === 1) medal = "🥇";
                else if (u.rank === 2) medal = "🥈";
                else if (u.rank === 3) medal = "🥉";

                const isMe = this.currentUser && this.currentUser.id === u.user_id;

                return `
                    <tr class="${isMe ? 'highlight-me' : ''}">
                        <td><strong>${medal}</strong></td>
                        <td><strong>${u.username}</strong> ${isMe ? '<span class="task-category-pill" style="background:var(--blue-light); color:var(--blue);">(You)</span>' : ''}</td>
                        <td>${u.age} yrs</td>
                        <td><span class="score-badge">${u.fitness_score}</span></td>
                        <td>🔥 ${u.streak}d</td>
                        <td><strong style="color:var(--blue);">${u.points.toLocaleString()} XP</strong></td>
                    </tr>
                `;
            }).join("");
        } catch (e) {
            console.error("Failed to load global leaderboard", e);
        }
    }

    renderExerciseLeaderboardSelect() {
        const sel = document.getElementById("exercise-leaderboard-select");
        if (!sel || sel.children.length > 0) return;

        sel.innerHTML = this.exercises.map(ex => `
            <option value="${ex.id}">${ex.icon} ${ex.name}</option>
        `).join("");

        sel.value = this.selectedExercise;
        sel.addEventListener("change", (e) => {
            this.loadExerciseLeaderboard(e.target.value);
        });
    }

    async loadExerciseLeaderboard(exerciseId) {
        try {
            const res = await fetch(`/api/leaderboard/exercise/${exerciseId}`);
            const data = await res.json();
            const tbody = document.getElementById("exercise-leaderboard-tbody");
            if (!tbody) return;

            tbody.innerHTML = data.leaderboard.map(u => {
                let medal = `#${u.rank}`;
                if (u.rank === 1) medal = "🥇";
                else if (u.rank === 2) medal = "🥈";
                else if (u.rank === 3) medal = "🥉";

                const isMe = this.currentUser && this.currentUser.id === u.user_id;

                return `
                    <tr class="${isMe ? 'highlight-me' : ''}">
                        <td><strong>${medal}</strong></td>
                        <td><strong>${u.username}</strong> ${isMe ? '<span class="task-category-pill" style="background:var(--blue-light); color:var(--blue);">(You)</span>' : ''}</td>
                        <td><strong style="color:var(--emerald);">${u.matches_won} Wins</strong></td>
                        <td><strong>${u.max_reps}</strong> reps</td>
                        <td>${u.total_reps}</td>
                        <td>${u.win_rate}%</td>
                    </tr>
                `;
            }).join("");
        } catch (e) {
            console.error("Failed to load exercise leaderboard", e);
        }
    }

    async loadHealthMonitor() {
        const token = localStorage.getItem("fitbat_token");
        const todayKey = new Date().toISOString().slice(0, 10);
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};

        let meals = [];
        let totals = { total_calories: 0, total_protein: 0, total_carbs: 0, total_fats: 0, total_water: 0 };
        let target = 2100;

        // 1. Check local storage cache first for instant reliable rendering
        try {
            const cachedMeals = localStorage.getItem(`fitbat_health_meals_${todayKey}`);
            const cachedTotals = localStorage.getItem(`fitbat_health_totals_${todayKey}`);
            if (cachedMeals) meals = JSON.parse(cachedMeals);
            if (cachedTotals) totals = JSON.parse(cachedTotals);
        } catch (e) {}

        // 2. Fetch from backend API
        try {
            const res = await fetch("/api/nutrition/today", { headers });
            if (res.ok) {
                const data = await res.json();
                if (data.totals && (data.totals.total_calories > 0 || data.totals.total_water > 0 || (data.meals && data.meals.length > 0))) {
                    totals = data.totals;
                    meals = data.meals || [];
                    target = Math.round(data.calorie_target || 2100);
                    localStorage.setItem(`fitbat_health_meals_${todayKey}`, JSON.stringify(meals));
                    localStorage.setItem(`fitbat_health_totals_${todayKey}`, JSON.stringify(totals));
                }
                if (data.calorie_target) target = Math.round(data.calorie_target);
            }
        } catch (e) {
            console.warn("Health monitor API fetch warning:", e);
        }

        const consumed = Math.round(totals.total_calories || 0);
        const calEl = document.getElementById("health-cal-consumed");
        const targetEl = document.getElementById("health-cal-target");
        const protEl = document.getElementById("health-protein");
        const carbsEl = document.getElementById("health-carbs");
        const fatsEl = document.getElementById("health-fats");
        const waterEl = document.getElementById("health-water");
        const remEl = document.getElementById("health-cal-remaining");
        const progEl = document.getElementById("health-cal-progress");

        if (calEl) calEl.textContent = consumed;
        if (targetEl) targetEl.textContent = target;
        if (protEl) protEl.textContent = Math.round(totals.total_protein || 0) + "g";
        if (carbsEl) carbsEl.textContent = Math.round(totals.total_carbs || 0) + "g";
        if (fatsEl) fatsEl.textContent = Math.round(totals.total_fats || 0) + "g";

        const waterLiters = totals.total_water_liters !== undefined && totals.total_water_liters !== null ? totals.total_water_liters : (totals.total_water || 0);
        if (waterEl) waterEl.textContent = `${parseFloat(waterLiters).toFixed(1)} L`;
        const waterTargetEl = document.getElementById("health-water-target");
        if (waterTargetEl && data && data.water_target) waterTargetEl.textContent = data.water_target;

        const remaining = Math.max(0, target - consumed);
        if (remEl) remEl.textContent = `${remaining} kcal remaining`;

        const pct = Math.min(100, Math.round((consumed / target) * 100));
        if (progEl) progEl.style.width = `${pct}%`;

        // Render meal history log
        const logDiv = document.getElementById("health-meal-log");
        if (logDiv) {
            if (!meals || meals.length === 0) {
                logDiv.innerHTML = '<p style="color: var(--text-muted); font-style: italic;">No meals logged yet today. Tell the AI Coach what you ate!</p>';
            } else {
                logDiv.innerHTML = meals.map(m => {
                    const mealIcons = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍿", water: "💧" };
                    const icon = mealIcons[m.meal_type] || "🍽️";

                    let timeStr = "";
                    if (m.timestamp) {
                        let ts = m.timestamp;
                        if (typeof ts === "string" && !ts.endsWith("Z") && !ts.includes("+") && ts.length >= 19) {
                            ts += "Z";
                        }
                        try {
                            timeStr = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        } catch (e) {
                            timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        }
                    } else {
                        timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }

                    return `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.7rem 1rem; background: var(--bg-card-subtle); border-radius: 12px; border: 1px solid var(--border-color);">
                            <div style="display: flex; align-items: center; gap: 0.7rem;">
                                <span style="font-size: 1.5rem;">${icon}</span>
                                <div>
                                    <strong style="font-size: 0.92rem; text-transform: capitalize; color: var(--text-primary);">${m.meal_type}</strong>
                                    <div style="font-size: 0.82rem; color: var(--text-secondary);">${m.food_description}</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <strong style="color: var(--coral); font-size: 0.95rem;">${Math.round(m.estimated_calories)} kcal</strong>
                                <div style="font-size: 0.75rem; color: var(--text-muted);">${timeStr}</div>
                            </div>
                        </div>
                    `;
                }).join("");
            }
        }
    }

    async resetTodayHealth() {
        if (!confirm("Are you sure you want to reset today's health monitor and calorie log to 0?")) {
            return;
        }

        const todayKey = new Date().toISOString().slice(0, 10);
        localStorage.removeItem(`fitbat_health_meals_${todayKey}`);
        localStorage.removeItem(`fitbat_health_totals_${todayKey}`);

        const token = localStorage.getItem("fitbat_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        try {
            await fetch("/api/nutrition/reset", { method: "POST", headers });
        } catch (e) {
            console.warn("Reset error:", e);
        }

        await this.loadHealthMonitor();
    }

    async logHealthFood() {
        const input = document.getElementById("health-food-input");
        const text = input ? input.value.trim() : "";
        if (!text) return;

        input.value = "";
        if (window.chatbotWidget) {
            window.chatbotWidget.sendMessage(text);
        }
        setTimeout(() => this.loadHealthMonitor(), 1200);
    }

    async logWater(liters = 0.5) {
        const token = localStorage.getItem("fitbat_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const clientTs = new Date().toISOString();

        try {
            await fetch("/api/nutrition/log", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    meal_type: "water",
                    food_description: `${liters} L of water`,
                    estimated_calories: 0,
                    protein_g: 0,
                    carbs_g: 0,
                    fats_g: 0,
                    water_glasses: Math.round(liters / 0.25),
                    water_liters: liters,
                    client_timestamp: clientTs
                })
            });
        } catch (e) {
            console.warn(e);
        }

        if (window.chatbotWidget) {
            window.chatbotWidget.sendMessage(`I drank ${liters} litre of water`);
        }
        await this.loadHealthMonitor();
    }

    startHealthCheckIn() {
        window.chatbotWidget.toggle();
        setTimeout(() => {
            window.chatbotWidget.sendMessage("health check");
        }, 400);
    }
}

window.app = new FitbatApp();
document.addEventListener("DOMContentLoaded", () => {
    window.app.init();
});
