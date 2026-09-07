// FITBAT Dynamic Morphing Gym Background
// High-performance canvas animation rendering floating, morphing gym instruments & crimson embers.

(function() {
    class GymBackground {
        constructor() {
            this.canvas = document.getElementById("gym-bg-canvas");
            if (!this.canvas) {
                this.canvas = document.createElement("canvas");
                this.canvas.id = "gym-bg-canvas";
                document.body.prepend(this.canvas);
            }
            this.ctx = this.canvas.getContext("2d");
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.particles = [];
            this.instruments = [];
            this.time = 0;

            this.initCanvas();
            this.createInstruments();
            this.createEmbers();
            this.bindEvents();
            this.animate = this.animate.bind(this);
            requestAnimationFrame(this.animate);
        }

        initCanvas() {
            this.canvas.style.position = "fixed";
            this.canvas.style.top = "0";
            this.canvas.style.left = "0";
            this.canvas.style.width = "100vw";
            this.canvas.style.height = "100vh";
            this.canvas.style.zIndex = "-1";
            this.canvas.style.pointerEvents = "none";
            this.resize();
        }

        resize() {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.canvas.width = this.width * dpr;
            this.canvas.height = this.height * dpr;
            this.ctx.scale(dpr, dpr);
        }

        bindEvents() {
            window.addEventListener("resize", () => this.resize());
        }

        createEmbers() {
            this.particles = [];
            const count = Math.min(45, Math.floor(this.width / 30));
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    radius: Math.random() * 2 + 1,
                    speedY: Math.random() * 0.7 + 0.25,
                    speedX: (Math.random() - 0.5) * 0.35,
                    alpha: Math.random() * 0.6 + 0.2,
                    pulse: Math.random() * Math.PI * 2
                });
            }
        }

        createInstruments() {
            const types = ["dumbbell", "barbell", "kettlebell", "plate", "boxing_glove", "bench"];
            this.instruments = [];
            const count = Math.max(6, Math.floor(this.width / 220));

            for (let i = 0; i < count; i++) {
                this.instruments.push({
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    size: Math.random() * 35 + 45,
                    rot: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.008,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.25,
                    type: types[i % types.length],
                    morphT: Math.random() * Math.PI * 2,
                    alpha: Math.random() * 0.18 + 0.12
                });
            }
        }

        drawDumbbell(ctx, x, y, size, rot, morph) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);

            const m = Math.sin(morph) * 4;
            const w = size;
            const h = size * 0.45;

            // Handle
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-w * 0.3, 0);
            ctx.lineTo(w * 0.3, 0);
            ctx.stroke();

            // Knurling marks
            for (let i = -w * 0.2; i <= w * 0.2; i += 6) {
                ctx.beginPath();
                ctx.moveTo(i, -3);
                ctx.lineTo(i, 3);
                ctx.stroke();
            }

            // Left Weight Plates (Hexagonal morph)
            ctx.beginPath();
            ctx.rect(-w * 0.45 - m, -h * 0.5, w * 0.15, h);
            ctx.rect(-w * 0.38 - m, -h * 0.38, w * 0.08, h * 0.76);
            ctx.stroke();

            // Right Weight Plates
            ctx.beginPath();
            ctx.rect(w * 0.3 + m, -h * 0.5, w * 0.15, h);
            ctx.rect(w * 0.3 + m - w * 0.08, -h * 0.38, w * 0.08, h * 0.76);
            ctx.stroke();

            ctx.restore();
        }

        drawBarbell(ctx, x, y, size, rot, morph) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);

            const barLen = size * 1.6;
            const plateR = size * 0.48;
            const m = Math.cos(morph) * 3;

            // Bar
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(-barLen * 0.5, 0);
            ctx.lineTo(barLen * 0.5, 0);
            ctx.stroke();

            // Left bumper plates
            ctx.beginPath();
            ctx.rect(-barLen * 0.38 - m, -plateR, 7, plateR * 2);
            ctx.rect(-barLen * 0.43 - m, -plateR * 0.88, 6, plateR * 1.76);
            ctx.rect(-barLen * 0.47 - m, -plateR * 0.75, 5, plateR * 1.5);
            ctx.stroke();

            // Right bumper plates
            ctx.beginPath();
            ctx.rect(barLen * 0.38 - 7 + m, -plateR, 7, plateR * 2);
            ctx.rect(barLen * 0.43 - 6 + m, -plateR * 0.88, 6, plateR * 1.76);
            ctx.rect(barLen * 0.47 - 5 + m, -plateR * 0.75, 5, plateR * 1.5);
            ctx.stroke();

            ctx.restore();
        }

        drawKettlebell(ctx, x, y, size, rot, morph) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);

            const r = size * 0.38;
            const m = Math.sin(morph) * 2;

            // Bell Body
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(0, r * 0.4, r + m * 0.5, 0, Math.PI * 2);
            ctx.stroke();

            // Handle
            ctx.beginPath();
            ctx.arc(0, -r * 0.25, r * 0.75, Math.PI * 1.15, Math.PI * 1.85);
            ctx.stroke();

            // Connecting horns
            ctx.beginPath();
            ctx.moveTo(-r * 0.65, -r * 0.1);
            ctx.lineTo(-r * 0.55, r * 0.1);
            ctx.moveTo(r * 0.65, -r * 0.1);
            ctx.lineTo(r * 0.55, r * 0.1);
            ctx.stroke();

            // 45 LB weight stamp outline
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.strokeText("45 LB", 0, r * 0.4);

            ctx.restore();
        }

        drawPlate(ctx, x, y, size, rot, morph) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);

            const r = size * 0.45;
            const m = Math.sin(morph) * 3;

            // Outer rim
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();

            // Inner groove
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
            ctx.stroke();

            // Center hole
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
            ctx.stroke();

            // 3 Ergonomic Grip cutouts
            for (let i = 0; i < 3; i++) {
                const angle = (i * Math.PI * 2) / 3 + morph * 0.2;
                const gx = Math.cos(angle) * r * 0.52;
                const gy = Math.sin(angle) * r * 0.52;
                ctx.save();
                ctx.translate(gx, gy);
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.ellipse(0, 0, 7 + m, 3.5, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            ctx.restore();
        }

        drawBoxingGlove(ctx, x, y, size, rot, morph) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);

            const s = size * 0.04;
            const m = Math.sin(morph) * 2;

            ctx.lineWidth = 3.5;
            ctx.beginPath();
            // Curved fist knuckle
            ctx.moveTo(-10 * s, 12 * s);
            ctx.quadraticCurveTo(-14 * s, -8 * s, 2 * s + m, -12 * s);
            ctx.quadraticCurveTo(14 * s + m, -10 * s, 12 * s, 6 * s);
            // Thumb
            ctx.quadraticCurveTo(10 * s, 10 * s, 3 * s, 11 * s);
            ctx.lineTo(-10 * s, 12 * s);
            ctx.stroke();

            // Wrist strap
            ctx.beginPath();
            ctx.rect(-11 * s, 12 * s, 22 * s, 6 * s);
            ctx.stroke();

            ctx.restore();
        }

        drawBench(ctx, x, y, size, rot) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);

            const w = size * 1.1;
            const h = size * 0.5;

            ctx.lineWidth = 3.5;
            // Pad
            ctx.beginPath();
            ctx.rect(-w * 0.5, -h * 0.3, w, h * 0.16);
            ctx.stroke();

            // Frame legs
            ctx.beginPath();
            ctx.moveTo(-w * 0.35, -h * 0.14);
            ctx.lineTo(-w * 0.35, h * 0.4);
            ctx.moveTo(w * 0.35, -h * 0.14);
            ctx.lineTo(w * 0.35, h * 0.4);
            // Feet
            ctx.moveTo(-w * 0.45, h * 0.4);
            ctx.lineTo(-w * 0.25, h * 0.4);
            ctx.moveTo(w * 0.25, h * 0.4);
            ctx.lineTo(w * 0.45, h * 0.4);
            ctx.stroke();

            ctx.restore();
        }

        animate() {
            this.time += 0.02;
            this.ctx.clearRect(0, 0, this.width, this.height);

            // Dark Gym Atmosphere Gradient Backdrop
            const bgGrad = this.ctx.createRadialGradient(
                this.width * 0.5, this.height * 0.5, 50,
                this.width * 0.5, this.height * 0.5, Math.max(this.width, this.height) * 0.75
            );
            bgGrad.addColorStop(0, "rgba(22, 10, 14, 0.45)");
            bgGrad.addColorStop(0.5, "rgba(12, 14, 20, 0.7)");
            bgGrad.addColorStop(1, "rgba(8, 9, 13, 0.95)");
            this.ctx.fillStyle = bgGrad;
            this.ctx.fillRect(0, 0, this.width, this.height);

            // Draw Morphing Gym Instruments
            for (const inst of this.instruments) {
                inst.x += inst.vx;
                inst.y += inst.vy;
                inst.rot += inst.rotSpeed;
                inst.morphT += 0.025;

                // Screen bounce
                if (inst.x < -80) inst.x = this.width + 80;
                if (inst.x > this.width + 80) inst.x = -80;
                if (inst.y < -80) inst.y = this.height + 80;
                if (inst.y > this.height + 80) inst.y = -80;

                // Gym Red Glowing Wireframe Stroke
                this.ctx.strokeStyle = `rgba(239, 68, 68, ${inst.alpha})`;
                this.ctx.shadowColor = "rgba(239, 68, 68, 0.45)";
                this.ctx.shadowBlur = 12;

                if (inst.type === "dumbbell") {
                    this.drawDumbbell(this.ctx, inst.x, inst.y, inst.size, inst.rot, inst.morphT);
                } else if (inst.type === "barbell") {
                    this.drawBarbell(this.ctx, inst.x, inst.y, inst.size, inst.rot, inst.morphT);
                } else if (inst.type === "kettlebell") {
                    this.drawKettlebell(this.ctx, inst.x, inst.y, inst.size, inst.rot, inst.morphT);
                } else if (inst.type === "plate") {
                    this.drawPlate(this.ctx, inst.x, inst.y, inst.size, inst.rot, inst.morphT);
                } else if (inst.type === "boxing_glove") {
                    this.drawBoxingGlove(this.ctx, inst.x, inst.y, inst.size, inst.rot, inst.morphT);
                } else {
                    this.drawBench(this.ctx, inst.x, inst.y, inst.size, inst.rot);
                }
            }

            // Draw Rising Crimson Embers
            this.ctx.shadowBlur = 8;
            for (const p of this.particles) {
                p.y -= p.speedY;
                p.x += p.speedX;
                p.pulse += 0.04;

                if (p.y < -10) {
                    p.y = this.height + 10;
                    p.x = Math.random() * this.width;
                }

                const alpha = (Math.sin(p.pulse) * 0.3 + 0.5) * p.alpha;
                this.ctx.fillStyle = `rgba(255, 68, 88, ${alpha})`;
                this.ctx.shadowColor = "rgba(239, 68, 68, 0.8)";
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.shadowBlur = 0;
            requestAnimationFrame(this.animate);
        }
    }

    window.gymBackground = new GymBackground();
})();
