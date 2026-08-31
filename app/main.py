import os
import random
from datetime import datetime, date
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .database import get_db_connection, init_db
from .auth import hash_password, verify_password, create_session_token, get_current_user_from_token
from .fitness_engine import FitnessPredictionEngine
from .chatbot import FitnessCoachChatbot
from .exercises import get_all_exercises, get_exercise_by_id
from .battle_manager import battle_manager

app = FastAPI(title="FITBAT - Fitness Battles", version="1.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "css"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "js"), exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.on_event("startup")
def on_startup():
    init_db()

# --- Pydantic Request Models ---
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    age: int
    gender: str = "Male"
    height_cm: float = 175.0
    weight_kg: float = 70.0
    fitness_level: str = "Beginner"
    primary_goal: str = "Muscle Gain"
    activity_level: str = "Moderately Active"

class LoginRequest(BaseModel):
    username: str
    password: str

class ProfileUpdateRequest(BaseModel):
    age: int
    gender: str
    height_cm: float
    weight_kg: float
    fitness_level: str
    primary_goal: str
    activity_level: str

class ChatRequest(BaseModel):
    message: str

class ActivityLogRequest(BaseModel):
    steps: int
    distance_km: float
    calories_burned: float
    active_minutes: int

class TaskCompleteRequest(BaseModel):
    task_id: int
    progress: float

def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    return get_current_user_from_token(token)

def get_current_user(authorization: Optional[str] = Header(None)):
    user = get_optional_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized session. Please login.")
    return user

# --- API Routes ---

@app.get("/")
def serve_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE username = ? OR email = ?", (req.username.strip(), req.email.strip().lower()))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Username or Email is already registered.")

    metrics = FitnessPredictionEngine.calculate_metrics(
        age=req.age,
        gender=req.gender,
        height_cm=req.height_cm,
        weight_kg=req.weight_kg,
        fitness_level=req.fitness_level,
        primary_goal=req.primary_goal,
        activity_level=req.activity_level
    )

    pwd_hash = hash_password(req.password)
    now_str = datetime.now().isoformat()

    cursor.execute("""
    INSERT INTO users (username, email, password_hash, points, xp, coins, streak, level, created_at)
    VALUES (?, ?, ?, 100, 100, 150, 1, 1, ?)
    """, (req.username.strip(), req.email.strip().lower(), pwd_hash, now_str))
    user_id = cursor.lastrowid

    cursor.execute("""
    INSERT INTO profiles (user_id, age, gender, height_cm, weight_kg, fitness_level, primary_goal, activity_level, 
                          fitness_score, bmi, bmr, tdee, body_fat_pct, daily_calorie_target, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, req.age, req.gender, req.height_cm, req.weight_kg, req.fitness_level, req.primary_goal, req.activity_level,
          metrics["fitness_score"], metrics["bmi"], metrics["bmr"], metrics["tdee"], metrics["body_fat_pct"], 
          metrics["daily_calorie_target"], now_str))

    conn.commit()
    conn.close()

    token = create_session_token(user_id, req.username.strip())
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user_id,
            "username": req.username.strip(),
            "email": req.email.strip().lower(),
            "metrics": metrics
        }
    }

@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    identifier = req.username.strip().lower()
    cursor.execute("SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?", (identifier, identifier))
    user = cursor.fetchone()
    
    if not user or not verify_password(req.password, user["password_hash"]):
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid username/email or password.")

    user_id = user["id"]
    cursor.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,))
    profile = cursor.fetchone()

    metrics = None
    if profile:
        metrics = FitnessPredictionEngine.calculate_metrics(
            age=profile["age"],
            gender=profile["gender"],
            height_cm=profile["height_cm"],
            weight_kg=profile["weight_kg"],
            fitness_level=profile["fitness_level"],
            primary_goal=profile["primary_goal"],
            activity_level=profile["activity_level"]
        )

    conn.close()
    token = create_session_token(user_id, user["username"])
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "points": user["points"],
            "xp": user["xp"],
            "coins": user["coins"],
            "streak": user["streak"],
            "level": user["level"],
            "profile": dict(profile) if profile else None,
            "metrics": metrics
        }
    }

@app.get("/api/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, username, email, points, xp, coins, streak, level FROM users WHERE id = ?", (user["user_id"],))
    user_data = cursor.fetchone()
    if not user_data:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found.")

    cursor.execute("SELECT * FROM profiles WHERE user_id = ?", (user["user_id"],))
    profile = cursor.fetchone()
    
    metrics = None
    if profile:
        metrics = FitnessPredictionEngine.calculate_metrics(
            age=profile["age"],
            gender=profile["gender"],
            height_cm=profile["height_cm"],
            weight_kg=profile["weight_kg"],
            fitness_level=profile["fitness_level"],
            primary_goal=profile["primary_goal"],
            activity_level=profile["activity_level"]
        )

    conn.close()
    return {
        "user": dict(user_data),
        "profile": dict(profile) if profile else None,
        "metrics": metrics
    }

@app.get("/api/exercises")
def list_exercises():
    return {"exercises": get_all_exercises()}

@app.get("/api/exercises/{exercise_id}")
def get_exercise(exercise_id: str):
    return {"exercise": get_exercise_by_id(exercise_id)}

# Works for both logged-in users AND guests (Never returns 401!)
@app.get("/api/tasks/daily")
def get_daily_tasks(user: Optional[dict] = Depends(get_optional_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    today_str = date.today().isoformat()

    user_age = 22
    user_id = None
    if user:
        user_id = user["user_id"]
        cursor.execute("SELECT age FROM profiles WHERE user_id = ?", (user_id,))
        prof = cursor.fetchone()
        if prof:
            user_age = prof["age"]

    cursor.execute("""
    SELECT * FROM daily_tasks WHERE min_age <= ? AND max_age >= ?
    """, (user_age, user_age))
    tasks = cursor.fetchall()

    result = []
    for t in tasks:
        progress = 0
        completed = False
        if user_id:
            cursor.execute("""
            SELECT progress, completed FROM user_tasks WHERE user_id = ? AND task_id = ? AND date_str = ?
            """, (user_id, t["id"], today_str))
            user_t = cursor.fetchone()
            if user_t:
                progress = user_t["progress"]
                completed = bool(user_t["completed"])
        
        result.append({
            "id": t["id"],
            "title": t["title"],
            "description": t["description"],
            "category": t["category"],
            "exercise_id": t["exercise_id"],
            "target_value": t["target_value"],
            "unit": t["unit"],
            "xp_reward": t["xp_reward"],
            "coin_reward": t["coin_reward"],
            "progress": progress,
            "completed": completed
        })

    conn.close()
    return {"tasks": result, "date": today_str}

@app.post("/api/tasks/complete")
def complete_task(req: TaskCompleteRequest, user: Optional[dict] = Depends(get_optional_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    today_str = date.today().isoformat()

    cursor.execute("SELECT * FROM daily_tasks WHERE id = ?", (req.task_id,))
    task = cursor.fetchone()
    if not task:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")

    is_complete = req.progress >= task["target_value"]
    xp_awarded = task["xp_reward"] if is_complete else 0
    coins_awarded = task["coin_reward"] if is_complete else 0

    if user:
        user_id = user["user_id"]
        cursor.execute("""
        SELECT completed FROM user_tasks WHERE user_id = ? AND task_id = ? AND date_str = ?
        """, (user_id, req.task_id, today_str))
        existing = cursor.fetchone()
        already_awarded = existing and existing["completed"] == 1

        cursor.execute("""
        INSERT OR REPLACE INTO user_tasks (user_id, task_id, progress, completed, date_str)
        VALUES (?, ?, ?, ?, ?)
        """, (user_id, req.task_id, req.progress, 1 if is_complete else 0, today_str))

        if is_complete and not already_awarded:
            cursor.execute("""
            UPDATE users SET xp = xp + ?, points = points + ?, coins = coins + ? WHERE id = ?
            """, (xp_awarded, xp_awarded, coins_awarded, user_id))

        conn.commit()

    conn.close()
    return {
        "success": True,
        "completed": is_complete,
        "xp_awarded": xp_awarded,
        "coins_awarded": coins_awarded
    }

@app.post("/api/activity/log")
def log_activity(req: ActivityLogRequest, user: Optional[dict] = Depends(get_optional_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    today_str = date.today().isoformat()
    total_steps = req.steps

    if user:
        user_id = user["user_id"]
        cursor.execute("""
        INSERT INTO activity_logs (user_id, date_str, steps, distance_km, calories_burned, active_minutes)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, date_str) DO UPDATE SET
            steps = steps + excluded.steps,
            distance_km = distance_km + excluded.distance_km,
            calories_burned = calories_burned + excluded.calories_burned,
            active_minutes = active_minutes + excluded.active_minutes
        """, (user_id, today_str, req.steps, req.distance_km, req.calories_burned, req.active_minutes))

        cursor.execute("SELECT steps FROM activity_logs WHERE user_id = ? AND date_str = ?", (user_id, today_str))
        row = cursor.fetchone()
        if row:
            total_steps = row["steps"]

        cursor.execute("SELECT id, target_value, xp_reward, coin_reward FROM daily_tasks WHERE category = 'walking'")
        walking_task = cursor.fetchone()
        if walking_task and total_steps >= walking_task["target_value"]:
            cursor.execute("""
            INSERT OR REPLACE INTO user_tasks (user_id, task_id, progress, completed, date_str)
            VALUES (?, ?, ?, 1, ?)
            """, (user_id, walking_task["id"], total_steps, today_str))

        conn.commit()

    conn.close()
    return {"success": True, "total_steps": total_steps}

@app.get("/api/activity/today")
def get_today_activity(user: Optional[dict] = Depends(get_optional_user)):
    today_str = date.today().isoformat()
    if user:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM activity_logs WHERE user_id = ? AND date_str = ?", (user["user_id"], today_str))
        row = cursor.fetchone()
        conn.close()
        if row:
            return dict(row)
    return {
        "user_id": 0,
        "date_str": today_str,
        "steps": 0,
        "distance_km": 0.0,
        "calories_burned": 0.0,
        "active_minutes": 0
    }

@app.post("/api/chatbot/message")
def chat_with_coach(req: ChatRequest, user: Optional[dict] = Depends(get_optional_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    user_prof = None
    if user:
        cursor.execute("SELECT * FROM profiles WHERE user_id = ?", (user["user_id"],))
        profile = cursor.fetchone()
        if profile:
            user_prof = dict(profile)

    reply = FitnessCoachChatbot.answer(req.message, user_prof)

    if user:
        now_str = datetime.now().isoformat()
        cursor.execute("""
        INSERT INTO chat_history (user_id, sender, message, timestamp)
        VALUES (?, 'user', ?, ?), (?, 'coach', ?, ?)
        """, (user["user_id"], req.message, now_str, user["user_id"], reply, now_str))
        conn.commit()

    conn.close()
    return {"reply": reply}

@app.get("/api/leaderboard/global")
def get_global_leaderboard():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT u.id, u.username, u.points, u.xp, u.level, u.streak, p.fitness_score, p.age
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    ORDER BY u.points DESC, u.xp DESC
    LIMIT 50
    """)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for idx, r in enumerate(rows):
        result.append({
            "rank": idx + 1,
            "user_id": r["id"],
            "username": r["username"],
            "points": r["points"],
            "xp": r["xp"],
            "level": r["level"],
            "streak": r["streak"],
            "fitness_score": r["fitness_score"] or 75.0,
            "age": r["age"] or 22
        })
    return {"leaderboard": result}

