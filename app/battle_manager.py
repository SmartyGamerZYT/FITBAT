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
        self.is_active = False
        self.start_time = 0
        self.duration_seconds = 45
        self.is_ai_battle = False
        self.ai_player: Optional[dict] = None
        self.ai_task: Optional[asyncio.Task] = None

class BattleManager:
    def __init__(self):
        self.active_rooms: Dict[str, BattleRoom] = {}
        # Queue entries: {"ws": ws, "user_id": uid, "username": name, "exercise_id": eid, "age_group": ag, "joined_at": ts}
        self.waiting_queue: List[dict] = []

    async def connect_player(self, websocket: WebSocket, user_id: int, username: str, 
                             exercise_id: str, age_group: str, room_code: Optional[str] = None, 
                             force_ai: bool = False):
        await websocket.accept()

        # ----------------------------------------------------
        # 1. PRIVATE ARENA WITH ROOM CODE (DIRECT FRIEND BATTLE)
        # ----------------------------------------------------
        if room_code and room_code.strip():
            clean_code = room_code.strip().upper()
            
            # Check if friend already created this room (Player 2 is joining)
            if clean_code in self.active_rooms:
                room = self.active_rooms[clean_code]
                
                # Add Player 2
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

                # Get Player 1
                p1_ws = [ws for ws in room.players.keys() if ws != websocket][0]
                p1_data = room.players[p1_ws]

                print(f"[BattleManager] Friend joined Private Arena {clean_code}! Pairing {p1_data['username']} and {username}")

                # Notify Player 1 (Initiator for WebRTC stream)
                try:
                    await p1_ws.send_json({
                        "type": "MATCH_START",
                        "room_id": clean_code,
                        "exercise_id": room.exercise_id,
                        "age_group": room.age_group,
                        "duration": room.duration_seconds,
                        "is_initiator": True,
                        "opponent": {"username": username, "is_ai": False}
                    })
                except Exception as e:
                    print(f"Error sending to p1: {e}")

                # Notify Player 2 (Joiner)
                try:
                    await websocket.send_json({
                        "type": "MATCH_START",
                        "room_id": clean_code,
                        "exercise_id": room.exercise_id,
                        "age_group": room.age_group,
                        "duration": room.duration_seconds,
                        "is_initiator": False,
                        "opponent": {"username": p1_data["username"], "is_ai": False}
                    })
                except Exception as e:
                    print(f"Error sending to p2: {e}")

                return clean_code

            else:
                # Player 1 is creating the private room
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

                print(f"[BattleManager] Created Private Arena {clean_code} for user {username}")

                await websocket.send_json({
                    "type": "ROOM_CREATED",
                    "room_code": clean_code,
                    "message": f"Private Arena {clean_code} created. Waiting for friend to enter this Arena ID..."
                })
                return clean_code

        # ----------------------------------------------------
        # 2. RANDOM ARENA (STAGE 1: SAME AGE -> STAGE 2: ALL AGES -> STAGE 3: AI)
        # ----------------------------------------------------
        if not force_ai:
            # Step 1: Immediate check if another player in EXACT SAME AGE group & exercise is waiting
            same_age_opp = None
            for idx, entry in enumerate(self.waiting_queue):
                if entry["exercise_id"] == exercise_id and entry["age_group"] == age_group and entry["ws"] != websocket:
                    same_age_opp = self.waiting_queue.pop(idx)
                    break

            if same_age_opp:
                return await self.pair_two_players(same_age_opp, {
                    "ws": websocket, "user_id": user_id, "username": username,
                    "exercise_id": exercise_id, "age_group": age_group
                })

            # If not immediately found, add to waiting queue
            queue_entry = {
                "ws": websocket,
                "user_id": user_id,
                "username": username,
                "exercise_id": exercise_id,
                "age_group": age_group,
                "joined_at": time.time()
            }
            self.waiting_queue.append(queue_entry)

            await websocket.send_json({
                "type": "SEARCHING_OPPONENT",
                "stage": "SAME_AGE",
                "message": f"Searching for {age_group} opponent (10s)..."
            })

            # Launch progressive matchmaking background task
            asyncio.create_task(self.run_progressive_matchmaking(websocket, user_id, username, exercise_id, age_group))
            return "queue"

        # ----------------------------------------------------
        # 3. DIRECT SOLO AI DUEL
        # ----------------------------------------------------
        return await self.spawn_ai_match(websocket, user_id, username, exercise_id, age_group)

    async def run_progressive_matchmaking(self, websocket: WebSocket, user_id: int, username: str, 
                                          exercise_id: str, age_group: str):
        # Stage 1: Wait 2 seconds for SAME AGE GROUP opponent (check every 0.5s)
        for tick in range(4):
            await asyncio.sleep(0.5)
            # Check if already paired
            if not any(e["ws"] == websocket for e in self.waiting_queue):
                return
            
            # Check for incoming same-age player
            for idx, entry in enumerate(self.waiting_queue):
                if entry["exercise_id"] == exercise_id and entry["age_group"] == age_group and entry["ws"] != websocket:
                    same_age_opp = self.waiting_queue.pop(idx)
                    self.waiting_queue = [e for e in self.waiting_queue if e["ws"] != websocket]
                    return await self.pair_two_players(same_age_opp, {
                        "ws": websocket, "user_id": user_id, "username": username,
                        "exercise_id": exercise_id, "age_group": age_group
                    })

        # Stage 2: Expand to ALL AGE GROUPS for 1.5 seconds
        print(f"[Matchmaker] Expanding search for {username} to all age divisions...")
        try:
            await websocket.send_json({
                "type": "SEARCHING_OPPONENT",
                "stage": "ANY_AGE",
                "message": "Expanding search to warriors across all divisions..."
            })
        except Exception:
            return

        for tick in range(3):
            await asyncio.sleep(0.5)
            if not any(e["ws"] == websocket for e in self.waiting_queue):
                return
            
            for idx, entry in enumerate(self.waiting_queue):
                if entry["exercise_id"] == exercise_id and entry["ws"] != websocket:
                    any_age_opp = self.waiting_queue.pop(idx)
                    self.waiting_queue = [e for e in self.waiting_queue if e["ws"] != websocket]
                    return await self.pair_two_players(any_age_opp, {
                        "ws": websocket, "user_id": user_id, "username": username,
                        "exercise_id": exercise_id, "age_group": age_group
                    })

        # Stage 3: Instant AI rival fallback (maximum 3.5 seconds total wait)
        if any(e["ws"] == websocket for e in self.waiting_queue):
            self.waiting_queue = [e for e in self.waiting_queue if e["ws"] != websocket]
            print(f"[Matchmaker] Quick Match fallback: Spawning synchronized AI challenger for {username}")
            await self.spawn_ai_match(websocket, user_id, username, exercise_id, age_group)

    async def pair_two_players(self, p1_entry: dict, p2_entry: dict) -> str:
        room_id = f"random_room_{int(time.time()*1000)}"
        room = BattleRoom(room_id, p1_entry["exercise_id"], p1_entry["age_group"])
        room.is_active = True
        room.start_time = time.time()

        p1_ws = p1_entry["ws"]
        p2_ws = p2_entry["ws"]

        room.players[p1_ws] = {
            "user_id": p1_entry["user_id"],
            "username": p1_entry["username"],
            "reps": 0, "combo": 0, "is_ai": False, "ws": p1_ws
        }
        room.players[p2_ws] = {
            "user_id": p2_entry["user_id"],
            "username": p2_entry["username"],
            "reps": 0, "combo": 0, "is_ai": False, "ws": p2_ws
        }

        self.active_rooms[room_id] = room
        print(f"[Matchmaker] PAIRED: {p1_entry['username']} vs {p2_entry['username']} in {room_id}")

        # Notify Player 1 (Initiator for WebRTC stream)
        try:
            await p1_ws.send_json({
                "type": "MATCH_START",
                "room_id": room_id,
                "exercise_id": p1_entry["exercise_id"],
                "age_group": p1_entry["age_group"],
                "duration": room.duration_seconds,
                "is_initiator": True,
                "opponent": {"username": p2_entry["username"], "is_ai": False}
            })
        except Exception:
            pass

        # Notify Player 2
        try:
            await p2_ws.send_json({
                "type": "MATCH_START",
                "room_id": room_id,
                "exercise_id": p2_entry["exercise_id"],
                "age_group": p2_entry["age_group"],
                "duration": room.duration_seconds,
                "is_initiator": False,
                "opponent": {"username": p1_entry["username"], "is_ai": False}
            })
        except Exception:
            pass

        return room_id

    async def spawn_ai_match(self, websocket: WebSocket, user_id: int, username: str, 
                             exercise_id: str, age_group: str) -> str:
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
        name_pool = ai_names.get(age_group, ["TitanPulse [AI]", "ApexValkyrie [AI]", "FitBot_X [AI]"])
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

        try:
            await websocket.send_json({
                "type": "MATCH_START",
                "room_id": room_id,
                "exercise_id": exercise_id,
                "age_group": age_group,
                "duration": room.duration_seconds,
                "is_initiator": False,
                "opponent": {"username": ai_name, "is_ai": True}
            })
        except Exception:
            return room_id

        room.ai_task = asyncio.create_task(self.run_ai_opponent_loop(room, websocket))
        return room_id

    async def forward_webrtc_signaling(self, websocket: WebSocket, room_id: str, data: dict):
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
        # Remove from queue if disconnect happens
        if triggering_ws:
            self.waiting_queue = [e for e in self.waiting_queue if e["ws"] != triggering_ws]

        if room_id not in self.active_rooms:
            return
        
        print(f"[BATTLE] Finishing match {room_id}")
        room = self.active_rooms[room_id]
        room.is_active = False

        if room.ai_task and not room.ai_task.done():
            room.ai_task.cancel()

        if room.is_ai_battle:
            for ws, player in room.players.items():
                user_reps = player["reps"]
                ai_reps = room.ai_player["reps"] if room.ai_player else 0
                
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
                    opponent_name=room.ai_player["username"] if room.ai_player else "AI",
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
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            now_str = datetime.now().isoformat()
            print(f"[DB] Saving match result: user_id={user_id}, outcome={outcome}")

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
            print(f"[DB] Match saved successfully: match_id={cursor.lastrowid} for user_id={user_id}")
        except Exception as e:
            if conn:
                conn.rollback()
            print(f"[DB ERROR] Failed to save match result for user_id {user_id}: {type(e).__name__}: {e}")
        finally:
            if conn:
                conn.close()

battle_manager = BattleManager()
