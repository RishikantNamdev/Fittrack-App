# Fittrack - AI Development Context

## Project Overview

Fittrack is a React Native mobile fitness application built with Expo.

The app uses the device camera and MediaPipe pose detection to:

* Detect body landmarks in real time
* Count exercise repetitions automatically
* Analyze exercise form
* Provide live workout feedback
* Store workout statistics locally

All pose processing must happen on-device.

No server-side video processing is allowed.

---

## Current Development Stage

Current Phase:
Milestone 2C Complete (Skeleton Rendering Validation)

Completed:

* Expo project initialized
* Expo application runs successfully on Android via custom development client
* Project folder structure created
* Java 17 installed and configured
* Expo SDK 56 installed
* AI_CONTEXT.md created
* README.md created
* MediaPipe BlazePose selected as pose estimation engine
* react-native-vision-camera installed
* Android Studio installed and configured
* Git repository initialized
* **Milestone 1: Camera verification & preview** (Completed)
* **Milestone 2A: TFLite model execution validation** (Completed)
* **Milestone 2B: Landmark decoding validation** (Completed)
* **Milestone 2C: Skeleton rendering validation** (Completed)

In Progress:

* Ready for next phase (Exercise Analysis / Rep Counting)

Not Started:

* Rep counting (Milestone 3 / 4)
* Feedback engine (Milestone 5)
* Workout analytics (Milestone 6)
* Local data persistence (Milestone 7)

---

## Milestone 2C: Skeleton Rendering Validation Specifications

### 1. Rendering Architecture

*   **Thread Execution:** Synchronous execution of inference (`tflite.runSync`) and coordinate decoding directly on the frame processor (worklet) thread.
*   **JS Main Thread Sync:** Normalized decoded coordinate coordinates are transferred to the main JS thread using the worklet JSI `runOnJS` wrapper.
*   **UI Layer:** The overlay is implemented using standard absolute-positioned React Native `View` components:
    *   **Joints:** Rendered as 10px circular `View` elements with Emerald Green background and white borders.
    *   **Bones:** Rendered as 3px lines with Sleek Indigo background, scaled and rotated dynamically using trigonometry (angle/length calculations) on the JS thread.

### 2. Coordinate Transform Pipeline

*   **Aspect Ratio Crop (1:1):** The resizer uses `scaleMode: 'cover'` to crop and resize input frames to `256x256` square formats, centered on the camera feed.
*   **Scale Factor:** The screen scale factor is calculated as `scale = viewportWidth / 256`.
*   **Viewport Translation:**
    *   `x_screen = lx * scale`
    *   `y_screen = ly * scale + (viewportHeight - viewportWidth) / 2`
    *(Aligns the centered square crop to the viewport bounds of the portrait device)*
*   **Horizontal Mirroring:** Front-camera coordinates map natively to the screen without horizontal inversion because both the input frames to the frame processor and the preview surface display are horizontally mirrored on Android.

### 3. Skeleton Connection Map (35 Bones)

The connection map connects standard BlazePose landmarks 0-32, completely ignoring virtual/alignment landmarks 33-38:
*   **Face/Head (9 connections):**
    *   Left eye path: `[0, 1]`, `[1, 2]`, `[2, 3]`, `[3, 7]` (Nose $\rightarrow$ Inner $\rightarrow$ Eye $\rightarrow$ Outer $\rightarrow$ Ear)
    *   Right eye path: `[0, 4]`, `[4, 5]`, `[5, 6]`, `[6, 8]`
    *   Mouth path: `[9, 10]`
*   **Torso (4 connections):**
    *   Shoulders: `[11, 12]`
    *   Hips: `[23, 24]`
    *   Left Torso: `[11, 23]` (Shoulder to Hip)
    *   Right Torso: `[12, 24]` (Shoulder to Hip)
*   **Left Arm (6 connections):**
    *   `[11, 13]`, `[13, 15]`, `[15, 17]`, `[15, 19]`, `[15, 21]`, `[17, 19]`
*   **Right Arm (6 connections):**
    *   `[12, 14]`, `[14, 16]`, `[16, 18]`, `[16, 20]`, `[16, 22]`, `[18, 20]`
