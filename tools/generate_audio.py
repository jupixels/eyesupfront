#!/usr/bin/env python3
"""Regenerate the ElevenLabs sounds and voice lines used by the game.

Usage:  ELEVENLABS_API_KEY=sk_... python3 tools/generate_audio.py [--force] [names...]

Never commit your API key. Output goes to sounds/eleven/<name>.mp3.
Edit SFX / VOICE below to change prompts or lines, then re-run with the name.
"""
import json, os, sys, urllib.request, pathlib

KEY = os.environ.get("ELEVENLABS_API_KEY")
OUT = pathlib.Path(__file__).resolve().parent.parent / "sounds" / "eleven"
TEACHER_VOICE = "XrExE9yKIg1WjnnlVkGX"  # Matilda - middle-aged American educator

# name: (prompt, seconds)
SFX = {
    "chalk":       ("chalk writing on a chalkboard, steady scratching strokes and taps, close", 5),
    "heels":       ("slow high heel footsteps walking on hard school tile floor, echoey classroom", 5),
    "hum":         ("fluorescent tube lights humming in a quiet room, steady electrical buzz, loopable", 8),
    "ambience":    ("quiet high school classroom ambience, pencils scribbling, papers, soft air conditioning, no talking", 10),
    "tick":        ("loud analog wall clock ticking, one tick per second", 5),
    "bell":        ("old school bell ringing in a hallway", 3),
    "locker":      ("single metal locker door slamming hard in an empty school hallway, echo", 1.5),
    "chair_roll":  ("old chair with squeaky wheels slowly rolling across a tile floor", 2.5),
    "scare1":      ("extremely loud horror movie jump scare sting, distorted orchestral hit with violin screech", 2),
    "scare2":      ("sudden horror jump scare, screeching strings and metallic bang, very loud", 2),
    "scream":      ("distorted inhuman woman shriek, horror, terrifying", 2),
    "drone":       ("dark ominous horror ambient drone, low rumble and distant metallic groans, loopable", 12),
    "whisper":     ("creepy close female whisper, unintelligible words, horror", 3),
    "lights_off":  ("heavy electrical breaker clunk, power shutting off, fluorescent lights dying", 1.5),
    "flicker":     ("fluorescent light flickering and buzzing erratically", 2),
    "video":       ("upbeat silly cartoon video audio, bouncy goofy music and kids laughing", 8),
    "blast":       ("extremely loud obnoxious meme video blasting from laptop speakers, airhorn and yelling", 3),
    "heartbeat":   ("slow heavy heartbeat, muffled, horror, loopable", 4),
    "breath":      ("slow raspy breathing very close to the listener's ear, horror", 3),
    "door_creak":  ("old wooden classroom door slowly creaking open", 2.5),
    "lofi":        ("mellow lofi hip hop beat, warm keys, cozy, loopable", 20),
    "notify":      ("soft laptop chat message notification pop", 0.6),
    "game_hit":    ("retro 8-bit game damage blip", 0.5),
    "game_coin":   ("retro 8-bit game coin pickup chime", 0.5),
    "tension":     ("rising horror tension riser, strings building, ending abruptly", 4),
    "glitch":      ("digital video glitch stutter and static burst", 1),
    "static":      ("tv static white noise hiss, loopable", 4),
}

# name: (text, stability)
VOICE = {
    "d1_1": ("Good afternoon, class. Today we're continuing with photosynthesis.", 0.6),
    "d1_2": ("Plants take in sunlight, water, and carbon dioxide.", 0.6),
    "d1_3": ("Chlorophyll is what makes the leaves green. Write that down.", 0.6),
    "d1_4": ("This will be on the test. Yes, Tyler. Actually on the test.", 0.6),
    "d1_5": ("The light reactions happen in the thylakoid membranes.", 0.6),
    "d1_6": ("Eyes up front, please.", 0.6),
    "d2_2": ("Tyler isn't here today. That's alright. Tyler wasn't paying attention.", 0.55),
    "d2_3": ("Plants turn toward the light. They can't help it.", 0.55),
    "d2_5": ("Some things grow better when no one is watching them.", 0.5),
    "d3_1": ("Three empty desks. Can anyone tell me why?", 0.45),
    "d3_2": ("Attention is a kind of energy. It has to go somewhere.", 0.45),
    "d3_3": ("I can always tell when someone isn't looking at me.", 0.4),
    "d3_4": ("Plants turn toward the light. Students turn toward the front.", 0.4),
    "d3_5": ("I don't need to turn around to see you.", 0.35),
    "d4_1": ("Eyes. Up. Front.", 0.3),
    "d4_2": ("I have taught in this room for a very, very long time.", 0.3),
    "d4_3": ("Every face on that wall paid attention. Eventually.", 0.3),
    "d4_4": ("You keep looking down. What's down there that's better than me?", 0.3),
    "d4_5": ("I move when you look away. You've noticed, haven't you?", 0.25),
    "d5_1": ("It's just us now.", 0.25),
    "d5_2": ("You were always my favorite. You never could sit still.", 0.25),
    "d5_3": ("Look at me. Keep looking at me.", 0.2),
    "d5_4": ("The bell won't save you. But you can try.", 0.2),
    "d5_5": ("Don't look down.", 0.2),
    "c1":   ("Is there something more interesting than my lesson?", 0.6),
    "c2":   ("Laptop closed. Now.", 0.6),
    "c3":   ("I saw that.", 0.4),
    "c4":   ("See me after class.", 0.25),
    "found": ("Found you.", 0.2),
    "hm":   ("Hm?", 0.5),
    "dismiss": ("Class dismissed.", 0.6),
    "dismiss5": ("Class... dismissed.", 0.2),
    "perfect": ("Why won't you look away? Why won't you LOOK AWAY?", 0.15),
}


def post(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                 headers={"xi-api-key": KEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def main():
    if not KEY:
        sys.exit("Set ELEVENLABS_API_KEY first.")
    force = "--force" in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = [("sfx", k, v) for k, v in SFX.items()] + [("voice", k, v) for k, v in VOICE.items()]
    for kind, name, spec in jobs:
        if only and name not in only:
            continue
        path = OUT / f"{name}.mp3"
        if path.exists() and not force and not only:
            continue
        try:
            if kind == "sfx":
                data = post("https://api.elevenlabs.io/v1/sound-generation",
                            {"text": spec[0], "duration_seconds": spec[1], "prompt_influence": 0.5})
            else:
                data = post(f"https://api.elevenlabs.io/v1/text-to-speech/{TEACHER_VOICE}?output_format=mp3_44100_128",
                            {"text": spec[0], "model_id": "eleven_multilingual_v2",
                             "voice_settings": {"stability": spec[1], "similarity_boost": 0.8, "style": 0.3}})
            path.write_bytes(data)
            print("ok ", name, len(data))
        except Exception as e:
            print("ERR", name, e)


if __name__ == "__main__":
    main()
