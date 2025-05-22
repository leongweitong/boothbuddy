import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, StatusBar, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { db, auth } from '@/FirebaseConfig';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { TouchableOpacity } from 'react-native';

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
        console.log(eventsData)
        setEvents(eventsData);
  
        // 2. Get current user
        const currentUser = auth.currentUser;
        console.log(currentUser.uid)
        if (currentUser) {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setUserData(userDocSnap.data());
            console.log('User data:', userDocSnap.data());
          } else {
            console.log('No such user document!');
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
      <SafeAreaView style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#5d3fd3" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {userData && (
        <Text style={{ fontSize: 20, marginBottom: 10, color: "#5d3fd3", paddingHorizontal: 16 }}>
          Welcome, {userData.username}
        </Text>
      )}
      <Text style={styles.title}>Event List</Text>
      <FlatList
        style={{paddingHorizontal: 16, paddingVertical: 8}}
        data={events}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
            <Link
                href={{
                pathname: '/pages/eventDetails',
                params: { event_id: item.id },
                }}
                asChild
            >
                <TouchableOpacity style={styles.card}>
                    <Text style={styles.eventName}>{item.event_name}</Text>
                    <Text>{item.location}</Text>
                    <Text>{item.event_time.toDate().toLocaleString()}</Text>
                    {/* <Text>{item.event_time.toDate().toDateString()}</Text> */}
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
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16
  },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    // borderWidth: 1,
    // borderColor: '#5d3fd3',
    // iOS shadow properties
    shadowColor: '#5d3fd3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    // Android shadow property
    elevation: 6,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '600',
  },
});
