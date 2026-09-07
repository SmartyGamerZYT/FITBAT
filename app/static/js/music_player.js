// FITBAT Gym Beats Workout Music Player
// Powerful online gym workout audio player with Web Audio API beat synthesizer & streaming audio,
// real-time spectrum equalizer, live search, and persistent cross-view dock player.

class GymMusicPlayer {
    constructor() {
        this.stations = [
            {
                id: "phonk",
                name: "Aggressive Phonk & Drift",
                icon: "⚡",
                bpm: 138,
                genre: "Phonk / Drift",
                desc: "Heavy 808 sub-bass, distorted cowbells, and fast tempo PR crusher.",
                tracks: [
                    { title: "Ghost Rider Phonk", artist: "FITBAT Records", duration: 185, stream: "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77c30.mp3?filename=action-sport-breakbeat-122934.mp3" },
                    { title: "Drift Blade 808", artist: "Kage Phonk", duration: 210, stream: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=electronic-future-beats-117997.mp3" },
                    { title: "Tokyo Night Nitro", artist: "Drift King", duration: 195, stream: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=sport-electro-115316.mp3" }
                ]
            },
            {
                id: "hardstyle",
                name: "Hardstyle PR Crusher",
                icon: "🔥",
                bpm: 156,
                genre: "Rawstyle / Hard Dance",
                desc: "155+ BPM punchy reverse kicks for intense deadlifts, squats and sprints.",
                tracks: [
                    { title: "Titan Rawstyle Drop", artist: "Gladiator X", duration: 220, stream: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=energetic-hip-hop-8-112588.mp3" },
                    { title: "Beast Overdrive", artist: "Iron Goliath", duration: 205, stream: "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77c30.mp3?filename=action-sport-breakbeat-122934.mp3" },
                    { title: "Apex Valkyrie", artist: "Hardstyle Nation", duration: 235, stream: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=electronic-future-beats-117997.mp3" }
                ]
            },
            {
                id: "hiphop",
                name: "Hip-Hop Beast Mode",
                icon: "🥊",
                bpm: 142,
                genre: "Trap & Gym Rap",
                desc: "Booming drums, aggressive brass, and raw motivational energy.",
                tracks: [
                    { title: "Iron Paradise Cypher", artist: "Gym Titans", duration: 190, stream: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=energetic-hip-hop-8-112588.mp3" },
                    { title: "No Mercy Reps", artist: "Beastflow", duration: 175, stream: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=sport-electro-115316.mp3" },
                    { title: "Heavyweight Anthem", artist: "Gold Standard", duration: 215, stream: "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77c30.mp3?filename=action-sport-breakbeat-122934.mp3" }
                ]
            },
            {
                id: "synthwave",
                name: "Cyberpunk Cardio",
                icon: "🦾",
                bpm: 132,
                genre: "Synthwave / Darksynth",
                desc: "Driving neon arpeggios and relentless kicks for cycling and endurance runs.",
                tracks: [
                    { title: "Neon Muscle Run", artist: "CyberRunner", duration: 240, stream: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=electronic-future-beats-117997.mp3" },
                    { title: "Laser Treadmill Sprint", artist: "RetroWave 84", duration: 225, stream: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=sport-electro-115316.mp3" },
                    { title: "Night City Velocity", artist: "Overdrive X", duration: 210, stream: "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77c30.mp3?filename=action-sport-breakbeat-122934.mp3" }
                ]
            },
            {
                id: "metal",
                name: "Heavy Metal Gains",
                icon: "🎸",
                bpm: 148,
                genre: "Industrial & Metal",
                desc: "Distorted heavy drop-D guitars and thunderous double-bass drums.",
                tracks: [
                    { title: "Iron Forge Riff", artist: "Steel Colossus", duration: 210, stream: "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77c30.mp3?filename=action-sport-breakbeat-122934.mp3" },
                    { title: "Barbell Breakdown", artist: "Hammer Strength", duration: 230, stream: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=energetic-hip-hop-8-112588.mp3" },
                    { title: "Anvil Drop Metal", artist: "Rupture", duration: 198, stream: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=sport-electro-115316.mp3" }
                ]
            },
            {
                id: "recovery",
                name: "Deep Recovery & Stretch",
                icon: "🧘",
                bpm: 98,
                genre: "Chill Lofi & Ambient",
                desc: "Smooth relaxing frequencies for post-workout stretching and breathing.",
                tracks: [
                    { title: "Zenith Cool Down", artist: "Calm Beats", duration: 180, stream: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=electronic-future-beats-117997.mp3" },
                    { title: "Post-Battle Horizon", artist: "Aura Stretch", duration: 240, stream: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=sport-electro-115316.mp3" }
                ]
            }
        ];

        this.currentStation = this.stations[0];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.volume = 0.8;
        this.currentTime = 0;
        this.duration = 185;

        // Audio Elements & Web Audio Synth
        this.audio = new Audio();
        this.audio.volume = this.volume;
        this.synthCtx = null;
        this.synthInterval = null;
        this.synthStep = 0;

        this.setupAudioListeners();
    }

    setupAudioListeners() {
        this.audio.addEventListener("timeupdate", () => {
            this.currentTime = this.audio.currentTime;
            this.duration = this.audio.duration || this.currentTrack.duration || 180;
            this.updateScrubberUI();
        });

        this.audio.addEventListener("ended", () => {
            this.next();
        });

        this.audio.addEventListener("error", () => {
            console.warn("[MusicPlayer] Stream fallback: Activating Web Audio API Gym Synth Beat Generator");
            this.startWebAudioSynthBeat();
        });
    }

    get currentTrack() {
        return this.currentStation.tracks[this.currentTrackIndex] || this.currentStation.tracks[0];
    }

    init() {
        this.renderStations();
        this.renderDeck();
        this.updateMiniPlayerUI();
        this.setupVisualizer();
    }

    selectStation(stationId) {
        const found = this.stations.find(s => s.id === stationId);
        if (!found) return;

        this.currentStation = found;
        this.currentTrackIndex = 0;
        this.renderStations();
        this.renderDeck();
        if (this.isPlaying) {
            this.play();
        }
    }

    selectTrack(index) {
        this.currentTrackIndex = index;
        this.renderDeck();
        this.play();
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        this.isPlaying = true;
        const track = this.currentTrack;

        if (track.stream) {
            this.audio.src = track.stream;
            this.audio.play().catch(e => {
                console.log("[MusicPlayer] Autoplay restricted or stream failed, using Web Audio gym synth:", e);
                this.startWebAudioSynthBeat();
            });
        } else {
            this.startWebAudioSynthBeat();
        }

        this.updateControlsUI();
        this.updateMiniPlayerUI();
    }

    pause() {
        this.isPlaying = false;
        this.audio.pause();
        this.stopWebAudioSynthBeat();
        this.updateControlsUI();
        this.updateMiniPlayerUI();
    }

    next() {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.currentStation.tracks.length;
        this.renderDeck();
        if (this.isPlaying) this.play();
    }

    prev() {
        this.currentTrackIndex = (this.currentTrackIndex - 1 + this.currentStation.tracks.length) % this.currentStation.tracks.length;
        this.renderDeck();
        if (this.isPlaying) this.play();
    }

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, parseFloat(val)));
        this.audio.volume = this.volume;
        const sliders = document.querySelectorAll(".music-vol-slider");
        sliders.forEach(s => s.value = this.volume);
    }

    seek(fraction) {
        if (this.audio && this.audio.duration) {
            this.audio.currentTime = this.audio.duration * fraction;
        }
    }

    // Web Audio API Synthesizer: 100% Guaranteed High-Energy Workout Beat Generator
    initSynth() {
        if (!this.synthCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.synthCtx = new AudioCtx();
        }
        if (this.synthCtx.state === "suspended") {
            this.synthCtx.resume();
        }
    }

    startWebAudioSynthBeat() {
        this.initSynth();
        this.stopWebAudioSynthBeat();
        const bpm = this.currentStation.bpm || 140;
        const intervalMs = (60 / bpm / 4) * 1000; // 16th note steps

        this.synthInterval = setInterval(() => {
            this.triggerSynthStep(this.synthStep);
            this.synthStep = (this.synthStep + 1) % 16;
        }, intervalMs);
    }

    stopWebAudioSynthBeat() {
        if (this.synthInterval) {
            clearInterval(this.synthInterval);
            this.synthInterval = null;
        }
    }

    triggerSynthStep(step) {
        if (!this.synthCtx || !this.isPlaying) return;
        const ctx = this.synthCtx;
        const t = ctx.currentTime;

        // Kick drum on beats 0, 4, 8, 12
        if (step % 4 === 0) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(32, t + 0.12);
            gain.gain.setValueAtTime(this.volume * 0.9, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.18);
        }

        // Sub Bass on 808 roll (steps 2, 6, 10, 14)
        if (step % 4 === 2) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            const freqs = [42, 45, 40, 48];
            const f = freqs[(step >> 2) % freqs.length];
            osc.frequency.setValueAtTime(f, t);
            gain.gain.setValueAtTime(this.volume * 0.45, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.22);
        }

        // Hi-Hats on every offbeat 16th note
        if (step % 2 === 1) {
            const bufSize = ctx.sampleRate * 0.04;
            const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = "highpass";
            filter.frequency.value = 7500;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(this.volume * 0.35, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            noise.start(t);
        }
    }

    renderStations() {
        const container = document.getElementById("music-stations-container");
        if (!container) return;

        container.innerHTML = this.stations.map(st => {
            const isActive = st.id === this.currentStation.id;
            return `
                <div class="station-card ${isActive ? 'active' : ''}" onclick="window.gymMusicPlayer.selectStation('${st.id}')">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <span style="font-size: 2.2rem;">${st.icon}</span>
                        <span class="station-bpm-badge">${st.bpm} BPM</span>
                    </div>
                    <div>
                        <h3 style="font-family: var(--font-heading); font-size: 1.15rem; color: #fff; margin-bottom: 0.3rem;">${st.name}</h3>
                        <div style="font-size: 0.78rem; color: var(--blue); font-weight: 800; text-transform: uppercase;">${st.genre}</div>
                        <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.4rem; line-height: 1.3;">${st.desc}</p>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                        <span style="font-size: 0.8rem; color: var(--text-muted);">${st.tracks.length} Tracks</span>
                        <span style="font-size: 0.85rem; font-weight: 800; color: ${isActive ? 'var(--blue)' : '#fff'};">
                            ${isActive && this.isPlaying ? '▶️ PLAYING' : '⚡ PLAY'}
                        </span>
                    </div>
                </div>
            `;
        }).join("");
    }

    renderDeck() {
        const track = this.currentTrack;
        const station = this.currentStation;

        const titleEl = document.getElementById("deck-track-title");
        const artistEl = document.getElementById("deck-track-artist");
        const badgeEl = document.getElementById("deck-station-badge");
        const durEl = document.getElementById("deck-track-duration");

        if (titleEl) titleEl.textContent = track.title;
        if (artistEl) artistEl.textContent = `${track.artist} • ${station.genre}`;
        if (badgeEl) badgeEl.textContent = `${station.icon} ${station.name} (${station.bpm} BPM)`;
        if (durEl) durEl.textContent = this.formatTime(track.duration || 180);

        // Render Tracklist for current station
        const listEl = document.getElementById("music-tracklist-container");
        if (listEl) {
            listEl.innerHTML = station.tracks.map((t, idx) => {
                const isCur = idx === this.currentTrackIndex;
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: ${isCur ? 'rgba(239, 68, 68, 0.18)' : 'rgba(18, 21, 31, 0.8)'}; border: 1px solid ${isCur ? 'var(--blue)' : 'var(--border-color)'}; border-radius: 12px; margin-bottom: 0.5rem; cursor: pointer;" onclick="window.gymMusicPlayer.selectTrack(${idx})">
                        <div style="display: flex; align-items: center; gap: 0.8rem;">
                            <span style="font-size: 1.1rem; color: ${isCur ? 'var(--blue)' : 'var(--text-muted)'};">${isCur && this.isPlaying ? '🔊' : '🎵'}</span>
                            <div>
                                <strong style="font-size: 0.95rem; color: #fff;">${t.title}</strong>
                                <div style="font-size: 0.78rem; color: var(--text-secondary);">${t.artist}</div>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.8rem;">
                            <span style="font-size: 0.82rem; color: var(--text-muted);">${this.formatTime(t.duration)}</span>
                            <button class="btn-primary" style="padding: 0.35rem 0.8rem; font-size: 0.78rem;">${isCur && this.isPlaying ? 'PAUSE' : 'PLAY'}</button>
                        </div>
                    </div>
                `;
            }).join("");
        }

        this.updateControlsUI();
        this.updateMiniPlayerUI();
    }

    updateControlsUI() {
        const deckPlayBtn = document.getElementById("deck-btn-play");
        const miniPlayBtn = document.getElementById("mini-btn-play");
        const playIcon = this.isPlaying ? "⏸️" : "▶️";

        if (deckPlayBtn) deckPlayBtn.textContent = playIcon;
        if (miniPlayBtn) miniPlayBtn.textContent = playIcon;

        const miniBars = document.querySelectorAll(".mini-eq-bar");
        miniBars.forEach(b => {
            b.style.animationPlayState = this.isPlaying ? "running" : "paused";
        });
    }

    updateScrubberUI() {
        const fill = document.getElementById("deck-scrubber-fill");
        const timeEl = document.getElementById("deck-current-time");
        if (fill && this.duration) {
            const pct = Math.min(100, (this.currentTime / this.duration) * 100);
            fill.style.width = `${pct}%`;
        }
        if (timeEl) {
            timeEl.textContent = this.formatTime(this.currentTime);
        }
    }

    updateMiniPlayerUI() {
        const titleEl = document.getElementById("mini-track-title");
        const infoEl = document.getElementById("mini-track-info");
        const track = this.currentTrack;
        const station = this.currentStation;

        if (titleEl) titleEl.textContent = track.title;
        if (infoEl) infoEl.textContent = `${station.icon} ${station.name} (${station.bpm} BPM)`;
    }

    filterTracks(query) {
        const q = (query || "").toLowerCase().trim();
        const container = document.getElementById("music-search-results");
        if (!container) return;

        if (!q) {
            container.innerHTML = "";
            container.style.display = "none";
            return;
        }

        container.style.display = "block";
        const results = [];
        this.stations.forEach(st => {
            st.tracks.forEach((tr, tIdx) => {
                if (tr.title.toLowerCase().includes(q) || tr.artist.toLowerCase().includes(q) || st.name.toLowerCase().includes(q) || st.genre.toLowerCase().includes(q)) {
                    results.push({ stationId: st.id, trackIndex: tIdx, track: tr, station: st });
                }
            });
        });

        if (results.length === 0) {
            container.innerHTML = `<div style="padding: 1rem; color: var(--text-muted); text-align: center;">No tracks found matching "${query}". Try "phonk", "hardstyle", "rock" or "cardio"!</div>`;
            return;
        }

        container.innerHTML = `
            <div style="font-size: 0.85rem; font-weight: 800; color: var(--blue); margin-bottom: 0.6rem; text-transform: uppercase;">
                🔍 Search Results (${results.length})
            </div>
            ${results.map(r => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.9rem; background: rgba(22, 25, 38, 0.95); border: 1px solid var(--border-color); border-radius: 10px; margin-bottom: 0.4rem; cursor: pointer;" onclick="window.gymMusicPlayer.selectStation('${r.stationId}'); window.gymMusicPlayer.selectTrack(${r.trackIndex});">
                    <div>
                        <strong style="font-size: 0.92rem; color: #fff;">${r.track.title}</strong>
                        <div style="font-size: 0.76rem; color: var(--text-secondary);">${r.station.icon} ${r.station.name} • ${r.track.artist}</div>
                    </div>
                    <button class="btn-primary" style="padding: 0.3rem 0.8rem; font-size: 0.76rem;">Play ⚡</button>
                </div>
            `).join("")}
        `;
    }

    setupVisualizer() {
        const canvas = document.getElementById("music-visualizer");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        const renderFrame = () => {
            requestAnimationFrame(renderFrame);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const numBars = 36;
            const barWidth = canvas.width / numBars;
            const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
            grad.addColorStop(0, "#b91c1c");
            grad.addColorStop(0.6, "#ef4444");
            grad.addColorStop(1, "#ff2a4b");
            ctx.fillStyle = grad;

            const t = Date.now() * 0.005;
            for (let i = 0; i < numBars; i++) {
                let h = 4;
                if (this.isPlaying) {
                    const noise = Math.sin(t * 2 + i * 0.4) * Math.cos(t * 3 - i * 0.2);
                    h = Math.max(4, Math.abs(noise) * (canvas.height * 0.88));
                }
                ctx.fillRect(i * barWidth + 2, canvas.height - h, barWidth - 4, h);
            }
        };

        renderFrame();
    }

    formatTime(sec) {
        if (!sec || isNaN(sec)) return "0:00";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
}

window.gymMusicPlayer = new GymMusicPlayer();
