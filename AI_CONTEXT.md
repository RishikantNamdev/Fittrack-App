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

In Progress:

Camera integration

Not Started:

* Camera preview verification
* Pose detection
* Skeleton rendering
* Rep counting
* Feedback engine
* Workout analytics
* Local data persistence

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

Milestone 1: Camera Verification

Objectives:

1. Request camera permissions.
2. Display live front-camera preview.
3. Verify Vision Camera works with the current Expo setup.

Success Criteria:

* App launches on Android device.
* Camera permission prompt appears.
* Camera permission can be granted.
* Front camera preview is visible.
* No crashes related to Vision Camera.

Out of Scope:

* MediaPipe
* Skia
* Pose detection
* Rep counting
* Exercise tracking
* Analytics

Nothing else should be built until camera functionality is verified.
