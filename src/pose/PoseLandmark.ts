/**
 * Fittrack – Pose Landmark Type Definitions
 *
 * Defines the canonical data model for decoded BlazePose landmarks.
 *
 * BlazePose outputs 39 landmarks in total:
 *   - Indices  0–32: Standard body landmarks (PARSED)
 *   - Indices 33–38: Virtual / alignment landmarks (INTENTIONALLY IGNORED)
 *
 * Coordinate semantics (image-space, from Identity tensor):
 *
 *   RUNTIME-VERIFIED: x and y are pixel coordinates in the 256×256 input frame,
 *   NOT normalized to [0.0, 1.0]. The model outputs raw pixel positions directly.
 *
 *   x – Pixel x-coordinate in [0, 256] within the 256×256 input crop.
 *       0 = left edge, 256 = right edge.
 *       Observed runtime range for body landmarks: approximately [67, 210].
 *   y – Pixel y-coordinate in [0, 256] within the 256×256 input crop.
 *       0 = top edge, 256 = bottom edge.
 *       Observed runtime range for body landmarks: approximately [42, 175].
 *   z – Depth in pixel-scale units, relative to the hip midpoint.
 *       Negative values = landmark is closer to the camera than the hips.
 *       Positive values = landmark is farther from the camera than the hips.
 *       Same unit scale as x/y but can exceed [0, 256] in magnitude.
 *       Observed runtime range: approximately [−543, +162] (outliers from
 *       occluded or ambiguous landmarks can reach extreme values).
 *       Not used for 2-D rendering but preserved for future 3-D / angle work.
 *
 * visibility and presence are sigmoid-converted from raw model logits.
 * Both values lie in [0.0, 1.0]:
 *   visibility – Probability that the landmark is visible (not occluded).
 *   presence   – Probability that the landmark is present in the frame at all.
 */

/** Number of body landmarks parsed per frame (0–32 inclusive). */
export const LANDMARK_COUNT = 33;

/**
 * A single body landmark decoded from the BlazePose Identity output tensor.
 */
export interface PoseLandmark {
  /** Landmark index in [0, 32]. Indices 33–38 are excluded. */
  index: number;

  /**
   * Pixel x-coordinate in the 256×256 input frame.
   * Runtime-verified range: [0, 256]. Observed body landmark range: ~[67, 210].
   */
  x: number;

  /**
   * Pixel y-coordinate in the 256×256 input frame.
   * Runtime-verified range: [0, 256]. Observed body landmark range: ~[42, 175].
   */
  y: number;

  /**
   * Depth in pixel-scale units relative to the hip midpoint.
   * Negative = landmark is closer to the camera than the hips.
   * Positive = landmark is farther from the camera than the hips.
   * Same unit scale as x/y but can exceed ±256 in magnitude.
   * Observed runtime range: approximately [−543, +162].
   */
  z: number;

  /**
   * Visibility probability [0.0, 1.0].
   * Derived from sigmoid(raw_visibility_logit).
   * High values indicate the landmark is not occluded.
   */
  visibility: number;

  /**
   * Presence probability [0.0, 1.0].
   * Derived from sigmoid(raw_presence_logit).
   * High values indicate the landmark is present inside the frame.
   */
  presence: number;
}

/**
 * A complete set of decoded pose landmarks produced from one BlazePose
 * inference frame.
 */
export interface PoseFrame {
  /**
   * Array of exactly LANDMARK_COUNT (33) decoded body landmarks.
   * Indexed as landmarks[i] where i matches PoseLandmark.index.
   */
  landmarks: PoseLandmark[];

  /**
   * Overall pose detection confidence score [0.0, 1.0].
   * Derived from sigmoid(Identity_1 logit).
   * Values below ~0.5 typically indicate no person is detected.
   */
  poseScore: number;

  /**
   * Frame capture timestamp in milliseconds (Date.now() at inference start).
   */
  timestamp: number;
}
