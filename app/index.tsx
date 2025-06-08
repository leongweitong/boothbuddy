import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert, Image, SafeAreaView, Text } from 'react-native';
import { db, auth } from '../FirebaseConfig';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { Link } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';

const APPICON = require('../assets/images/small_splash.png');

const Index = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  // router.replace('/(tabs)');

  const signIn = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user's role from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const role = userData.userType;

        if (role === 'admin') {
          // Sign out admin users
          await signOut(auth);
          Alert.alert('Access Denied', 'Admin users are not allowed to sign in.');
          return;
        }

        if(!userData.status) {
          await signOut(auth);
          Alert.alert('Access Denied', 'You account have been diable, call admin.');
          return;
        }

        // Proceed to app for allowed roles
        console.log('Signed in as:', user.email, 'Role:', role);
        router.replace('/(tabs)');
      } else {
        // User document not found
        await signOut(auth);
        Alert.alert('Error', 'User profile not found.');
      }
    } catch (error: any) {
      Alert.alert('Sign in failed', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.iconContainer}>
        <Image source={APPICON} style={styles.icon} />
      </View>

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
        <Button title="Sign In" onPress={signIn} color="#5d3fd3" />
      </View>

      <Link href={{ pathname: '/pages/register' }} asChild>
        <Text style={{ color: '#5d3fd3', marginTop: 20, textAlign: 'center' }}>
          Haven't have an account?
        </Text>
      </Link>
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
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
