import { ThemeProvider as NavThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth, db_realtime } from '../firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import { useKeepAwake } from 'expo-keep-awake';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const isExpoGo = Constants.appOwnership === 'expo';
const isAndroid = Platform.OS === 'android';

// Configure notifications handler globally
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  useKeepAwake();

  useEffect(() => {
    // Request permissions on mount
    const requestPermissions = async () => {
        try {
            // Only attempt push token registration on physical devices
            if (!Device.isDevice) {
                console.log('Skipping push token registration: Not a physical device');
                return;
            }

            if (isExpoGo && isAndroid) {
                // Specific guard for Expo Go Android if needed, but isDevice covers most cases
                console.log('Skipping push token registration in Expo Go Android');
                return;
            }
            
            const { status: currentStatus } = await Notifications.requestPermissionsAsync();
            if (currentStatus !== 'granted') {
                console.log('Notification permissions not granted');
            }

            // The SCHEDULE_EXACT_ALARM permission is in app.json and will be used by the library automatically.
        } catch (e) {
            console.log('Error requesting notification permissions:', e);
        }
    };
    requestPermissions();

    // Setup high-priority channel for Android
    try {
        console.log('Registering high-priority alarm channel...');
        Notifications.setNotificationChannelAsync('medication-alarm', {
          name: 'Critical Medication Alarms 💊',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 1000, 500, 1000],
          lightColor: '#FF0000',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
          showBadge: true,
          sound: 'default',
          enableVibrate: true,
        });
    } catch (e) {
        console.log('Error setting notification channel:', e);
    }

    Notifications.setNotificationCategoryAsync('med_reminder', [
      {
        identifier: 'snooze',
        buttonTitle: 'Snooze (10m)',
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
      {
        identifier: 'taken',
        buttonTitle: 'Mark Taken',
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
    ]);

    const checkIfTaken = async (medId: string) => {
        const user = auth.currentUser;
        if (!user || !medId) return false;
        
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        try {
            const medDoc = await getDoc(doc(db, 'users', user.uid, 'medicines', medId));
            if (medDoc.exists()) {
                const data = medDoc.data();
                return data.history?.[todayStr]?.status === 'taken' || data.status === 'taken';
            }
        } catch (e) {
            console.log('Error checking medicine status:', e);
        }
        return false;
    };

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(async response => {
      const actionIdentifier = response.actionIdentifier;
      const data = response.notification.request.content.data as any;

      if (actionIdentifier === 'snooze') {
        const trigger = new Date();
        trigger.setMinutes(trigger.getMinutes() + 10);
        await Notifications.scheduleNotificationAsync({
          content: response.notification.request.content as any,
          trigger: { type: 'date', date: trigger, channelId: 'medication-alarm' } as any,
        });
        return;
      }

      if (actionIdentifier === 'taken') {
        if (data && data.medId) {
            const user = auth.currentUser;
            if (user) {
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                try {
                  await updateDoc(doc(db, 'users', user.uid, 'medicines', data.medId), {
                      [`history.${todayStr}`]: { status: 'taken', timestamp: new Date().toISOString() },
                      status: 'taken'
                  });
                } catch(e) {}
            }
        }
        return;
      }

      if (data && data.medName) {
          const isTaken = await checkIfTaken(data.medId);
          if (isTaken) {
              console.log(`Dose for ${data.medName} already taken. Skipping reminder.`);
              return;
          }

          if (router.canGoBack()) {
              try {
                  router.dismissAll();
              } catch (e) {}
          }
          
          console.log(`Notification tapped: Opening reminder interface for ${data.medName}`);
          router.replace({
              pathname: '/reminder',
              params: {
                  medId: data.medId,
                  medName: data.medName,
                  imageUrl: data.imageUrl,
                  time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
                  isNag: String(data.isNag || 'false'),
                  isPre: String(data.isPre || 'false')
              }
          });
      }
    });

    const foregroundSubscription = Notifications.addNotificationReceivedListener(async notification => {
      const data = notification.request.content.data as any;
      console.log('Incoming foreground reminder alert triggering direct interface...');
      
      if (data && data.medId) {
          const isTaken = await checkIfTaken(data.medId);
          if (isTaken) return;

          // Clear any current routes to prioritize the alert
          if (router.canGoBack()) {
               try {
                   router.dismissAll();
               } catch (e) {}
          }
          
          router.replace({
              pathname: '/reminder',
              params: {
                  medId: data.medId,
                  medName: data.medName,
                  imageUrl: data.imageUrl,
                  time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
                  isNag: String(data.isNag || 'false'),
                  isPre: String(data.isPre || 'false')
              }
          });
      }
    });

    // --- LIVE RTDB TIME CHECKER ---
    let rtdbMeds: any = {};
    let lastAlerted: Record<string, string> = {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
            const medsRef = ref(db_realtime, `medicines_hw/${user.uid}`);
            onValue(medsRef, (snapshot) => {
                if (snapshot.exists()) {
                    rtdbMeds = snapshot.val();
                } else {
                    rtdbMeds = {};
                }
            });
        } else {
            rtdbMeds = {};
        }
    });

    const timeChecker = setInterval(() => {
        const now = new Date();
        const time24 = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        Object.keys(rtdbMeds).forEach(medId => {
            const med = rtdbMeds[medId];
            if (med.time24 === time24 && med.status !== 'taken') {
                if (lastAlerted[medId] !== time24) {
                    lastAlerted[medId] = time24;
                    
                    checkIfTaken(medId).then(isTaken => {
                        if (!isTaken) {
                            console.log(`Live RTDB Check: Time matched for ${med.name}. Triggering alert!`);
                            if (router.canGoBack()) {
                                try { router.dismissAll(); } catch (e) {}
                            }
                            router.replace({
                                pathname: '/reminder',
                                params: {
                                    medId: medId,
                                    medName: med.name,
                                    time: med.time24,
                                    isNag: 'false',
                                    isPre: 'false'
                                }
                            });
                        }
                    });
                }
            }
        });
    }, 1000);

    return () => {
      responseSubscription.remove();
      foregroundSubscription.remove();
      unsubscribeAuth();
      clearInterval(timeChecker);
    };
  }, []);

  return (
    <NavThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="Signup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="reminder" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="add-appointment" options={{ presentation: 'modal', title: 'Schedule Appointment' }} />
        <Stack.Screen name="appointment-details" options={{ presentation: 'card', title: 'Appointment' }} />
        <Stack.Screen name="voice-assistant" options={{ presentation: 'transparentModal', headerShown: false }} />
        <Stack.Screen name="medicine-list" options={{ presentation: 'card', headerShown: false }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LanguageProvider>
          <RootLayoutContent />
        </LanguageProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
