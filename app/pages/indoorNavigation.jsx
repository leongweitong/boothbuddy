import React, { useEffect, useState, useRef } from "react";
import { View, Image, Text, StyleSheet, useWindowDimensions, ActivityIndicator } from "react-native";
import useBLE from "@/useBLE";
import KalmanFilter from "@/kalmanFilter";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/FirebaseConfig";

const test = [
  {
    x: 310,
    y: 175
  },
  {
    x: 310,
    y: 260
  },
  {
    x: 310,
    y: 360
  },
  {
    x: 310,
    y: 460
  },
  {
    x: 310,
    y: 570
  },
  {
    x: 310,
    y: 85
  },
  {
    x: 375,
    y: 110
  },
  {
    x: 441,
    y: 119
  },
  {
    x: 520,
    y: 85
  },
  {
    x: 520,
    y: 170
  },
  {
    x: 310,
    y: 642
  },
  {
    x: 386,
    y: 671
  },
  {
    x: 477,
    y: 672
  },
]

const IndoorNavigation = () => {
  const { scanForPeripherals, stopScan, allDevices, calculateDistance, calculateHorizontalDistance } = useBLE();
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
        const pathsQuery = query(pathsRef, where('event_id', '==', eventData.id));
        const pathsSnapshot = await getDocs(pathsQuery);
        const pathsData = pathsSnapshot.docs.map(doc => doc.data());

        // Fetch points
        const pointsRef = collection(db, 'points');
        const pointsQuery = query(pointsRef, where('event_id', '==', eventData.id));
        const pointsSnapshot = await getDocs(pointsQuery);
        const allPoints = pointsSnapshot.docs.flatMap(doc => doc.data().coordinate || []);

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
              console.log("Image size:", width, height);
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
    scanForPeripherals();
    // setClosestPath(PATHS[0]);
    // setClosestPoint({x:320, y:120})

    // setClosestPath(PATHS[1]);
    // setClosestPoint({x:320, y:315})
    return stopScan;
  }, []);

  useEffect(() => {
    if (allDevices.length === 0) return;
  
    const MAX_HISTORY = 20;
    const PIXELS_PER_METER = 155 / 3;
  
    // Step 1: Extract relevant beacon data
    const beaconDevices = ibeacons.map((beacon) => {
      const matched = allDevices.find(
        (d) => d.name?.includes(beacon.id)
      );
  
      return matched
        ? {
            name: matched.name,
            id: matched.id,
            rssi: matched.rssi,
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

      const [b1, b2, b3] = topBeacons;

      // console.log('ibeacon1', calculateHorizontalDistance(b1.rssi))
      // console.log('ibeacon2', calculateHorizontalDistance(b2.rssi))
      // console.log('ibeacon3', calculateHorizontalDistance(b3.rssi))

      console.log('ibeacon1', getDistanceFromRSSI(b1.rssi))
      console.log('ibeacon2', getDistanceFromRSSI(b2.rssi))
      console.log('ibeacon3', getDistanceFromRSSI(b3.rssi))

      // console.log('ibeacon1', b1.rssi)
      // console.log('ibeacon2', b2.rssi)
      // console.log('ibeacon3', b3.rssi)
  
      const result = trilateration(
        { x: b1.x, y: b1.y },
        { x: b2.x, y: b2.y },
        { x: b3.x, y: b3.y },
        getDistanceFromRSSI(b1.rssi) * PIXELS_PER_METER,
        getDistanceFromRSSI(b2.rssi) * PIXELS_PER_METER,
        getDistanceFromRSSI(b3.rssi) * PIXELS_PER_METER
      );
  
      if (result && result.x !== null && result.y !== null) {
        const newUserPos = { x: result.x, y: result.y };

        if ( isNaN(newUserPos.x) || isNaN(newUserPos.y) || newUserPos.x < 0 || newUserPos.y < 0 ) return;
        
        if(!eventData.preset_position) {
          const THRESHOLD = 2; // pixel distance threshold
          const dx = newUserPos.x - userPosition.x;
          const dy = newUserPos.y - userPosition.y;
          const distanceSquared = dx * dx + dy * dy;
  
          if (distanceSquared > THRESHOLD * THRESHOLD) {
            setUserPosition(newUserPos);
  
            const closest = findClosestPath(newUserPos);
            if (closest && closest.path) {
              console.log(closest.path)
              setClosestPath(closest.path);
              setClosestPoint(closest.point);
            }
          }
        } else {
          const closest = findClosestPresetPoint(newUserPos);
          if (closest?.point) {
            setUserPosition(closest.point);
          }
        }
      }
    }
  }, [allDevices]); 

  function weightedAverage(arr) {
    const weights = arr.map((_, i) => i + 1); // recent gets higher weight
    const sumWeights = weights.reduce((a, b) => a + b, 0);
    const result =
      arr.reduce((sum, val, i) => sum + val * weights[i], 0) / sumWeights;
    return result;
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
  const findClosestPath = (userPos) => {
    if (!userPos || userPos.x === null || userPos.y === null) return null;
    
    let closestPath = null;
    let closestPoint = null;
    let minDistance = Infinity;
    
    // Check each path
    for (const path of paths) {
      // Check each point in the path
      for (let i = 0; i < path.points.length; i++) {
        const point = path.points[i];
        const dx = point.x - userPos.x;
        const dy = point.y - userPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestPath = path;
          closestPoint = point;
        }
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
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5d3fd3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ width: displayWidth, height: displayHeight }}>
        <Image
          source={{uri: eventData.floor_plan}}
          style={{ width: displayWidth, height: displayHeight, resizeMode: "contain" }}
        />

        {ibeacons.map((beacon, index) => (
          <View
            key={index}
            style={[styles.beaconMarker, scalePosition(beacon.x, beacon.y)]}
          />
        ))}

        {/* {test.map((beacon, index) => (
          <View
            key={index}
            style={[styles.beaconMarker, scalePosition(beacon.x, beacon.y)]}
          />
        ))} */}

        {userPosition.x !== null && userPosition.y !== null && (
          <View
            style={[styles.userMarker, scalePosition(userPosition.x, userPosition.y)]}
          />
        )}

        {/* Render the closest path */}
        {closestPath && closestPath.points
          .slice(0, -1) // Skip the last point, since it has no "next"
          .map((point, index) => {
            const nextPoint = closestPath.points[index + 1];
            return renderPathSegment(point, nextPoint, `${closestPath.id}-${index}`);
        })}

        {/* Render the closest point marker */}
        {closestPoint && (
          <View
            style={[styles.closestPointMarker, scalePosition(closestPoint.x, closestPoint.y)]}
          />
        )}

        {/* Render the destination point (final point in the path) */}
        {closestPath && closestPath.points.length > 0 && 
          <View
            style={[styles.closestPointMarker, scalePosition(closestPath.points[closestPath.points.length - 1].x, closestPath.points[closestPath.points.length - 1].y)]}
          />
        }
      </View>

      <Text style={styles.info}>
        User Position: X={userPosition.x?.toFixed(1)}, Y={userPosition.y?.toFixed(1)}
      </Text>
      <Text style={styles.info}>
        Booth Position: X={boothData.coordinate.x}, Y={boothData.coordinate.y}
      </Text>
      
      {closestPath && (
        <Text style={styles.pathInfo}>
          Closest Path: {closestPath.name}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
