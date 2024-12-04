import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Mapbox, { MapView, UserLocation, Camera, LocationPuck } from '@rnmapbox/maps';
import * as Location from "expo-location";

// Set your Mapbox access token
Mapbox.setAccessToken('pk.eyJ1Ijoid2VpdG9uZzA3MjQiLCJhIjoiY20yeWNiazQ0MDAyeTJqczY4bTl3bHh3YyJ9.67Ph1C9lW2_fJUmVZ-lduQ');

export default function HomeScreen() {
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

  useEffect(() => {
    (async () => {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setLocationPermissionGranted(true);
      } else {
        console.log("Permission to access location was denied");
      }
    })();
  }, []);

  if (!locationPermissionGranted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Location permission is required to use this feature.</Text>
      </View>
    );
  }

  return (
    <MapView style={styles.map} styleURL="mapbox://styles/mapbox/streets-v11">
      <Camera followUserLocation={true} followZoomLevel={20} animationMode="flyTo" />
      <UserLocation visible={true} androidRenderMode="gps" />

      {/* show mapview in specify location */}
      {/* <Camera centerCoordinate={[102.27694254743255, 2.250354266032344]} zoomLevel={21} animationMode="none" /> */}
    </MapView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    color: 'red',
  },
  map: {
    flex: 1,
  },
});
