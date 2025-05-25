import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert, SafeAreaView, Text, Image } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../FirebaseConfig';
import { useRouter } from 'expo-router';
import { Link } from 'expo-router';

const APPICON = require('../../assets/images/small_splash.png');

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const signUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save custom user data to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        username,
        email,
        userType: 'visitor',
        createdAt: new Date(),
        user_uid: user.uid
      });

      Alert.alert('Congratulations on your successful registration');

      router.replace('/');
    } catch (error: any) {
      Alert.alert('Sign up failed', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.iconContainer}>
            <Image source={APPICON} style={styles.icon} />
        </View>

        <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        />

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
        <Button title="Register" onPress={signUp} color="#5d3fd3" />
        </View>

        <Link href={{ pathname: '/' }} asChild>
        <Text style={{ color: '#5d3fd3', marginTop: 20, textAlign: 'center' }}>
        Go to signIn
        </Text>
        </Link>
    </SafeAreaView>
  );
};

export default Register;

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
