/**
 * Fittrack – Milestone 3A: Skeleton Rendering Foundation
 *
 * Renders 33 body landmark joint dots as circles positioned absolutely
 * over the camera preview.
 *
 * Milestone 3A scope (circles only):
 *   ✓ All 33 landmarks rendered
 *   ✗ Bone / skeleton lines (Milestone 3B)
 *   ✗ Visibility filtering
 *   ✗ Smoothing / interpolation
 *   ✗ Angle calculations
 *
 * Coordinate transform (runtime-verified, Milestone 2C):
 *   BlazePose outputs x/y in [0, 256] pixel-space of the 256×256 input.
 *   To map to screen coordinates within the camera container:
 *
 *     scale    = viewWidth / 256
 *     x_screen = landmark.x * scale
 *     y_screen = landmark.y * scale + (viewHeight − viewWidth) / 2
 *
 *   The y-offset centers the square 256×256 crop inside the taller portrait
 *   camera container. No horizontal mirroring is required because both the
 *   camera preview surface and the frame processor input are already mirrored
 *   by Vision Camera on Android.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import type { PoseLandmark } from '../../pose/PoseLandmark';

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------

/** Radius of each landmark joint circle in screen pixels. */
const JOINT_RADIUS = 5;
const JOINT_DIAMETER = JOINT_RADIUS * 2;

/** Emerald green fill (AI_CONTEXT Milestone 2C spec). */
const JOINT_COLOR = '#10B981';

const JOINT_BORDER_COLOR = '#ffffff';
const JOINT_BORDER_WIDTH = 1.5;

// ---------------------------------------------------------------------------
// Bone Connections & Helper for Temporary Diagnostic Visualization
// ---------------------------------------------------------------------------
const BONE_CONNECTIONS = [
  // Face
  [0, 2], // nose ↔ left eye
  [0, 5], // nose ↔ right eye
  [2, 7], // left eye ↔ left ear
  [5, 8], // right eye ↔ right ear

  // Torso
  [11, 12], // left shoulder ↔ right shoulder
  [11, 23], // left shoulder ↔ left hip
  [12, 24], // right shoulder ↔ right hip
  [23, 24], // left hip ↔ right hip

  // Left arm
  [11, 13], // shoulder → elbow
  [13, 15], // elbow → wrist
  [15, 19], // wrist → index
  [15, 17], // wrist → pinky
  [15, 21], // wrist → thumb

  // Right arm
  [12, 14], // shoulder → elbow
  [14, 16], // elbow → wrist
  [16, 20], // wrist → index
  [16, 18], // wrist → pinky
  [16, 22], // wrist → thumb

  // Left leg
  [23, 25], // hip → knee
  [25, 27], // knee → ankle
  [27, 29], // ankle → heel
  [29, 31], // heel → foot index

  // Right leg
  [24, 26], // hip → knee
  [26, 28], // knee → ankle
  [28, 30], // ankle → heel
  [30, 32], // heel → foot index
];

