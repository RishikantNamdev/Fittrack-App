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
Milestone 2C Complete (Landmark Parser Implementation)

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
* **Milestone 2C: Landmark Parser Implementation** (Completed)

In Progress:

* Ready for next phase (Skeleton Rendering — Milestone 3)

Not Started:

* Skeleton overlay rendering (Milestone 3)
* Rep counting (Milestone 4)
* Feedback engine (Milestone 5)
* Workout analytics (Milestone 6)
* Local data persistence (Milestone 7)

---

## Milestone 2C: Landmark Parser Implementation Specifications

### 1. New Files

| File | Role |
|---|---|
| `src/pose/PoseLandmark.ts` | TypeScript interfaces (`PoseLandmark`, `PoseFrame`) and constant `LANDMARK_COUNT` |
| `src/pose/parseLandmarks.ts` | Pure worklet-compatible parser function (`parsePoseLandmarks`) |

### 2. Landmark Interfaces

```typescript
/** Number of body landmarks parsed per frame (0–32 inclusive). */
export const LANDMARK_COUNT = 33;

export interface PoseLandmark {
  index: number;      // [0, 32] – indices 33–38 are excluded
  x: number;         // normalized [0.0, 1.0] in 256×256 input frame
  y: number;         // normalized [0.0, 1.0] in 256×256 input frame
  z: number;         // relative depth from hip midpoint (negative = closer)
  visibility: number; // sigmoid-converted logit → [0.0, 1.0]
  presence: number;   // sigmoid-converted logit → [0.0, 1.0]
}

export interface PoseFrame {
  landmarks: PoseLandmark[]; // exactly 33 landmarks
  poseScore: number;         // overall detection confidence [0.0, 1.0]
  timestamp: number;         // Date.now() at inference start
}
```

### 3. Parser Architecture

```
Camera Frame
  → GPU Resizer (256×256 RGB Float32, cover-crop)
  → TFLite runSync()
  → outputs[0]: Identity [1, 195]   ← primary landmark tensor
  → outputs[1]: Identity_1 [1, 1]   ← pose score logit
  → parsePoseLandmarks(data0, data1[0], timestamp)
  → PoseFrame { landmarks[33], poseScore, timestamp }
```

The parser lives in `src/pose/parseLandmarks.ts` and is separate from inference
execution in `PoseCamera.tsx`. This separation ensures the parser can be
unit-tested, reused by future hooks, and replaced without touching the camera layer.

### 4. Parsing Methodology

**Input tensor layout (Identity, shape [1, 195]):**

For landmark index `i` (0 ≤ i ≤ 32):

```
offset = i * 5
x            = data0[offset + 0]   // normalized image-space x
y            = data0[offset + 1]   // normalized image-space y
z            = data0[offset + 2]   // relative depth
visibility   = sigmoid(data0[offset + 3])
presence     = sigmoid(data0[offset + 4])
```

**Sigmoid conversion:**
```
sigmoid(logit) = 1 / (1 + Math.exp(-logit))
```

Applied to raw visibility and presence logits before storing in PoseLandmark.
Converts unbounded logits to probabilities in [0.0, 1.0].

**Ignored indices:**
Landmarks 33–38 are virtual/alignment landmarks output by BlazePose.
They have no anatomical body correspondence and are intentionally ignored.
The parsing loop runs for `i = 0` to `i = 32` only (LANDMARK_COUNT = 33).

### 5. Worklet Compatibility

Both `sigmoid()` and `parsePoseLandmarks()` are marked with the `'worklet'`
directive. This causes the `react-native-worklets` Babel plugin to compile
them for the native worklet runtime, allowing them to be called synchronously
on the Vision Camera frame processor thread without any `runOnJS` bridge hop.

### 6. Coordinate Semantics (Runtime-Verified)

Coordinates were verified against live device output from 1,200+ inference frames.

| Field | Runtime Range | Description |
|---|---|---|
| `x` | [0, 256] px | Pixel x-coordinate in the 256×256 input frame. 0 = left edge. Observed body range: ~[67, 210]. |
| `y` | [0, 256] px | Pixel y-coordinate in the 256×256 input frame. 0 = top edge. Observed body range: ~[42, 175]. |
| `z` | (−∞, +∞) px-scale | Depth in pixel-scale units relative to hip midpoint. Negative = closer to camera. Observed range: ~[−543, +162]; outliers can be extreme when landmark is occluded or ambiguous. |
| `visibility` | [0.0, 1.0] | Probability landmark is not occluded. Sigmoid-converted. |
| `presence` | [0.0, 1.0] | Probability landmark is present in frame. Sigmoid-converted. |
| `poseScore` | [0.0, 1.0] | Overall detection confidence. Values ≤0.5 indicate no/uncertain detection. |

> **Important:** x and y are **pixel coordinates** (not normalized). They are in the same
> coordinate space as the 256×256 model input image. Future rendering must apply a scale
> factor to map them to screen coordinates:
> ```
> scale    = viewportWidth / 256
> x_screen = lm.x * scale
> y_screen = lm.y * scale + (viewportHeight − viewportWidth) / 2
> ```
> (The y offset aligns the square crop center to the portrait viewport.)

> **Note on z:** z values in the range ~[−543, +162] were observed at runtime.
> The large negative extremes (e.g., −543) occur for occluded or poorly-detected
> landmarks such as knees when the lower body is out of frame. z is preserved
> for future angle and depth calculations but must be treated with care
> (e.g., filtered by visibility/presence thresholds) before use.

### 7. Unused Tensor Outputs

The following BlazePose output tensors are NOT consumed in Milestone 2C:

