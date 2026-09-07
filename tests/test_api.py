import unittest
from fastapi.testclient import TestClient
from app.main import app

class TestFitbatAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_get_exercises(self):
        res = self.client.get("/api/exercises")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("exercises", data)
        self.assertEqual(len(data["exercises"]), 13)
        self.assertEqual(data["exercises"][0]["id"], "frog_jumps")

    def test_register_and_login_flow(self):
        import time
        uniq = int(time.time() * 1000)
        username = f"warrior_{uniq}"
        email = f"warrior_{uniq}@fitbat.test"

        # 1. Register
        reg_res = self.client.post("/api/auth/register", json={
            "username": username,
            "email": email,
            "password": "Password123!",
            "age": 22,
            "gender": "Male",
            "height_cm": 178,
            "weight_kg": 72,
            "fitness_level": "Intermediate",
            "primary_goal": "Muscle Gain",
            "activity_level": "Very Active"
        })
        self.assertEqual(reg_res.status_code, 200)
        reg_data = reg_res.json()
        token = reg_data["token"]
        self.assertIsNotNone(token)
        self.assertIn("metrics", reg_data["user"])

        # 2. Login with username
        login_res = self.client.post("/api/auth/login", json={
            "username": username,
            "password": "Password123!"
        })
        self.assertEqual(login_res.status_code, 200)
        login_data = login_res.json()
        self.assertEqual(login_data["user"]["username"], username)

        # 3. Login with email
        login_email_res = self.client.post("/api/auth/login", json={
            "username": email,
            "password": "Password123!"
        })
        self.assertEqual(login_email_res.status_code, 200)

        # 4. Get Profile /me
        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_res.status_code, 200)
        me_data = me_res.json()
        self.assertEqual(me_data["user"]["username"], username)

        # 5. Get Daily Tasks
        tasks_res = self.client.get("/api/tasks/daily", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(tasks_res.status_code, 200)
        tasks_data = tasks_res.json()
        self.assertIn("tasks", tasks_data)
        self.assertGreater(len(tasks_data["tasks"]), 0)

        # 6. Log Steps / Activity
        act_res = self.client.post("/api/activity/log", json={
            "steps": 1000,
            "distance_km": 0.75,
            "calories_burned": 40.0,
            "active_minutes": 10
        }, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(act_res.status_code, 200)

        # 7. Query Chatbot
        chat_res = self.client.post("/api/chatbot/message", json={
            "message": "What is the best way to do squats?"
        }, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(chat_res.status_code, 200)
        self.assertIn("Squat", chat_res.json()["reply"])

        # 8. Check Leaderboards
        lead_res = self.client.get("/api/leaderboard/global")
        self.assertEqual(lead_res.status_code, 200)
        lead_data = lead_res.json()
        self.assertGreater(len(lead_data["leaderboard"]), 0)

        ex_lead_res = self.client.get("/api/leaderboard/exercise/pushups")
        self.assertEqual(ex_lead_res.status_code, 200)
        self.assertGreater(len(ex_lead_res.json()["leaderboard"]), 0)

        # 9. Test Real-time Step Activity Logging in Database
        act_log = self.client.post("/api/activity/log", json={
            "steps": 125,
            "distance_km": 0.093,
            "calories_burned": 5.0,
            "active_minutes": 2
        }, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(act_log.status_code, 200)
        self.assertGreaterEqual(act_log.json()["total_steps"], 125)

        # 10. Test Health Monitor Nutrition Logging in Database
        nut_log = self.client.post("/api/nutrition/log", json={
            "meal_type": "breakfast",
            "food_description": "2 eggs and oats",
            "estimated_calories": 306,
            "protein_g": 17,
            "carbs_g": 28,
            "fats_g": 12,
            "water_glasses": 1
        }, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(nut_log.status_code, 200)

        today_nut = self.client.get("/api/nutrition/today", headers={"Authorization": f"Bearer {token}"})
        # 11. Test Strava Multi-Sport Workout Logging
        strava_res = self.client.post("/api/strava/workout", json={
            "sport_type": "cycling",
            "title": "Morning Hill Climb",
            "distance_km": 14.5,
            "duration_seconds": 1850,
            "avg_speed_kmh": 28.2,
            "max_speed_kmh": 45.0,
            "avg_pace_minkm": "2:08",
            "elevation_gain_m": 125.0,
            "calories_burned": 420.0,
            "route_geojson": '{"type":"LineString","coordinates":[[77.59,12.97],[77.60,12.98]]}'
        }, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(strava_res.status_code, 200)
        strava_data = strava_res.json()
        self.assertTrue(strava_data["success"])
        self.assertGreaterEqual(strava_data["xp_awarded"], 25)

        strava_list = self.client.get("/api/strava/workouts", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(strava_list.status_code, 200)
        workouts = strava_list.json()["workouts"]
        self.assertGreaterEqual(len(workouts), 1)
        self.assertEqual(workouts[0]["sport_type"], "cycling")

if __name__ == "__main__":
    unittest.main()