function renderBone(
  key: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness = 1.5,
  color = '#4F46E5' // Indigo
) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  return (
    <View
      key={key}
      style={{
        position: 'absolute',
        left: cx - length / 2,
        top: cy - thickness / 2,
        width: length,
        height: thickness,
        backgroundColor: color,
        transform: [{ rotate: `${angle}rad` }],
      }}
      pointerEvents="none"
    />
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkeletonOverlayProps {
  /**
   * Parsed pose landmarks from PoseFrame.
   * Expected: 33 landmarks with indices 0–32.
   * Indices 33–38 must not appear here (excluded by parsePoseLandmarks).
   */
  landmarks: PoseLandmark[];

  /**
   * Rendered width of the camera container in screen pixels.
   * Measured via the container's onLayout event.
   */
  viewWidth: number;

  /**
   * Rendered height of the camera container in screen pixels.
   * Measured via the container's onLayout event.
   */
  viewHeight: number;

  /** Camera frame width (native, landscape). */
  frameWidth: number;

  /** Camera frame height (native, landscape). */
  frameHeight: number;

  /** Whether using front camera. */
  isFrontCamera: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders 33 body landmark joint dots over the camera preview.
 *
 * Wrapped with React.memo so the component only re-renders when the
 * landmarks prop reference changes (i.e., every inference frame that
 * produces new data).
 */
export const SkeletonOverlay = React.memo(function SkeletonOverlay({
  landmarks,
  viewWidth,
  viewHeight,
  frameWidth,
  frameHeight,
  isFrontCamera,
}: SkeletonOverlayProps) {
  // Wait until the container has been measured and landmarks are available
  if (landmarks.length === 0 || viewWidth === 0 || viewHeight === 0 || frameWidth === 0 || frameHeight === 0) {
    return null;
  }

  // Calculate geometry values for contain-mode camera preview
  const effectiveFrameWidth = Math.min(frameWidth, frameHeight);
  const effectiveFrameHeight = Math.max(frameWidth, frameHeight);
  const viewRatio = viewWidth / viewHeight;
  const frameRatio = effectiveFrameWidth / effectiveFrameHeight;

  let previewWidth = viewWidth;
  let previewHeight = viewHeight;
  let previewLeftOffset = 0;
  let previewTopOffset = 0;

  if (viewRatio < frameRatio) {
    // In contain mode, if the view ratio is narrower than the frame ratio,
    // the preview fits the container width, and the height scales down.
    previewWidth = viewWidth;
    previewHeight = viewWidth / frameRatio;
    previewTopOffset = (viewHeight - previewHeight) / 2;
  } else {
    // If the view ratio is wider, the preview fits the container height,
    // and the width scales down.
    previewHeight = viewHeight;
    previewWidth = viewHeight * frameRatio;
    previewLeftOffset = (viewWidth - previewWidth) / 2;
  }

  // Debug log every 1000ms
  const lastLogRef = React.useRef(0);
  const now = Date.now();

  // contain-mode parameters: 9:16 frame scaled into 256x256 results in a 144x256 region
  // with 56px horizontal pillarbox padding on both the left and right.
  const scale = previewHeight / 256;
  const leftPadding = 56;
  const effectiveModelWidth = 144;
  const cropYOffset = 0; // contain-mode spans the full height, so no vertical crop exists

  if (now - lastLogRef.current > 1000) {
    lastLogRef.current = now;

    const nose = landmarks[0];
    if (nose) {
      const noseXScreen = (nose.x - leftPadding) * scale + previewLeftOffset;
      const noseYScreen = nose.y * scale + previewTopOffset;
      const finalXScreen = isFrontCamera ? (viewWidth - noseXScreen) : noseXScreen;
      const finalYScreen = noseYScreen;
      const finalRenderedLeft = finalXScreen - JOINT_RADIUS;
      const finalRenderedTop = finalYScreen - JOINT_RADIUS;

      console.log('=== END-TO-END NOSE PROJECTION VERIFICATION ===');
      console.log(`Camera Frame: ${frameWidth}x${frameHeight}`);
      console.log(`Resizer Output: 256x256`);
      console.log(`Raw outputs[0] nose (same as parsed): x=${nose.x.toFixed(5)}, y=${nose.y.toFixed(5)}, z=${nose.z.toFixed(5)}, vis=${nose.visibility.toFixed(5)}, pres=${nose.presence.toFixed(5)}`);
      console.log(`Parsed Landmark nose: x=${nose.x.toFixed(5)}, y=${nose.y.toFixed(5)}, z=${nose.z.toFixed(5)}, vis=${nose.visibility.toFixed(5)}, pres=${nose.presence.toFixed(5)}`);
      console.log('Screen Coordinate Calculation:');
      console.log(`  raw x: ${nose.x.toFixed(5)}`);
      console.log(`  raw y: ${nose.y.toFixed(5)}`);
      console.log(`  parsed x: ${nose.x.toFixed(5)}`);
      console.log(`  parsed y: ${nose.y.toFixed(5)}`);
      console.log(`  scale: ${scale.toFixed(5)}`);
      console.log(`  previewWidth: ${previewWidth.toFixed(5)}`);
      console.log(`  previewHeight: ${previewHeight.toFixed(5)}`);
      console.log(`  previewTopOffset: ${previewTopOffset.toFixed(5)}`);
      console.log(`  previewLeftOffset: ${previewLeftOffset.toFixed(5)}`);
      console.log(`  xOffset (previewLeftOffset): ${previewLeftOffset.toFixed(5)}`);
      console.log(`  yOffset (previewTopOffset): ${previewTopOffset.toFixed(5)}`);
      console.log(`  leftPadding: ${leftPadding}`);
      console.log(`  mirror calculation (isFrontCamera = ${isFrontCamera}): isFrontCamera ? (viewWidth - noseXScreen) : noseXScreen`);
      console.log(`  final xScreen (pre-mirroring): ${noseXScreen.toFixed(5)}`);
      console.log(`  final yScreen: ${noseYScreen.toFixed(5)}`);
      console.log(`  final rendered left: ${finalRenderedLeft.toFixed(5)}`);
      console.log(`  final rendered top: ${finalRenderedTop.toFixed(5)}`);
      console.log('================================================');
    }
  }

  // Pre-calculate transformed screen-space coordinates for lookup
  const coords = landmarks.reduce((acc, lm) => {
    const xScreen = (lm.x - leftPadding) * scale + previewLeftOffset;
    const yScreen = lm.y * scale + previewTopOffset;
    const xFinal = isFrontCamera ? (viewWidth - xScreen) : xScreen;
    acc[lm.index] = { x: xFinal, y: yScreen };
    return acc;
  }, {} as Record<number, { x: number; y: number }>);

  return (
    <View style={[StyleSheet.absoluteFill, { borderColor: 'blue', borderWidth: 2 }]} pointerEvents="none">
      {/* Draw temporary diagnostic bone connections first (below joints) */}
      {BONE_CONNECTIONS.map(([idx1, idx2]) => {
        const p1 = coords[idx1];
        const p2 = coords[idx2];
        if (p1 && p2) {
          return renderBone(`bone-${idx1}-${idx2}`, p1.x, p1.y, p2.x, p2.y);
        }
        return null;
      })}

      {/* Draw landmark joint dots */}
      {landmarks.map((lm) => {
        const p = coords[lm.index];
        if (!p) return null;
        return (
          <View
            key={lm.index}
            style={[
              styles.joint,
              {
                left: p.x - JOINT_RADIUS,
                top: p.y - JOINT_RADIUS,
              },
            ]}
          />
        );
      })}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  joint: {
    position: 'absolute',
    width: JOINT_DIAMETER,
    height: JOINT_DIAMETER,
    borderRadius: JOINT_RADIUS,
    backgroundColor: JOINT_COLOR,
    borderWidth: JOINT_BORDER_WIDTH,
    borderColor: JOINT_BORDER_COLOR,
  },
});
