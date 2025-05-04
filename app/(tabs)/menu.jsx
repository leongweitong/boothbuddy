import React from "react";
import { getAuth, signOut } from "firebase/auth";
import { useRouter } from "expo-router";
import {
  StyleSheet,
  View,
  Alert,
  SafeAreaView,
  StatusBar,
  Pressable,
  Text,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";

export default function Home() {
  const router = useRouter();

  const handleLogout = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      try {
        await signOut(auth);
        router.replace("/ResetToRoot");
      } catch (error) {
        Alert.alert("Logout failed", error.message);
      }
    } else {
      router.replace("/ResetToRoot");
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          onPress: handleLogout,
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Pressable style={styles.logoutButton} onPress={confirmLogout}>
        <Text style={styles.logoutText}>Logout</Text>
        <FontAwesome name="sign-out" size={20} color="#5d3fd3" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    paddingTop: StatusBar.currentHeight || 0,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#e6e6fa",
    padding: 12,
    borderRadius: 8,
  },
  logoutText: {
    color: "#5d3fd3",
    fontSize: 16,
    marginRight: 8,
  },
});
