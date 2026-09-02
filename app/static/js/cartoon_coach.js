// FITBAT Cartoon Coach Animated Guide
// Renders dynamic, animated cartoon coach characters demonstrating each exercise in real time.

class CartoonCoach {
    constructor() {
        this.currentExercise = "pushups";
        this.speechPraise = [
            "Nice Rep! 🔥",
            "Great form! ⚡",
            "Keep the pace! 💥",
            "Explosive power! 🚀",
            "You got this! 💪",
            "Unstoppable! 🏆",
            "Full extension! ✨"
        ];
        this.lastPraiseIndex = 0;
    }

    getExerciseData(exerciseId) {
        const EXERCISE_GUIDES = {
            pushups: {
                name: "PUSHUP",
                tip: "Lower chest to 90°! 💪",
                svg: `
                    <svg viewBox="0 0 100 100" class="coach-svg coach-anim-pushup">
                        <!-- Floor mat -->
                        <rect x="5" y="82" width="90" height="4" rx="2" fill="#334155"/>
                        <!-- Moving body group -->
                        <g class="pushup-body">
                            <!-- Legs & feet -->
                            <line x1="18" y1="78" x2="38" y2="72" stroke="#1e293b" stroke-width="6" stroke-linecap="round"/>
                            <!-- Torso -->
                            <line x1="38" y1="72" x2="68" y2="66" stroke="#2563eb" stroke-width="8" stroke-linecap="round"/>
                            <!-- Head & Headband -->
                            <circle cx="76" cy="62" r="9" fill="#fed7aa"/>
                            <path d="M68 58 Q76 56 84 58" stroke="#ef4444" stroke-width="3" fill="none"/>
                            <!-- Eye & smile -->
                            <circle cx="78" cy="61" r="1.5" fill="#0f172a"/>
                            <path d="M75 66 Q78 68 81 66" stroke="#0f172a" stroke-width="1.2" fill="none"/>
                            <!-- Arms (pumping down and up) -->
                            <polyline points="66,68 68,76 68,82" stroke="#f97316" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" class="pushup-arm"/>
                        </g>
                        <!-- Motivational sweat drops -->
                        <circle cx="83" cy="53" r="2" fill="#38bdf8" class="coach-sweat"/>
                    </svg>
                `
            },
            frog_jumps: {
                name: "FROG JUMP",
                tip: "Crouch deep & leap high! 🐸",
                svg: `
                    <svg viewBox="0 0 100 100" class="coach-svg coach-anim-frog">
                        <ellipse cx="50" cy="88" rx="25" ry="4" fill="#334155" opacity="0.6"/>
                        <g class="frog-leaper">
                            <!-- Legs -->
                            <path d="M35 75 Q28 65 38 58" stroke="#15803d" stroke-width="5" fill="none" stroke-linecap="round"/>
                            <path d="M65 75 Q72 65 62 58" stroke="#15803d" stroke-width="5" fill="none" stroke-linecap="round"/>
                            <!-- Torso -->
                            <ellipse cx="50" cy="56" rx="13" ry="15" fill="#10b981"/>
                            <!-- Head -->
                            <circle cx="50" cy="36" r="12" fill="#fed7aa"/>
                            <!-- Green Frog Headband -->
                            <path d="M39 32 Q50 28 61 32" stroke="#22c55e" stroke-width="4" fill="none"/>
                            <!-- Frog eyes on headband -->
                            <circle cx="44" cy="28" r="3.5" fill="#22c55e"/>
                            <circle cx="44" cy="28" r="1.5" fill="#ffffff"/>
                            <circle cx="56" cy="28" r="3.5" fill="#22c55e"/>
                            <circle cx="56" cy="28" r="1.5" fill="#ffffff"/>
                            <!-- Face -->
                            <circle cx="47" cy="36" r="1.5" fill="#0f172a"/>
                            <circle cx="53" cy="36" r="1.5" fill="#0f172a"/>
                            <path d="M46 41 Q50 45 54 41" stroke="#0f172a" stroke-width="1.5" fill="none"/>
                            <!-- Arms raised in leap -->
                            <path d="M40 50 L26 38" stroke="#fed7aa" stroke-width="4" stroke-linecap="round"/>
                            <path d="M60 50 L74 38" stroke="#fed7aa" stroke-width="4" stroke-linecap="round"/>
                        </g>
                    </svg>
                `
            },
            squats: {
                name: "SQUAT",
                tip: "Hips back, thighs parallel! 🦵",
                svg: `
                    <svg viewBox="0 0 100 100" class="coach-svg coach-anim-squat">
                        <ellipse cx="50" cy="88" rx="20" ry="3" fill="#334155" opacity="0.6"/>
                        <g class="squat-body">
                            <!-- Legs bending -->
                            <path d="M42 62 L38 74 L42 86" stroke="#1e293b" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" class="squat-leg-l"/>
                            <path d="M58 62 L62 74 L58 86" stroke="#1e293b" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" class="squat-leg-r"/>
                            <!-- Torso -->
                            <line x1="50" y1="62" x2="50" y2="40" stroke="#f59e0b" stroke-width="12" stroke-linecap="round"/>
                            <!-- Head & Headband -->
                            <circle cx="50" cy="30" r="10" fill="#fed7aa"/>
                            <path d="M41 27 Q50 24 59 27" stroke="#ef4444" stroke-width="3" fill="none"/>
                            <!-- Face -->
                            <circle cx="47" cy="30" r="1.5" fill="#0f172a"/>
                            <circle cx="53" cy="30" r="1.5" fill="#0f172a"/>
                            <path d="M47 34 Q50 37 53 34" stroke="#0f172a" stroke-width="1.5" fill="none"/>
                            <!-- Arms outstretched forward for balance -->
                            <line x1="46" y1="44" x2="26" y2="44" stroke="#fed7aa" stroke-width="4" stroke-linecap="round"/>
                            <line x1="54" y1="44" x2="74" y2="44" stroke="#fed7aa" stroke-width="4" stroke-linecap="round"/>
                        </g>
                    </svg>
                `
            },
            jumping_jacks: {
                name: "JUMPING JACK",
                tip: "Clap high, feet wide! ⚡",
                svg: `
                    <svg viewBox="0 0 100 100" class="coach-svg coach-anim-jack">
                        <g class="jack-body">
                            <!-- Legs jumping wide and together -->
                            <line x1="50" y1="60" x2="32" y2="86" stroke="#1e293b" stroke-width="5" stroke-linecap="round" class="jack-leg-l"/>
                            <line x1="50" y1="60" x2="68" y2="86" stroke="#1e293b" stroke-width="5" stroke-linecap="round" class="jack-leg-r"/>
                            <!-- Torso -->
                            <line x1="50" y1="60" x2="50" y2="40" stroke="#0284c7" stroke-width="11" stroke-linecap="round"/>
                            <!-- Head -->
                            <circle cx="50" cy="30" r="10" fill="#fed7aa"/>
                            <path d="M41 26 Q50 23 59 26" stroke="#eab308" stroke-width="3" fill="none"/>
                            <circle cx="47" cy="30" r="1.5" fill="#0f172a"/>
                            <circle cx="53" cy="30" r="1.5" fill="#0f172a"/>
                            <path d="M47 34 Q50 37 53 34" stroke="#0f172a" stroke-width="1.5" fill="none"/>
                            <!-- Arms clapping overhead into V -->
                            <line x1="45" y1="42" x2="24" y2="18" stroke="#fed7aa" stroke-width="4" stroke-linecap="round" class="jack-arm-l"/>
                            <line x1="55" y1="42" x2="76" y2="18" stroke="#fed7aa" stroke-width="4" stroke-linecap="round" class="jack-arm-r"/>
                        </g>
                        <!-- Electric spark particles -->
                        <path d="M50 12 L48 16 L52 17 L50 21" stroke="#fde047" stroke-width="2" fill="none" class="jack-spark"/>
                    </svg>
                `
            },
            bicep_curls: {
                name: "BICEP CURL",
                tip: "Lock elbows, squeeze bicep! 💥",
                svg: `
                    <svg viewBox="0 0 100 100" class="coach-svg coach-anim-curl">
                        <ellipse cx="50" cy="88" rx="18" ry="3" fill="#334155" opacity="0.6"/>
                        <!-- Legs -->
                        <line x1="44" y1="64" x2="44" y2="86" stroke="#1e293b" stroke-width="6" stroke-linecap="round"/>
                        <line x1="56" y1="64" x2="56" y2="86" stroke="#1e293b" stroke-width="6" stroke-linecap="round"/>
                        <!-- Torso -->
                        <line x1="50" y1="64" x2="50" y2="38" stroke="#db2777" stroke-width="12" stroke-linecap="round"/>
                        <!-- Head -->
                        <circle cx="50" cy="26" r="10" fill="#fed7aa"/>
                        <path d="M41 22 Q50 19 59 22" stroke="#ef4444" stroke-width="3" fill="none"/>
                        <circle cx="47" cy="26" r="1.5" fill="#0f172a"/>
                        <circle cx="53" cy="26" r="1.5" fill="#0f172a"/>
                        <path d="M47 30 Q50 33 53 30" stroke="#0f172a" stroke-width="1.5" fill="none"/>
                        <!-- Curling arms with dumbbells -->
                        <g class="curl-arms">
                            <path d="M44 40 L38 52 L36 40" stroke="#fed7aa" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="curl-arm-l"/>
                            <rect x="30" y="36" width="12" height="6" rx="2" fill="#38bdf8" class="curl-db-l"/>
                            <path d="M56 40 L62 52 L64 40" stroke="#fed7aa" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="curl-arm-r"/>
                            <rect x="58" y="36" width="12" height="6" rx="2" fill="#38bdf8" class="curl-db-r"/>
                        </g>
                    </svg>
                `
            },
            shadow_boxing: {
                name: "SHADOW BOXING",
                tip: "Snap punches with speed! 🥊",
                svg: `
                    <svg viewBox="0 0 100 100" class="coach-svg coach-anim-box">
                        <ellipse cx="50" cy="88" rx="22" ry="3" fill="#334155" opacity="0.6"/>
                        <!-- Boxing stance legs -->
                        <line x1="42" y1="64" x2="38" y2="86" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>
                        <line x1="54" y1="64" x2="62" y2="86" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>
                        <!-- Torso bobbing -->
                        <g class="boxer-torso">
                            <line x1="48" y1="64" x2="50" y2="40" stroke="#dc2626" stroke-width="12" stroke-linecap="round"/>
                            <!-- Head with intense focus -->
                            <circle cx="50" cy="28" r="10" fill="#fed7aa"/>
                            <path d="M41 24 Q50 21 59 24" stroke="#0f172a" stroke-width="3" fill="none"/>
                            <circle cx="47" cy="27" r="1.5" fill="#0f172a"/>
                            <circle cx="53" cy="27" r="1.5" fill="#0f172a"/>
                            <line x1="46" y1="31" x2="54" y2="31" stroke="#0f172a" stroke-width="1.5"/>
                            <!-- Punching red gloves -->
                            <g class="boxer-punch-l">
                                <line x1="44" y1="42" x2="24" y2="36" stroke="#fed7aa" stroke-width="4" stroke-linecap="round"/>
                                <circle cx="20" cy="36" r="6" fill="#ef4444"/>
                            </g>
                            <g class="boxer-punch-r">
                                <line x1="54" y1="42" x2="78" y2="38" stroke="#fed7aa" stroke-width="4" stroke-linecap="round"/>
                                <circle cx="82" cy="38" r="6" fill="#ef4444"/>
                            </g>
                        </g>
                    </svg>
                `
            },
            plank: {
                name: "PLANK HOLD",
                tip: "Keep spine flat like iron! 🛡️",
                svg: `
                    <svg viewBox="0 0 100 100" class="coach-svg coach-anim-plank">
                        <rect x="5" y="82" width="90" height="4" rx="2" fill="#334155"/>
                        <g class="plank-body">
                            <!-- Forearm on floor -->
                            <line x1="72" y1="78" x2="80" y2="82" stroke="#fed7aa" stroke-width="4" stroke-linecap="round"/>
                            <line x1="72" y1="68" x2="72" y2="78" stroke="#fed7aa" stroke-width="4" stroke-linecap="round"/>
                            <!-- Flat horizontal spine -->
                            <line x1="20" y1="72" x2="42" y2="68" stroke="#1e293b" stroke-width="6" stroke-linecap="round"/>
                            <line x1="42" y1="68" x2="72" y2="68" stroke="#3b82f6" stroke-width="8" stroke-linecap="round"/>
                            <!-- Head looking down at floor -->
                            <circle cx="80" cy="64" r="8" fill="#fed7aa"/>
                            <path d="M74 61 Q80 59 86 61" stroke="#ef4444" stroke-width="3" fill="none"/>
                            <!-- Sweat bead -->
                            <circle cx="85" cy="56" r="1.8" fill="#38bdf8" class="coach-sweat"/>
                        </g>
                        <!-- Glowing blue core aura -->
                        <ellipse cx="56" cy="68" rx="14" ry="7" fill="none" stroke="#60a5fa" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.8" class="plank-aura"/>
                    </svg>
                `
            },
            high_knees: {
                name: "HIGH KNEES",
                tip: "Drive knees up to hip height! 🏃",
                svg: `
                    <svg viewBox="0 0 100 100" class="coach-svg coach-anim-knees">
                        <ellipse cx="50" cy="88" rx="20" ry="3" fill="#334155" opacity="0.6"/>
                        <g class="knees-runner">
                            <!-- Torso -->
                            <line x1="50" y1="60" x2="50" y2="38" stroke="#7c3aed" stroke-width="11" stroke-linecap="round"/>
                            <!-- Head -->
                            <circle cx="50" cy="28" r="9" fill="#fed7aa"/>
                            <path d="M42 24 Q50 22 58 24" stroke="#f59e0b" stroke-width="3" fill="none"/>
                            <circle cx="47" cy="28" r="1.5" fill="#0f172a"/>
                            <circle cx="53" cy="28" r="1.5" fill="#0f172a"/>
                            <!-- Alternating high knee sprint -->
                            <g class="knee-cycle-l">
                                <polyline points="46,60 36,48 38,64" stroke="#1e293b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                            </g>
                            <g class="knee-cycle-r">
                                <line x1="54" y1="60" x2="58" y2="86" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>
                            </g>
                            <!-- Pumping arms -->
                            <line x1="45" y1="42" x2="30" y2="52" stroke="#fed7aa" stroke-width="4" stroke-linecap="round"/>
                            <line x1="55" y1="42" x2="70" y2="32" stroke="#fed7aa" stroke-width="4" stroke-linecap="round"/>
                        </g>
                    </svg>
                `
            },
            lunges: {
                name: "LUNGE",
                tip: "Step deep, chest upright! 🚶‍♂️",
                svg: `
                    <svg viewBox="0 0 100 100" class="coach-svg coach-anim-lunge">
                        <ellipse cx="50" cy="88" rx="26" ry="3" fill="#334155" opacity="0.6"/>
                        <g class="lunge-body">
                            <!-- Front bent leg 90 deg -->
                            <polyline points="50,58 66,66 66,86" stroke="#1e293b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                            <!-- Back leg kneeling down -->
                            <polyline points="50,58 32,70 24,84" stroke="#1e293b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                            <!-- Torso tall -->
                            <line x1="50" y1="58" x2="50" y2="34" stroke="#0d9488" stroke-width="11" stroke-linecap="round"/>
                            <!-- Head -->
                            <circle cx="50" cy="24" r="9" fill="#fed7aa"/>
                            <path d="M42 20 Q50 18 58 20" stroke="#f43f5e" stroke-width="3" fill="none"/>
                            <circle cx="47" cy="24" r="1.5" fill="#0f172a"/>
                            <circle cx="53" cy="24" r="1.5" fill="#0f172a"/>
                            <!-- Hands on hips -->
                            <path d="M44 38 L36 46 L46 48" stroke="#fed7aa" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M56 38 L64 46 L54 48" stroke="#fed7aa" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        </g>
                    </svg>
                `
            },
            shoulder_press: {
                name: "SHOULDER PRESS",
                tip: "Press straight overhead! 🏋️",
                svg: `
                    <svg viewBox="0 0 100 100" class="coach-svg coach-anim-press">
                        <ellipse cx="50" cy="88" rx="18" ry="3" fill="#334155" opacity="0.6"/>
                        <!-- Standing legs -->
                        <line x1="44" y1="64" x2="42" y2="86" stroke="#1e293b" stroke-width="6" stroke-linecap="round"/>
                        <line x1="56" y1="64" x2="58" y2="86" stroke="#1e293b" stroke-width="6" stroke-linecap="round"/>
                        <!-- Torso -->
                        <line x1="50" y1="64" x2="50" y2="38" stroke="#ea580c" stroke-width="12" stroke-linecap="round"/>
                        <!-- Head -->
                        <circle cx="50" cy="26" r="10" fill="#fed7aa"/>
                        <path d="M41 22 Q50 19 59 22" stroke="#2563eb" stroke-width="3" fill="none"/>
                        <circle cx="47" cy="26" r="1.5" fill="#0f172a"/>
                        <circle cx="53" cy="26" r="1.5" fill="#0f172a"/>
                        <!-- Arms pushing dumbbells overhead -->
                        <g class="press-arms-group">
                            <line x1="45" y1="40" x2="32" y2="18" stroke="#fed7aa" stroke-width="4" stroke-linecap="round" class="press-arm-l"/>
                            <rect x="24" y="14" width="16" height="5" rx="2" fill="#eab308" class="press-db-l"/>
                            <line x1="55" y1="40" x2="68" y2="18" stroke="#fed7aa" stroke-width="4" stroke-linecap="round" class="press-arm-r"/>
                            <rect x="60" y="14" width="16" height="5" rx="2" fill="#eab308" class="press-db-r"/>
                        </g>
                    </svg>
                `
            },
            crunches: {
                name: "CRUNCH",
                tip: "Curl shoulders, squeeze core! 🍫",
                svg: `
                    <svg viewBox="0 0 100 100" class="coach-svg coach-anim-crunch">
                        <rect x="5" y="82" width="90" height="4" rx="2" fill="#334155"/>
                        <!-- Bent knees on mat -->
                        <polyline points="26,82 38,62 54,82" stroke="#1e293b" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
                        <g class="crunch-torso">
                            <!-- Upper body curling off floor -->
                            <line x1="54" y1="80" x2="76" y2="68" stroke="#e11d48" stroke-width="9" stroke-linecap="round"/>
                            <!-- Head with hands behind neck -->
                            <circle cx="83" cy="62" r="8" fill="#fed7aa"/>
                            <path d="M78 58 Q83 56 88 58" stroke="#f59e0b" stroke-width="2.5" fill="none"/>
                            <path d="M72 68 L78 60" stroke="#fed7aa" stroke-width="3" stroke-linecap="round"/>
                        </g>
                    </svg>
                `
            },
            mountain_climbers: {
                name: "MOUNTAIN CLIMBER",
                tip: "Sprint knees fast like a runner! 🧗",
                svg: `
                    <svg viewBox="0 0 100 100" class="coach-svg coach-anim-climber">
                        <rect x="5" y="82" width="90" height="4" rx="2" fill="#334155"/>
                        <!-- Hands on floor -->
                        <line x1="72" y1="68" x2="72" y2="82" stroke="#fed7aa" stroke-width="4" stroke-linecap="round"/>
                        <!-- Torso in angled plank -->
                        <line x1="42" y1="64" x2="72" y2="66" stroke="#4f46e5" stroke-width="8" stroke-linecap="round"/>
                        <circle cx="80" cy="62" r="8" fill="#fed7aa"/>
                        <path d="M74 58 Q80 56 86 58" stroke="#10b981" stroke-width="2.5" fill="none"/>
                        <!-- Alternating driving knees -->
                        <g class="climber-knee-l">
                            <polyline points="42,64 56,72 48,82" stroke="#1e293b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                        </g>
                        <g class="climber-knee-r">
                            <line x1="42" y1="64" x2="20" y2="82" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>
                        </g>
                    </svg>
                `
            },
            lateral_raises: {
                name: "LATERAL RAISE",
                tip: "Soar arms like eagle wings! 🦅",
                svg: `
                    <svg viewBox="0 0 100 100" class="coach-svg coach-anim-lateral">
                        <ellipse cx="50" cy="88" rx="18" ry="3" fill="#334155" opacity="0.6"/>
                        <!-- Standing legs -->
                        <line x1="44" y1="64" x2="42" y2="86" stroke="#1e293b" stroke-width="6" stroke-linecap="round"/>
                        <line x1="56" y1="64" x2="58" y2="86" stroke="#1e293b" stroke-width="6" stroke-linecap="round"/>
                        <!-- Torso -->
                        <line x1="50" y1="64" x2="50" y2="38" stroke="#9333ea" stroke-width="12" stroke-linecap="round"/>
                        <!-- Head -->
                        <circle cx="50" cy="26" r="10" fill="#fed7aa"/>
                        <path d="M41 22 Q50 19 59 22" stroke="#38bdf8" stroke-width="3" fill="none"/>
                        <circle cx="47" cy="26" r="1.5" fill="#0f172a"/>
                        <circle cx="53" cy="26" r="1.5" fill="#0f172a"/>
                        <!-- Arms raising laterally to shoulder height -->
                        <g class="lateral-arm-l">
                            <line x1="45" y1="42" x2="16" y2="42" stroke="#fed7aa" stroke-width="4" stroke-linecap="round"/>
                            <circle cx="14" cy="42" r="3.5" fill="#facc15"/>
                        </g>
                        <g class="lateral-arm-r">
                            <line x1="55" y1="42" x2="84" y2="42" stroke="#fed7aa" stroke-width="4" stroke-linecap="round"/>
                            <circle cx="86" cy="42" r="3.5" fill="#facc15"/>
                        </g>
                    </svg>
                `
            }
        };

        return EXERCISE_GUIDES[exerciseId] || EXERCISE_GUIDES["pushups"];
    }

