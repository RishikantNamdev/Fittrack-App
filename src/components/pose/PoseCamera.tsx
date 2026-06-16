import React, { useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, Button, Linking, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useFrameOutput } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { createResizer } from 'react-native-vision-camera-resizer';
import { NitroModules } from 'react-native-nitro-modules';

interface PoseCameraProps {
  isActive: boolean;
}

export function PoseCamera({ isActive }: PoseCameraProps) {
  const { hasPermission, status, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');

  // Load the BlazePose model (using android-gpu delegate for hardware acceleration if possible)
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

  // Initialize the resizer plugin state
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

  // Box the resizer plugin so it can cross the thread boundary to the worklet runtime
  const boxedResizer = useMemo(
    () => (resizer != null ? NitroModules.box(resizer) : undefined),
    [resizer]
  );

  // Log model details once loaded
  useEffect(() => {
    if (actualModel != null) {
      console.log('[TFLite Model] Load Success! Model loaded successfully.');
      console.log('[TFLite Model] Input tensor shape:', JSON.stringify(actualModel.inputs));
      console.log('[TFLite Model] Output tensor count:', actualModel.outputs.length);
      console.log('[TFLite Model] Output tensor shapes:', JSON.stringify(actualModel.outputs));
    }
  }, [actualModel]);

  console.log('[PoseCamera] render: hasPermission =', hasPermission, 'status =', status, 'device =', device != null, 'modelState =', model.state, 'resizer =', resizer != null);

  // Set up the Vision Camera frame processor hook
  const frameOutput = useFrameOutput({
    onFrame(frame) {
      'worklet';
      
      // Initialize thread-local statistics on the worklet thread if not done yet
      if (global.frameCount === undefined) {
        global.frameCount = 0;
        global.inferenceCount = 0;
        global.totalTime = 0;
      }

      global.frameCount++;

      if (global.frameCount % 30 === 1) {
        console.log(`[TFLite Inference] onFrame called! Frame: ${global.frameCount} | size: ${frame.width}x${frame.height} | model: ${boxedModel != null} | resizer: ${boxedResizer != null}`);
      }

      if (boxedModel == null || boxedResizer == null) {
        // Model or Resizer is not yet loaded/initialized
        frame.dispose();
        return;
      }

      try {
        const tflite = boxedModel.unbox();
        const gpuResizer = boxedResizer.unbox();

        const start = Date.now();

        // 1. Preprocess and resize frame to 256x256 RGB Float32
        const resized = gpuResizer.resize(frame);

        // 2. Extract input ArrayBuffer from GPUFrame
        const inputBuffer = resized.getPixelBuffer();

        // 3. Execute inference synchronously on the worklet thread
        const outputs = tflite.runSync([inputBuffer]);

        const end = Date.now();
        const duration = end - start;

        global.totalTime += duration;
        global.inferenceCount++;

        // Log inference metrics every 30 inferences
        if (global.inferenceCount % 30 === 0) {
          const avg = global.totalTime / global.inferenceCount;
          console.log(
            `[TFLite Inference] Success | Inferences: ${global.inferenceCount} | Time: ${duration}ms | Avg: ${avg.toFixed(2)}ms | Outputs: ${outputs.length}`
          );
        }

        // 4. Dispose of buffers immediately to avoid memory leaks
        resized.dispose();
      } catch (err: any) {
        console.error('[TFLite Inference] Error during execution:', err.message);
      } finally {
        // Frame must ALWAYS be disposed of in useFrameOutput
        frame.dispose();
      }
    },
  });

  // Automatically request camera permission on mount if it's not determined yet
  useEffect(() => {
    if (status === 'not-determined') {
      requestPermission();
    }
  }, [status, requestPermission]);

  // Handle permission-related UI states
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

  // Handle loading or missing device states
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

  // Render active camera preview with frame outputs attached
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
