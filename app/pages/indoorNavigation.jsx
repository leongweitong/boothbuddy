import React, { useEffect, useState, useRef } from "react";
import { View, Image, Text, StyleSheet, useWindowDimensions, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import useBLE from "@/useBLE";
import KalmanFilter from "@/kalmanFilter";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/FirebaseConfig";
import { Ionicons } from '@expo/vector-icons';

import ArrowIcon from '../../assets/images/arrow-marker.png'

const IndoorNavigation = () => {
  const { scanForPeripherals, stopScan, allDevices, requestBluetoothPermission, calculateDistance } = useBLE();
  const { booth, event } = useLocalSearchParams();
  const boothData = JSON.parse(booth);
  const eventData = JSON.parse(event);
  const window = useWindowDimensions();

  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [paths, setPaths] = useState([]);
  const [ibeacons, setIbeacons] = useState([]);
  const [userPosition, setUserPosition] = useState({ x: null, y: null });
  const [boothLocation, setBoothLocation] = useState(null);
  const [closestPath, setClosestPath] = useState(null);
  const [closestPoint, setClosestPoint] = useState(null);
  const [presetPoints, setPresetPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const rssiHistory = useRef({});
  const kalmanFilters = useRef({});

  const [displayWidth, setDisplayWidth] = useState(0);
  const [displayHeight, setDisplayHeight] = useState(0);
  const [scaleX, setScaleX] = useState(0);
  const [scaleY, setXcaleY] = useState(0);
  const previousPosition = useRef({ x: null, y: null });
  const currentPosition = useRef({ x: null, y: null });
  const userPositionHistory = useRef([]);
  const hasArrived = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch ibeacons
        const ibeaconsRef = collection(db, 'ibeacons');
        const ibeaconsQuery = query(ibeaconsRef, where('event_id', '==', eventData.id));
        const ibeaconsSnapshot = await getDocs(ibeaconsQuery);

        const ibeaconsData = ibeaconsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            // id: doc.id,
            id: data.name,
            x: data.coordinate.x,
            y: data.coordinate.y,
            rssi: null,
          };
        });

        // Initialize RSSI history
        rssiHistory.current = ibeaconsData.reduce((acc, beacon) => {
          acc[beacon.id] = [];
          return acc;
        }, {});

        // Initialize Kalman filters
        kalmanFilters.current = ibeaconsData.reduce((acc, beacon) => {
          acc[beacon.id] = new KalmanFilter();
          return acc;
        }, {});

        // Fetch paths
        const pathsRef = collection(db, 'paths');
        const pathsQuery = query(pathsRef, where('booth_id', '==', boothData.id));
        const pathsSnapshot = await getDocs(pathsQuery);
        const pathsData = pathsSnapshot.docs.map(doc => doc.data());

        // Fetch points
        const pointsRef = collection(db, 'points');
        const pointsQuery = query(pointsRef, where('event_id', '==', eventData.id));
        const pointsSnapshot = await getDocs(pointsQuery);
        const allPoints = pointsSnapshot.docs.flatMap(doc => doc.data().points);
        console.log(allPoints)

        // Set state
        setIbeacons(ibeaconsData);
        setPaths(pathsData);
        setBoothLocation({ x: boothData.coordinate.x, y: boothData.coordinate.y });
        setPresetPoints(allPoints);

        // Load image size
        if (eventData.floor_plan) {
          Image.getSize(
            eventData.floor_plan,
            (width, height) => {
              // console.log("Image size:", width, height);
              setImageSize({ width, height });

              setDisplayWidth(window.width)
              setDisplayHeight(window.width * (height / width))
              setScaleX(window.width / width)
              setXcaleY((window.width * (height / width)) / height)
            },
            (err) => console.error("Failed to get image size:", err)
          );
        }

      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {

    const initialize = async () => {
      const granted = await requestBluetoothPermission();
      if (!granted) {
        alert("Bluetooth permissions are required.");
      } else {
        scanForPeripherals();
      }
    };

    initialize();
    return stopScan;
  }, []);

  useEffect(() => {
    if (allDevices.length === 0) return;
  
    const MAX_HISTORY = 5;
  
    // Step 1: Extract relevant beacon data
    const beaconDevices = ibeacons.map((beacon) => {
      const matched = allDevices.find(
        (d) => d.name?.includes(beacon.id)
      );
  
      return matched
        ? {
            name: matched.name,
            id: matched.id,
            rssi: matched.rssi + 6,
            x: beacon.x,
            y: beacon.y,
          }
        : null;
    }).filter(Boolean); // Remove nulls

    // console.log(beaconDevices)
  
    // Step 2: Handle RSSI history + compute medians
    const validBeacons = [];
  
    beaconDevices.forEach((device) => {
      const history = rssiHistory.current[device.name];
    
      if (device.rssi !== null && history) {
        history.push(device.rssi);
    
        if (history.length > MAX_HISTORY) {
          history.shift();
        }
    
        if (history.length === MAX_HISTORY) {
          const avgRSSI = weightedAverage(history);
    
          // ✅ Apply Kalman filter after smoothing
          const beaconId = ibeacons.find((b) => device.name === b.id)?.id;
          const kalman = kalmanFilters.current[beaconId];
          const filteredRSSI = kalman ? kalman.filter(avgRSSI) : avgRSSI;
    
          validBeacons.push({
            ...device,
            rssi: filteredRSSI,
          });
    
          // Optional: log for debugging
          // console.log(`[${device.id} ${device.name}] avg: ${avgRSSI.toFixed(2)}, kalman: ${filteredRSSI.toFixed(2)}`);
        }
      }
    });      
  
    // Step 3: Trilateration logic
    if (validBeacons.length >= 3) {
      // console.log(validBeacons)
      const topBeacons = [...validBeacons].sort((a, b) => b.rssi - a.rssi).slice(0, 3);
      // console.log(topBeacons)

      const [b1, b2, b3] = topBeacons;

      // console.log('ibeacon1', calculateHorizontalDistance(b1.rssi))
      // console.log('ibeacon2', calculateHorizontalDistance(b2.rssi))
      // console.log('ibeacon3', calculateHorizontalDistance(b3.rssi))

      // console.log(eventData.pixels_per_meter)
      // console.log(b1.name, getDistanceFromRSSI(b1.rssi))
      // console.log(b2.name, getDistanceFromRSSI(b2.rssi))
      // console.log(b3.name, getDistanceFromRSSI(b3.rssi))

      // console.log(b1.name, b1.rssi)
      // console.log(b2.name, b2.rssi)
      // console.log(b3.name, b3.rssi)
  
      const result = trilateration(
        { x: b1.x, y: b1.y },
        { x: b2.x, y: b2.y },
        { x: b3.x, y: b3.y },
        calculateDistance(b1.rssi) * eventData.pixels_per_meter,
        calculateDistance(b2.rssi) * eventData.pixels_per_meter,
        calculateDistance(b3.rssi) * eventData.pixels_per_meter
      );
  
      if (result && result.x !== null && result.y !== null) {
        const newUserPos = { x: result.x, y: result.y };

          // console.log(calculateAngle(previousPosition, newUserPos))

        if ( isNaN(newUserPos.x) || isNaN(newUserPos.y) || newUserPos.x < 0 || newUserPos.y < 0 ) return;
        
        if(!eventData.preset_position) {
          const THRESHOLD = 2; // pixel distance threshold
          const dx = newUserPos.x - userPosition.x;
          const dy = newUserPos.y - userPosition.y;
          const distanceSquared = dx * dx + dy * dy;
  
          if (distanceSquared > THRESHOLD * THRESHOLD) {
            previousPosition.current = { ...userPosition };
            currentPosition.current = { ...newUserPos };
            setUserPosition(newUserPos);
  
            const closest = findClosestPath(newUserPos);
            if (closest && closest.path) {
              // console.log(closest.path)
              setClosestPath(closest.path);
              setClosestPoint(closest.point);
            }
          }
        } else {
          const smoothedPos = clampPosition(userPosition, newUserPos, { x: 50, y: 50 });
          // Store the position in history buffer
          userPositionHistory.current.push(smoothedPos);
          if (userPositionHistory.current.length > MAX_HISTORY) {
            userPositionHistory.current.shift();
          }

          // Calculate average position if enough history
          let averagedPos = smoothedPos;
          if (userPositionHistory.current.length === MAX_HISTORY) {
            const total = userPositionHistory.current.reduce(
              (acc, pos) => {
                return {
                  x: acc.x + pos.x,
                  y: acc.y + pos.y,
                };
              },
              { x: 0, y: 0 }
            );

            averagedPos = {
              x: total.x / MAX_HISTORY,
              y: total.y / MAX_HISTORY,
            };
          }

          // Continue with averaged position
          const closest = findClosestPresetPoint(averagedPos);
          if (closest?.point) {
            // ✅ Save current and previous positions for angle calc
            previousPosition.current = { ...userPosition };
            currentPosition.current = { ...closest.point };

            // ✅ Update user position
            setUserPosition(closest.point);

            // ✅ Update closest path
            const closestPath = findClosestPath(closest.point);
            if (closestPath?.path) {
              setClosestPath(closestPath.path);
              setClosestPoint(closestPath.point);
            }
          }
        }
      }
    }
  }, [allDevices]);

  useEffect(() => {
    if (closestPath && closestPath.points.length > 0) {
      const destination = closestPath.points.at(-1);
      if (isUserAtDestination(userPosition, destination) && !hasArrived.current) {
        hasArrived.current = true;
        Alert.alert("🎉 You have arrived!", "You are now at your destination.");
      } else if (!isUserAtDestination(userPosition, destination)) {
        hasArrived.current = false; // Reset if user moves away
      }
    }
  }, [userPosition]);

  const calculateAngle = (prev, curr) => {
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    // console.log((Math.atan2(dy, dx) * 180) / Math.PI)
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return angle !== 0 ? angle+90 : angle;
  };


  function weightedAverage(arr) {
    const weights = arr.map((_, i) => i + 1); // recent gets higher weight
    const sumWeights = weights.reduce((a, b) => a + b, 0);
    const result =
      arr.reduce((sum, val, i) => sum + val * weights[i], 0) / sumWeights;
    return result;
  }

  function clampPosition(currentPos, newPos, maxDelta) {
    const clampedX = Math.max(
      currentPos.x - maxDelta.x,
      Math.min(newPos.x, currentPos.x + maxDelta.x)
    );

    const clampedY = Math.max(
      currentPos.y - maxDelta.y,
      Math.min(newPos.y, currentPos.y + maxDelta.y)
    );

    return { x: clampedX, y: clampedY };
  }

  const findClosestPresetPoint = (userPos) => {
    if (!userPos || userPos.x == null || userPos.y == null || presetPoints.length === 0) return null;

    let closestPoint = null;
    let minDistance = Infinity;

    for (const point of presetPoints) {
      const dx = point.x - userPos.x;
      const dy = point.y - userPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    }

    return { point: closestPoint, distance: minDistance };
  };

  // Find the closest path and point to the user
  // const findClosestPath = (userPos) => {
  //   if (!userPos || userPos.x === null || userPos.y === null) return null;
    
  //   let closestPath = null;
  //   let closestPoint = null;
  //   let minDistance = Infinity;
    
  //   // Check each path
  //   for (const path of paths) {
  //     // Check each point in the path
  //     for (let i = 0; i < path.points.length; i++) {
  //       const point = path.points[i];
  //       const dx = point.x - userPos.x;
  //       const dy = point.y - userPos.y;
  //       const distance = Math.sqrt(dx * dx + dy * dy);
        
  //       if (distance < minDistance) {
  //         minDistance = distance;
  //         closestPath = path;
  //         closestPoint = point;
  //       }
  //     }
  //   }
    
  //   return { path: closestPath, point: closestPoint, distance: minDistance };
  // }; 

  // Find the closest path based on the first point of each path
  const findClosestPath = (userPos) => {
    if (!userPos || userPos.x === null || userPos.y === null) return null;

    let closestPath = null;
    let closestPoint = null;
    let minDistance = Infinity;

    for (const path of paths) {
      const firstPoint = path.points[0];
      if (!firstPoint) continue;

      const dx = firstPoint.x - userPos.x;
      const dy = firstPoint.y - userPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        closestPath = path;
        closestPoint = firstPoint;
      }
    }

    return { path: closestPath, point: closestPoint, distance: minDistance };
  };
  
  function getDistanceFromRSSI(rssi) {
    const absRSSI = Math.abs(rssi);
  
    let result = 0;
  
    if (absRSSI < 58) {
      return 0.5;
    } else if (absRSSI >= 58 && absRSSI < 64) {
      // Around 1 meter
      result = Math.log(absRSSI) / Math.log(58);
      return result * 1;
    } else if (absRSSI >= 64 && absRSSI < 70) {
      // Around 2 meters
      result = Math.log(absRSSI) / Math.log(64);
      return result * 2;
    } else if (absRSSI >= 70 && absRSSI < 76) {
      // Around 3 meters
      result = Math.log(absRSSI) / Math.log(70);
      return result * 3;
    } else if (absRSSI >= 76 && absRSSI < 82) {
      // Around 4 meters
      result = Math.log(absRSSI) / Math.log(76);
      return result * 4;
    } else if (absRSSI >= 82 && absRSSI < 88) {
      // Around 4 meters
      result = Math.log(absRSSI) / Math.log(82);
      return result * 5;
    }
  }  

  function trilateration(p1, p2, p3, r1, r2, r3) {
    // Helper functions for vector operations
    function subtract(a, b) {
      return { x: a.x - b.x, y: a.y - b.y };
    }
  
    function dot(a, b) {
      return a.x * b.x + a.y * b.y;
    }
  
    function norm(v) {
      return Math.sqrt(v.x * v.x + v.y * v.y);
    }
  
    function multiply(v, scalar) {
      return { x: v.x * scalar, y: v.y * scalar };
    }
  
    function divide(v, scalar) {
      return { x: v.x / scalar, y: v.y / scalar };
    }
  
    function add(a, b) {
      return { x: a.x + b.x, y: a.y + b.y };
    }
  
    // ex = (P2 - P1) / ‖P2 - P1‖
    const ex = divide(subtract(p2, p1), norm(subtract(p2, p1)));
  
    // i = ex · (P3 - P1)
    const p3p1 = subtract(p3, p1);
    const i = dot(ex, p3p1);
  
    // ey = (P3 - P1 - i * ex) / ‖P3 - P1 - i * ex‖
    const temp = subtract(p3p1, multiply(ex, i));
    const ey = divide(temp, norm(temp));
  
    // d = ‖P2 - P1‖
    const d = norm(subtract(p2, p1));
  
    // j = ey · (P3 - P1)
    const j = dot(ey, p3p1);
  
    // x = (r1² - r2² + d²) / (2d)
    const x = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  
    // y = (r1² - r3² + i² + j²) / (2j) - (i * x) / j
    const y = ((r1 * r1 - r3 * r3 + i * i + j * j) / (2 * j)) - ((i * x) / j);
  
    // Final point = P1 + x * ex + y * ey
    const final = add(add(p1, multiply(ex, x)), multiply(ey, y));
  
    return final;
  }  
  

  const scalePosition = (x, y) => {
    return {
      left: x * scaleX,
      top: y * scaleY,
    };
  };

  // Render a path segment between two points
  const renderPathSegment = (start, end, key) => {
    const startPos = scalePosition(start.x, start.y);
    const endPos = scalePosition(end.x, end.y);
  
    const dx = endPos.left - startPos.left;
    const dy = endPos.top - startPos.top;
  
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
    const centerX = (startPos.left + endPos.left) / 2;
    const centerY = (startPos.top + endPos.top) / 2;
  
    return (
      <View
        key={`segment-${key}`}
        style={{
          position: 'absolute',
          left: centerX - length / 2,
          top: centerY - 2,
          width: length,
          height: 4,
          backgroundColor: '#fff',
          transform: [{ rotateZ: `${angle}deg` }],
          zIndex: 10, // ensure it stays visible above others
        }}
      />
    );
  };

  function isUserAtDestination(user, destination, threshold = 50) {
    const dx = Math.abs(user.x - destination.x);
    const dy = Math.abs(user.y - destination.y);
    return dx <= threshold && dy <= threshold;
  }
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5d3fd3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          position: 'absolute',
          top: 40,
          left: 20,
          zIndex: 10,
          backgroundColor: 'white',
          padding: 10,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center'
        }}
      >
        <Ionicons name="arrow-back" size={20} color="#5d3fd3" />
      </TouchableOpacity>

      <View style={{ width: displayWidth, height: displayHeight }}>
        <Image
          source={{uri: eventData.floor_plan}}
          style={{ width: displayWidth, height: displayHeight, resizeMode: "contain" }}
        />

        {/* {ibeacons.map((beacon, index) => (
          <View
            key={index}
            style={[styles.beaconMarker, scalePosition(beacon.x, beacon.y)]}
          />
        ))} */}

        {/* {presetPoints.map((beacon, index) => (
          <View
            key={index}
            style={[styles.beaconMarker, scalePosition(beacon.x, beacon.y)]}
          />
        ))} */}

        {userPosition.x !== null && userPosition.y !== null && (
          <>
            {/* <View
              style={[styles.userMarker, scalePosition(userPosition.x, userPosition.y)]}
            /> */}

            {/* <View
              style={[
                styles.arrow,
                scalePosition(userPosition.x, userPosition.y),
                {
                  transform: [{ rotate: `${calculateAngle(previousPosition.current, userPosition)}deg` }]
                }
              ]}
            /> */}

            <Image
              source={ArrowIcon}
              style={[
                styles.arrowImage,
                scalePosition(userPosition.x, userPosition.y),
                {
                  transform: [{ rotate: `${calculateAngle(previousPosition.current, currentPosition.current)}deg` }],
                }
              ]}
            />
          </>
        )}

        {/* Only show path if user has NOT arrived */}
        {closestPath && closestPath.points.length > 0 && !isUserAtDestination(userPosition, closestPath.points.at(-1)) && (
          <>
            {closestPath.points.slice(0, -1).map((point, index) => {
              const nextPoint = closestPath.points[index + 1];
              return renderPathSegment(point, nextPoint, `${closestPath.id}-${index}`);
            })}

            {/* Destination point */}
            <View
              style={[styles.closestPointMarker, scalePosition(closestPath.points.at(-1).x, closestPath.points.at(-1).y)]}
            />
          </>
        )}

        {/* Render the closest point marker */}
        {/* {closestPoint && (
          <View
            style={[styles.closestPointMarker, scalePosition(closestPoint.x, closestPoint.y)]}
          />
        )} */}
      </View>

      {/* <Text style={styles.info}>
        User Position: X={userPosition.x?.toFixed(1)}, Y={userPosition.y?.toFixed(1)}
      </Text>
      <Text style={styles.info}>
        Booth Position: X={boothData.coordinate.x}, Y={boothData.coordinate.y}
      </Text>
      
      {closestPath && (
        <Text style={styles.pathInfo}>
          Closest Path: {closestPath.name}
        </Text>
      )} */}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
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
  arrowImage: {
    width: 20,
    height: 20,
    position: 'absolute',
    marginLeft: -5,
    marginTop: -5,
    zIndex: 100,
  },
  closestPointMarker: {
    width: 20,
    height: 20,
    backgroundColor: "#FF9800",
    borderRadius: 10,
    position: "absolute",
    borderWidth: 2,
    borderColor: "white",
    marginLeft: -10, // 👈 shifts it left by half width
    marginTop: -10,  // 👈 shifts it up by half height
    zIndex: 10
  },
  info: {
    fontSize: 16,
    marginTop: 10,
  },
  pathInfo: {
    fontSize: 16,
    marginTop: 5,
    color: "#4CAF50",
    fontWeight: "bold",
  },
});

export default IndoorNavigation;
