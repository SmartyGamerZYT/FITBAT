// FITBAT Strava-Like Multi-Sport GPS Tracker Engine
// Supports Cycling, Running, Walking, Hiking, Live GPS Breadcrumb Mapping,
// Kilometer Splits, Elevation Ascent, Calories, and Route Simulation.

class StravaTracker {
    constructor() {
        this.sport = "cycling"; // cycling, running, walking, hiking
        this.status = "idle"; // idle, tracking, paused, completed
        this.startTime = null;
        this.elapsedSeconds = 0;
        this.timerInterval = null;

        // Metrics
        this.distanceKm = 0.0;
        this.currentSpeedKmh = 0.0;
        this.maxSpeedKmh = 0.0;
        this.avgSpeedKmh = 0.0;
        this.currentPaceMinKm = "0:00";
        this.elevationGainM = 0;
        this.caloriesBurned = 0;
        this.liveCadence = 0;
        this.liveSteps = 0;

        // GPS & Route Tracking
        this.routeCoords = [];
        this.splits = [];
        this.lastSplitDist = 0.0;
        this.lastSplitTime = 0;
        this.watchId = null;
        this.map = null;
        this.routePolyline = null;
        this.userMarker = null;
        this.simInterval = null;
    }

    init() {
        this.initMap();
        this.loadSavedWorkouts();
    }

