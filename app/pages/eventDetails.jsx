import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Image, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { db } from 'FirebaseConfig';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
// import Carousel, { Pagination } from 'react-native-snap-carousel';
import Swiper from 'react-native-swiper';

const { width: screenWidth } = Dimensions.get('window');

export default function eventDetails() {
  const { event: eventString } = useLocalSearchParams();
  const event = JSON.parse(eventString);
  const router = useRouter();

  const [booths, setBooths] = useState([]);
  const [pictures, setPictures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const picturesRef = collection(db, 'pictures');
        const picQuery = query(picturesRef, where('belong_id', '==', event.id));
        const picSnapshot = await getDocs(picQuery);
        const picturesData = picSnapshot.docs.map(doc => doc.data());
        setPictures(picturesData);

        const boothsRef = collection(db, 'booths');
        const boothQuery = query(boothsRef, where('event_id', '==', event.id));
        const boothSnapshot = await getDocs(boothQuery);
        const boothsData = boothSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBooths(boothsData);
      } catch (error) {
        console.error('Error loading event details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5d3fd3" />
      </View>
    );
  }

  return (
    <ScrollView>
      {/* Image Carousel */}
      {pictures.length > 0 && (
      <View style={{ height: 250 }}>
        <Swiper
          // autoplay
          showsPagination={true}
          dotColor="lightgray"
          activeDotColor="#5d3fd3"
          loop
        >
          {pictures.map((item, index) => (
            <Image
              key={index}
              source={{ uri: item.picture_path }}
              style={{
                width: screenWidth,
                height: 250,
                resizeMode: 'cover',
              }}
            />
          ))}
        </Swiper>
      </View>
    )}

      {/* Event Info */}
      {event && (
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event.event_name}</Text>
          <View style={styles.card}>
            <Text style={styles.eventText}>📍 {event.location}</Text>
            <Text style={styles.eventText}>🕒 {new Date(event.event_time.seconds * 1000).toLocaleString()}</Text>
            <Text style={styles.eventText}>📝 {event.description}</Text>
          </View>
          {/* <Text style={styles.eventText}>🗺️ Floor plan:</Text>
          <Image
            source={{ uri: event.floor_plan }}
            style={styles.floorPlan}
            resizeMode="contain"
          /> */}
        </View>
      )}

      {/* Booth List */}
      <View style={styles.boothContainer}>
        <Text style={styles.sectionTitle}>Booths</Text>
        <FlatList
          data={booths}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({
                pathname: '/pages/boothDetail',
                params: {
                  booth: JSON.stringify(item),
                  event: JSON.stringify(event)
                }
              })}
            >
              <Text style={styles.boothName}>{item.booth_name}</Text>
              <Text>Map: {item.coordinate?.x}, {item.coordinate?.y}</Text>
            </TouchableOpacity>
          )}
          scrollEnabled={false}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: {
    width: screenWidth,
    height: 250,
    alignSelf: 'center',
    resizeMode: "cover"
  },
  eventInfo: {
    marginBottom: 20,
    paddingHorizontal: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center'
  },
  eventText: {
    fontSize: 14,
    marginBottom: 4,
  },
  floorPlan: {
    height: 200,
    width: '100%',
    borderRadius: 6,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center'
  },
  boothContainer: {
    paddingHorizontal: 12,
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
  boothName: {
    fontSize: 16,
    fontWeight: '600',
  },
});
