import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import axios from 'axios';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [prediction, setPrediction] = useState('');
  const [sentence, setSentence] = useState('');
  const [lastLetter, setLastLetter] = useState('');
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRunning) {
      interval = setInterval(async () => {
        await captureAndPredict();
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, lastLetter, count]);

  const captureAndPredict = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        shutterSound: false
      });

      const formData = new FormData();
      const fileData: any = {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'hand.jpg'
      };
      formData.append('file', fileData);

      // const response = await axios.post(API_URL, formData, {
      //   headers: { 'Content-Type': 'multipart/form-data' }
      // });

      // const letter = response.data.prediction;
      // if (!letter) return;

      // setPrediction(letter);

      // if (letter === lastLetter) {
      //   const newCount = count + 1;
      //   setCount(newCount);
      //   if (newCount >= 3) {
      //     setSentence(prev => prev + letter);
      //     setCount(0);
      //   }
      // } else {
      //   setLastLetter(letter);
      //   setCount(0);
      // }
    } catch (err:any) {
      console.log('Error:', err.message);
    }
  };

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission chahiye</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} />
      <View style={styles.overlay}>
        <Text style={styles.letter}>{prediction || '...'}</Text>
        <Text style={styles.sentence}>{sentence || 'Sentence yahan aayega'}</Text>
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, isRunning && styles.buttonRed]}
            onPress={() => setIsRunning(!isRunning)}>
            <Text style={styles.buttonText}>
              {isRunning ? 'Stop' : 'Start'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setSentence('')}>
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute', bottom: 0,
    width: '100%', padding: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center'
  },
  letter: { fontSize: 80, color: '#fff', fontWeight: 'bold' },
  sentence: { fontSize: 20, color: '#fff', marginTop: 8, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  button: { backgroundColor: '#6366f1', padding: 12, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  buttonRed: { backgroundColor: '#ef4444' },
  buttonText: { color: '#fff', fontSize: 16 },
  text: { color: '#fff', fontSize: 18 }
});