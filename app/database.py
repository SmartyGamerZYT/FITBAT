import sqlite3
import os
import shutil
from datetime import datetime, date

# Determine writable DB path (Vercel / Lambda requires writing to /tmp)
LOCAL_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fitbat.db")

def get_db_path() -> str:
    # Check if running in Vercel or AWS Lambda / Serverless read-only environment
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME") or not os.access(os.path.dirname(LOCAL_DB_PATH), os.W_OK):
        tmp_db = "/tmp/fitbat.db"
        if not os.path.exists(tmp_db):
            if os.path.exists(LOCAL_DB_PATH):
                try:
                    shutil.copyfile(LOCAL_DB_PATH, tmp_db)
                except Exception:
                    pass
        return tmp_db
    return LOCAL_DB_PATH

DB_PATH = get_db_path()

def get_db_connection():
    db_file = get_db_path()
    conn = sqlite3.connect(db_file)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        points INTEGER DEFAULT 0,
        xp INTEGER DEFAULT 0,
        coins INTEGER DEFAULT 100,
        streak INTEGER DEFAULT 1,
        level INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
    )
    """)

    # Profiles Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS profiles (
        user_id INTEGER PRIMARY KEY,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        height_cm REAL NOT NULL,
        weight_kg REAL NOT NULL,
        fitness_level TEXT NOT NULL,
        primary_goal TEXT NOT NULL,
        activity_level TEXT NOT NULL,
        fitness_score REAL DEFAULT 0,
        bmi REAL DEFAULT 0,
        bmr REAL DEFAULT 0,
        tdee REAL DEFAULT 0,
        body_fat_pct REAL DEFAULT 0,
        daily_calorie_target REAL DEFAULT 0,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Daily Tasks Catalog
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS daily_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        exercise_id TEXT,
        target_value REAL NOT NULL,
        unit TEXT NOT NULL,
        xp_reward INTEGER NOT NULL,
        coin_reward INTEGER NOT NULL,
        min_age INTEGER DEFAULT 10,
        max_age INTEGER DEFAULT 100
    )
    """)

    # User Daily Tasks Progress
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        task_id INTEGER NOT NULL,
        progress REAL DEFAULT 0,
        completed INTEGER DEFAULT 0,
        date_str TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES daily_tasks(id) ON DELETE CASCADE
    )
    """)

    # Exercise Specific Stats
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS exercise_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        exercise_id TEXT NOT NULL,
        total_reps INTEGER DEFAULT 0,
        max_reps_single_match INTEGER DEFAULT 0,
        matches_played INTEGER DEFAULT 0,
        matches_won INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, exercise_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Battle Match History
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS battle_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        opponent_name TEXT NOT NULL,
        opponent_type TEXT NOT NULL,
        age_group TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        user_reps INTEGER NOT NULL,
        opponent_reps INTEGER NOT NULL,
        outcome TEXT NOT NULL,
        xp_earned INTEGER DEFAULT 0,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Activity & Steps Monitoring
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date_str TEXT NOT NULL,
        steps INTEGER DEFAULT 0,
        distance_km REAL DEFAULT 0,
        calories_burned REAL DEFAULT 0,
        active_minutes INTEGER DEFAULT 0,
        UNIQUE(user_id, date_str),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Chat History
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        sender TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Daily Nutrition Logs (Health Monitor)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS nutrition_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date_str TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        food_description TEXT NOT NULL,
        estimated_calories REAL DEFAULT 0,
        protein_g REAL DEFAULT 0,
        carbs_g REAL DEFAULT 0,
        fats_g REAL DEFAULT 0,
        water_glasses INTEGER DEFAULT 0,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Seed Default Tasks if empty
    cursor.execute("SELECT COUNT(*) as count FROM daily_tasks")
    if cursor.fetchone()["count"] == 0:
        seed_tasks = [
            ("Morning Stride", "Walk at least 4,000 steps today to activate your metabolism.", "walking", None, 4000, "steps", 50, 20, 10, 100),
            ("Pushup Prodigy", "Complete 20 clean form pushups in the Battle Arena or practice.", "exercise", "pushups", 20, "reps", 80, 35, 13, 60),
            ("Squat Champion", "Power through 25 deep bodyweight squats.", "exercise", "squats", 25, "reps", 75, 30, 10, 75),
            ("Iron Core Plank", "Hold a static plank for 45 total seconds.", "exercise", "plank", 45, "seconds", 90, 40, 12, 70),
            ("Jumping Jack Flash", "Blast your cardio with 40 jumping jacks.", "exercise", "jumping_jacks", 40, "reps", 60, 25, 10, 80),
            ("Gladiator Arena Trial", "Compete in at least 1 real-time Fitness Battle against a peer or AI.", "battle", None, 1, "battle", 100, 50, 10, 100),
            ("Bicep Pump", "Complete 20 controlled bicep curls.", "exercise", "bicep_curls", 20, "reps", 70, 30, 12, 80),
            ("Hydration Hero", "Log 8 glasses of water to maintain peak performance.", "habit", None, 8, "glasses", 40, 15, 10, 100)
        ]
        cursor.executemany("""
        INSERT INTO daily_tasks (title, description, category, exercise_id, target_value, unit, xp_reward, coin_reward, min_age, max_age)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, seed_tasks)

    # Seed Bot Rivals for Leaderboards if no users exist
    cursor.execute("SELECT COUNT(*) as count FROM users")
    if cursor.fetchone()["count"] == 0:
        seed_bots = [
            ("ApexTitan", "titan@fitbat.ai", "hash_mock_1", 3450, 3450, 850, 14, 8),
            ("ValkyriePulse", "valk@fitbat.ai", "hash_mock_2", 3120, 3120, 720, 11, 7),
            ("CyberNinja", "ninja@fitbat.ai", "hash_mock_3", 2890, 2890, 640, 9, 6),
            ("IronBeast99", "beast@fitbat.ai", "hash_mock_4", 2450, 2450, 530, 7, 5),
            ("PhoenixFit", "phoenix@fitbat.ai", "hash_mock_5", 2100, 2100, 480, 6, 5),
            ("ShadowStriker", "shadow@fitbat.ai", "hash_mock_6", 1850, 1850, 390, 5, 4),
            ("VoltRunner", "volt@fitbat.ai", "hash_mock_7", 1600, 1600, 320, 4, 3),
            ("ZenithWarrior", "zenith@fitbat.ai", "hash_mock_8", 1350, 1350, 260, 3, 3)
        ]
        for b in seed_bots:
            cursor.execute("""
            INSERT INTO users (username, email, password_hash, points, xp, coins, streak, level, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], datetime.now().isoformat()))
            uid = cursor.lastrowid
            
            # Profiles for bots
            cursor.execute("""
            INSERT INTO profiles (user_id, age, gender, height_cm, weight_kg, fitness_level, primary_goal, activity_level, fitness_score, bmi, bmr, tdee, body_fat_pct, daily_calorie_target, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (uid, 24, "Other", 178, 74, "Advanced", "Muscle Gain", "Very Active", 88.5, 23.4, 1750, 2600, 14.2, 2600, datetime.now().isoformat()))

            # Exercise stats for bots
            exercises = ["pushups", "squats", "jumping_jacks", "bicep_curls", "lunges", "high_knees", "plank", "shoulder_press", "crunches", "mountain_climbers", "lateral_raises", "shadow_boxing"]
            import random
            for ex in exercises:
                reps = random.randint(35, 120)
                max_reps = random.randint(25, 65)
                played = random.randint(10, 30)
                won = int(played * random.uniform(0.6, 0.9))
                cursor.execute("""
                INSERT INTO exercise_stats (user_id, exercise_id, total_reps, max_reps_single_match, matches_played, matches_won, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (uid, ex, reps, max_reps, played, won, datetime.now().isoformat()))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
