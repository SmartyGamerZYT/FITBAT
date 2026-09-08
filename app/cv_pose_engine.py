"""
FITBAT - Real-Time AI Computer Vision Pose Tracking & Biometric Rep Engine
Department of Artificial Intelligence & Machine Learning
Project: FITBAT - Fitness Battles & AI Health Monitor
Authors: Kshitij Pawar (Roll: 25942), Swaraj Kadam (Roll: 25928)
Guide: Prof. Neha S.
"""

import math
import time
from typing import Dict, Tuple, List, Optional

class Landmark:
    def __init__(self, x: float, y: float, z: float = 0.0, visibility: float = 1.0):
        self.x = x
        self.y = y
        self.z = z
        self.visibility = visibility

class FitbatPoseCVEngine:
    """
    Core Computer Vision Pose Estimation & Biometric Motion Analysis Engine.
    Implements 3D skeletal joint trigonometric calculations, form posture 
    verification, and anti-cheat biomechanical threshold validation.
    """
    
    # Standard MediaPipe Joint Indices
    NOSE = 0
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_ELBOW = 13
    RIGHT_ELBOW = 14
    LEFT_WRIST = 15
    RIGHT_WRIST = 16
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28

    def __init__(self, exercise_id: str = "pushups"):
        self.exercise_id = exercise_id
        self.rep_count = 0
        self.stage = "idle"
        self.form_score = 1.0
        self.form_feedback = "Position yourself in camera frame"
        self.last_rep_timestamp = 0.0
        self.stable_frames = 0
        self.baseline_hip_y = 0.0
        self.deepest_crouch_y = 0.0

    @staticmethod
    def calculate_angle(a: Landmark, b: Landmark, c: Landmark) -> float:
        """
        Calculates the interior 2D/3D joint angle formed by three spatial coordinates:
        Vertex point 'b' connected to endpoints 'a' and 'c'.
        Returns angle in degrees [0.0 - 180.0].
        """
        if not a or not b or not c:
            return 180.0
            
        radians = math.atan2(c.y - b.y, c.x - b.x) - math.atan2(a.y - b.y, a.x - b.x)
        angle = abs(math.degrees(radians))
        if angle > 180.0:
            angle = 360.0 - angle
        return round(angle, 1)

    @staticmethod
    def calculate_distance(a: Landmark, b: Landmark) -> float:
        """Euclidean distance between two landmarks in normalized viewport coordinates."""
        if not a or not b:
            return 0.0
        return math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)

    def process_frame_landmarks(self, landmarks: Dict[int, Landmark]) -> Tuple[int, str, float]:
        """
        Processes normalized skeletal landmarks, performs biometric checks, 
        and updates rep count and live biomechanical form feedback.
        """
        ls = landmarks.get(self.LEFT_SHOULDER)
        rs = landmarks.get(self.RIGHT_SHOULDER)
        le = landmarks.get(self.LEFT_ELBOW)
        re = landmarks.get(self.RIGHT_ELBOW)
        lw = landmarks.get(self.LEFT_WRIST)
        rw = landmarks.get(self.RIGHT_WRIST)
        lh = landmarks.get(self.LEFT_HIP)
        rh = landmarks.get(self.RIGHT_HIP)
        lk = landmarks.get(self.LEFT_KNEE)
        rk = landmarks.get(self.RIGHT_KNEE)
        la = landmarks.get(self.LEFT_ANKLE)
        ra = landmarks.get(self.RIGHT_ANKLE)

        # Joint Angles
        l_arm_angle = self.calculate_angle(ls, le, lw)
        r_arm_angle = self.calculate_angle(rs, re, rw)
        l_leg_angle = self.calculate_angle(lh, lk, la)
        r_leg_angle = self.calculate_angle(rh, rk, ra)

        mid_shoulder_y = (ls.y + rs.y) / 2.0 if (ls and rs) else 0.0
        mid_hip_y = (lh.y + rh.y) / 2.0 if (lh and rh) else 0.0
        mid_shoulder_x = (ls.x + rs.x) / 2.0 if (ls and rs) else 0.0
        mid_hip_x = (lh.x + rh.x) / 2.0 if (lh and rh) else 0.0
        current_time = time.time()

        # ---------------------------------------------------------------
        # 1. PUSHUPS: Prone Horizontal Plank + 90 Degree Elbow Lockout
        # ---------------------------------------------------------------
        if self.exercise_id == "pushups":
            vert_dist = mid_hip_y - mid_shoulder_y
            horiz_dist = abs(mid_hip_x - mid_shoulder_x)

            if vert_dist > 0.18 and horiz_dist < 0.20:
                self.stage = "idle"
                self.form_feedback = "Not pushup stance! Lie horizontally on floor."
                return self.rep_count, self.form_feedback, self.form_score

            elbow_angle = min(l_arm_angle, r_arm_angle)

            if elbow_angle <= 95:
                if self.stage != "down":
                    self.stage = "down"
                    self.stable_frames = 0
                    self.form_feedback = "Excellent depth! Push all the way up."
                self.stable_frames += 1

            elif elbow_angle >= 150 and self.stage == "down" and self.stable_frames >= 2:
                if (current_time - self.last_rep_timestamp) > 0.6:
                    self.rep_count += 1
                    self.last_rep_timestamp = current_time
                    self.stage = "up"
                    self.stable_frames = 0
                    self.form_score = min(1.0, 0.85 + (0.15 * (180 - elbow_angle) / 30.0))
                    self.form_feedback = f"Rep {self.rep_count} Counted! Perfect Pushup."

        # ---------------------------------------------------------------
        # 2. BODYWEIGHT SQUATS: Parallel Femur Dip (Knee <= 104 deg)
        # ---------------------------------------------------------------
        elif self.exercise_id == "squats":
            knee_angle = min(l_leg_angle, r_leg_angle)

            if knee_angle <= 104:
                if self.stage != "down":
                    self.stage = "down"
                    self.stable_frames = 0
                    self.form_feedback = "Deep parallel squat! Drive through heels."
                self.stable_frames += 1

            elif knee_angle >= 158 and self.stage == "down" and self.stable_frames >= 2:
                if (current_time - self.last_rep_timestamp) > 0.6:
                    self.rep_count += 1
                    self.last_rep_timestamp = current_time
                    self.stage = "up"
                    self.stable_frames = 0
                    self.form_feedback = f"Rep {self.rep_count} Counted! Power Squat."

        # ---------------------------------------------------------------
        # 3. FROG JUMPS: Plyometric Deep Crouch to Explosive Jump
        # ---------------------------------------------------------------
        elif self.exercise_id == "frog_jumps":
            knee_angle = min(l_leg_angle, r_leg_angle)
            if not self.baseline_hip_y:
                self.baseline_hip_y = mid_hip_y

            if knee_angle <= 98 and (mid_hip_y >= self.baseline_hip_y + 0.04):
                if self.stage != "crouch":
                    self.stage = "crouch"
                    self.deepest_crouch_y = mid_hip_y
                    self.stable_frames = 0
                    self.form_feedback = "Deep crouch! Explode into jump!"
                if mid_hip_y > self.deepest_crouch_y:
                    self.deepest_crouch_y = mid_hip_y
                self.stable_frames += 1

            elif knee_angle >= 152 and (self.deepest_crouch_y - mid_hip_y >= 0.07):
                if self.stage == "crouch" and self.stable_frames >= 2:
                    if (current_time - self.last_rep_timestamp) > 0.55:
                        self.rep_count += 1
                        self.last_rep_timestamp = current_time
                        self.stage = "landed"
                        self.stable_frames = 0
                        self.form_feedback = f"Rep {self.rep_count} Counted! Explosive Leap."

        # ---------------------------------------------------------------
        # 4. BICEP CURLS: Arm Flexion (Elbow <= 50 deg to >= 155 deg)
        # ---------------------------------------------------------------
        elif self.exercise_id == "bicep_curls":
            elbow_angle = min(l_arm_angle, r_arm_angle)
            if elbow_angle <= 50:
                if self.stage != "curled":
                    self.stage = "curled"
                    self.stable_frames = 0
                    self.form_feedback = "Peak contraction! Lower dumbbells slowly."
                self.stable_frames += 1
            elif elbow_angle >= 155 and self.stage == "curled" and self.stable_frames >= 2:
                if (current_time - self.last_rep_timestamp) > 0.5:
                    self.rep_count += 1
                    self.last_rep_timestamp = current_time
                    self.stage = "extended"
                    self.stable_frames = 0
                    self.form_feedback = f"Rep {self.rep_count} Counted! Full Extension."

        return self.rep_count, self.form_feedback, self.form_score
