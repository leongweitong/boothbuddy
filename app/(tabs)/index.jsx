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
  const [noData, setNoData] = useState(false);

  useEffect(() => {
    const fetchEventsAndUser = async () => {
      try {
        const currentUser = auth.currentUser;

        if (!currentUser) return;

        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          console.log('No such user document!');
          return;
        }

        const userData = userDocSnap.data();
        setUserData(userData);

        const now = new Date();

        let eventsData = [];

        if (userData.userType === 'visitor') {
          const querySnapshot = await getDocs(collection(db, 'events'));
          eventsData = querySnapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter(event => {
              console.log(event.event_time.toDate() >= now)
              return event.event_time.toDate() >= now
            })
            .sort((a, b) => a.event_time.toDate() - b.event_time.toDate());
        } else if (userData.userType === 'judge') {
          // Step 1: Fetch assign_event documents where user_id matches
          const assignEventSnapshot = await getDocs(collection(db, 'assign_event'));
          const assignedEventIds = assignEventSnapshot.docs
            .map(doc => doc.data())
            .filter(item => item.user_id === currentUser.uid)
            .map(item => item.event_id);

          if (assignedEventIds.length === 0) {
            console.log('Judge has no assigned events');
          } else {
            // Step 2: Fetch each assigned event
            const assignedEventPromises = assignedEventIds.map(eventId =>
              getDoc(doc(db, 'events', eventId))
            );
            const assignedEventSnapshots = await Promise.all(assignedEventPromises);

            // Step 3: Extract and filter upcoming events
            eventsData = assignedEventSnapshots
              .filter(snap => snap.exists())
              .map(snap => ({
                id: snap.id,
                ...snap.data(),
              }))
              .filter(event => event.event_time.toDate() >= now)
              .sort((a, b) => a.event_time.toDate() - b.event_time.toDate());
          }
        }

        if(eventsData.length > 0)setEvents(eventsData);
        else setNoData(true)
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
      <SafeAreaView style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white'}}>
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
      {events.length > 0 && (
        <FlatList
          style={{paddingHorizontal: 16, paddingVertical: 8}}
          data={events}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
              <Link
                  href={{
                  pathname: '/pages/eventDetails',
                  params: { event: JSON.stringify(item)},
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
      )}

      {noData && (
        <View styles={styles.card}>
          <Text style={styles.noData}>That is no any events</Text>
        </View>
      )}
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
  noData: {
    textAlign: 'center',
    color: 'black',
    padding: 16, 
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
