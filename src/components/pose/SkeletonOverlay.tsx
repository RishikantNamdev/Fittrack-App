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

  // Calculate geometry values
  const effectiveFrameWidth = Math.min(frameWidth, frameHeight);
  const effectiveFrameHeight = Math.max(frameWidth, frameHeight);
  const viewRatio = viewWidth / viewHeight;
  const frameRatio = effectiveFrameWidth / effectiveFrameHeight;

  let previewWidth = viewWidth;
  let previewHeight = viewHeight;
  let xOffset = 0;
  let yOffset = 0;

  if (viewRatio < frameRatio) {
    previewHeight = viewHeight;
    previewWidth = viewHeight * frameRatio;
    xOffset = (viewWidth - previewWidth) / 2;
  } else {
    previewWidth = viewWidth;
    previewHeight = viewWidth / frameRatio;
    yOffset = (viewHeight - previewHeight) / 2;
  }

  // Debug log every 1000ms
  const lastLogRef = React.useRef(0);
  const now = Date.now();
  const scale = previewWidth / 256;
  const cropYOffset = (previewHeight - previewWidth) / 2;

  if (now - lastLogRef.current > 1000) {
    lastLogRef.current = now;
    console.log('[GEOMETRY DEBUG] details:', JSON.stringify({
      frameWidth,
      frameHeight,
      viewWidth,
      viewHeight,
      effectiveFrameWidth,
      effectiveFrameHeight,
      previewWidth,
      previewHeight,
      xOffset,
      yOffset,
      isFrontCamera,
      scale,
      cropYOffset,
    }, null, 2));

    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    if (nose && leftShoulder && rightShoulder) {
      const noseXScreen = nose.x * scale + xOffset;
      const noseYScreen = nose.y * scale + cropYOffset + yOffset;
      const leftShXScreen = leftShoulder.x * scale + xOffset;
      const leftShYScreen = leftShoulder.y * scale + cropYOffset + yOffset;
      const rightShXScreen = rightShoulder.x * scale + xOffset;
      const rightShYScreen = rightShoulder.y * scale + cropYOffset + yOffset;

      console.log('[GEOMETRY DEBUG] transformed coordinates:', JSON.stringify({
        nose: {
          x_model: nose.x,
          y_model: nose.y,
          x_screen: noseXScreen,
          y_screen: noseYScreen,
          left_position: isFrontCamera ? (viewWidth - noseXScreen) : noseXScreen,
        },
        leftShoulder: {
          x_model: leftShoulder.x,
          y_model: leftShoulder.y,
          x_screen: leftShXScreen,
          y_screen: leftShYScreen,
          left_position: isFrontCamera ? (viewWidth - leftShXScreen) : leftShXScreen,
        },
        rightShoulder: {
          x_model: rightShoulder.x,
          y_model: rightShoulder.y,
          x_screen: rightShXScreen,
          y_screen: rightShYScreen,
          left_position: isFrontCamera ? (viewWidth - rightShXScreen) : rightShXScreen,
        }
      }, null, 2));
    }
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {landmarks.map((lm) => {
        const xScreen = lm.x * scale + xOffset;
        const yScreen = lm.y * scale + cropYOffset + yOffset;
        const leftPosition = isFrontCamera ? (viewWidth - xScreen) : xScreen;

        return (
          <View
            key={lm.index}
            style={[
              styles.joint,
              {
                // Center the circle on the landmark position
                left: leftPosition - JOINT_RADIUS,
                top: yScreen - JOINT_RADIUS,
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
