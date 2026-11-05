# SwimGuard AI

Create a modern, clean mobile-first web app UI called "SwimGuard AI" for swim stroke mechanics and injury prevention analysis. Use a modern Dark/Cyan sport tech aesthetic (Tailwind CSS, Lucide icons).

Include 3 main tab views:

1. Dashboard / Upload View:

- Header with "SwimGuard AI" logo and athlete profile indicator.

- A prominent Drag-and-Drop video upload area ("Upload Swim Video for Pose Analysis").

- An alternative button: "Connect Underwater Camera (RTSP / Wi-Fi)".

- A "Recent Sessions" list showing past video runs with status tags: "Low Injury Risk", "High Shoulder Risk".

2. Pose Analysis View (Video Playback Simulation):

- A mock video player displaying a swimmer freestyle stroke.

- Overlay a canvas with simulated MediaPipe 33-point skeleton lines (cyan joints and connecting lines over the swimmer's arms, shoulders, and hips).

- Live HUD metrics overlay on top of video:

  * Elbow Catch Angle: 88° (Target: 90° - 110°)

  * Body Roll Angle: 22° [WARN: Low Roll]

  * Stroke Phase: Pull-Through

- Scrubbing timeline controls and speed toggle (0.5x, 0.25x).

3. Biomechanical Injury Risk Report:

- Risk Score gauge widget: "Moderate Risk (64/100)" focused on Right Shoulder Subacromial Impingement.

- Flagged Mechanics Breakdown Cards:

  * 🔴 Dropped Elbow on Recovery (Detected 4 times) - "Wrist elevated above elbow during recovery phase."

  * 🟡 Insufficient Trunk Rotation - "Average roll 22° (Recommended: 35-45°)."

- Drill Recommendations Section: "3 corrective drills for shoulder clearance (e.g., Fingertip Drag Drill, Kick on Side)."

Make the layout responsive, smooth, and interactive with functional tabs!

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b9b37338-9e86-479a-9218-a3d935e42d2b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
