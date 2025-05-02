import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { auth } from '@/FirebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'expo-router';

const Index = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // User is already signed in, redirect to main app
        router.replace('/(tabs)');
      }
    });
  
    return unsubscribe; // Clean up the listener on unmount
  }, []);
  

  const signIn = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Signed in as:', userCredential.user.email);
      router.replace('/(tabs)'); // redirect to your main app tab layout
    } catch (error: any) {
      Alert.alert('Sign in failed', error.message);
    }
  };

  const signUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Registered:', userCredential.user.email);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Sign up failed', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Welcome to the App</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={styles.buttonContainer}>
        <Button title="Sign In" onPress={signIn} />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Sign Up" onPress={signUp} color="green" />
      </View>
    </SafeAreaView>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 12,
    marginBottom: 15,
  },
  buttonContainer: {
    marginVertical: 5,
  },
});
