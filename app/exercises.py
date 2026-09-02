from typing import Dict, List, Any

EXERCISES_DATABASE: Dict[str, Dict[str, Any]] = {
    "frog_jumps": {
        "id": "frog_jumps",
        "name": "Frog Jumps",
        "category": "Plyometrics & Explosive Power",
        "target_muscles": ["Quadriceps", "Glutes", "Hamstrings", "Calves", "Core"],
        "icon": "🐸",
        "difficulty": "Medium - Hard",
        "cv_primary_joints": ["Hip", "Knee", "Ankle"],
        "angle_down_threshold": 90,
        "angle_up_threshold": 160,
        "instructions": "Drop into a deep squat touching your fingers towards the floor, then explode up into the air and land softly back in a deep squat.",
        "form_tips": "Ensure a full deep crouch before jumping; land gently on the balls of your feet and absorb into a squat."
    },
    "pushups": {
        "id": "pushups",
        "name": "Pushups",
        "category": "Upper Body & Chest",
        "target_muscles": ["Chest (Pectorals)", "Triceps", "Anterior Deltoids", "Core"],
        "icon": "💪",
        "difficulty": "Medium",
        "cv_primary_joints": ["Shoulder", "Elbow", "Wrist"],
        "angle_down_threshold": 90,
        "angle_up_threshold": 160,
        "instructions": "Place your hands shoulder-width apart. Lower your chest until your elbows bend to 90 degrees, then push all the way back up to full arm extension.",
        "form_tips": "Keep your core tight, don't let your hips sag, and extend arms fully on each rep."
    },
    "squats": {
        "id": "squats",
        "name": "Bodyweight Squats",
        "category": "Lower Body Power",
        "target_muscles": ["Quadriceps", "Glutes", "Hamstrings", "Calves"],
        "icon": "🦵",
        "difficulty": "Easy - Medium",
        "cv_primary_joints": ["Hip", "Knee", "Ankle"],
        "angle_down_threshold": 95,
        "angle_up_threshold": 165,
        "instructions": "Stand with feet shoulder-width apart. Lower your hips down as if sitting on a chair until your knees reach approximately 90 degrees, then drive through heels back up.",
        "form_tips": "Keep knees tracking over your toes, chest upright, and achieve full depth."
    },
    "jumping_jacks": {
        "id": "jumping_jacks",
        "name": "Jumping Jacks",
        "category": "Cardio & Full Body",
        "target_muscles": ["Calves", "Deltoids", "Lats", "Cardiovascular System"],
        "icon": "⚡",
        "difficulty": "Easy",
        "cv_primary_joints": ["Shoulder", "Hip", "Ankle"],
        "angle_down_threshold": 40,
        "angle_up_threshold": 140,
        "instructions": "Start with feet together and hands by sides. Jump spreading legs and raising arms above head simultaneously, then return to starting position.",
        "form_tips": "Land softly on the balls of your feet and keep a rhythmic tempo."
    },
    "bicep_curls": {
        "id": "bicep_curls",
        "name": "Bicep Curls",
        "category": "Arm Strength",
        "target_muscles": ["Biceps Brachii", "Brachialis", "Forearms"],
        "icon": "💥",
        "difficulty": "Easy",
        "cv_primary_joints": ["Shoulder", "Elbow", "Wrist"],
        "angle_down_threshold": 45,
        "angle_up_threshold": 150,
        "instructions": "Keep elbows glued by your sides. Curl your hands upward towards shoulders squeezing the biceps, then lower with control.",
        "form_tips": "Do not swing your back or flare your elbows outwards."
    },
    "lunges": {
        "id": "lunges",
        "name": "Forward Lunges",
        "category": "Lower Body & Balance",
        "target_muscles": ["Quadriceps", "Glutes", "Hamstrings", "Calves"],
        "icon": "🚶‍♂️",
        "difficulty": "Medium",
        "cv_primary_joints": ["Hip", "Knee", "Ankle"],
        "angle_down_threshold": 95,
        "angle_up_threshold": 160,
        "instructions": "Step forward with one leg and lower your hips until both knees are bent at about a 90-degree angle. Push back to starting position.",
        "form_tips": "Keep your upper body straight and do not let your front knee drift past your toes."
    },
    "high_knees": {
        "id": "high_knees",
        "name": "High Knees",
        "category": "HIIT & Cardio",
        "target_muscles": ["Hip Flexors", "Quadriceps", "Calves", "Abs"],
        "icon": "🏃",
        "difficulty": "Medium",
        "cv_primary_joints": ["Hip", "Knee"],
        "angle_down_threshold": 80,
        "angle_up_threshold": 150,
        "instructions": "Run in place driving your knees up towards hip height rapidly with explosive cadence.",
        "form_tips": "Stay light on your feet and drive knees up to at least waist level."
    },
    "plank": {
        "id": "plank",
        "name": "Iron Core Plank",
        "category": "Isometric Core",
        "target_muscles": ["Rectus Abdominis", "Transverse Abdominis", "Lower Back", "Shoulders"],
        "icon": "🛡️",
        "difficulty": "Medium - Hard",
        "cv_primary_joints": ["Shoulder", "Hip", "Ankle"],
        "angle_down_threshold": 160,
        "angle_up_threshold": 180,
        "instructions": "Hold a straight pushup or forearm plank position. Keep your body in a rigid straight line from head to heels.",
        "form_tips": "Squeeze glutes and core; do not let your hips sink or pike up."
    },
    "shoulder_press": {
        "id": "shoulder_press",
        "name": "Overhead Shoulder Press",
        "category": "Shoulders & Upper Body",
        "target_muscles": ["Anterior/Lateral Deltoids", "Triceps", "Trapezius"],
        "icon": "🏋️",
        "difficulty": "Medium",
        "cv_primary_joints": ["Elbow", "Shoulder", "Wrist"],
        "angle_down_threshold": 80,
        "angle_up_threshold": 165,
        "instructions": "Hold hands at ear level with 90-degree bent elbows. Press overhead until arms are nearly fully locked, then return.",
        "form_tips": "Avoid arching your lower back as you press overhead."
    },
    "crunches": {
        "id": "crunches",
        "name": "Abdominal Crunches",
        "category": "Core & Abs",
        "target_muscles": ["Upper Abdominals", "Core Stabilizers"],
        "icon": "🔥",
        "difficulty": "Easy - Medium",
        "cv_primary_joints": ["Shoulder", "Hip", "Knee"],
        "angle_down_threshold": 130,
        "angle_up_threshold": 80,
        "instructions": "Lie on back with knees bent. Contract abs to lift your shoulder blades off the floor, pause, and slowly lower.",
        "form_tips": "Do not pull on your neck with your hands; curl using your abdominal wall."
    },
    "mountain_climbers": {
        "id": "mountain_climbers",
        "name": "Mountain Climbers",
        "category": "Agility & Core",
        "target_muscles": ["Core", "Shoulders", "Hip Flexors", "Quads"],
        "icon": "🧗",
        "difficulty": "Medium - Hard",
        "cv_primary_joints": ["Hip", "Knee", "Ankle"],
        "angle_down_threshold": 75,
        "angle_up_threshold": 155,
        "instructions": "From a high plank position, alternate driving each knee rapidly towards your chest like sprinting on the floor.",
        "form_tips": "Maintain a flat back and keep your shoulders directly stacked over wrists."
    },
    "lateral_raises": {
        "id": "lateral_raises",
        "name": "Lateral Shoulder Raises",
        "category": "Shoulder Definition",
        "target_muscles": ["Lateral Deltoid", "Rotator Cuff"],
        "icon": "🦅",
        "difficulty": "Easy",
        "cv_primary_joints": ["Hip", "Shoulder", "Elbow"],
        "angle_down_threshold": 25,
        "angle_up_threshold": 85,
        "instructions": "Stand tall with hands by sides. Raise arms out to the sides until parallel with the floor, then lower under control.",
        "form_tips": "Lead with your elbows and keep a soft bend in the arms."
    },
    "shadow_boxing": {
        "id": "shadow_boxing",
        "name": "Shadow Boxing Strikes",
        "category": "Combat Cardio & Reflexes",
        "target_muscles": ["Shoulders", "Chest", "Core", "Cardiovascular"],
        "icon": "🥊",
        "difficulty": "Easy - Fast",
        "cv_primary_joints": ["Shoulder", "Elbow", "Wrist"],
        "angle_down_threshold": 60,
        "angle_up_threshold": 150,
        "instructions": "In fighting stance, alternate throwing straight punches (jabs and crosses) with full extension and snap back to guard.",
        "form_tips": "Rotate your torso into each strike and snap hands back to protect your chin."
    }
}

def get_all_exercises() -> List[Dict[str, Any]]:
    return list(EXERCISES_DATABASE.values())

def get_exercise_by_id(exercise_id: str) -> Dict[str, Any]:
    return EXERCISES_DATABASE.get(exercise_id, EXERCISES_DATABASE["frog_jumps"])
