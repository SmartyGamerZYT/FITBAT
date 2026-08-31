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
        self.assertEqual(len(data["exercises"]), 12)

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

if __name__ == "__main__":
    unittest.main()
