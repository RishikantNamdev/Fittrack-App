import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Button, Linking, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

interface PoseCameraProps {
  isActive: boolean;
}

export function PoseCamera({ isActive }: PoseCameraProps) {
  const { hasPermission, status, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');

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

  // Render active camera preview
  return (
    <View style={styles.cameraContainer}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        onError={(error) => console.error('VisionCamera Error:', error)}
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
