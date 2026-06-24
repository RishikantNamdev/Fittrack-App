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
import { StyleSheet, View } from 'react-native';
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
   * Used to compute the coordinate scale factor: scale = viewWidth / 256.
   */
  viewWidth: number;

  /**
   * Rendered height of the camera container in screen pixels.
   * Measured via the container's onLayout event.
   * Used to compute the vertical crop offset:
   *   yOffset = (viewHeight - viewWidth) / 2
   */
  viewHeight: number;
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
}: SkeletonOverlayProps) {
  // Wait until the container has been measured and landmarks are available
  if (landmarks.length === 0 || viewWidth === 0 || viewHeight === 0) {
    return null;
  }

  // Coordinate transform: BlazePose [0,256] → screen pixels
  const scale = viewWidth / 256;
  const yOffset = (viewHeight - viewWidth) / 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {landmarks.map((lm) => (
        <View
          key={lm.index}
          style={[
            styles.joint,
            {
              // Center the circle on the landmark position
              left: lm.x * scale - JOINT_RADIUS,
              top: lm.y * scale + yOffset - JOINT_RADIUS,
            },
          ]}
        />
      ))}
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
