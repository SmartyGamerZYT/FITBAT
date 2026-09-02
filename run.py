import os
import sys
import uvicorn
from app.database import init_db

def main():
    print("=" * 60)
    print("           🔥 FITBAT - FITNESS BATTLES PLATFORM 🔥          ")
    print("=" * 60)
    print("[1/3] Initializing Database & Seeding Exercise Catalog...")
    init_db()
    print("      ✓ Database ready (fitbat.db)")
    
    print("[2/3] Verifying Modules & Computer Vision Engine...")
    from app.fitness_engine import FitnessPredictionEngine
    from app.chatbot import FitnessCoachChatbot
    from app.exercises import get_all_exercises
    exercises = get_all_exercises()
    print(f"      ✓ Loaded {len(exercises)} Exercise Disciplines.")
    print("      ✓ AI Fitness Prediction Engine active.")
    print("      ✓ AI Fitness Coach Chatbot online.")
    
    print("[3/3] Launching FastAPI Web & WebSocket Server...")
    print("=" * 60)
    print("🚀 Server running on all interfaces: http://0.0.0.0:8000")
    print("📱 Open http://localhost:8000 or your LAN IP in your browser to start battles!")
    print("=" * 60)

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)

if __name__ == "__main__":
    main()
