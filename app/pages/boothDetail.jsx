import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db, auth } from '@/FirebaseConfig';
import { collection, query, where, doc, getDocs, getDoc, addDoc } from 'firebase/firestore';
import Swiper from 'react-native-swiper';

const { width: screenWidth } = Dimensions.get('window');

export default function BoothDetail() {
  const { booth, event } = useLocalSearchParams();
  const router = useRouter();
  const boothData = JSON.parse(booth);

  const [pictures, setPictures] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);

  useEffect(() => {
    const fetchPicturesAndUser = async () => {
      try {
        const picQuery = query(collection(db, 'pictures'), where('belong_id', '==', boothData.id));
        const snapshot = await getDocs(picQuery);
        const pictureList = snapshot.docs.map(doc => doc.data());
        setPictures(pictureList);

        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserType(userData.userType);

            if (userData.userType === 'judge') {
              // Check if user has any evaluation for this booth
              const evalQuery = query(
                collection(db, 'evaluations'),
                where('boothId', '==', boothData.id),
                where('userId', '==', currentUser.uid)
              );
              const evalSnap = await getDocs(evalQuery);
              
              // Check if already submitted
              const submitted = evalSnap.docs.some(doc => doc.data().status === 'submitted');
              if (submitted) setHasSubmitted(true);
            }

            if (userData.userType === 'visitor') {
              const attendQuery = query(
                collection(db, 'attends'),
                where('booth_id', '==', boothData.id),
                where('user_id', '==', currentUser.uid)
              );
              const attendSnap = await getDocs(attendQuery);
              if (!attendSnap.empty) setHasVisited(true);
            }
          }
        }

      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPicturesAndUser();
  }, [boothData.id]);

  const handleVisit = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const newAttend = {
        booth_id: boothData.id,
        user_id: currentUser.uid,
        timestamp: new Date().toISOString(),
      };

      await addDoc(collection(db, 'attends'), newAttend);
      Alert.alert('Success', 'You have visited this booth!');
      setHasVisited(true);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to record visit.');
    }
  };

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
          onPress={() => router.replace({ pathname: '/pages/indoorNavigation', params: { booth, event } })}
        >
          <Text style={styles.buttonText}>Navigate</Text>
        </TouchableOpacity>

        {userType === 'visitor' && !hasVisited && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#34a853' }]}
            onPress={handleVisit}
          >
            <Text style={styles.buttonText}>Visit</Text>
          </TouchableOpacity>
        )}

        {userType === 'judge' && !hasSubmitted && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace({ pathname: '/pages/evaluate', params: { booth } })}
          >
            <Text style={styles.buttonText}>Evaluate</Text>
          </TouchableOpacity>
        )}
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
