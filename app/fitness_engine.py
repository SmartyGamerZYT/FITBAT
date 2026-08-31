import math
from typing import Dict, Any

class FitnessPredictionEngine:
    @staticmethod
    def calculate_metrics(age: int, gender: str, height_cm: float, weight_kg: float, 
                          fitness_level: str, primary_goal: str, activity_level: str) -> Dict[str, Any]:
        """
        Predicts body composition, metabolic metrics, fitness score, and delivers tailored recommendations.
        """
        # 1. BMI calculation
        height_m = max(height_cm / 100.0, 0.5)
        bmi = round(weight_kg / (height_m ** 2), 1)

        if bmi < 18.5:
            bmi_category = "Underweight"
        elif 18.5 <= bmi < 25:
            bmi_category = "Healthy / Optimal"
        elif 25 <= bmi < 30:
            bmi_category = "Overweight"
        else:
            bmi_category = "Obese"

        # 2. BMR (Mifflin-St Jeor Equation)
        if gender.lower() == "male":
            bmr = round(10 * weight_kg + 6.25 * height_cm - 5 * age + 5)
            # Deurenberg formula for Body Fat %: (1.20 * BMI) + (0.23 * Age) - 16.2
            body_fat_pct = round(max(5.0, min(50.0, (1.20 * bmi) + (0.23 * age) - 16.2)), 1)
        elif gender.lower() == "female":
            bmr = round(10 * weight_kg + 6.25 * height_cm - 5 * age - 161)
            # Deurenberg formula for Body Fat %: (1.20 * BMI) + (0.23 * Age) - 5.4
            body_fat_pct = round(max(10.0, min(55.0, (1.20 * bmi) + (0.23 * age) - 5.4)), 1)
        else:
            bmr = round(10 * weight_kg + 6.25 * height_cm - 5 * age - 78)
            body_fat_pct = round(max(8.0, min(50.0, (1.20 * bmi) + (0.23 * age) - 10.8)), 1)

        # 3. TDEE based on Activity Level
        activity_multipliers = {
            "Sedentary": 1.2,
            "Lightly Active": 1.375,
            "Moderately Active": 1.55,
            "Very Active": 1.725,
            "Extremely Active": 1.9
        }
        multiplier = activity_multipliers.get(activity_level, 1.375)
        tdee = round(bmr * multiplier)

        # 4. Target Daily Calories based on Goal
        if primary_goal == "Weight Loss":
            daily_calorie_target = round(tdee - 450)
            protein_ratio = 0.35
            carb_ratio = 0.40
            fat_ratio = 0.25
        elif primary_goal == "Muscle Gain":
            daily_calorie_target = round(tdee + 350)
            protein_ratio = 0.30
            carb_ratio = 0.50
            fat_ratio = 0.20
        elif primary_goal == "Stamina & Endurance":
            daily_calorie_target = round(tdee)
            protein_ratio = 0.25
            carb_ratio = 0.55
            fat_ratio = 0.20
        else: # General Health & Maintenance
            daily_calorie_target = round(tdee)
            protein_ratio = 0.25
            carb_ratio = 0.50
            fat_ratio = 0.25

        # Macronutrient grams
        protein_g = round((daily_calorie_target * protein_ratio) / 4)
        carb_g = round((daily_calorie_target * carb_ratio) / 4)
        fat_g = round((daily_calorie_target * fat_ratio) / 9)

        # 5. FITBAT Fitness Index (0-100)
        # Factors: BMI proximity to 22.0, Activity level, Fitness level baseline, Age normalization
        bmi_score = max(0, 100 - abs(bmi - 22.0) * 5)
        
        activity_score_map = {"Sedentary": 40, "Lightly Active": 60, "Moderately Active": 80, "Very Active": 95, "Extremely Active": 100}
        activity_score = activity_score_map.get(activity_level, 65)

        level_score_map = {"Beginner": 50, "Intermediate": 75, "Advanced": 95}
        level_score = level_score_map.get(fitness_level, 60)

        raw_fitness_score = (bmi_score * 0.35) + (activity_score * 0.35) + (level_score * 0.30)
        fitness_score = round(max(10.0, min(99.0, raw_fitness_score)), 1)

        # 6. Age Group Categorization
        if age < 20:
            age_group = "Junior (13-19)"
            age_badge = "🔥 Young Phenom"
            age_advice = "Focus on building foundational movement mechanics, high mobility, and safe progressive overload. Avoid extreme heavy lifting without warmups."
        elif age < 30:
            age_group = "Prime (20-29)"
            age_badge = "⚡ Peak Titan"
            age_advice = "Your metabolic recovery and muscular hypertrophy capacity are at their highest. Push for high-intensity battle sessions, progressive calisthenics, and power output."
        elif age < 46:
            age_group = "Master (30-45)"
            age_badge = "🛡️ Iron Veteran"
            age_advice = "Prioritize joint longevity, dynamic warm-ups, and core stabilization (Planks & Squats). Balance high intensity with dedicated recovery sleep."
        else:
            age_group = "Legend (46+)"
            age_badge = "👑 Immortal Master"
            age_advice = "Focus on cardiovascular stamina, functional mobility, consistent daily walking, and low-impact joint-friendly rep pacing."

        # 7. Suggestions & Actionable Recommendations
        suggestions = {
            "summary": f"Your calculated FITBAT Fitness Index is {fitness_score}/100 with a {bmi_category} profile ({bmi} BMI).",
            "age_bracket": age_group,
            "age_badge": age_badge,
            "age_guidance": age_advice,
            "recommended_daily_steps": 7000 if age > 50 else (10000 if primary_goal == "Weight Loss" else 8000),
            "water_intake_liters": round(weight_kg * 0.035, 1),
            "macro_breakdown": {
                "calories": daily_calorie_target,
                "protein_g": protein_g,
                "carbs_g": carb_g,
                "fats_g": fat_g
            },
            "top_exercises": [
                {"name": "Pushups", "target": "Chest & Triceps", "recommended_daily": 25 if fitness_level == "Beginner" else 50},
                {"name": "Bodyweight Squats", "target": "Quadriceps & Glutes", "recommended_daily": 30 if fitness_level == "Beginner" else 60},
                {"name": "Core Plank", "target": "Deep Abdominals", "recommended_daily_sec": 45 if fitness_level == "Beginner" else 90},
                {"name": "Jumping Jacks", "target": "Cardio & Stamina", "recommended_daily": 50 if fitness_level == "Beginner" else 100}
            ],
            "battle_recommendation": f"Enter the {age_group} arena! Start with Pushups or Squats battles to test your real-time computer vision rep speed against matched opponents."
        }

        return {
            "bmi": bmi,
            "bmi_category": bmi_category,
            "bmr": bmr,
            "tdee": tdee,
            "body_fat_pct": body_fat_pct,
            "daily_calorie_target": daily_calorie_target,
            "fitness_score": fitness_score,
            "age_group": age_group,
            "suggestions": suggestions
        }
