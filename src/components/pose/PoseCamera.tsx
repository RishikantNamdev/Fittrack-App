import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, Button, Linking, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useFrameOutput } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { createResizer } from 'react-native-vision-camera-resizer';
import { NitroModules } from 'react-native-nitro-modules';
import { parsePoseLandmarks } from '../../pose/parseLandmarks';
import type { PoseFrame } from '../../pose/PoseLandmark';

// ---------------------------------------------------------------------------
// Landmark indices logged during validation. Chosen to cover the full body:
//   Nose (face), Shoulders (upper torso), Hips (lower torso), Knees (legs).
// ---------------------------------------------------------------------------
const LOG_INDICES = [0, 11, 12, 23, 24, 25, 26] as const;
const LOG_NAMES: Readonly<Record<number, string>> = {
  0: 'Nose',
  11: 'L.Shoulder',
  12: 'R.Shoulder',
  23: 'L.Hip',
  24: 'R.Hip',
  25: 'L.Knee',
  26: 'R.Knee',
};

interface PoseCameraProps {
  isActive: boolean;
}

export function PoseCamera({ isActive }: PoseCameraProps) {
  const { hasPermission, status, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');

  // Load the BlazePose model (android-gpu delegate for hardware acceleration)
  const model = useTensorflowModel(
    require('../../../assets/pose_landmark_full.tflite'),
    ['android-gpu']
  );
  const actualModel = model.state === 'loaded' ? model.model : undefined;

  // Box the loaded model so it can cross the thread boundary to the worklet runtime
  const boxedModel = useMemo(
    () => (actualModel != null ? NitroModules.box(actualModel) : undefined),
    [actualModel]
  );

  // Initialize the GPU resizer
  const [resizer, setResizer] = useState<any>(null);
  useEffect(() => {
    let active = true;
    async function initResizer() {
      try {
        const r = await createResizer({
          width: 256,
          height: 256,
          channelOrder: 'rgb',
          dataType: 'float32',
          scaleMode: 'cover',
          pixelLayout: 'interleaved',
        });
        if (active) {
          setResizer(r);
          console.log('[TFLite Resizer] GPU Resizer initialized successfully!');
        }
      } catch (e) {
        console.error('[TFLite Resizer] Failed to initialize GPU Resizer:', e);
      }
    }
    initResizer();
    return () => {
      active = false;
      if (resizer != null) {
        resizer.dispose();
      }
    };
  }, []);

  // Box the resizer so it can cross the thread boundary to the worklet runtime
  const boxedResizer = useMemo(
    () => (resizer != null ? NitroModules.box(resizer) : undefined),
    [resizer]
  );

  // Log model tensor shapes once on load
  useEffect(() => {
    if (actualModel != null) {
      console.log('[TFLite Model] Load Success! Model loaded successfully.');
      console.log('[TFLite Model] Input tensor shape:', JSON.stringify(actualModel.inputs));
      console.log('[TFLite Model] Output tensor count:', actualModel.outputs.length);
      console.log('[TFLite Model] Output tensor shapes:', JSON.stringify(actualModel.outputs));
    }
  }, [actualModel]);

  console.log('[PoseCamera] render: hasPermission =', hasPermission, 'status =', status, 'device =', device != null, 'modelState =', model.state, 'resizer =', resizer != null);

  // ---------------------------------------------------------------------------
  // Vision Camera frame processor (worklet thread)
  //
  // Pipeline per frame:
  //   1. GPU-resize camera frame → 256×256 RGB Float32
  //   2. Extract pixel ArrayBuffer
  //   3. Run TFLite inference synchronously (runSync)
  //   4. Wrap raw output buffers in Float32Array views (no data copy)
  //   5. Parse outputs[0] + outputs[1] into a typed PoseFrame
  //   6. Log structured landmark data every 30 frames for validation
  //   7. Dispose GPU frame to release native memory
  //
  // outputs[2] (segmentation mask) and outputs[3] (heatmaps) are not
  // consumed in this milestone and are intentionally left unwrapped.
  // outputs[4] (world landmarks) is reserved for future angle calculations.
  // ---------------------------------------------------------------------------
  const frameOutput = useFrameOutput({
    onFrame(frame) {
      'worklet';

      // Thread-local counters (initialised once per worklet thread lifetime)
      if (global.frameCount === undefined) {
        global.frameCount = 0;
        global.inferenceCount = 0;
        global.totalTime = 0;
      }

      global.frameCount++;

      if (global.frameCount % 30 === 1) {
        console.log(
          `[TFLite Inference] onFrame #${global.frameCount} | ${frame.width}x${frame.height} | model: ${boxedModel != null} | resizer: ${boxedResizer != null}`
        );
      }

      if (boxedModel == null || boxedResizer == null) {
        frame.dispose();
        return;
      }

      try {
        const tflite = boxedModel.unbox();
        const gpuResizer = boxedResizer.unbox();

        const start = Date.now();

        // 1. Resize to 256×256 RGB Float32 (cover-crop, GPU-accelerated)
        const resized = gpuResizer.resize(frame);

        // 2. Extract input pixel buffer
        const inputBuffer = resized.getPixelBuffer();

        // 3. Synchronous inference on the worklet thread
        const outputs = tflite.runSync([inputBuffer]);

        const end = Date.now();
        const duration = end - start;

        global.totalTime += duration;
        global.inferenceCount++;

        // 4. Wrap the required output tensors as Float32Array views (zero-copy)
        //    outputs[0] – Identity    [1, 195]: 39 landmarks × 5 floats
        //    outputs[1] – Identity_1  [1,   1]: pose score logit
        //    outputs[2] – Identity_2  [1, 256, 256, 1] (segmentation) – unused here
        //    outputs[3] – Identity_3  [1,  64,  64, 39] (heatmaps)    – unused here
        //    outputs[4] – Identity_4  [1, 117]: world landmarks         – unused here
        const data0 = new Float32Array(outputs[0]);
        const data1 = new Float32Array(outputs[1]);

        // 5. Parse raw tensor data into a typed PoseFrame (landmarks 0–32 only)
        const poseFrame: PoseFrame = parsePoseLandmarks(data0, data1[0], start);

        // 6. Structured validation log every 30 inferences
        if (global.inferenceCount % 30 === 0) {
          const avg = global.totalTime / global.inferenceCount;
          console.log(
            `[Parser] Inferences: ${global.inferenceCount} | Time: ${duration}ms | Avg: ${avg.toFixed(2)}ms | Score: ${poseFrame.poseScore.toFixed(3)} | Landmarks: ${poseFrame.landmarks.length}`
          );

          console.log('[Parser] Validated landmarks (x/y in [0,256]px input-space | z pixel-scale depth | vis/pres sigmoid):');
          LOG_INDICES.forEach((idx) => {
            const lm = poseFrame.landmarks[idx];
            if (lm != null) {
              console.log(
                `  [${lm.index}] ${LOG_NAMES[idx]}: x=${lm.x.toFixed(3)} y=${lm.y.toFixed(3)} z=${lm.z.toFixed(3)} vis=${lm.visibility.toFixed(3)} pres=${lm.presence.toFixed(3)}`
              );
            }
          });
        }

        // 7. Release GPU frame to avoid native memory leak
        resized.dispose();
      } catch (err: any) {
        console.error('[TFLite Inference] Error during execution:', err.message);
      } finally {
        // Frame MUST always be disposed in useFrameOutput
        frame.dispose();
      }
    },
  });

  // Request camera permission on mount if status is undetermined
  useEffect(() => {
    if (status === 'not-determined') {
      requestPermission();
    }
  }, [status, requestPermission]);

  // Permission denied / not granted UI
  if (!hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>Camera Access Required</Text>
        <Text style={styles.description}>
          Fittrack needs access to your camera to detect pose landmarks and count exercise repetitions.
        </Text>
        {status === 'denied' ? (
          <View style={styles.buttonContainer}>
            <Text style={styles.warningText}>
              Permission was denied. Please enable camera access in system settings to use this feature.
            </Text>
            <Button title="Open Settings" onPress={() => Linking.openSettings()} color="#6366F1" />
          </View>
        ) : (
          <Button title="Grant Permission" onPress={requestPermission} color="#6366F1" />
        )}
      </View>
    );
  }

  // Camera device not found
  if (device == null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={[styles.description, { marginTop: 16 }]}>
          Searching for front camera device...
        </Text>
        <Text style={styles.subtitle}>
          If you are using an emulator, make sure a camera is configured in Virtual Device settings.
        </Text>
      </View>
    );
  }

  // Active camera preview with frame outputs attached
  return (
    <View style={styles.cameraContainer}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        onError={(error) => console.error('VisionCamera Error:', error)}
        outputs={[frameOutput]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#121214',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#c7c7cc',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
});
