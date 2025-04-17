/* eslint-disable no-bitwise */
import { useMemo, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { Buffer } from 'buffer';

import * as ExpoDevice from "expo-device";

import base64 from 'react-native-base64';

import {
  BleError,
  BleManager,
  Characteristic,
  Device,
  ScanMode
} from "react-native-ble-plx";

const NAME = "HOLY-IOT";
const bleManager = new BleManager();

function useBLE() {
    const [allDevices, setAllDevices] = useState<Device[]>([]);
  
    const requestBluetoothPermission = async () => {
      if (Platform.OS === 'ios') {
        return true
      }
      if (Platform.OS === 'android' && PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
        const apiLevel = parseInt(Platform.Version.toString(), 10)
    
        if (apiLevel < 31) {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
          return granted === PermissionsAndroid.RESULTS.GRANTED
        }
        if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN && PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
          const result = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          ])
    
          return (
            result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
            result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
            result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
          )
        }
      }
    
      return false
    }
  
    const scanForPeripherals = () => {
        setAllDevices([]); // Clear previous devices
      
        // Start scanning for BLE devices
        bleManager.startDeviceScan(null,  null, (error, device) => {
          if (error) {
            console.error("Device Scan Error:", error);
            return;
          }
      
          if (device) {
            if (device.name && device.rssi && device.serviceData && '00005242-0000-1000-8000-00805f9b34fb' in device.serviceData) {
              const distance = calculateDistance(device.rssi);
              // console.log(distance.toFixed(2))
              setAllDevices((prevDevices) => {
                const existingIndex = prevDevices.findIndex((d) => d.id === device.id);
                if (existingIndex !== -1) {
                  const updatedDevices = [...prevDevices];
                  updatedDevices[existingIndex] = device;
                  return updatedDevices;
                } else {
                  return [...prevDevices, device];
                }
              });
            }
          }          
        });
    };      
  
    const stopScan = () => {
      bleManager.stopDeviceScan();
    };

    function calculateDistance(rssi = -55 , measure = -59, multiplier = 2) {
      return Math.pow(10, (measure - rssi) / (10 * multiplier));
    }

    function calculateHorizontalDistance(rssi = -55, measure = -59, multiplier = 2, beaconHeight = 0) {
      const distance3D = Math.pow(10, (measure - rssi) / (10 * multiplier));
      const horizontal = Math.sqrt(Math.max(0, distance3D ** 2 - beaconHeight ** 2));
      return horizontal === 0 ? 1 : horizontal;
    }
  
    return {
      requestBluetoothPermission,
      scanForPeripherals,
      stopScan,
      calculateDistance,
      calculateHorizontalDistance,
      allDevices,
    };
}
  
export default useBLE;  