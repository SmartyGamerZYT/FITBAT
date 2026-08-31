# 🔥 FITBAT - Real-Time Fitness Battles & AI Health Arena

FITBAT (Fitness Battles) is a comprehensive gamified fitness platform built with **Python (FastAPI, SQLite, WebSockets, AI Fitness Engine)** and modern real-time **Computer Vision Pose Tracking**.

---

## ⚡ Core Features

1. **User Authentication & Personalized Profiling**:
   - Register and Login with username, email, and password.
   - Onboarding captures: **Age, Gender, Height, Weight, Current Fitness Level, Primary Goal, and Daily Activity Level**.

2. **AI Fitness Prediction & Personalized Recommendations**:
   - Computes **BMI** & Category (Underweight, Optimal, Overweight, Obese).
   - Computes **BMR** (Mifflin-St Jeor) and **TDEE** (Total Daily Energy Expenditure).
   - Computes **Body Fat %** and **FITBAT Overall Fitness Score (0-100)**.
   - Calculates custom **Daily Calorie Targets** and **Macronutrient split (Protein, Carbs, Fats)**.
   - Delivers tailored age-group advice and daily hydration targets.

3. **Real-Time Computer Vision Battle Arena (12 Exercises)**:
   - **Age Group Matchmaking**:
     - *Junior Arena (13–19)*
     - *Prime Arena (20–29)*
     - *Master Arena (30–45)*
     - *Legend Arena (46+)*
   - **12 Computer Vision Supported Exercises**:
     1. **Pushups** (Elbow angle flexion/extension)
     2. **Bodyweight Squats** (Hip/Knee depth tracking)
     3. **Jumping Jacks** (Abduction & arm elevation)
     4. **Bicep Curls** (Bicep flexion and lockout)
     5. **Forward Lunges** (Knee angle alignment)
     6. **High Knees** (Hip drive elevation)
     7. **Iron Core Plank** (Spine-hip-ankle line stability hold timer)
     8. **Overhead Shoulder Press** (Vertical lockout)
     9. **Abdominal Crunches** (Torso contraction)
     10. **Mountain Climbers** (Rapid alternating knee sprint)
     11. **Lateral Shoulder Raises** (Arm abduction to parallel)
     12. **Shadow Boxing Strikes** (Snap punches & guard recovery)
   - **Arcade Battle Aesthetics & SFX**:
     - Dual-view HUD with health/power meters.
     - Animated floating popups: `+1 REP!`, `COMBO x3!`, `CRITICAL HIT!`, `KO!`.
     - Screen shake, particle confetti, and Web Audio API synthesized sound effects.

4. **AI Fitness Coach Chatbot**:
   - Floating interactive assistant answering queries on exercise form, fat loss, muscle building, nutrition, recovery, and battle tactics.

5. **Daily Quests & Step/Walking Activity Monitor**:
   - Daily challenges tailored to your age and profile awarding XP and Coins.
   - Step tracking with distance (km), active minutes, and calorie burn calculation.

6. **Multi-Tier Leaderboards**:
   - **Global Warriors Leaderboard**: Total XP, streak, and rank badges.
   - **Exercise-Specific Leaderboards**: Filterable across all 12 exercises with win counts and maximum reps in a single match.

---

## 🚀 How to Run

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the Application**:
   ```bash
   python run.py
   ```

3. **Open in Browser**:
   Visit [http://127.0.0.1:8000](http://127.0.0.1:8000) in Chrome, Edge, or Firefox.
   - Allow camera access when prompted for real-time computer vision pose tracking.
   - (Optional) Use the instant rep test button to test reps without a webcam.
