import unittest
from app.database import init_db, get_db_connection
from app.auth import hash_password, verify_password, create_session_token, get_current_user_from_token
from app.fitness_engine import FitnessPredictionEngine
from app.chatbot import FitnessCoachChatbot
from app.exercises import get_all_exercises, get_exercise_by_id

class TestFitbat(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_database_and_exercises_seed(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM daily_tasks")
        task_cnt = cursor.fetchone()["cnt"]
        self.assertGreater(task_cnt, 0)

        cursor.execute("SELECT COUNT(*) as cnt FROM users")
        user_cnt = cursor.fetchone()["cnt"]
        self.assertGreater(user_cnt, 0)
        conn.close()

    def test_all_12_exercises(self):
        exercises = get_all_exercises()
        self.assertEqual(len(exercises), 12)
        ex_ids = [e["id"] for e in exercises]
        self.assertIn("pushups", ex_ids)
        self.assertIn("squats", ex_ids)
        self.assertIn("jumping_jacks", ex_ids)
        self.assertIn("bicep_curls", ex_ids)
        self.assertIn("lunges", ex_ids)
        self.assertIn("high_knees", ex_ids)
        self.assertIn("plank", ex_ids)
        self.assertIn("shoulder_press", ex_ids)
        self.assertIn("crunches", ex_ids)
        self.assertIn("mountain_climbers", ex_ids)
        self.assertIn("lateral_raises", ex_ids)
        self.assertIn("shadow_boxing", ex_ids)

    def test_fitness_prediction_engine(self):
        metrics = FitnessPredictionEngine.calculate_metrics(
            age=24,
            gender="Male",
            height_cm=180,
            weight_kg=75,
            fitness_level="Intermediate",
            primary_goal="Muscle Gain",
            activity_level="Very Active"
        )
        self.assertIn("bmi", metrics)
        self.assertIn("bmr", metrics)
        self.assertIn("tdee", metrics)
        self.assertIn("fitness_score", metrics)
        self.assertIn("suggestions", metrics)
        self.assertGreater(metrics["fitness_score"], 0)
        self.assertEqual(metrics["suggestions"]["age_bracket"], "Prime (20-29)")
        self.assertGreater(metrics["suggestions"]["macro_breakdown"]["protein_g"], 50)

    def test_auth_hashing(self):
        pwd = "SecretBattlePassword123!"
        hashed = hash_password(pwd)
        self.assertTrue(verify_password(pwd, hashed))
        self.assertFalse(verify_password("wrong_password", hashed))

        token = create_session_token(1, "TestWarrior")
        session = get_current_user_from_token(token)
        self.assertIsNotNone(session)
        self.assertEqual(session["username"], "TestWarrior")

    def test_chatbot_engine(self):
        reply_pushup = FitnessCoachChatbot.answer("How should I position my elbows in pushups?")
        self.assertIn("Pushup", reply_pushup)
        
        reply_diet = FitnessCoachChatbot.answer("What is the best protein diet for muscle gain?")
        self.assertIn("protein", reply_diet.lower())

        reply_battle = FitnessCoachChatbot.answer("How do I win battles in the arena?")
        self.assertIn("Battle", reply_battle)

    def test_food_calorie_estimation(self):
        food_data = FitnessCoachChatbot.estimate_food_calories("I ate 2 eggs and 1 banana")
        self.assertIsNotNone(food_data)
        self.assertGreater(food_data["total_calories"], 200)
        self.assertGreater(food_data["total_protein"], 10)

        # Test water detection
        water_data = FitnessCoachChatbot.estimate_food_calories("I drank 3 glasses of water")
        self.assertIsNotNone(water_data)
        self.assertEqual(water_data["water_glasses"], 3)

        # Test health check response
        health_check = FitnessCoachChatbot.answer("health check")
        self.assertIn("Breakfast", health_check)

if __name__ == "__main__":
    unittest.main()