    setSport(sportType) {
        this.sport = sportType;
        document.querySelectorAll(".sport-tab-btn").forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-sport") === sportType);
        });

        const speedLabel = document.getElementById("strava-speed-label");
        const speedUnit = document.getElementById("strava-speed-unit");
        const stepsBox = document.getElementById("strava-steps-box");

        if (sportType === "cycling") {
            if (speedLabel) speedLabel.textContent = "Live Speed";
            if (speedUnit) speedUnit.textContent = "KM/H";
            if (stepsBox) stepsBox.style.display = "none";
        } else {
            if (speedLabel) speedLabel.textContent = "Live Pace";
            if (speedUnit) speedUnit.textContent = "MIN/KM";
            if (stepsBox) stepsBox.style.display = "block";
        }

        this.updateHUD();
    }

    initMap() {
        const mapEl = document.getElementById("strava-map");
        if (!mapEl || this.map) {
            if (this.map) setTimeout(() => this.map.invalidateSize(), 200);
            return;
        }

        try {
            // Default center: scenic location (San Francisco Presidio / Park loop or user location)
            const defaultLat = 37.7749;
            const defaultLng = -122.4194;

            this.map = L.map("strava-map", {
                zoomControl: true,
                attributionControl: false
            }).setView([defaultLat, defaultLng], 14);

            // 100% Free OpenStreetMap tile layer - NEVER requires any API key or subscription
            const osmLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "© OpenStreetMap contributors",
                className: "osm-dark-tiles"
            });
            osmLayer.addTo(this.map);

            // Glowing Crimson Route Polyline
            this.routePolyline = L.polyline([], {
                color: "#ef4444",
                weight: 5,
                opacity: 0.9,
                smoothFactor: 1.0,
                lineJoin: "round"
            }).addTo(this.map);

            // Glowing Pulsing User Location Beacon Marker
            const beaconIcon = L.divIcon({
                className: "custom-strava-beacon",
                html: `<div style="width: 18px; height: 18px; background: #ef4444; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 0 16px #ef4444; transform: translate(-9px, -9px);"></div>`,
                iconSize: [18, 18]
            });

            this.userMarker = L.marker([defaultLat, defaultLng], { icon: beaconIcon }).addTo(this.map);

            // Try to center on user's real coordinates if geolocation permitted
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    if (this.map && this.routeCoords.length === 0) {
                        this.map.setView([lat, lng], 15);
                        this.userMarker.setLatLng([lat, lng]);
                        const coordsEl = document.getElementById("strava-gps-coords");
                        if (coordsEl) coordsEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    }
                }, () => {});
            }
        } catch (e) {
            console.warn("[StravaTracker] Leaflet init error:", e);
        }
    }

    start() {
        if (this.status === "tracking") return;

        this.status = "tracking";
        this.startTime = Date.now() - (this.elapsedSeconds * 1000);

        // Update Buttons
        document.getElementById("btn-strava-start").style.display = "none";
        document.getElementById("btn-strava-pause").style.display = "inline-block";
        document.getElementById("btn-strava-finish").style.display = "inline-block";

        const badge = document.getElementById("strava-status-badge");
        if (badge) {
            badge.textContent = `🟢 ${this.sport.toUpperCase()} IN PROGRESS`;
            badge.style.background = "rgba(16, 185, 129, 0.25)";
            badge.style.color = "#34d399";
        }

        // Timer Interval
        this.timerInterval = setInterval(() => {
            this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
            this.updateHUD();
        }, 1000);

        // Real GPS Tracking if on phone / supported
        if (navigator.geolocation && !this.simInterval) {
            this.watchId = navigator.geolocation.watchPosition(
                pos => this.handleGPSPosition(pos),
                err => console.log("[StravaTracker] GPS watch notice:", err.message),
                { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
            );
        }
    }

    pause() {
        if (this.status !== "tracking") return;

        this.status = "paused";
        clearInterval(this.timerInterval);
        this.timerInterval = null;

        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        if (this.simInterval) {
            clearInterval(this.simInterval);
            this.simInterval = null;
        }

        const btnStart = document.getElementById("btn-strava-start");
        const btnPause = document.getElementById("btn-strava-pause");
        if (btnStart) {
            btnStart.textContent = "▶️ Resume Workout";
            btnStart.style.display = "inline-block";
        }
        if (btnPause) btnPause.style.display = "none";

        const badge = document.getElementById("strava-status-badge");
        if (badge) {
            badge.textContent = "⏸️ WORKOUT PAUSED";
            badge.style.background = "rgba(245, 158, 11, 0.25)";
            badge.style.color = "#fbbf24";
        }
    }

    async finish() {
        this.pause();
        this.status = "completed";

        if (this.distanceKm < 0.1 && this.elapsedSeconds < 10) {
            alert("Workout was too short to record! Try running, cycling, or using the quick simulation buttons.");
            this.reset();
            return;
        }

        const title = `${this.sport.charAt(0).toUpperCase() + this.sport.slice(1)} Session`;
        const token = localStorage.getItem("fitbat_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const payload = {
            sport_type: this.sport,
            title: title,
            distance_km: parseFloat(this.distanceKm.toFixed(2)),
            duration_seconds: this.elapsedSeconds,
            avg_speed_kmh: parseFloat(this.avgSpeedKmh.toFixed(1)),
            max_speed_kmh: parseFloat(this.maxSpeedKmh.toFixed(1)),
            avg_pace_minkm: this.currentPaceMinKm,
            elevation_gain_m: this.elevationGainM,
            calories_burned: Math.round(this.caloriesBurned),
            route_geojson: JSON.stringify(this.routeCoords),
            created_at: new Date().toISOString()
        };

        try {
            const res = await fetch("/api/strava/workout", {
                method: "POST",
                headers,
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                if (window.battleArena) window.battleArena.spawnConfetti();
                if (window.soundEngine) window.soundEngine.playVictory();
                alert(`🏆 ${title} COMPLETED!\nDistance: ${this.distanceKm.toFixed(2)} km\nTime: ${this.formatTime(this.elapsedSeconds)}\nCalories: ${Math.round(this.caloriesBurned)} kcal\n${data.message}`);
                await this.loadSavedWorkouts();
                if (window.app) window.app.loadUserProfile();
            }
        } catch (e) {
            console.error("Failed to save Strava workout", e);
        }

        this.reset();
    }

    reset() {
        this.status = "idle";
        this.elapsedSeconds = 0;
        this.distanceKm = 0.0;
        this.currentSpeedKmh = 0.0;
        this.maxSpeedKmh = 0.0;
        this.avgSpeedKmh = 0.0;
        this.elevationGainM = 0;
        this.caloriesBurned = 0;
        this.liveSteps = 0;
        this.routeCoords = [];
        this.splits = [];
        this.lastSplitDist = 0.0;
        this.lastSplitTime = 0;

        if (this.routePolyline) this.routePolyline.setLatLngs([]);
        const splitsTbody = document.getElementById("strava-splits-tbody");
        if (splitsTbody) {
            splitsTbody.innerHTML = `<tr><td colspan="4" style="color: var(--text-muted); text-align: center;">Start workout or simulate to generate splits!</td></tr>`;
        }

        document.getElementById("btn-strava-start").textContent = "▶️ Start Workout";
        document.getElementById("btn-strava-start").style.display = "inline-block";
        document.getElementById("btn-strava-pause").style.display = "none";
        document.getElementById("btn-strava-finish").style.display = "none";

        const badge = document.getElementById("strava-status-badge");
        if (badge) {
            badge.textContent = "⚪ Tracker Ready";
            badge.style.background = "rgba(239, 68, 68, 0.2)";
            badge.style.color = "#fca5a5";
        }

        this.updateHUD();
    }

    handleGPSPosition(pos) {
        if (this.status !== "tracking") return;

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const alt = pos.coords.altitude || 0;
        const speed = pos.coords.speed ? (pos.coords.speed * 3.6) : 0; // m/s to km/h

        this.addCoordinate(lat, lng, alt, speed);
    }

    addCoordinate(lat, lng, alt = 0, rawSpeed = 0) {
        const point = [lat, lng];
        const prevPoint = this.routeCoords.length > 0 ? this.routeCoords[this.routeCoords.length - 1] : null;

        if (prevPoint) {
            const distDelta = this.haversineDistance(prevPoint[0], prevPoint[1], lat, lng);
            if (distDelta > 0.002) { // Minimum 2 meters movement
                this.distanceKm += distDelta;

                // Calorie model: ~35 kcal/km for cycling, ~65 kcal/km for running/hiking
                const calFactor = this.sport === "cycling" ? 35 : 65;
                this.caloriesBurned += distDelta * calFactor;

                // Elevation calculation
                if (alt && prevPoint[2]) {
                    const elevDelta = alt - prevPoint[2];
                    if (elevDelta > 0.5) this.elevationGainM += Math.round(elevDelta);
                }

                // Speed calculation
                const speedKmh = rawSpeed > 0 ? rawSpeed : (distDelta / (1 / 3600));
                this.currentSpeedKmh = Math.min(75, Math.max(0, speedKmh));
                if (this.currentSpeedKmh > this.maxSpeedKmh) this.maxSpeedKmh = this.currentSpeedKmh;

                // Steps estimation for walking/running
                if (this.sport !== "cycling") {
                    this.liveSteps += Math.round(distDelta * 1350);
                }

                // Split detection: every 1.0 km
                if (this.distanceKm - this.lastSplitDist >= 1.0) {
                    this.recordSplit();
                }
            }
        }

        this.routeCoords.push([lat, lng, alt]);

        // Update Map & Marker
        if (this.routePolyline) {
            this.routePolyline.addLatLng(point);
        }
        if (this.userMarker) {
            this.userMarker.setLatLng(point);
            this.map.panTo(point, { animate: true, duration: 0.5 });
        }

        const coordsEl = document.getElementById("strava-gps-coords");
        if (coordsEl) coordsEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        this.updateHUD();
    }

    recordSplit() {
        const splitKm = Math.floor(this.distanceKm);
        const splitTimeSec = this.elapsedSeconds - this.lastSplitTime;
        this.lastSplitTime = this.elapsedSeconds;
        this.lastSplitDist = splitKm;

        const splitPace = this.formatTime(splitTimeSec);
        const splitSpeed = (1 / (splitTimeSec / 3600)).toFixed(1);

        this.splits.push({
            km: splitKm,
            pace: splitPace,
            speed: splitSpeed,
            splitSec: splitTimeSec
        });

        this.renderSplits();
    }

    renderSplits() {
        const tbody = document.getElementById("strava-splits-tbody");
        if (!tbody) return;

        tbody.innerHTML = this.splits.map(s => `
            <tr>
                <td style="font-weight: 800; color: #fff;">${s.km} KM</td>
                <td style="color: var(--blue); font-weight: 700;">${this.sport === 'cycling' ? s.speed + ' km/h' : s.pace + ' /km'}</td>
                <td style="color: #38bdf8;">+${Math.round(this.elevationGainM / this.splits.length)}m</td>
                <td style="color: #f59e0b; font-weight: 700;">${this.formatTime(s.splitSec)}</td>
            </tr>
        `).join("");
    }

    updateHUD() {
        const distEl = document.getElementById("strava-distance");
        const speedPaceEl = document.getElementById("strava-speed-pace");
        const timerEl = document.getElementById("strava-timer");
        const calEl = document.getElementById("strava-calories");
        const elevEl = document.getElementById("strava-elevation");
        const stepsEl = document.getElementById("strava-steps");
        const cadenceEl = document.getElementById("strava-cadence");

        if (distEl) distEl.textContent = this.distanceKm.toFixed(2);
        if (timerEl) timerEl.textContent = this.formatTime(this.elapsedSeconds);
        if (calEl) calEl.textContent = Math.round(this.caloriesBurned);
        if (elevEl) elevEl.textContent = this.elevationGainM;
        if (stepsEl) stepsEl.textContent = this.liveSteps.toLocaleString();

        // Calculate average speed
        if (this.elapsedSeconds > 0) {
            this.avgSpeedKmh = (this.distanceKm / (this.elapsedSeconds / 3600));
        }

        // Live Speed vs Pace
        if (this.sport === "cycling") {
            if (speedPaceEl) speedPaceEl.textContent = this.currentSpeedKmh.toFixed(1);
        } else {
            // Running/Walking Pace (min/km)
            if (this.currentSpeedKmh > 1.0) {
                const paceSec = 3600 / this.currentSpeedKmh;
                this.currentPaceMinKm = this.formatTime(Math.min(1200, paceSec));
            } else {
                this.currentPaceMinKm = "0:00";
            }
            if (speedPaceEl) speedPaceEl.textContent = this.currentPaceMinKm;
        }

        if (cadenceEl && this.elapsedSeconds > 0) {
            const c = Math.round((this.liveSteps / Math.max(1, this.elapsedSeconds)) * 60);
            cadenceEl.textContent = `${c} steps/min`;
        }
    }

    // Realistic Route Simulation for Desktops / Laptops
    simulateRoute(type) {
        this.reset();
        this.setSport(type === "ride" ? "cycling" : (type === "run" ? "running" : "walking"));
        this.start();

        // High-fidelity waypoint route coordinates (Golden Gate Park Scenic Loop)
        const baseRoute = [
            [37.7690, -122.4862, 20],
            [37.7702, -122.4820, 24],
            [37.7715, -122.4770, 32],
            [37.7728, -122.4715, 38],
            [37.7735, -122.4660, 45],
            [37.7725, -122.4600, 52],
            [37.7700, -122.4550, 48],
            [37.7680, -122.4510, 40],
            [37.7660, -122.4560, 35],
            [37.7650, -122.4620, 30],
            [37.7645, -122.4680, 26],
            [37.7655, -122.4750, 22],
            [37.7670, -122.4810, 20]
        ];

        let index = 0;
        const targetSpeed = type === "ride" ? 28.5 : (type === "run" ? 12.2 : 5.4);

        if (this.simInterval) clearInterval(this.simInterval);

        this.simInterval = setInterval(() => {
            if (this.status !== "tracking") return;
            const pt = baseRoute[index % baseRoute.length];
            const jitterLat = (Math.random() - 0.5) * 0.0005;
            const jitterLng = (Math.random() - 0.5) * 0.0005;
            const speedVariance = targetSpeed + (Math.sin(index) * 3);

            this.addCoordinate(pt[0] + jitterLat, pt[1] + jitterLng, pt[2] + index * 2, speedVariance);
            index++;
        }, 800);
    }

    async loadSavedWorkouts() {
        const feedEl = document.getElementById("strava-activities-feed");
        if (!feedEl) return;

        const token = localStorage.getItem("fitbat_token");
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};

        try {
            const res = await fetch("/api/strava/workouts", { headers });
            const data = await res.json();
            const list = data.workouts || [];

            if (list.length === 0) {
                feedEl.innerHTML = `<div style="color: var(--text-muted); text-align: center; padding: 1rem;">No saved workouts yet. Complete your first ride or run!</div>`;
                return;
            }

            const icons = { cycling: "🚴", running: "🏃", walking: "🚶", hiking: "⛰️" };

            feedEl.innerHTML = list.map(w => {
                const icon = icons[w.sport_type] || "⚡";
                const dateStr = new Date(w.created_at).toLocaleDateString([], { month: "short", day: "numeric" });
                return `
                    <div class="strava-workout-card">
                        <div style="display: flex; align-items: center; gap: 0.8rem;">
                            <span style="font-size: 1.8rem;">${icon}</span>
                            <div>
                                <strong style="font-size: 0.95rem; color: #fff;">${w.title}</strong>
                                <div style="font-size: 0.76rem; color: var(--text-secondary);">${dateStr} • ${w.sport_type.toUpperCase()}</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 1.2rem; text-align: right;">
                            <div>
                                <strong style="color: #10b981; font-size: 1.05rem;">${w.distance_km.toFixed(2)} km</strong>
                                <div style="font-size: 0.72rem; color: var(--text-muted);">DISTANCE</div>
                            </div>
                            <div>
                                <strong style="color: #f59e0b; font-size: 1.05rem;">${this.formatTime(w.duration_seconds)}</strong>
                                <div style="font-size: 0.72rem; color: var(--text-muted);">TIME</div>
                            </div>
                            <div>
                                <strong style="color: var(--blue); font-size: 1.05rem;">${w.avg_speed_kmh} km/h</strong>
                                <div style="font-size: 0.72rem; color: var(--text-muted);">AVG SPEED</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join("");
        } catch (e) {
            console.error("Failed to load saved workouts", e);
        }
    }

    haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    formatTime(sec) {
        if (!sec || isNaN(sec)) return "00:00:00";
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        const pad = (n) => (n < 10 ? "0" : "") + n;
        if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
        return `${pad(m)}:${pad(s)}`;
    }
}

window.stravaTracker = new StravaTracker();
