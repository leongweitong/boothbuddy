import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '@/FirebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Swiper from 'react-native-swiper';

const { width: screenWidth } = Dimensions.get('window');

export default function BoothDetail() {
  const { booth } = useLocalSearchParams();
  const router = useRouter();
  const boothData = JSON.parse(booth);

  const [pictures, setPictures] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPictures = async () => {
      try {
        const picQuery = query(collection(db, 'pictures'), where('belong_id', '==', boothData.id));
        const snapshot = await getDocs(picQuery);
        const pictureList = snapshot.docs.map(doc => doc.data());
        setPictures(pictureList);
      } catch (error) {
        console.error('Error fetching booth pictures:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPictures();
  }, [boothData.id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5d3fd3" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
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

      {/* Booth Info */}
      <View style={styles.boothInfo}>
        <Text style={styles.boothName}>{boothData.booth_name}</Text>
        <Text style={styles.infoText}>📝 {boothData.description}</Text>
        <Text style={styles.infoText}>🗺️ Coordinate: {boothData.coordinate?.x}, {boothData.coordinate?.y}</Text>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => Alert.alert("Navigate", "Navigation function coming soon.")}
        >
          <Text style={styles.buttonText}>Navigate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#34a853' }]}
          onPress={() => Alert.alert("Visit", "Visit function coming soon.")}
        >
          <Text style={styles.buttonText}>Visit</Text>
        </TouchableOpacity>
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
    resizeMode: 'cover',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#5d3fd3',
  },
  boothInfo: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    marginTop: 10,
    borderRadius: 8,
  },
  boothName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    backgroundColor: '#5d3fd3',
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