| Tensor | Shape | Contents | Milestone |
|---|---|---|---|
| `outputs[2]` | [1, 256, 256, 1] | Segmentation mask | Future (optional) |
| `outputs[3]` | [1, 64, 64, 39] | Heatmaps | Future (optional) |
| `outputs[4]` | [1, 117] | World landmarks (metres) | Milestone 4+ (angle calculations) |

### 8. Allocation Analysis

| Allocation | Size | Frequency | Notes |
|---|---|---|---|
| `new Float32Array(outputs[0])` | O(1) – typed view, no copy | Per frame | ArrayBuffer wrapper only |
| `new Float32Array(outputs[1])` | O(1) – typed view, no copy | Per frame | ArrayBuffer wrapper only |
| `landmarks[]` array | 33 objects | Per frame | ~990 small objects/sec at 30 FPS |
| `PoseFrame` object | 1 object | Per frame | Consumed immediately in worklet |

Net: ~35 small heap allocations per frame. Suitable for 30 FPS real-time processing on Hermes/V8.

### 9. Validation Log Format (Runtime-Verified)

Every 30 inference frames the parser emits:

```
[Parser] Inferences: N | Time: Xms | Avg: Y.YYms | Score: 0.649 | Landmarks: 33
[Parser] Validated landmarks (x/y in [0,256]px input-space | z pixel-scale depth | vis/pres sigmoid):
  [0]  Nose:        x=131.986 y=121.240 z= -44.436 vis=0.968 pres=0.956
  [11] L.Shoulder:  x=163.240 y=117.607 z= -67.735 vis=0.998 pres=0.984
  [12] R.Shoulder:  x=144.608 y=115.482 z= -24.082 vis=0.998 pres=0.998
  [23] L.Hip:       x=156.989 y=161.364 z= -25.651 vis=1.000 pres=0.999
  [24] R.Hip:       x=147.759 y=157.206 z= +25.693 vis=1.000 pres=0.999
  [25] L.Knee:      x=111.219 y=161.650 z= -63.937 vis=0.809 pres=0.997
  [26] R.Knee:      x=105.507 y=149.235 z= +11.209 vis=0.265 pres=0.996
```

**Movement validation results (runtime-confirmed):**

| Test | x behaviour | y behaviour | z behaviour | vis/pres |
|---|---|---|---|---|
| Standing still | Stable ~128±20 | Stable ~50–165 | Small magnitude (~±10 at hips) | High (>0.9) |
| Stepping sideways | Uniform shift of all x values | Stable | Minor change | Maintained |
| Raising arm | Wrist/shoulder x shifts | Shoulder y decreases | Shoulder z increases (extends forward) | Stable on torso |
| No person / off-screen | Any | Any | Large/erratic | Low (<0.3) |

---

## Milestone 2C: Skeleton Rendering Validation Specifications

*(Carried forward from previous completed skeleton validation — Milestone 3 scope.)*

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
    *   Left eye path: `[0, 1]`, `[1, 2]`, `[2, 3]`, `[3, 7]` (Nose → Inner → Eye → Outer → Ear)
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

---

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

src/pose/

PoseLandmark.ts

* PoseLandmark interface (per-landmark typed data)
* PoseFrame interface (per-frame collection)
* LANDMARK_COUNT constant (33)

parseLandmarks.ts

* parsePoseLandmarks() — worklet-compatible parser
* sigmoid() — worklet-compatible activation function

src/components/pose/

PoseCamera.tsx

* Camera viewport
* Camera permissions
* TFLite inference execution
* Calls parsePoseLandmarks per frame

SkeletonOverlay.tsx

* Draw body landmarks (Milestone 3)
* Draw skeleton connections (Milestone 3)

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
* Landmark parser is separated from inference execution into `src/pose/` to allow
  future hooks (usePoseTriggers, useRepCounter) to consume PoseFrame without
  depending on camera internals.
* Indices 33–38 (virtual/alignment landmarks) are permanently excluded from
  PoseFrame.landmarks. They carry no anatomical meaning and must not be used
  by any downstream logic.

---

## Current Goal

MILESTONE CHECKPOINT — Milestone 2C Complete + Runtime Coordinate Semantics Verified.

Verification summary:
- 1,200+ inference frames captured on physical Android device
- x/y confirmed as pixel coordinates in [0, 256] (NOT normalized)
- z confirmed as pixel-scale depth units (NOT normalized); range ~[−543, +162]
- visibility confirmed in [0.0, 1.0] via sigmoid conversion ✓
- presence confirmed in [0.0, 1.0] via sigmoid conversion ✓
- poseScore confirmed in [0.0, 1.0] via sigmoid conversion ✓
- 33 landmarks per frame, stable indices, consistent across all poses ✓
- Average inference: ~20ms | Camera: 30+ FPS | Zero dropped frames ✓
- Documentation corrected in PoseLandmark.ts, parseLandmarks.ts, PoseCamera.tsx, AI_CONTEXT.md
- Parser logic unchanged (was correct from the start)

Awaiting:
1. Repository review
2. git commit
3. git tag
4. git push

Do not proceed to Milestone 3 (Skeleton Rendering) until the above steps are confirmed.


---

## Next Milestone: Milestone 3 — Skeleton Rendering

Objectives (NOT yet started):

1. Transfer parsed PoseFrame from the worklet thread to the React JS thread
   using runOnJS or a Reanimated shared value.
2. Implement SkeletonOverlay.tsx to render 33 joint dots and 35 bone lines
   using the coordinate transform pipeline defined above.
3. Validate that the overlay tracks body movements correctly at 30 FPS
   without dropped frames or UI jank.
