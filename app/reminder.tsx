import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, RotateInUpLeft, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

export default function Reminder() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const router = useRouter();
    const params = useLocalSearchParams();
    const { medId, medName, imageUrl } = params;

    const [loading, setLoading] = useState(false);
    const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isSpeakingRef = useRef(false);

    // Pulse animation for the alert icon
    const pulseAnim = useSharedValue(1);
    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseAnim.value }],
    }));

    useEffect(() => {
        // Start pulsing animation
        pulseAnim.value = withRepeat(
            withSequence(
                withTiming(1.15, { duration: 600 }),
                withTiming(1, { duration: 600 })
            ),
            -1,
            true
        );

        const speakAlert = async () => {
            if (isSpeakingRef.current) return; // Prevent overlap
            isSpeakingRef.current = true;

            const langCode = await AsyncStorage.getItem('ttsLanguage') || 'en-IN';
            let thingToSay = `Alert! It's time to take your medicine: ${medName}. Please take it now.`;

            if (langCode === 'hi-IN') {
                thingToSay = `ध्यान दें! ${medName} लेने का समय हो गया है। कृपया इसे अभी लें।`;
            } else if (langCode === 'mr-IN') {
                thingToSay = `लक्ष द्या! ${medName} घेण्याची वेळ झाली आहे। कृपया ते आता घ्या।`;
            }

            Speech.speak(thingToSay, {
                language: langCode,
                rate: 0.85,
                pitch: 1.0,
                volume: 1.0,
                onDone: () => { isSpeakingRef.current = false; },
                onError: () => { isSpeakingRef.current = false; },
                onStopped: () => { isSpeakingRef.current = false; },
            });
        };

        // Speak immediately on mount
        speakAlert();

        // Then repeat every 5 seconds until dismissed
        alertIntervalRef.current = setInterval(speakAlert, 2000);

        return () => {
            stopAlert();
        };
    }, [medName]);

    const stopAlert = () => {
        if (alertIntervalRef.current) {
            clearInterval(alertIntervalRef.current);
            alertIntervalRef.current = null;
        }
        Speech.stop();
        isSpeakingRef.current = false;
    };

    const handleTaken = async () => {
        if (!medId) return;
        // Stop the looping alert immediately
        stopAlert();
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            const today = new Date().toISOString().split('T')[0];
            const medRef = doc(db, 'users', user.uid, 'medicines', medId as string);
            const medSnap = await getDoc(medRef);

            if (medSnap.exists()) {
                const data = medSnap.data();
                const history = data.history || {};
                history[today] = { status: 'taken', timestamp: new Date().toISOString() };
                await updateDoc(medRef, { history, status: 'taken' });

                // Cancel scheduled notifications
                if (data.notificationId) {
                    await Notifications.cancelScheduledNotificationAsync(data.notificationId).catch(() => { });
                }
                if (data.preNotificationId) {
                    await Notifications.cancelScheduledNotificationAsync(data.preNotificationId).catch(() => { });
                }

                router.replace('/(tabs)');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSnooze = async () => {
        // Stop the looping alert immediately
        stopAlert();

        const trigger = new Date();
        trigger.setMinutes(trigger.getMinutes() + 5);

        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Snoozed: Time for Medicine! 💊',
                body: `Reminder again: Take ${medName}`,
                data: { medId, medName, imageUrl },
                priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: { type: 'date', date: trigger, channelId: 'medication-alarm' } as any,
        });

        router.replace('/(tabs)');
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={[theme.primary, colorScheme === 'dark' ? '#1E1B4B' : '#4338CA']}
                style={styles.header}
            >
                <Animated.View entering={RotateInUpLeft.duration(1000)} style={[styles.iconContainer, pulseStyle]}>
                    <Ionicons name="notifications" size={80} color="#FFF" />
                </Animated.View>
                <Text style={styles.headerTitle}>⏰ Reminder</Text>
            </LinearGradient>

            <View style={[styles.card, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                <Animated.View entering={FadeInUp.delay(200)} style={styles.medInfo}>
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl as string }} style={styles.medImage} />
                    ) : (
                        <View style={[styles.imagePlaceholder, { backgroundColor: theme.input }]}>
                            <Ionicons name="medkit" size={60} color={theme.primary} />
                        </View>
                    )}
                    <Text style={[styles.timeLabel, { color: theme.primary }]}>DUE NOW</Text>
                    <Text style={[styles.medName, { color: theme.text }]}>{medName || 'Medicine'}</Text>
                    <Text style={[styles.instruction, { color: theme.textDim }]}>Please take your prescribed dose now for better health.</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(400)} style={styles.actions}>
                    {/* TAKEN — marks status as 'taken' in Firestore, home screen shows green checkmark */}
                    <TouchableOpacity
                        style={[styles.takenBtn, { ...theme.cardShadow }]}
                        onPress={handleTaken}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.btnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            {loading ? <ActivityIndicator color="#FFF" /> : (
                                <>
                                    <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                                    <Text style={styles.btnText}>✅  I'VE TAKEN IT</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* SNOOZE — does NOT change Firestore status, medicine stays 'pending' on home screen */}
                    <TouchableOpacity
                        style={[styles.snoozeBtn, { borderColor: theme.primary, backgroundColor: 'rgba(79,70,229,0.08)' }]}
                        onPress={handleSnooze}
                    >
                        <Ionicons name="alarm-outline" size={22} color={theme.primary} />
                        <Text style={[styles.snoozeText, { color: theme.primary }]}>⏰  REMIND IN 5 MINS</Text>
                    </TouchableOpacity>

                    {/* LATER — explicitly marks status as 'pending', stops alert, home shows orange */}
                    <TouchableOpacity
                        style={[styles.laterBtn, { borderColor: theme.border }]}
                        onPress={() => {
                            stopAlert();
                            router.replace('/(tabs)');
                        }}
                    >
                        <Ionicons name="chevron-down-circle-outline" size={20} color={theme.textDim} />
                        <Text style={[styles.laterText, { color: theme.textDim }]}>I'LL TAKE IT LATER</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: height * 0.4,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomLeftRadius: 50,
        borderBottomRightRadius: 50,
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 2,
    },
    card: {
        marginHorizontal: 24,
        marginTop: -60,
        borderRadius: 32,
        padding: 30,
        alignItems: 'center',
    },
    medInfo: {
        alignItems: 'center',
        marginBottom: 30,
    },
    medImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 20,
        borderWidth: 4,
        borderColor: '#FFF',
    },
    imagePlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    timeLabel: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 8,
    },
    medName: {
        fontSize: 36,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 12,
    },
    instruction: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '600',
        paddingHorizontal: 10,
    },
    actions: {
        width: '100%',
        gap: 16,
    },
    takenBtn: {
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
    },
    btnGradient: {
        height: 70,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    btnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
    },
    snoozeBtn: {
        width: '100%',
        height: 65,
        borderRadius: 20,
        borderWidth: 2,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    snoozeText: {
        fontSize: 16,
        fontWeight: '700',
    },
    laterBtn: {
        width: '100%',
        height: 52,
        borderRadius: 16,
        borderWidth: 1.5,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    laterText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
