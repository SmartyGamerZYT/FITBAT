import re
from typing import Dict, Any, Optional

class FitnessCoachChatbot:
    """
    Intelligent AI Fitness Coach Chatbot tailored for FITBAT warriors.
    """

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
            "response": "👋 **Greetings Warrior!** I am your **FITBAT AI Coach**. You can ask me about proper exercise form, diet and meal plans, muscle building, fat loss, or tips to dominate the multiplayer Battle Arena. How can I help you today?"
        }
    ]

    @classmethod
    def answer(cls, query: str, user_profile: Optional[Dict[str, Any]] = None) -> str:
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
            "💪 **FITBAT Coach Tip**: Great question! To maximize your fitness gains, "
            "focus on three pillars: **Consistent Form** across your 12 daily exercises, "
            "**Nutrient-Dense Meals** with adequate protein, and **Active Daily Movement** (hitting 7,000+ steps). "
            "Jump into the Battle Arena or complete a Daily Quest today to keep leveling up!"
        )