@app.get("/api/leaderboard/exercise/{exercise_id}")
def get_exercise_leaderboard(exercise_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT u.id, u.username, es.total_reps, es.max_reps_single_match, es.matches_played, es.matches_won, p.age
    FROM exercise_stats es
    JOIN users u ON es.user_id = u.id
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE es.exercise_id = ?
    ORDER BY es.matches_won DESC, es.max_reps_single_match DESC, es.total_reps DESC
    LIMIT 50
    """, (exercise_id,))
    rows = cursor.fetchall()
    conn.close()

    result = []
    for idx, r in enumerate(rows):
        win_rate = round((r["matches_won"] / max(1, r["matches_played"])) * 100, 1)
        result.append({
            "rank": idx + 1,
            "user_id": r["id"],
            "username": r["username"],
            "total_reps": r["total_reps"],
            "max_reps": r["max_reps_single_match"],
            "matches_played": r["matches_played"],
            "matches_won": r["matches_won"],
            "win_rate": win_rate,
            "age": r["age"] or 22
        })
    return {"exercise_id": exercise_id, "leaderboard": result}

@app.get("/api/battles/history")
def get_battle_history(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT * FROM battle_matches 
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT 25
    """, (user["user_id"],))
    rows = cursor.fetchall()
    conn.close()
    return {"history": [dict(r) for r in rows]}

