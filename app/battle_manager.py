import asyncio
import random
import time
from typing import Dict, List, Any, Optional
from fastapi import WebSocket
from datetime import datetime
from .database import get_db_connection

class BattleRoom:
    def __init__(self, room_id: str, exercise_id: str, age_group: str, is_custom_code: bool = False):
        self.room_id = room_id
        self.exercise_id = exercise_id
        self.age_group = age_group
        self.is_custom_code = is_custom_code
        self.players: Dict[WebSocket, dict] = {} # websocket -> player_data
        self.is_active = False # Starts active once both or AI ready
        self.start_time = 0
        self.duration_seconds = 45 # 45-second high-intensity battle round
        self.is_ai_battle = False
        self.ai_player: Optional[dict] = None
        self.ai_task: Optional[asyncio.Task] = None

class BattleManager:
    def __init__(self):
        self.active_rooms: Dict[str, BattleRoom] = {}
        self.waiting_queue: Dict[str, List[dict]] = {} # (exercise_id + '_' + age_group) -> list of waiting websockets

    def get_queue_key(self, exercise_id: str, age_group: str) -> str:
        return f"{exercise_id}::{age_group}"

    async def connect_player(self, websocket: WebSocket, user_id: int, username: str, 
                             exercise_id: str, age_group: str, room_code: Optional[str] = None, force_ai: bool = False):
        await websocket.accept()

        # 1. Direct Friend Room with Room Code
        if room_code and room_code.strip():
            clean_code = room_code.strip().upper()
            if clean_code in self.active_rooms:
                room = self.active_rooms[clean_code]
                # Second player joining friend's room!
                room.players[websocket] = {
                    "user_id": user_id,
                    "username": username,
                    "reps": 0,
                    "combo": 0,
                    "is_ai": False,
                    "ws": websocket
                }
                room.is_active = True
                room.start_time = time.time()

                # Get the first player
                first_ws = [ws for ws in room.players.keys() if ws != websocket][0]
                first_player = room.players[first_ws]

                # Notify first player that friend joined (initiator can send WebRTC offer)
                await first_ws.send_json({
                    "type": "MATCH_START",
                    "room_id": clean_code,
                    "exercise_id": room.exercise_id,
                    "age_group": room.age_group,
                    "duration": room.duration_seconds,
                    "is_initiator": True,
                    "opponent": {"username": username, "is_ai": False}
                })

                # Notify second player
                await websocket.send_json({
                    "type": "MATCH_START",
                    "room_id": clean_code,
                    "exercise_id": room.exercise_id,
                    "age_group": room.age_group,
                    "duration": room.duration_seconds,
                    "is_initiator": False,
                    "opponent": {"username": first_player["username"], "is_ai": False}
                })
                return clean_code
            else:
                # First player creating friend room
                room = BattleRoom(clean_code, exercise_id, age_group, is_custom_code=True)
                room.players[websocket] = {
                    "user_id": user_id,
                    "username": username,
                    "reps": 0,
                    "combo": 0,
                    "is_ai": False,
                    "ws": websocket
                }
                self.active_rooms[clean_code] = room
                await websocket.send_json({
                    "type": "ROOM_CREATED",
                    "room_code": clean_code,
                    "message": f"Room {clean_code} created! Share this code with your friend."
                })
                return clean_code

        queue_key = self.get_queue_key(exercise_id, age_group)

        # 2. Public Matchmaking: Check if another human player is waiting
        if not force_ai and queue_key in self.waiting_queue and len(self.waiting_queue[queue_key]) > 0:
            opponent_entry = self.waiting_queue[queue_key].pop(0)
            room_id = f"room_{int(time.time()*1000)}"
            room = BattleRoom(room_id, exercise_id, age_group)
            room.is_active = True
            room.start_time = time.time()
            
            room.players[opponent_entry["ws"]] = {
                "user_id": opponent_entry["user_id"],
                "username": opponent_entry["username"],
                "reps": 0,
                "combo": 0,
                "is_ai": False,
                "ws": opponent_entry["ws"]
            }
            room.players[websocket] = {
                "user_id": user_id,
                "username": username,
                "reps": 0,
                "combo": 0,
                "is_ai": False,
                "ws": websocket
            }

            self.active_rooms[room_id] = room

            # Notify both of match start with WebRTC initiator flag
            await opponent_entry["ws"].send_json({
                "type": "MATCH_START",
                "room_id": room_id,
                "exercise_id": exercise_id,
                "age_group": age_group,
                "duration": room.duration_seconds,
                "is_initiator": True,
                "opponent": {"username": username, "is_ai": False}
            })
            await websocket.send_json({
                "type": "MATCH_START",
                "room_id": room_id,
                "exercise_id": exercise_id,
                "age_group": age_group,
                "duration": room.duration_seconds,
                "is_initiator": False,
                "opponent": {"username": opponent_entry["username"], "is_ai": False}
            })
            return room_id

        # 3. Solo AI Practice or Fallback
        room_id = f"ai_room_{int(time.time()*1000)}"
        room = BattleRoom(room_id, exercise_id, age_group)
        room.is_active = True
        room.is_ai_battle = True
        room.start_time = time.time()
        
        ai_names = {
            "Junior (13-19)": ["CyberNova [AI]", "VortexKid [AI]", "HyperBlade [AI]", "FalconStriker [AI]"],
            "Prime (20-29)": ["TitanPulse [AI]", "ApexValkyrie [AI]", "IronGoliath [AI]", "ShadowViper [AI]"],
            "Master (30-45)": ["Centurion [AI]", "SteelSergeant [AI]", "FrostWolf [AI]", "Spartan99 [AI]"],
            "Legend (46+)": ["GrandMaster [AI]", "SilverPhoenix [AI]", "OdinForce [AI]", "ImmortalRyu [AI]"]
        }
        name_pool = ai_names.get(age_group, ["AI_Warrior", "NeonFighter", "FitBot_X"])
        ai_name = random.choice(name_pool)

        room.ai_player = {
            "user_id": 0,
            "username": ai_name,
            "reps": 0,
            "combo": 0,
            "is_ai": True,
            "pace_delay": random.uniform(1.6, 2.4)
        }
        room.players[websocket] = {
            "user_id": user_id,
            "username": username,
            "reps": 0,
            "combo": 0,
            "is_ai": False,
            "ws": websocket
        }

        self.active_rooms[room_id] = room

        await websocket.send_json({
            "type": "MATCH_START",
            "room_id": room_id,
            "exercise_id": exercise_id,
            "age_group": age_group,
            "duration": room.duration_seconds,
            "is_initiator": False,
            "opponent": {"username": ai_name, "is_ai": True}
        })

        room.ai_task = asyncio.create_task(self.run_ai_opponent_loop(room, websocket))
        return room_id

    async def forward_webrtc_signaling(self, websocket: WebSocket, room_id: str, data: dict):
        """Forwards WebRTC video stream offers, answers, and ICE candidates between peers"""
        if room_id not in self.active_rooms:
            return
        room = self.active_rooms[room_id]
        for ws in room.players.keys():
            if ws != websocket:
                try:
                    await ws.send_json(data)
                except Exception:
                    pass

    async def run_ai_opponent_loop(self, room: BattleRoom, player_ws: WebSocket):
        try:
            time_left = room.duration_seconds
            while room.is_active and time_left > 0:
                delay = room.ai_player["pace_delay"] + random.uniform(-0.3, 0.3)
                await asyncio.sleep(max(1.0, delay))
                if not room.is_active:
                    break

                room.ai_player["reps"] += 1
                room.ai_player["combo"] += 1
                is_crit = (room.ai_player["reps"] % 5 == 0)

                msg = {
                    "type": "OPPONENT_REP",
                    "reps": room.ai_player["reps"],
                    "combo": room.ai_player["combo"],
                    "is_critical": is_crit
                }
                try:
                    await player_ws.send_json(msg)
                except Exception:
                    break
        except asyncio.CancelledError:
            pass

    async def handle_player_rep(self, websocket: WebSocket, room_id: str, rep_count: int, form_score: float):
        if room_id not in self.active_rooms:
            return
        room = self.active_rooms[room_id]
        if websocket not in room.players:
            return

        player = room.players[websocket]
        player["reps"] = rep_count
        player["combo"] += 1

        for ws, p in room.players.items():
            if ws != websocket:
                try:
                    await ws.send_json({
                        "type": "OPPONENT_REP",
                        "reps": rep_count,
                        "combo": player["combo"],
                        "form_score": form_score
                    })
                except Exception:
                    pass

    async def finish_match(self, room_id: str, triggering_ws: Optional[WebSocket] = None):
        if room_id not in self.active_rooms:
            return
        room = self.active_rooms[room_id]
        room.is_active = False

        if room.ai_task and not room.ai_task.done():
            room.ai_task.cancel()

        if room.is_ai_battle:
            for ws, player in room.players.items():
                user_reps = player["reps"]
                ai_reps = room.ai_player["reps"]
                
                if user_reps > ai_reps:
                    outcome = "VICTORY"
                    xp_earned = 150 + (user_reps * 5)
                elif user_reps < ai_reps:
                    outcome = "DEFEAT"
                    xp_earned = 50 + (user_reps * 2)
                else:
                    outcome = "DRAW"
                    xp_earned = 75 + (user_reps * 3)

                self.record_match_result(
                    user_id=player["user_id"],
                    opponent_name=room.ai_player["username"],
                    opponent_type="AI",
                    age_group=room.age_group,
                    exercise_id=room.exercise_id,
                    user_reps=user_reps,
                    opp_reps=ai_reps,
                    outcome=outcome,
                    xp=xp_earned
                )

                try:
                    await ws.send_json({
                        "type": "MATCH_FINISH",
                        "outcome": outcome,
                        "user_reps": user_reps,
                        "opponent_reps": ai_reps,
                        "xp_earned": xp_earned
                    })
                except Exception:
                    pass
        else:
            player_list = list(room.players.values())
            if len(player_list) >= 2:
                p1, p2 = player_list[0], player_list[1]
                for p_curr, p_opp in [(p1, p2), (p2, p1)]:
                    if p_curr["reps"] > p_opp["reps"]:
                        outcome = "VICTORY"
                        xp = 200 + (p_curr["reps"] * 5)
                    elif p_curr["reps"] < p_opp["reps"]:
                        outcome = "DEFEAT"
                        xp = 60 + (p_curr["reps"] * 2)
                    else:
                        outcome = "DRAW"
                        xp = 100 + (p_curr["reps"] * 3)

                    self.record_match_result(
                        user_id=p_curr["user_id"],
                        opponent_name=p_opp["username"],
                        opponent_type="HUMAN",
                        age_group=room.age_group,
                        exercise_id=room.exercise_id,
                        user_reps=p_curr["reps"],
                        opp_reps=p_opp["reps"],
                        outcome=outcome,
                        xp=xp
                    )

                    try:
                        await p_curr["ws"].send_json({
                            "type": "MATCH_FINISH",
                            "outcome": outcome,
                            "user_reps": p_curr["reps"],
                            "opponent_reps": p_opp["reps"],
                            "xp_earned": xp
                        })
                    except Exception:
                        pass

        if room_id in self.active_rooms:
            del self.active_rooms[room_id]

    def record_match_result(self, user_id: int, opponent_name: str, opponent_type: str, 
                            age_group: str, exercise_id: str, user_reps: int, 
                            opp_reps: int, outcome: str, xp: int):
        conn = get_db_connection()
        cursor = conn.cursor()
        now_str = datetime.now().isoformat()

        cursor.execute("""
        INSERT INTO battle_matches (user_id, opponent_name, opponent_type, age_group, exercise_id, user_reps, opponent_reps, outcome, xp_earned, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, opponent_name, opponent_type, age_group, exercise_id, user_reps, opp_reps, outcome, xp, now_str))

        won = 1 if outcome == "VICTORY" else 0
        cursor.execute("""
        UPDATE users 
        SET xp = xp + ?, points = points + ?, coins = coins + ?
        WHERE id = ?
        """, (xp, xp, 30 if won else 10, user_id))

        cursor.execute("""
        SELECT * FROM exercise_stats WHERE user_id = ? AND exercise_id = ?
        """, (user_id, exercise_id))
        row = cursor.fetchone()
        if row:
            max_reps = max(row["max_reps_single_match"], user_reps)
            cursor.execute("""
            UPDATE exercise_stats
            SET total_reps = total_reps + ?,
                max_reps_single_match = ?,
                matches_played = matches_played + 1,
                matches_won = matches_won + ?,
                updated_at = ?
            WHERE user_id = ? AND exercise_id = ?
            """, (user_reps, max_reps, won, now_str, user_id, exercise_id))
        else:
            cursor.execute("""
            INSERT INTO exercise_stats (user_id, exercise_id, total_reps, max_reps_single_match, matches_played, matches_won, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)
            """, (user_id, exercise_id, user_reps, user_reps, won, now_str))

        conn.commit()
        conn.close()

battle_manager = BattleManager()
