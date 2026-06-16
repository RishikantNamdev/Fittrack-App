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
Milestone 2B Complete (Landmark Decoding Validation)

Completed:

* Expo project initialized
* Expo application runs successfully on Android via Expo Go
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

In Progress:

* Preparing for **Milestone 2C: Landmark Parser Implementation**

Not Started:

* Skeleton rendering (Milestone 3)
* Rep counting (Milestone 4)
* Feedback engine (Milestone 5)
* Workout analytics (Milestone 6)
* Local data persistence (Milestone 7)

---

## Milestone 2: Model Execution & Landmark Decoding Specifications

### 1. Validated Tensor Structures

* **Input Tensor:**
  * `input_1` (`float32`, shape `[1, 256, 256, 3]`): Interleaved RGB image resized to 256x256 pixels, values scaled to `[0.0, 1.0]` or standard normalized float range.
* **Output Tensors:**
  * `Identity` (`float32`, shape `[1, 195]`): Pixel-space pose landmarks. 39 landmarks × 5 values (`x`, `y`, `z`, `visibility_logit`, `presence_logit`).
  * `Identity_1` (`float32`, shape `[1, 1]`): Pose presence confidence score logit.
  * `Identity_2` (`float32`, shape `[1, 256, 256, 1]`): Segmentation mask.
  * `Identity_3` (`float32`, shape `[1, 64, 64, 39]`): Heatmap grids.
  * `Identity_4` (`float32`, shape `[1, 117]`): Metric world landmarks. 39 landmarks × 3 values (`x_meters`, `y_meters`, `z_meters`).

### 2. Landmark Topology & Mapping

The model outputs **39 landmarks**. 
* The first **33 landmarks** correspond exactly to the standard **MediaPipe BlazePose topology**:
  * `0`: Nose
  * `11`: Left Shoulder, `12`: Right Shoulder
  * `15`: Left Wrist, `16`: Right Wrist
  * `23`: Left Hip, `24`: Right Hip
  * `25`: Left Knee, `26`: Right Knee
* The remaining **6 landmarks** (indices `33-38`) are supplementary alignment points (e.g. hip/shoulder centers, hand/feet alignment points).

### 3. Coordinate Systems & Semantics

* **Pixel-Space Landmarks (`Identity` / `data0`):**
  * `x`, `y`: Coordinates scaled in pixel range `[0, 256]` corresponding to the input frame bounding box. `y = 0` represents the top of the frame, and `y = 256` represents the bottom.
  * `z`: Relative depth coordinate (same scale as x/y).
  * `visibility_logit`, `presence_logit`: Passed through a standard Sigmoid function `1 / (1 + exp(-logit))` to yield confidence scores in `[0.0, 1.0]`.
* **World Landmarks (`Identity_4` / `data4`):**
  * `x_meters`, `y_meters`, `z_meters`: Real-world coordinates in meters.
  * **Origin:** Midpoint of the left and right hip landmarks.
  * **Directions:** `y` points downwards (negative `y` is above hips, e.g. shoulders/nose), `x` points to the person's left (screen-right), `z` points relative to the hip center.
* **Pose Score (`Identity_1` / `data1`):**
  * Passed through Sigmoid to represent the probability `[0.0, 1.0]` of a human pose being present.

### 4. Inference Performance Metrics

* **Delegate:** GPU Delegate via OpenCL (`TfLiteGpuDelegateV2`) replacing all 332 node operations.
* **Execution Time:** **~21.50ms** average per inference (between 16ms and 32ms), well within the 33.3ms budget for 30 FPS processing.
* **UI Responsiveness:** 100% responsive, frame processing operates completely off the JS main thread in the C++ worklet runtime.

### 5. Lessons Learned & Limitations

* **Worklet Caching:** React Native Worklet runtimes are persisted by the native C++ wrapper. Code updates inside `onFrame` may not load via Metro hot-reload and require a full `adb shell am force-stop` to invalidate the native cache.
* **SDK Compatibility:** Overriding `minSdkVersion = 26` in `android/build.gradle` is strictly required to prevent JNI crashes during hardware buffer allocations inside the resizer module.

---

## Tech Stack

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