    render(containerId, exerciseId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        this.currentExercise = exerciseId;
        const data = this.getExerciseData(exerciseId);

        container.innerHTML = `
            <div class="cartoon-coach-widget" id="active-coach-widget">
                <div class="coach-speech-bubble" id="coach-bubble-text">${data.tip}</div>
                <div class="coach-stage">
                    ${data.svg}
                </div>
                <div class="coach-badge" id="coach-label-badge">${data.name} PACE</div>
            </div>
        `;
    }

    onRepPerformed() {
        const bubble = document.getElementById("coach-bubble-text");
        if (!bubble) return;

        this.lastPraiseIndex = (this.lastPraiseIndex + 1) % this.speechPraise.length;
        bubble.textContent = this.speechPraise[this.lastPraiseIndex];
        bubble.style.color = "#fde047";
        bubble.style.transform = "scale(1.15)";
        
        setTimeout(() => {
            if (bubble) {
                bubble.style.transform = "scale(1)";
                bubble.style.color = "#f8fafc";
            }
        }, 350);

        // Subtle jump pulse on coach avatar
        const widget = document.getElementById("active-coach-widget");
        if (widget) {
            widget.style.transform = "scale(1.08) translateY(-4px)";
            setTimeout(() => {
                if (widget) widget.style.transform = "scale(1) translateY(0)";
            }, 200);
        }
    }
}

window.cartoonCoach = new CartoonCoach();