# --- Real-time WebSocket Battle Arena ---
@app.websocket("/ws/battle")
async def websocket_battle_endpoint(websocket: WebSocket, token: Optional[str] = None, exercise_id: str = "pushups", 
                                    age_group: str = "Prime (20-29)", room_code: Optional[str] = None, 
                                    force_ai: bool = False):
    session = get_current_user_from_token(token) if token else None
    
    if not session:
        guest_id = random.randint(50000, 99999)
        guest_name = f"Warrior_{random.randint(100, 999)}"
        session = {"user_id": guest_id, "username": guest_name}

    user_id = session["user_id"]
    username = session["username"]

    room_id = await battle_manager.connect_player(
        websocket=websocket,
        user_id=user_id,
        username=username,
        exercise_id=exercise_id,
        age_group=age_group,
        room_code=room_code,
        force_ai=force_ai
    )

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "REP_PERFORMED":
                rep_count = data.get("reps", 0)
                form_score = data.get("form_score", 1.0)
                await battle_manager.handle_player_rep(websocket, room_id, rep_count, form_score)

            elif msg_type in ["WEBRTC_OFFER", "WEBRTC_ANSWER", "WEBRTC_ICE_CANDIDATE"]:
                await battle_manager.forward_webrtc_signaling(websocket, room_id, data)

            elif msg_type == "FINISH_ROUND":
                await battle_manager.finish_match(room_id, websocket)
                break

    except WebSocketDisconnect:
        await battle_manager.finish_match(room_id, websocket)
    except Exception:
        await battle_manager.finish_match(room_id, websocket)
