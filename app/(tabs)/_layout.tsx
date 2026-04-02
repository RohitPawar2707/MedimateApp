import { Tabs, router } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Custom Centered Add Button
 */
function CustomAddButton({ onPress, theme }: any) {
  return (
    <View style={styles.addButtonWrapper}>
      <TouchableOpacity
        style={[styles.addButtonContainer, { shadowColor: theme.primary }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[theme.primary, theme.secondary]}
          style={styles.addButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={42} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 30 : 20,
          left: 20,
          right: 20,
          elevation: 10,
          backgroundColor: theme.surface,
          borderRadius: 30,
          height: 75,
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? 25 : 12,
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 15,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          marginBottom: 0,
        },
        tabBarIconStyle: {
            marginTop: 4,
        }
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="home-outline" color={color} />,
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="calendar-outline" color={color} />,
        }}
      />

      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarButton: (props) => (
            <CustomAddButton 
                theme={theme}
                onPress={() => router.push('/add')} 
            />
          ),
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="analytics-outline" color={color} />,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="person-outline" color={color} />,
        }}
      />
      
      {/* Hide Explore screen if already removed/hidden */}
      <Tabs.Screen
          name="explore"
          options={{
              href: null,
          }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonContainer: {
    top: -24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
        ios: {
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 10,
        },
        android: {
            elevation: 10,
        }
    })
  },
  addButtonGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
