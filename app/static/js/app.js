// FITBAT Main Application Controller

class FitbatApp {
    constructor() {
        this.currentUser = null;
        this.currentMetrics = null;
        this.exercises = [];
        this.selectedExercise = "pushups";
        this.selectedAgeGroup = "Prime (20-29)";
        this.activeQuest = null;
        this.questReps = 0;
    }

    async init() {
        await this.loadExercises();
        const token = localStorage.getItem("fitbat_token");
        if (token) {
            await this.loadUserProfile();
        } else {
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
        } else if (viewName === "battle_select") {
            this.renderBattleSelect();
        }
    }

    showAuthModal(tab = "login") {
        const modal = document.getElementById("auth-modal");
        modal.classList.add("open");
        this.switchAuthTab(tab);
    }

    hideAuthModal() {
        document.getElementById("auth-modal").classList.remove("open");
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
                this.showAuthModal("login");
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
        this.showAuthModal("login");
    }

    updateHeaderUI() {
        if (!this.currentUser) return;
        document.getElementById("header-username").textContent = this.currentUser.username;
        document.getElementById("header-points").textContent = `${this.currentUser.points} XP`;
        document.getElementById("header-coins").textContent = `${this.currentUser.coins} 🪙`;
        document.getElementById("header-streak").textContent = `🔥 ${this.currentUser.streak}d`;
        document.getElementById("header-user-badge").classList.remove("hidden");
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
        this.renderBattleSelect();
    }

    // 1. Random Arena (Quick Match vs any online player or AI)
    startRandomArena() {
        this.showView("battle_arena");
        window.battleArena.startBattle(this.selectedExercise, this.selectedAgeGroup, false, null);
    }

    // 2. Private Arena (Creates Room & displays Arena ID for friend)
    createPrivateArena() {
        const randomId = "ARENA-" + Math.floor(100 + Math.random() * 900);
        this.showView("battle_arena");
        window.battleArena.startBattle(this.selectedExercise, this.selectedAgeGroup, false, randomId);
    }

    // 3. Enter Arena ID (Joins friend's private room)
    joinWithArenaId() {
        const codeInput = document.getElementById("enter-arena-id-input");
        const code = codeInput ? codeInput.value.trim().toUpperCase() : "";
        if (!code) {
            alert("Please enter the Arena ID sent by your friend (e.g. ARENA-450)!");
            return;
        }
        this.showView("battle_arena");
        window.battleArena.startBattle(this.selectedExercise, this.selectedAgeGroup, false, code);
    }

    // --- DAILY QUESTS & INTERACTIVE CAMERA TRACKING ---
    async loadDailyTasks() {
        const token = localStorage.getItem("fitbat_token");
        if (!token) return;

        try {
            const res = await fetch("/api/tasks/daily", {
                headers: { "Authorization": `Bearer ${token}` }
            });
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
        try {
            const res = await fetch("/api/tasks/complete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
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
        if (!token) return;

        try {
            const res = await fetch("/api/activity/today", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const act = await res.json();
            
            document.getElementById("act-steps-count").textContent = act.steps.toLocaleString();
            document.getElementById("act-distance").textContent = `${act.distance_km.toFixed(2)} km`;
            document.getElementById("act-calories").textContent = `${Math.round(act.calories_burned)} kcal`;
            document.getElementById("act-active-min").textContent = `${act.active_minutes} min`;

            const target = 8000;
            const pct = Math.min(100, Math.round((act.steps / target) * 100));
            document.getElementById("act-step-pct").textContent = `${pct}% of 8,000 goal`;
            const fill = document.getElementById("step-progress-bar");
            if (fill) fill.style.width = `${pct}%`;
        } catch (e) {
            console.error("Failed to load activity", e);
        }
    }

    async simulateWalking(stepsToAdd = 500) {
        const token = localStorage.getItem("fitbat_token");
        const distanceKm = stepsToAdd * 0.00075;
        const caloriesBurned = stepsToAdd * 0.04;
        const activeMinutes = Math.round(stepsToAdd / 100);

        try {
            await fetch("/api/activity/log", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    steps: stepsToAdd,
                    distance_km: distanceKm,
                    calories_burned: caloriesBurned,
                    active_minutes: activeMinutes
                })
            });
            if (window.soundEngine) window.soundEngine.playRep();
            this.loadTodayActivity();
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
}

window.app = new FitbatApp();
document.addEventListener("DOMContentLoaded", () => {
    window.app.init();
});
