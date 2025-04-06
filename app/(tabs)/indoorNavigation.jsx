import React, { useEffect, useState } from "react";
import { View, Image, Text, StyleSheet, useWindowDimensions } from "react-native";
import useBLE from "@/useBLE";

const INDOOR_MAP = require("../../assets/images/ixora_block_c.jpg");

// Logical pixel dimensions to match FloorPlanPicker
const IMAGE_WIDTH = 732;
const IMAGE_HEIGHT = 817;

const IBEACONS = [
  { id: "beacon1", x: 510, y: 35, rssi: null },
  { id: "beacon2", x: 510, y: 190, rssi: null },
  { id: "beacon3", x: 295, y: 60, rssi: null },
];

const IndoorNavigation = () => {
  const { scanForPeripherals, stopScan, allDevices, calculateDistance } = useBLE();
  const [userPosition, setUserPosition] = useState({ x: null, y: null });
  const window = useWindowDimensions();

  const displayWidth = window.width;
  const displayHeight = displayWidth * (IMAGE_HEIGHT / IMAGE_WIDTH);
  const scaleX = displayWidth / IMAGE_WIDTH;
  const scaleY = displayHeight / IMAGE_HEIGHT;

  useEffect(() => {
    scanForPeripherals();
    return stopScan;
  }, []);

  const SMOOTHING_FACTOR = 0.2;

  const smoothRSSI = (oldRSSI, newRSSI) => {
    if (oldRSSI === null) return newRSSI;
    return oldRSSI + SMOOTHING_FACTOR * (newRSSI - oldRSSI);
  };

  useEffect(() => {
    if (allDevices.length > 0) {
      const updatedBeacons = IBEACONS.map((beacon) => {
        const device = allDevices.find((d) => d.id === beacon.id || d.name?.includes(beacon.id));
        const newRSSI = device ? device.rssi : null;
        return { ...beacon, rssi:  newRSSI !== null ? smoothRSSI(beacon.rssi, newRSSI) : beacon.rssi };
      });

      if (updatedBeacons.some((b) => b.rssi !== null)) {

        const validBeacons = updatedBeacons.filter(b => b.rssi !== null);
        if (validBeacons.length >= 3) {
          const [b1, b2, b3] = validBeacons;
          const r1 = calculateDistance(b1.rssi);
          const r2 = calculateDistance(b2.rssi);
          const r3 = calculateDistance(b3.rssi);
        
          const position = trilateration(b1, b2, b3, r1, r2, r3);
          console.log("Position:", position);
          setUserPosition(position);
        } else {
          console.log("Not enough beacons");
        }
      }
    }
  }, [allDevices]);

  function norm(p) {
    return Math.sqrt(p.x * p.x + p.y * p.y);
  }
  
  function trilateration(point1, point2, point3, r1, r2, r3) {
    const p2p1Distance = Math.sqrt(
      Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
    );
  
    const ex = {
      x: (point2.x - point1.x) / p2p1Distance,
      y: (point2.y - point1.y) / p2p1Distance,
    };
  
    const aux = {
      x: point3.x - point1.x,
      y: point3.y - point1.y,
    };
  
    const i = ex.x * aux.x + ex.y * aux.y;
  
    const aux2 = {
      x: point3.x - point1.x - i * ex.x,
      y: point3.y - point1.y - i * ex.y,
    };
  
    const eyNorm = norm(aux2);
    if (eyNorm === 0) return { x: null, y: null }; // avoid division by zero
  
    const ey = {
      x: aux2.x / eyNorm,
      y: aux2.y / eyNorm,
    };
  
    const j = ey.x * aux.x + ey.y * aux.y;
  
    const x = (r1 * r1 - r2 * r2 + p2p1Distance * p2p1Distance) / (2 * p2p1Distance);
    const y =
      (r1 * r1 - r3 * r3 + i * i + j * j) / (2 * j) - (i * x) / j;
  
    const finalX = point1.x + x * ex.x + y * ey.x;
    const finalY = point1.y + x * ex.y + y * ey.y;
  
    return { x: finalX, y: finalY };
  }

  const scalePosition = (x, y) => {
    return {
      left: x * scaleX,
      top: y * scaleY,
    };
  };

  return (
    <View style={styles.container}>
      <View style={{ width: displayWidth, height: displayHeight }}>
        <Image
          source={INDOOR_MAP}
          style={{ width: displayWidth, height: displayHeight, resizeMode: "contain" }}
        />

        {IBEACONS.map((beacon, index) => (
          <View
            key={index}
            style={[styles.beaconMarker, scalePosition(beacon.x, beacon.y)]}
          />
        ))}

        {userPosition.x !== null && userPosition.y !== null && (
          <View
            style={[styles.userMarker, scalePosition(userPosition.x, userPosition.y)]}
          />
        )}
      </View>

      {/* <Text style={styles.info}>
        User Position: X={userPosition.x}, Y={userPosition.y}
      </Text> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  beaconMarker: {
    width: 10,
    height: 10,
    backgroundColor: "blue",
    borderRadius: 5,
    position: "absolute",
  },
  userMarker: {
    width: 15,
    height: 15,
    backgroundColor: "red",
    borderRadius: 7.5,
    position: "absolute",
  },
  info: {
    fontSize: 16,
    marginTop: 10,
  },
});

export default IndoorNavigation;
