import React, { useState, useEffect } from "react";
import { View, Image, Text, useWindowDimensions, StyleSheet } from "react-native";
import {
  GestureHandlerRootView,
  PinchGestureHandler,
  State,
} from "react-native-gesture-handler";

const IMAGE_SRC = require("../../assets/images/ixora_block_c.jpg");

export default function FloorPlanPicker() {
  const [scale, setScale] = useState(1);
  const [touchPoints, setTouchPoints] = useState([]);
  const window = useWindowDimensions();

  const handlePinch = (event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setScale(event.nativeEvent.scale);
    }
  };

  const handlePress = (event) => {
    const { locationX, locationY } = event.nativeEvent;

    // Convert to image pixel coordinates based on displayed size
    const displayWidth = window.width * scale;
    const displayHeight = displayWidth * (817 / 732); // keep aspect ratio

    const xRatio = 732 / displayWidth;
    const yRatio = 817 / displayHeight;

    const originalX = Math.round(locationX * xRatio);
    const originalY = Math.round(locationY * yRatio);

    setTouchPoints([...touchPoints, { x: originalX, y: originalY }]);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <PinchGestureHandler onHandlerStateChange={handlePinch}>
          <View>
            <Image
              source={IMAGE_SRC}
              style={{
                width: window.width * scale,
                height: (window.width * scale) * (817 / 732),
                resizeMode: "contain",
              }}
              onStartShouldSetResponder={() => true}
              onResponderRelease={handlePress}
            />
          </View>
        </PinchGestureHandler>

        {touchPoints.length > 0 && (
          <View>
            <Text style={styles.title}>Clicked Points (image px):</Text>
            {touchPoints.map((point, index) => (
              <Text key={index}>
                Beacon {index + 1}: X = {point.x}, Y = {point.y}
              </Text>
            ))}
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    marginTop: 10,
  },
});
