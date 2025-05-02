import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { db } from '@/FirebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useLocalSearchParams } from 'expo-router';

export default function BoothScreen() {
  const { event_id } = useLocalSearchParams();
  const [booths, setBooths] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooths = async () => {
      try {
        const boothsRef = collection(db, 'booths');
        const q = query(boothsRef, where('event_id', '==', event_id));
        const snapshot = await getDocs(q);
        const boothsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log(boothsData)
        setBooths(boothsData);
      } catch (error) {
        console.error('Error fetching booths:', error);
      } finally {
        setLoading(false);
      }
    };
  
    if (event_id) {
      fetchBooths();
    }
  }, [event_id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Booths for Event ID: {event_id}</Text>
      <FlatList
        data={booths}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.boothName}>{item.booth_name}</Text>
            <Text>Map: {item.coordinate.x}, {item.coordinate.y}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  card: {
    padding: 10,
    backgroundColor: '#eee',
    marginBottom: 10,
    borderRadius: 8,
  },
  boothName: {
    fontSize: 16,
    fontWeight: '600',
  },
});
