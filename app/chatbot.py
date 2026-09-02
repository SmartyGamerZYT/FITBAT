import os
import re
import json
import urllib.request
import urllib.error
from datetime import datetime, date
from typing import Dict, Any, Optional, List

# Common food calorie database for offline estimation
FOOD_CALORIES_DB = {
    "rice": {"cal": 130, "p": 2.7, "c": 28, "f": 0.3, "unit": "1 cup cooked"},
    "roti": {"cal": 120, "p": 3.5, "c": 20, "f": 3.5, "unit": "1 piece"},
    "chapati": {"cal": 120, "p": 3.5, "c": 20, "f": 3.5, "unit": "1 piece"},
    "dal": {"cal": 150, "p": 9, "c": 20, "f": 3, "unit": "1 bowl"},
    "egg": {"cal": 78, "p": 6, "c": 0.6, "f": 5, "unit": "1 whole"},
    "eggs": {"cal": 78, "p": 6, "c": 0.6, "f": 5, "unit": "1 whole"},
    "chicken": {"cal": 239, "p": 27, "c": 0, "f": 14, "unit": "100g"},
    "paneer": {"cal": 265, "p": 18, "c": 1.2, "f": 21, "unit": "100g"},
    "milk": {"cal": 149, "p": 8, "c": 12, "f": 8, "unit": "1 glass"},
    "bread": {"cal": 79, "p": 2.7, "c": 15, "f": 1, "unit": "1 slice"},
    "banana": {"cal": 105, "p": 1.3, "c": 27, "f": 0.4, "unit": "1 medium"},
    "apple": {"cal": 95, "p": 0.5, "c": 25, "f": 0.3, "unit": "1 medium"},
    "oats": {"cal": 150, "p": 5, "c": 27, "f": 2.5, "unit": "1 cup cooked"},
    "curd": {"cal": 98, "p": 11, "c": 3.4, "f": 4.3, "unit": "1 cup"},
    "yogurt": {"cal": 100, "p": 10, "c": 4, "f": 4.5, "unit": "1 cup"},
    "pizza": {"cal": 266, "p": 11, "c": 33, "f": 10, "unit": "1 slice"},
    "burger": {"cal": 354, "p": 20, "c": 29, "f": 17, "unit": "1 burger"},
    "biryani": {"cal": 290, "p": 12, "c": 38, "f": 10, "unit": "1 plate"},
    "samosa": {"cal": 262, "p": 4, "c": 24, "f": 17, "unit": "1 piece"},
    "maggi": {"cal": 205, "p": 4.5, "c": 26, "f": 9, "unit": "1 pack"},
    "noodles": {"cal": 220, "p": 5, "c": 30, "f": 9, "unit": "1 plate"},
    "pasta": {"cal": 220, "p": 8, "c": 43, "f": 1.3, "unit": "1 cup cooked"},
    "salad": {"cal": 50, "p": 2, "c": 10, "f": 0.5, "unit": "1 bowl"},
    "juice": {"cal": 112, "p": 0.5, "c": 26, "f": 0.3, "unit": "1 glass"},
    "tea": {"cal": 30, "p": 0.5, "c": 6, "f": 0.5, "unit": "1 cup with milk"},
    "coffee": {"cal": 40, "p": 1, "c": 5, "f": 1.5, "unit": "1 cup with milk"},
    "protein shake": {"cal": 150, "p": 25, "c": 8, "f": 2, "unit": "1 scoop"},
    "whey": {"cal": 120, "p": 24, "c": 3, "f": 1, "unit": "1 scoop"},
    "peanut butter": {"cal": 94, "p": 4, "c": 3, "f": 8, "unit": "1 tbsp"},
    "almonds": {"cal": 164, "p": 6, "c": 6, "f": 14, "unit": "1 oz (23 pcs)"},
    "fish": {"cal": 206, "p": 22, "c": 0, "f": 12, "unit": "100g"},
    "mutton": {"cal": 294, "p": 25, "c": 0, "f": 21, "unit": "100g"},
    "rajma": {"cal": 127, "p": 8.7, "c": 22, "f": 0.5, "unit": "1 cup"},
    "idli": {"cal": 39, "p": 2, "c": 8, "f": 0.1, "unit": "1 piece"},
    "dosa": {"cal": 120, "p": 3, "c": 18, "f": 4, "unit": "1 plain"},
    "poha": {"cal": 180, "p": 3, "c": 32, "f": 5, "unit": "1 plate"},
    "paratha": {"cal": 230, "p": 5, "c": 30, "f": 10, "unit": "1 piece"},
    "upma": {"cal": 170, "p": 4, "c": 25, "f": 6, "unit": "1 bowl"},
    "ice cream": {"cal": 207, "p": 3.5, "c": 24, "f": 11, "unit": "1 cup"},
    "chocolate": {"cal": 155, "p": 1.4, "c": 17, "f": 9, "unit": "1 bar (30g)"},
    "chips": {"cal": 152, "p": 2, "c": 15, "f": 10, "unit": "1 small bag"},
    "sweet potato": {"cal": 103, "p": 2, "c": 24, "f": 0.1, "unit": "1 medium"},
    "corn": {"cal": 96, "p": 3.4, "c": 21, "f": 1.5, "unit": "1 ear"},
    "soya chunks": {"cal": 345, "p": 52, "c": 33, "f": 0.5, "unit": "100g dry"},
    "tofu": {"cal": 76, "p": 8, "c": 1.9, "f": 4.8, "unit": "100g"},
    "sprouts": {"cal": 31, "p": 3, "c": 6, "f": 0.2, "unit": "1 cup"},
    "water": {"cal": 0, "p": 0, "c": 0, "f": 0, "unit": "1 glass (250ml)"},
}