*   **Left Leg (5 connections):**
    *   `[23, 25]`, `[25, 27]`, `[27, 29]`, `[29, 31]`, `[27, 31]`
*   **Right Leg (5 connections):**
    *   `[24, 26]`, `[26, 28]`, `[28, 30]`, `[30, 32]`, `[28, 32]`

### 4. Performance Measurements

*   **Camera Frame Rate:** **30.6 FPS**
*   **Inference Execution Rate:** **30.4 FPS**
*   **Overlay Rendering Rate:** **29.7 FPS**
*   **Average JSI Latency:** **16ms** (model GPU inference + resizer resize)
*   **Dropped Frames / Lag:** **0%** dropped frames. UI remains 100% responsive.

### 5. Validation Findings

*   **Test A (Standing Still):** Skeleton overlays match human body posture. Connections align exactly with the shoulders, torso, arms, and legs.
*   **Test B (Raise Left Arm):** The skeleton correctly tracks the left arm moving upwards. The line rotates dynamically and coordinates map to the right side of the screen as expected in a mirrored view.
*   **Test C (Raise Right Arm):** Right arm tracks correctly and rotates dynamically.
*   **Test D (Squat):** Torso and leg connections dynamically compress/expand with the hips, knees, and ankles. The joints remain attached to the correct anatomical points.
*   **Test E (Step Sideways):** Horizontal translation maps across the screen. Joints remain stable.
*   *Verdict:* No coordinate inversion, mirroring, or layout offset issues are present.


Frontend:

* React Native
* Expo

State Management:

* Zustand

Storage:

* react-native-mmkv

Camera:

* react-native-vision-camera

Pose Detection:

* MediaPipe BlazePose

Graphics:

* @shopify/react-native-skia

Language:

* TypeScript

---

## MVP Features

### Workout Tracking

* Squat Detection
* Push-Up Detection

### Repetition Counting

* Automatic rep counting
* State machine based counting

### Form Feedback

Squat:

* Go Lower
* Keep Chest Up

Push-Up:

* Lower Hips
* Full Extension

### Session Summary

* Total Reps
* Total Sets
* Workout Duration

---

## Folder Responsibilities

src/components/pose/

PoseCamera.tsx

* Camera viewport
* Camera permissions

SkeletonOverlay.tsx

* Draw body landmarks
* Draw skeleton connections

src/hooks/

usePoseTriggers.ts

* Detect exercise states
* Angle threshold logic

useRepCounter.ts

* Count reps
* Prevent double counting

src/store/

workoutStore.ts

* Global workout state

src/database/

exercises.ts

* Exercise definitions
* Threshold values

---

## Development Rules

1. Use TypeScript everywhere.

2. Functional components only.

3. Keep business logic inside hooks.

4. Keep UI components presentation-only.

5. Do not install packages without approval.

6. Before modifying files, generate an implementation plan.

7. Do not refactor working files unless requested.

8. Prioritize simplicity over abstraction.

---

## Decision Log
* Expo selected over React Native CLI.
* MediaPipe BlazePose selected for pose estimation.
* All pose processing must happen on-device.
* TypeScript is mandatory throughout the project.
* Physical Android device will be used as the primary testing device.
* Development will proceed incrementally:
1. Camera
2. Pose Detection
3. Skeleton Overlay
4. Rep Counting
5. Form Feedback
6. Analytics
* No advanced features should be started until camera integration works reliably.
* Antigravity agents must generate an implementation plan before modifying files.
* Simplicity is preferred over abstraction and premature optimization.

---

## Current Goal

Milestone 2C: Landmark Parser Implementation

Objectives:

1. Create a structured parser class/hook to extract and map coordinates, confidence, and visibility for all 39 landmarks from the JSI outputs.
2. Establish a typed data model for landmark representations.
3. Validate that parsing logic runs within sub-millisecond durations inside the JSI frame processor thread.

Success Criteria:

* Raw float arrays from `Identity` and `Identity_4` are successfully mapped to structured TS objects.
* Coordinates are correctly normalized and flipped if needed for mirror correction.
* No regressions, UI blocking, or memory leaks are introduced.

Out of Scope:

* Drawing skeleton overlays (Milestone 3).
* Rep counting or form feedback logic (Milestones 4 & 5).
