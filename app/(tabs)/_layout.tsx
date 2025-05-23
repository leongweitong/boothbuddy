import { Tabs, useRouter } from 'expo-router';
import React, {useEffect} from 'react';
import { Platform } from 'react-native';
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { FontAwesome, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        // tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarActiveTintColor: '#5d3fd3',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <FontAwesome name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ble"
        options={{
          title: 'BLE',
          tabBarIcon: ({ color }) => <Ionicons name="bluetooth" size={24} color={color} />,
        }}
      />
      {/* <Tabs.Screen
        name="indoorNavigation"
        options={{
          title: 'Navigate',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="map-marker-path" size={24} color={color} />,
        }}
      /> */}
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color }) => <FontAwesome name="bars" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
