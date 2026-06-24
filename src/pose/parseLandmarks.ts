/**
 * Fittrack – BlazePose Landmark Parser
 *
 * Transforms raw BlazePose output tensor data into typed PoseFrame objects.
 *
 * This module is designed to run on the Vision Camera frame processor
 * worklet thread. All exported functions are marked with the 'worklet'
 * directive so the react-native-worklets babel plugin compiles them for
 * the native worklet runtime.
 *
 * Allocation strategy:
 *   - One Float32Array view is created per frame by the caller (O(1), no copy).
 *   - This function allocates one array of 33 small objects per call.
 *   - At 30 FPS this produces ~990 short-lived objects/second, which is
 *     within acceptable limits for the Hermes/V8 garbage collector.
 *   - No large buffers are allocated inside this function.
 *
 * Ignored indices:
 *   BlazePose defines 39 total landmarks. Indices 33–38 are virtual
 *   alignment landmarks with no anatomical meaning. They are never parsed
 *   and will not appear in PoseFrame.landmarks.
 */

import type { PoseLandmark, PoseFrame } from './PoseLandmark';
import { LANDMARK_COUNT } from './PoseLandmark';

/**
 * Number of float values per landmark in the Identity output tensor.
 *
 * Layout per landmark at offset (i * VALUES_PER_LANDMARK):
 *   [0] x               – pixel x-coordinate in [0, 256] of the 256×256 input
 *   [1] y               – pixel y-coordinate in [0, 256] of the 256×256 input
 *   [2] z               – depth in pixel-scale units, relative to hip midpoint
 *   [3] visibility_logit – raw pre-sigmoid visibility logit
 *   [4] presence_logit   – raw pre-sigmoid presence logit
 */
const VALUES_PER_LANDMARK = 5;

/**
 * Applies the sigmoid activation function to a raw logit.
 *
 * sigmoid(x) = 1 / (1 + e^-x)
 *
 * Used to convert raw model output logits for visibility and presence
 * into probability values in [0.0, 1.0].
 *
 * Marked as 'worklet' so it can be called from the frame processor thread.
 *
 * @param logit - Raw logit value from the model output tensor.
 * @returns Probability in [0.0, 1.0].
 */
function sigmoid(logit: number): number {
  'worklet';
  return 1 / (1 + Math.exp(-logit));
}

/**
 * Parses the BlazePose Identity output tensor into a typed PoseFrame.
 *
 * Only landmarks 0–32 are decoded. Indices 33–38 (virtual / alignment
 * landmarks) are intentionally excluded from the output.
 *
 * Identity tensor (outputs[0]) layout – shape [1, 195]:
 *   Total floats: 39 landmarks × 5 values = 195
 *
 *   RUNTIME-VERIFIED: x and y are pixel coordinates in [0, 256], not normalized.
 *   z is in pixel-scale depth units; observed range −543 to +162.
 *
 *   landmark[i].x          = data0[i * 5 + 0]   // pixel x in [0, 256]
 *   landmark[i].y          = data0[i * 5 + 1]   // pixel y in [0, 256]
 *   landmark[i].z          = data0[i * 5 + 2]   // pixel-scale depth
 *   landmark[i].visibility = sigmoid(data0[i * 5 + 3])
 *   landmark[i].presence   = sigmoid(data0[i * 5 + 4])
 *
 * Marked as 'worklet' so it can be called directly on the frame processor
 * thread without requiring a runOnJS bridge hop.
 *
 * @param data0          - Float32Array view of outputs[0] (Identity, 195 floats).
 * @param poseScoreLogit - Raw logit from outputs[1][0] (Identity_1, 1 float).
 * @param timestamp      - Frame capture timestamp in ms (Date.now()).
 * @returns              A PoseFrame with 33 decoded PoseLandmarks and a pose score.
 */
export function parsePoseLandmarks(
  data0: Float32Array,
  poseScoreLogit: number,
  timestamp: number,
): PoseFrame {
  'worklet';

  const landmarks: PoseLandmark[] = [];

  for (let i = 0; i < LANDMARK_COUNT; i++) {
    const offset = i * VALUES_PER_LANDMARK;
    landmarks.push({
      index: i,
      x: data0[offset],
      y: data0[offset + 1],
      z: data0[offset + 2],
      visibility: sigmoid(data0[offset + 3]),
      presence: sigmoid(data0[offset + 4]),
    });
  }

  return {
    landmarks,
    poseScore: sigmoid(poseScoreLogit),
    timestamp,
  };
}
