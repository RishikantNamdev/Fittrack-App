import { StatusBar } from 'expo-status-bar';
import { StyleSheet, SafeAreaView } from 'react-native';
import { PoseCamera } from './src/components/pose/PoseCamera';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <PoseCamera isActive={true} />
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
});
