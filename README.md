# EYES UP FRONT

A PS1-style stealth horror game that runs in the browser. You're a student in Room 113, sixth period, and you really want to be on your laptop. Mrs. Halloway is teaching photosynthesis. Over five days, the class gets steadily worse.

**Play:** https://jupixels.github.io/eyesupfront/

## How to play

| Key | Action |
|---|---|
| Mouse | Look around (click the game to lock the mouse) |
| Space | Open / close your laptop |
| Shift (hold, on laptop) | Glance up: you see the room more clearly, but have less fun |
| 1 / 2 / 3 | MeTube / Block Dodge / Chat |
| Tab | Panic button: switch to your fake essay |
| B | Raise your textbook to block her view |
| A / D | Move in Block Dodge |
| V | Laptop sound on or off (more fun, but she can hear it) |
| N | Next video |
| Enter | Reply in chat |
| M | Mute |
| P | Pause |

- **FUN** has to pass the white line before the bell.
- **URGE** rises while you pay attention. If it maxes out, your laptop opens on its own and something loud plays.
- **Her vision cone** is drawn on the floor. If your screen is inside it, the eye meter fills, and when it's full you're caught. Three strikes and you're out.
- **Listen for her tells.** When the chalk stops, she's about to turn around. Later in the week the chalk doesn't always stop first.
- **Things move when you're not looking.** That includes her.

There are three endings to find.

## Running locally

The game uses ES modules, so it has to be served over HTTP rather than opened as a file:

```
python3 -m http.server
```

Then open http://localhost:8000.

## Project layout

- `index.html`, `style.css`: page and HUD
- `js/main.js`: game loop, input, scares, day flow
- `js/world.js`: the classroom, classmates, and moving props
- `js/teacher.js`: Mrs. Halloway's AI and vision cone
- `js/laptop.js`: the laptop apps
- `js/days.js`: all per-day content (difficulty, events, lines, chat messages)
- `js/psx.js`: PS1 look (vertex snapping, affine textures, low-res dithered post pass)
- `vendor/`: Three.js r187 (MIT)

## Audio

- Horror sound effects and Mrs. Halloway's voice (`sounds/eleven/`) were generated with ElevenLabs. To change or regenerate them, edit the prompts and lines in `tools/generate_audio.py` and run:
  ```
  ELEVENLABS_API_KEY=your_key python3 tools/generate_audio.py --force name1 name2
  ```
  Don't commit your API key.
- UI, footstep, impact, and book sounds are from [Kenney.nl](https://kenney.nl) (CC0).
