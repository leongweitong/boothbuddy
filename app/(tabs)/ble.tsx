import React, { useEffect, useState } from "react";
import { FlatList, Text, View, StyleSheet, Button, StatusBar, TouchableOpacity } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Device } from "react-native-ble-plx";
import useBLE from "@/useBLE";

type Beacon = {
  id: string;
  x: number;
  y: number;
  rssi: number | null;
};

type Position = {
  x: number | null;
  y: number | null;
};

const IBEACONS: Beacon[] = [
  { id: "beacon1", x: 204, y: 10, rssi: null },
  { id: "beacon2", x: 204, y: 73, rssi: null },
  { id: "beacon3", x: 123, y: 19, rssi: null },
];

const BLEScreen: React.FC = () => {
  const { requestBluetoothPermission, calculateDistance, scanForPeripherals, stopScan, allDevices } = useBLE();
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [userPosition, setUserPosition] = useState<Position>({ x: null, y: null });

  useEffect(() => {
    const initialize = async () => {
      const granted = await requestBluetoothPermission();
      if (!granted) {
        alert("Bluetooth permissions are required.");
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    if (allDevices.length > 0) {
      const updatedBeacons = IBEACONS.map((beacon) => {
        const device = allDevices.find((d) => d.id === beacon.id || d.name?.includes(beacon.id));
        return { ...beacon, rssi: device ? device.rssi : null };
      });

      const estimatedPosition = trilateration(updatedBeacons);
      setUserPosition(estimatedPosition);
    }
  }, [allDevices]);

  const trilateration = (beacons: Beacon[]): Position => {
    // Filter beacons that have a valid RSSI
    const validBeacons = beacons.filter((b) => b.rssi !== null);

    // We need at least 3 valid beacons to perform triangulation
    if (validBeacons.length < 3) return { x: null, y: null };

    const [b1, b2, b3] = validBeacons.slice(0, 3).map((b) => ({
      x: b.x,
      y: b.y,
      r: calculateDistance(b.rssi as number),
    }));

    const A = 2 * (b2.x - b1.x);
    const B = 2 * (b2.y - b1.y);
    const C = 2 * (b3.x - b1.x);
    const D = 2 * (b3.y - b1.y);

    const E = b2.r ** 2 - b1.r ** 2 - b2.x ** 2 + b1.x ** 2 - b2.y ** 2 + b1.y ** 2;
    const F = b3.r ** 2 - b1.r ** 2 - b3.x ** 2 + b1.x ** 2 - b3.y ** 2 + b1.y ** 2;

    const denominator = A * D - B * C;
    if (denominator === 0) return { x: null, y: null };

    const x = (E * D - B * F) / denominator;
    const y = (A * F - E * C) / denominator;

    return { x: Math.round(x), y: Math.round(y) };
  };

  const handleScanToggle = () => {
    if (isScanning) {
      stopScan();
      setIsScanning(false);
    } else {
      setIsScanning(true);
      scanForPeripherals();
    }
  };

  const renderDevice = ({ item }: { item: Device }) => (
    <View style={styles.deviceItem}>
      <Text style={styles.deviceName}>{item.name}</Text>
      <Text style={styles.deviceId}>ID: {item.id}</Text>
      <Text style={styles.deviceId}>RSSI: {item.rssi}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.scanButton} onPress={handleScanToggle}>
          <Text style={{color: 'white'}}>{isScanning ? "Stop Scanning" : "Start Scanning"}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={allDevices}
        keyExtractor={(item) => item.id}
        renderItem={renderDevice}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyMessage}>
            {isScanning ? "Scanning for devices..." : "No devices found. Try scanning again."}
          </Text>
        }
      />
      {/* <Text style={styles.userPosition}>
        User Position: X={userPosition.x}, Y={userPosition.y}
      </Text> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  listContainer: {
    padding: 16,
  },
  deviceItem: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    borderRadius: 8,
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  deviceId: {
    fontSize: 12,
    color: "#666",
  },
  emptyMessage: {
    textAlign: "center",
    color: "#666",
    marginTop: 20,
  },
  userPosition: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 20,
  },
  scanButton: {
    backgroundColor: '#5d3fd3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
});

export default BLEScreen;
