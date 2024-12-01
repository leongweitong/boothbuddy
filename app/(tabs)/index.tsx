import React from 'react';
import { StyleSheet, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';

Mapbox.setAccessToken('pk.eyJ1Ijoid2VpdG9uZzA3MjQiLCJhIjoiY20yeWNiazQ0MDAyeTJqczY4bTl3bHh3YyJ9.67Ph1C9lW2_fJUmVZ-lduQ');

export default function HomeScreen() {
  return (
    <View style={styles.page}>
      <View style={styles.container}>
        <Mapbox.MapView style={styles.map} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',
  },

  container: {
    height: 300,

    width: 300,
  },

  map: {
    flex: 1,
  },
});