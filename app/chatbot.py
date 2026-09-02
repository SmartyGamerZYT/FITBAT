import os
import re
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

class FitnessCoachChatbot:
    """
    Intelligent AI Fitness Coach Chatbot powered by Google Gemini API
    with specialized sports biomechanics, nutrition, and workout knowledge.
    """

    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

    KNOWLEDGE_BASE = [
        {
            "keywords": ["pushup", "pushups", "push up", "push ups", "chest", "elbow", "elbows"],
            "response": "💥 **Pushup Mastery**: Place your hands slightly wider than shoulder-width. Get into a full-body horizontal plank—do not bend from the waist. Lower your chest until your elbows form roughly a 90° angle, then push through your palms back to full lockout! Keep your core braced tight throughout."
        },
        {
            "keywords": ["squat", "squats", "leg", "legs", "knee", "knees", "quad", "quads", "glute", "glutes"],
            "response": "🦵 **Squat Power Guide**: Stand with feet shoulder-width apart, toes pointed slightly outward (15–30°). Hinge your hips back like sitting into a low chair, keeping your chest upright and knees tracking over your toes. Drive up forcefully through mid-foot and heels!"
        },
        {
            "keywords": ["plank", "planks", "core", "abs", "belly", "stomach", "crunch", "crunches"],
            "response": "🛡️ **Iron Core Plank Form**: Keep a straight neutral spine from head to heels. Squeeze your glutes, brace your core like someone is about to punch your stomach, and breathe steadily. If your lower back starts arching, reset your position immediately to prevent lumbar strain."
        },
        {
            "keywords": ["diet", "food", "nutrition", "eat", "protein", "meal", "meals", "calorie", "calories"],
            "response": "🥗 **FITBAT Nutrition Blueprint**: Aim for 1.6 to 2.2g of protein per kg of bodyweight to support muscle recovery and repair. Combine lean protein sources (chicken, eggs, paneer, tofu, lentils) with complex carbohydrates (brown rice, oats, sweet potatoes) and healthy fats (nuts, olive oil, avocado)."
        },
        {
            "keywords": ["weight loss", "lose fat", "fat loss", "burn fat", "cut", "fat", "weight"],
            "response": "🔥 **Fat Loss Strategy**: Fat loss requires a sustainable caloric deficit (about 300-500 kcal below your TDEE). Combine daily 7,000-10,000 steps with FITBAT battle sessions (Pushups, High Knees, Squats) to preserve lean muscle while accelerating fat burn!"
        },
        {
            "keywords": ["muscle", "muscles", "bulk", "bulking", "gain", "hypertrophy", "mass", "bicep", "biceps"],
            "response": "⚡ **Hypertrophy & Muscle Gain**: Maintain a slight caloric surplus (+250 to 400 kcal) with high protein. Focus on progressive overload in your daily exercises, controlled eccentric (lowering) tempo, and minimum 7-8 hours of quality sleep for protein synthesis."
        },
        {
            "keywords": ["sore", "soreness", "doms", "pain", "recovery", "rest", "tired", "sleep"],
            "response": "💧 **Recovery & DOMS Relief**: Muscle soreness usually peaks 24-48 hours after intense battles. Speed up recovery with active recovery (light walking), 3-4 liters of water, dynamic stretching, magnesium-rich foods, and gentle foam rolling."
        },
        {
            "keywords": ["battle", "battles", "win", "strategy", "points", "leaderboard", "arena", "multiplayer"],
            "response": "🏆 **FITBAT Battle Winning Strategy**: In the Battle Arena, consistency and form speed win matches! Don't rush so fast that your camera fails to detect full range of motion. Keep a steady explosive rhythm, lock in 3+ combos for bonus multiplier points, and pace your stamina!"
        },
        {
            "keywords": ["age", "teen", "junior", "master", "elder", "old"],
            "response": "🎯 **Age-Specific Optimization**: FITBAT matches you with opponents in your age bracket! Young warriors (under 20) should focus on coordination and bodyweight mastery. Prime warriors (20-30) can push high volume. Masters & Veterans (30+) should prioritize joint warmups, posture, and core stability."
        },
        {
            "keywords": ["water", "hydrate", "hydration", "drink"],
            "response": "🥤 **Hydration Metric**: Drink roughly 35ml of water per kg of body weight daily (approx 2.5 to 3.5 Liters). Drink 300-500ml before entering a FITBAT battle to prevent muscle cramping and maintain high energy levels!"
        },
        {
            "keywords": ["hello", "hi", "hey", "fitbat", "who are you", "help"],
            "response": "👋 **Greetings Warrior!** I am your **FITBAT AI Coach** powered by Gemini AI. Ask me about custom workouts, diet plans, muscle gain, fat loss, or tactics to win the Battle Arena. What is your fitness goal today?"
        }
    ]

    @classmethod
    def call_gemini_api(cls, query: str, user_profile: Optional[Dict[str, Any]] = None) -> Optional[str]:
        api_key = os.environ.get("GEMINI_API_KEY", "") or cls.GEMINI_API_KEY
        if not api_key:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        
        system_instruction = (
            "You are FITBAT AI Coach, an expert, encouraging, energetic AI personal trainer and sports scientist "
            "for the FITBAT Fitness Battles application. Answer questions about workouts, pushup/squat/plank form, "
            "nutrition, macros, hydration, recovery, and fitness battles in concise, actionable markdown with emoji bullets."
        )

        user_context = ""
        if user_profile:
            user_context = f"\n[User Profile: Age {user_profile.get('age', 22)}, Goal: {user_profile.get('primary_goal', 'Fitness')}, Level: {user_profile.get('fitness_level', 'Intermediate')}]\n"

        prompt = f"{system_instruction}\n{user_context}\nUser Question: {query}"

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 400
            }
        }

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=6) as response:
                if response.status == 200:
                    resp_json = json.loads(response.read().decode("utf-8"))
                    candidates = resp_json.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "").strip()
        except Exception as e:
            print(f"[Chatbot] Gemini API call error: {e}")
            return None
        return None

    @classmethod
    def answer(cls, query: str, user_profile: Optional[Dict[str, Any]] = None) -> str:
        # 1. Try Google Gemini API if configured
        gemini_response = cls.call_gemini_api(query, user_profile)
        if gemini_response:
            return gemini_response

        # 2. Intelligent local sports biomechanics knowledge base
        q_lower = query.lower().strip()
        for item in cls.KNOWLEDGE_BASE:
            for kw in item["keywords"]:
                if kw in q_lower:
                    resp = item["response"]
                    if user_profile and "primary_goal" in user_profile:
                        goal = user_profile.get("primary_goal", "Fitness")
                        resp += f"\n\n*Targeted for your goal: {goal}*"
                    return resp

        return (
            "💪 **FITBAT AI Coach**: Great fitness question! To maximize your gains and win battles: "
            "1. **Full Body Form**: Lock into complete range of motion on your pushups and squats. "
            "2. **Optimal Fuel**: Target 1.6-2.0g protein/kg and keep a slight caloric target aligned with your goal. "
            "3. **Daily Habit**: Walk 8,000+ steps and complete your daily camera quests. "
            "Jump into the Battle Arena today to put your strength to the test!"
        )
