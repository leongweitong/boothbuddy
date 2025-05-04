import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, StatusBar, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { db } from '@/FirebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { TouchableOpacity } from 'react-native';
import { auth } from '@/FirebaseConfig';
import { getDoc, doc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEventsAndUser = async () => {
      try {
        // 1. Get events
        const querySnapshot = await getDocs(collection(db, 'events'));
        const eventsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEvents(eventsData);
  
        // 2. Get current user
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
            console.log('User data:', userDoc.data());
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchEventsAndUser();
  }, []);  

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {userData && (
        <Text style={{ fontSize: 16, marginBottom: 10 }}>
          Welcome, {userData.username}
        </Text>
      )}
      <Text style={styles.title}>Event List</Text>
      <FlatList
        data={events}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
            <Link
                href={{
                pathname: '/pages/booth',
                params: { event_id: item.id },
                }}
                asChild
            >
                <TouchableOpacity style={styles.card}>
                    <Text style={styles.eventName}>{item.event_name}</Text>
                    <Text>{item.location}</Text>
                </TouchableOpacity>
            </Link>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#f2f2f2',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '600',
  },
});
