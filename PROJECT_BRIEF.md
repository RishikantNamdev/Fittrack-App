# Fittrack Project Briefing

## Project Vision

Fittrack is an AI-powered mobile fitness application built with React Native.

The goal of the application is to use the smartphone camera to monitor a user's exercise movements in real time, automatically count repetitions, analyze exercise form, and provide corrective feedback.

The application is designed primarily for users exercising at home without access to a personal trainer.

The long-term goal is to create a personal fitness coach powered by computer vision.

---

# Core User Experience

A user opens the app and selects an exercise.

Examples:

* Squats
* Push-ups
* Lunges
* Jumping Jacks

The user places their phone in front of them and starts exercising.

The app will:

1. Detect the user's body.
2. Track body landmarks in real time.
3. Calculate joint angles.
4. Determine exercise state transitions.
5. Count repetitions automatically.
6. Detect poor form.
7. Display live feedback.
8. Generate a workout summary.

No wearable devices are required.

Only the phone camera is used.

---

# MVP Scope

The initial MVP must remain intentionally small.

Supported Exercises:

* Squats
* Push-ups

Supported Features:

* Real-time pose detection
* Automatic rep counting
* Basic form feedback
* Workout summary

The MVP is intended to validate the core computer vision pipeline before adding advanced features.

---

# Future Features (Not MVP)

These features are planned for future versions and should not be implemented during MVP development.

* Automatic exercise recognition
* Personalized workout plans
* AI fitness coach
* Progress analytics dashboards
* Streak tracking
* Achievement system
* Voice coaching
* Multi-exercise workout sessions

---

# Technology Architecture

## Frontend

Technology:
React Native + Expo

Purpose:

* Cross-platform mobile application
* UI rendering
* Navigation
* User interaction

Reason:

Single codebase for Android and iOS with faster development speed.

---

## Camera Layer

Technology:
react-native-vision-camera

Purpose:

* Access device camera
* Capture frames
* Provide real-time image stream

Reason:

Highest-performance camera solution available for React Native.

---

## Pose Detection Layer

Technology:
MediaPipe BlazePose

Purpose:

* Detect human body landmarks
* Return body joint coordinates

Output:

33 body landmarks per frame.

Examples:

* Shoulder
* Elbow
* Wrist
* Hip
* Knee
* Ankle

Reason:

Fast, accurate, mobile-optimized, and suitable for real-time fitness applications.

---

## Graphics Layer

Technology:
@shopify/react-native-skia

Purpose:

* Draw body skeleton overlays
* Render landmark points
* Render exercise guidance visuals

Reason:

High-performance graphics rendering.

---

## State Management

Technology:
Zustand

Purpose:

* Store workout state
* Store rep counts
* Store feedback messages
* Store active exercise information

Reason:

Simple, lightweight, and easy to maintain.

---

## Local Storage

Technology:
react-native-mmkv

Purpose:

* Persist workout history
* Persist user settings
* Persist statistics

Reason:

Very fast on-device storage.

---

# Rep Counting Architecture

Rep counting is NOT performed using AI.

The workflow is:

Camera
→ MediaPipe
→ Body Landmarks
→ Joint Angles
→ Exercise State Machine
→ Rep Count

Example:

Squat

Standing Position
→ Descending
→ Bottom Position
→ Ascending
→ Standing Position

One complete cycle equals one repetition.

---

# Form Analysis Architecture

Form analysis is based on geometry calculations.

Example:

Squat:

* Knee angle
* Hip angle
* Torso angle

Push-up:

* Elbow angle
* Shoulder angle
* Hip alignment

The app evaluates these measurements and provides feedback.

Examples:

* Go Lower
* Keep Chest Up
* Lower Hips
* Full Extension

---

# Performance Requirements

Critical Rules:

* All processing must happen on-device.
* No server-side video processing.
* No cloud inference.
* Maintain smooth camera performance.
* Avoid unnecessary re-renders.
* Keep business logic separate from UI components.

---

# Development Philosophy

1. Build incrementally.
2. Verify each milestone before moving forward.
3. Do not implement future features prematurely.
4. Simplicity is preferred over complexity.
5. Focus on reliability before optimization.

Development Order:

1. Camera Integration
2. Pose Detection
3. Skeleton Overlay
4. Rep Counting
5. Form Feedback
6. Workout Summary
7. Analytics

Each milestone must be fully functional before proceeding to the next.
