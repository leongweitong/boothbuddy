import React, { useEffect, useState } from "react";
import {
  FlatList,
  ListRenderItemInfo,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Button,
} from "react-native";
import { Device } from "react-native-ble-plx";
import useBLE from "@/useBLE";

const BLEScreen = () => {
    const { requestBluetoothPermission, scanForPeripherals, stopScan, allDevices } = useBLE();
    const [isScanning, setIsScanning] = useState(false);
  
    useEffect(() => {
      const initialize = async () => {
        const granted = await requestBluetoothPermission();
        if (!granted) {
          alert("Bluetooth permissions are required.");
        }
      };
      initialize();
      console.log(allDevices)
    }, []);
  
    const handleScan = () => {
      if (!isScanning) {
        setIsScanning(true);
        scanForPeripherals();
  
        setTimeout(() => {
          stopScan();
          setIsScanning(false);
        }, 10000); // Stop scan after 10 seconds
      }
    };
  
    const renderDevice = ({ item }: ListRenderItemInfo<Device>) => (
      <View style={styles.deviceItem}>
        <Text style={styles.deviceName}>{item.name || "Unnamed Device"}</Text>
        <Text style={styles.deviceId}>ID: {item.id}</Text>
        <Text style={styles.deviceId}>ManufacturerData: {item.manufacturerData}</Text>
        <Text style={styles.deviceId}>RSSI: {item.rssi}</Text>
      </View>
    );
  
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Button
            title={isScanning ? "Scanning..." : "Scan for Devices"}
            onPress={handleScan}
            disabled={isScanning}
          />
        </View>
        <FlatList
          data={allDevices}
          keyExtractor={(item) => item.id}
          renderItem={renderDevice}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyMessage}>
              {isScanning
                ? "Scanning for devices..."
                : "No devices found. Try scanning again."}
            </Text>
          }
        />
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
});

export default BLEScreen;
