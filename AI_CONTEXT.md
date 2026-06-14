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
Environment Setup Complete

Completed:

* Expo project initialized
* Project folder structure created
* Java 17 installed and configured
* Expo SDK installed
* AI_CONTEXT.md created
* README.md created
* MediaPipe selected as pose engine

Not Started:

* Camera integration
* Pose detection
* Skeleton rendering
* Rep counting
* Feedback engine
* Analytics

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

## Current Goal

Milestone 1:

1. Verify Expo app runs successfully.
2. Integrate camera access.
3. Display live front-camera preview.

Success Criteria:

- App launches on Android device.
- Camera permissions granted.
- Front camera feed visible.

Nothing else should be built until camera integration works reliably.