class FitnessCoachChatbot:
    """
    FITBAT AI Fitness Coach powered by Google Gemini API
    with Daily Health Monitor, calorie tracking, and sports knowledge.
    """

    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

    SYSTEM_PROMPT = """You are FITBAT AI Coach, an expert, encouraging, and energetic AI personal trainer and certified sports nutritionist for the FITBAT Fitness Battles app.

Your capabilities:
1. EXERCISE FORM: Detailed biomechanical guidance for pushups, squats, planks, lunges, curls, jumping jacks, etc.
2. NUTRITION & DIET: Personalized meal plans, calorie counting, macro splits, Indian & international foods.
3. DAILY HEALTH MONITOR: When users tell you what they ate or drank, calculate estimated calories, protein, carbs, fats. Tell them how many calories remain for their daily target.
4. HYDRATION: Track water intake and remind users to drink enough.
5. BATTLE STRATEGY: Tips to win FITBAT multiplayer fitness battles.
6. RECOVERY: DOMS management, sleep optimization, rest day advice.

Rules:
- Keep responses concise (under 200 words), actionable, and encouraging.
- Use emoji bullets and **bold** for key terms.
- When users mention food, ALWAYS estimate calories and macros.
- When tracking meals, show a summary of calories consumed vs target.
- Be conversational and friendly, like a personal coach.
- If you don't know something, give your best science-based estimate.
"""

    @classmethod
    def call_gemini_api(cls, query: str, user_profile: Optional[Dict[str, Any]] = None,
                       nutrition_context: str = "") -> Optional[str]:
        api_key = os.environ.get("GEMINI_API_KEY", "") or cls.GEMINI_API_KEY
        if not api_key:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"

        user_context = ""
        if user_profile:
            age = user_profile.get('age', 22)
            weight = user_profile.get('weight_kg', 70)
            height = user_profile.get('height_cm', 175)
            goal = user_profile.get('primary_goal', 'Fitness')
            level = user_profile.get('fitness_level', 'Intermediate')
            tdee = user_profile.get('tdee', 2200)
            cal_target = user_profile.get('daily_calorie_target', 2100)
            user_context = (f"\n[User: Age {age}, Weight {weight}kg, Height {height}cm, "
                          f"Goal: {goal}, Level: {level}, TDEE: {tdee} kcal, "
                          f"Daily Calorie Target: {cal_target} kcal]\n")

        full_prompt = cls.SYSTEM_PROMPT + user_context
        if nutrition_context:
            full_prompt += f"\n[Today's Nutrition Log So Far:\n{nutrition_context}]\n"
        full_prompt += f"\nUser: {query}"

        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "temperature": 0.75,
                "maxOutputTokens": 500
            }
        }

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url, data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=8) as response:
                if response.status == 200:
                    resp_json = json.loads(response.read().decode("utf-8"))
                    candidates = resp_json.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            text = parts[0].get("text", "").strip()
                            if text:
                                return text
        except Exception as e:
            print(f"[Chatbot] Gemini API error: {e}")
        return None

    @classmethod
    def estimate_food_calories(cls, text: str) -> Optional[Dict]:
        """Parse food mentions from text and estimate total calories using local DB."""
        text_lower = text.lower()
        found_items = []
        total_cal = 0
        total_p = 0
        total_c = 0
        total_f = 0
        water_glasses = 0

        # Check for water intake
        water_patterns = [
            (r'(\d+)\s*glass(?:es)?\s*(?:of\s*)?water', 'water'),
            (r'(\d+)\s*litre?s?\s*(?:of\s*)?water', 'water_litre'),
            (r'(\d+)\s*(?:ml|ML)\s*(?:of\s*)?water', 'water_ml'),
        ]
        for pattern, wtype in water_patterns:
            match = re.search(pattern, text_lower)
            if match:
                qty = int(match.group(1))
                if wtype == 'water_litre':
                    water_glasses = qty * 4
                elif wtype == 'water_ml':
                    water_glasses = max(1, qty // 250)
                else:
                    water_glasses = qty

        # Check for quantity multipliers
        for food_name, data in FOOD_CALORIES_DB.items():
            if food_name in text_lower and food_name != 'water':
                qty = 1
                qty_pattern = rf'(\d+)\s*{re.escape(food_name)}'
                qty_match = re.search(qty_pattern, text_lower)
                if qty_match:
                    qty = int(qty_match.group(1))

                cal = data["cal"] * qty
                p = data["p"] * qty
                c = data["c"] * qty
                f = data["f"] * qty

                found_items.append({
                    "food": food_name.title(),
                    "qty": qty,
                    "unit": data["unit"],
                    "calories": round(cal),
                    "protein": round(p, 1),
                    "carbs": round(c, 1),
                    "fats": round(f, 1)
                })
                total_cal += cal
                total_p += p
                total_c += c
                total_f += f

        if not found_items and water_glasses == 0:
            return None

        return {
            "items": found_items,
            "total_calories": round(total_cal),
            "total_protein": round(total_p, 1),
            "total_carbs": round(total_c, 1),
            "total_fats": round(total_f, 1),
            "water_glasses": water_glasses
        }

    @classmethod
    def build_local_response(cls, query: str, user_profile: Optional[Dict] = None,
                              food_data: Optional[Dict] = None,
                              daily_totals: Optional[Dict] = None) -> str:
        """Build an intelligent local response when Gemini API is unavailable."""
        q = query.lower().strip()

        # If food was detected, build a nutrition response
        if food_data and food_data.get("items"):
            lines = ["\U0001f37d\ufe0f **Meal Logged!** Here's the breakdown:\n"]
            for item in food_data["items"]:
                lines.append(f"\u2022 **{item['food']}** x{item['qty']} ({item['unit']}): "
                           f"{item['calories']} kcal | P:{item['protein']}g C:{item['carbs']}g F:{item['fats']}g")

            lines.append(f"\n**This Meal Total**: {food_data['total_calories']} kcal | "
                        f"P:{food_data['total_protein']}g C:{food_data['total_carbs']}g F:{food_data['total_fats']}g")

            if daily_totals:
                consumed = daily_totals.get('total_cal', 0) + food_data['total_calories']
                target = 2100
                if user_profile and user_profile.get('daily_calorie_target'):
                    target = user_profile['daily_calorie_target']
                remaining = max(0, target - consumed)
                lines.append(f"\n\U0001f4ca **Today's Total**: {round(consumed)} / {round(target)} kcal")
                lines.append(f"\U0001f3af **Remaining**: {round(remaining)} kcal to go!")
                if remaining < 200:
                    lines.append("\n\u2705 You're almost at your daily target! Great job!")
                elif remaining > 800:
                    lines.append(f"\n\U0001f4a1 You still need **{round(remaining)} kcal** more. Have a protein-rich meal!")

            if food_data.get('water_glasses', 0) > 0:
                lines.append(f"\n\U0001f4a7 Water: +{food_data['water_glasses']} glasses logged!")

            return "\n".join(lines)

        if food_data and food_data.get('water_glasses', 0) > 0:
            glasses = food_data['water_glasses']
            water_total = daily_totals.get('water', 0) + glasses if daily_totals else glasses
            msg = f"\U0001f4a7 **+{glasses} glasses of water logged!**\nToday's total: **{water_total}/8 glasses** \U0001f964\n"
            if water_total >= 8:
                msg += "\u2705 Great hydration!"
            else:
                msg += f"Drink **{8 - water_total}** more glasses today!"
            return msg

        # Health monitor questions
        if any(w in q for w in ['health', 'monitor', 'daily check', 'check-in', 'health check', 'checkup']):
            return ("\U0001fa7a **Daily Health Check-In!** Let me track your day:\n\n"
                    "I'll ask you a few quick questions:\n"
                    "1\ufe0f\u20e3 **Breakfast**: What did you eat for breakfast? (e.g., '2 eggs, 2 bread, 1 glass milk')\n"
                    "2\ufe0f\u20e3 **Lunch**: What did you have for lunch?\n"
                    "3\ufe0f\u20e3 **Dinner**: What's your dinner plan?\n"
                    "4\ufe0f\u20e3 **Water**: How many glasses of water have you had?\n"
                    "5\ufe0f\u20e3 **Snacks**: Any snacks between meals?\n\n"
                    "Just type what you ate and I'll calculate everything! \U0001f4ca")

        if any(w in q for w in ['what did i eat', 'my calories', 'today calories', 'calorie count',
                                 'how much i ate', 'nutrition summary', 'today summary', 'daily summary']):
            if daily_totals:
                target = 2100
                if user_profile and user_profile.get('daily_calorie_target'):
                    target = user_profile['daily_calorie_target']
                consumed = daily_totals.get('total_cal', 0)
                remaining = max(0, target - consumed)
                water = daily_totals.get('water', 0)
                return (f"\U0001f4ca **Today's Nutrition Summary**:\n\n"
                        f"\U0001f525 Calories: **{round(consumed)} / {round(target)} kcal**\n"
                        f"\U0001f969 Protein: **{round(daily_totals.get('total_p', 0), 1)}g**\n"
                        f"\U0001f35e Carbs: **{round(daily_totals.get('total_c', 0), 1)}g**\n"
                        f"\U0001f9c8 Fats: **{round(daily_totals.get('total_f', 0), 1)}g**\n"
                        f"\U0001f4a7 Water: **{water}/8 glasses**\n\n"
                        f"\U0001f3af **{round(remaining)} kcal remaining** for today!")
            return "\U0001f4ca No meals logged yet today! Tell me what you ate (e.g., '2 rotis, 1 bowl dal, salad') and I'll track it!"

        # Workout knowledge
        knowledge = {
            "frog": "🐸 **Frog Jump Mastery**: Start in an athletic stance. Drop into a deep squat touching your fingers near the floor, then explosively leap vertically upwards extending your hips, knees, and ankles. Land softly on the balls of your feet and absorb immediately into the next deep crouch!",
            "pushup": "\U0001f4a5 **Pushup Mastery**: Get into a full horizontal plank on the floor. Hands shoulder-width apart, lower chest until elbows hit 90\u00b0, then push to full lockout. Keep core tight \u2014 no hip sagging or piking!",
            "squat": "\U0001f9b5 **Squat Form**: Feet shoulder-width, toes out 15-30\u00b0. Sit hips back and down, knees track over toes, chest stays upright. Drive up through heels!",
            "plank": "\U0001f6e1\ufe0f **Plank Hold**: Straight line from head to heels. Squeeze glutes, brace core. Don't let lower back arch. Breathe steadily!",
            "diet": "\U0001f957 **Nutrition**: Aim for 1.6-2.2g protein/kg bodyweight. Lean proteins + complex carbs + healthy fats. Eat whole foods, minimize processed sugar.",
            "fat loss": "\U0001f525 **Fat Loss**: Create a 300-500 kcal daily deficit. Combine FITBAT battles with 8K+ steps. High protein preserves muscle while cutting!",
            "muscle": "\u26a1 **Muscle Gain**: Slight surplus (+250-400 kcal), 2g protein/kg, progressive overload, 7-8 hours sleep. Consistency > intensity!",
            "recovery": "\U0001f4a7 **Recovery**: Muscle soreness peaks at 24-48h. Active recovery walks, 3-4L water, stretching, foam rolling, and quality sleep help.",
            "battle": "\U0001f3c6 **Battle Tips**: Don't rush! Steady rhythm beats frantic speed. Camera needs to see full range of motion. Lock 3+ combos for bonus points!",
            "water": "\U0001f964 **Hydration**: 35ml per kg bodyweight daily (2.5-3.5L). Drink 300-500ml before battles. Dehydration = muscle cramps!",
            "bicep": "\U0001f4aa **Bicep Curls**: Pin upper arms to sides. Full extension at bottom, peak squeeze at top. Control the lowering phase for max gains!",
            "lunge": "\U0001f9b5 **Lunges**: Step forward, lower back knee to just above floor. Front knee stays over ankle. Push through front heel to stand!",
            "crunch": "\U0001f36b **Crunches**: Lie flat, hands behind head. Curl shoulders off floor by squeezing abs. Don't pull neck \u2014 let your core do the work!",
            "shoulder": "\U0001f3cb\ufe0f **Shoulder Press**: Press dumbbells overhead to full lockout. Lower to ear level. Keep core braced and back straight!",
            "stretch": "\U0001f9d8 **Stretching**: Hold static stretches 20-30 seconds post-workout. Dynamic stretches before training. Never bounce!",
            "sleep": "\U0001f4a4 **Sleep for Gains**: 7-9 hours for optimal recovery. Growth hormone peaks during deep sleep. Avoid screens 1 hour before bed.",
            "warm up": "\U0001f525 **Warm Up**: 5 min light cardio + dynamic stretches. Increases blood flow and reduces injury risk by 50%!",
        }

        for keyword, response in knowledge.items():
            if keyword in q:
                if user_profile and user_profile.get('primary_goal'):
                    response += f"\n\n*Aligned with your goal: {user_profile['primary_goal']}*"
                return response

        if any(w in q for w in ['hello', 'hi', 'hey', 'help', 'who are you']):
            return ("\U0001f44b **Hey Warrior!** I'm your **FITBAT AI Coach**! I can help with:\n\n"
                    "\U0001f3cb\ufe0f **Exercise Form** \u2014 Ask about any exercise\n"
                    "\U0001f37d\ufe0f **Calorie Tracking** \u2014 Tell me what you ate\n"
                    "\U0001f4a7 **Water Tracking** \u2014 Log your glasses\n"
                    "\U0001fa7a **Health Monitor** \u2014 Type 'health check' for a daily check-in\n"
                    "\U0001f3c6 **Battle Tips** \u2014 Winning strategies\n\n"
                    "Try: *'I ate 2 eggs and 1 banana for breakfast'* or *'health check'*!")

        # Default response — varies based on time of day
        hour = datetime.now().hour
        if hour < 12:
            time_tip = "Start your morning with protein! Try eggs, oats, or a shake."
        elif hour < 17:
            time_tip = "Afternoon fuel: balanced lunch with protein + carbs. Stay hydrated!"
        else:
            time_tip = "Evening recovery: light dinner with protein. Plan tomorrow's quests!"

        return (f"\U0001f4aa **FITBAT Coach**: {time_tip}\n\n"
                "\u2022 **Track food**: Tell me what you ate (e.g., '2 rotis and dal')\n"
                "\u2022 **Log water**: Say '3 glasses water'\n"
                "\u2022 **Health check**: Type 'health check' for a full daily review\n"
                "\u2022 **Exercise tips**: Ask about any exercise by name\n\n"
                "\U0001f4ca I'll calculate all your calories, protein, carbs & fats automatically!")

    @classmethod
    def answer(cls, query: str, user_profile: Optional[Dict[str, Any]] = None,
               daily_nutrition: Optional[Dict] = None) -> str:
        """
        Main entry point returning reply text string.
        """
        res = cls.answer_with_data(query, user_profile, daily_nutrition)
        return res["reply"]

    @classmethod
    def answer_with_data(cls, query: str, user_profile: Optional[Dict[str, Any]] = None,
                         daily_nutrition: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Extended entry point returning dict with reply text and food_data.
        """
        # 1. Try to detect food in the message
        food_data = cls.estimate_food_calories(query)

        # 2. Build nutrition context string for Gemini
        nutrition_context = ""
        if daily_nutrition:
            nutrition_context = (f"Calories consumed today: {daily_nutrition.get('total_cal', 0)} kcal, "
                                f"Protein: {daily_nutrition.get('total_p', 0)}g, "
                                f"Carbs: {daily_nutrition.get('total_c', 0)}g, "
                                f"Fats: {daily_nutrition.get('total_f', 0)}g, "
                                f"Water: {daily_nutrition.get('water', 0)} glasses")

        # 3. Try Gemini API first
        gemini_reply = cls.call_gemini_api(query, user_profile, nutrition_context)
        if gemini_reply:
            return {"reply": gemini_reply, "food_data": food_data}

        # 4. Fallback: intelligent local response
        local_reply = cls.build_local_response(query, user_profile, food_data, daily_nutrition)
        return {"reply": local_reply, "food_data": food_data}
