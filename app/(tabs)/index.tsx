import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Platform, Vibration, Dimensions, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { auth, db } from '../../firebaseConfig';
import { collection, query, onSnapshot, doc, getDoc, updateDoc, where, orderBy, limit } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import Animated, { FadeInDown, FadeInRight, FadeInUp } from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguage } from '@/context/LanguageContext';

const { width } = Dimensions.get('window');

export default function Home() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const { t } = useLanguage();

    const [medicines, setMedicines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');
    const [takenCount, setTakenCount] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [nextAppointment, setNextAppointment] = useState<any>(null);
    const [nagMed, setNagMed] = useState<any>(null);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            router.replace('/welcome');
            return;
        }

        const fetchUser = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setUserName(userDoc.data().name);
                }
            } catch (error: any) {
                console.log('Firebase Error:', error);
            }
        };
        fetchUser();

        const q = query(collection(db, 'users', user.uid, 'medicines'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            const meds: any[] = [];
            let taken = 0;
            snapshot.forEach((doc) => {
                const data = doc.data();
                const historyEntry = data.history?.[todayStr];
                // Support both string and object history formats
                const todayStatus = typeof historyEntry === 'object'
                    ? historyEntry?.status
                    : historyEntry ?? 'pending';
                meds.push({ id: doc.id, ...data, todayStatus });
                if (todayStatus === 'taken') taken++;
            });
            meds.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
            setMedicines(meds);
            setTakenCount(taken);
            
            // Sync nagMed with remote data
            setNagMed((currentNag: any) => {
                if (!currentNag) return null;
                const updatedMed = meds.find(m => m.id === currentNag.id);
                if (updatedMed?.todayStatus === 'taken') return null;
                return currentNag;
            });

            setLoading(false);
        });

        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        // Fetch Next Appointment
        const apptQ = query(
            collection(db, 'users', user.uid, 'appointments'),
            where('status', '==', 'scheduled'),
            orderBy('date', 'asc'),
            orderBy('time', 'asc'),
            limit(1)
        );
        const unsubscribeAppt = onSnapshot(apptQ, (snapshot) => {
            if (!snapshot.empty) {
                setNextAppointment({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
            } else {
                setNextAppointment(null);
            }
        });

        // Listen for incoming notifications to trigger the Nag Banner for snoozed meds
        const notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
            const data = notification.request.content.data as any;
            if (data && data.isNag === 'true') {
                const med = medicines.find(m => m.id === data.medId);
                if (med) setNagMed(med);
            }
        });

        return () => {
            unsubscribe();
            unsubscribeAppt();
            notificationSubscription.remove();
            clearInterval(timer);
        };
    }, []);

    const markStatus = async (medId: string, status: 'taken' | 'missed') => {
        const user = auth.currentUser;
        if (!user) return;
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        try {
            Vibration.cancel();
        } catch (e) {}

        try {
            const medRef = doc(db, 'users', user.uid, 'medicines', medId);
            const medSnap = await getDoc(medRef);

            if (medSnap.exists()) {
                const data = medSnap.data();
                const history = data.history || {};
                history[todayStr] = { status, timestamp: new Date().toISOString() };
                await updateDoc(medRef, { history, status });

                 if (status === 'taken') {
                    // Cancel all scheduled notifications for this medicine to ensure no delays or re-triggers
                    try {
                        const cancelIds = [
                            data.notificationId, 
                            data.preNotificationId, 
                            data.snoozeNotificationId
                        ].filter(Boolean);
                        
                        for (const id of cancelIds) {
                            await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
                        }
                    } catch (e) {}
                }
            }
        } catch (error: any) {
            console.log('Error updating status:', error);
        }
 
        if (nagMed?.id === medId) {
            setNagMed(null);
        }
    };
 
    const handleSnooze = async (med: any) => {
        setMedicines(prev => prev.map(m => m.id === med.id ? { ...m, isSnoozed: true } : m));
        
        // Use a high-priority OS notification instead of a timer for exact timing
        const trigger = new Date();
        trigger.setMinutes(trigger.getMinutes() + 5); 
        // Note: For testing you can use 10 seconds. In production we use 5 minutes.
        
        const snoozeId = await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Medicine Reminder! ⏳',
                body: t('home.nag.message').replace('{name}', med.name),
                data: { medId: med.id, isNag: 'true', medName: med.name },
                priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: { type: 'date', date: trigger, channelId: 'medication-alarm' } as any,
        });

        // Store snooze ID locally or in database to cancel it later if needed
        const medRef = doc(db, 'users', auth.currentUser!.uid, 'medicines', med.id);
        await updateDoc(medRef, { snoozeNotificationId: snoozeId });
    };

    const progressValue = medicines.length > 0 ? takenCount / medicines.length : 0;
    const pendingCount = medicines.filter(m => m.todayStatus !== 'taken').length;

    const getGreeting = () => {
        const h = currentTime.getHours();
        if (h < 12) return t('home.greeting.morning');
        if (h < 17) return t('home.greeting.afternoon');
        return t('home.greeting.evening');
    };

    const formatDateShort = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            {/* NAG BANNER */}
            {nagMed && (
                <Animated.View entering={FadeInUp.duration(600)} style={styles.nagBanner}>
                    <LinearGradient
                        colors={[theme.error, '#991B1B']}
                        style={styles.nagGradient}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                        <Ionicons name="alert-circle" size={24} color="#FFF" />
                        <Text style={styles.nagText}>
                            {t('home.nag.message').replace('{name}', nagMed.name)}
                        </Text>
                        <TouchableOpacity 
                            style={styles.nagTakenBtn}
                            onPress={() => markStatus(nagMed.id, 'taken')}
                        >
                            <Text style={styles.nagTakenText}>{t('home.action.taken')}</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </Animated.View>
            )}
 
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* --- HEADER --- */}
                <LinearGradient
                    colors={[theme.primary, colorScheme === 'dark' ? '#1E1B4B' : '#4338CA']}
                    style={styles.header}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                    <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.headerTop}>
                        <View>
                            <Text style={styles.greetingHeader}>{getGreeting()},</Text>
                            <Text style={styles.userNameText}>{userName || 'Healthy User'} 👋</Text>
                        </View>
                        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/settings')}>
                            <Ionicons name="person" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.delay(400).duration(800)} style={styles.statusDisplay}>
                        <View style={styles.timeBadge}>
                            <Ionicons name="time-outline" size={18} color="#FFF" />
                            <Text style={styles.currentTimeText}>
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                        <Text style={styles.dateHeader}>
                            {currentTime.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </Text>
                    </Animated.View>
                </LinearGradient>
 




                {/* --- RECENT DOSES SECTION --- */}
                <Animated.View entering={FadeInDown.delay(800)} style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('home.recent_doses')}</Text>
                    <TouchableOpacity onPress={() => router.push('/medicine-list')} style={[styles.historyBtn, { backgroundColor: theme.input }]}>
                        <Ionicons name="list-outline" size={16} color={theme.primary} />
                        <Text style={[styles.historyBtnText, { color: theme.primary }]}>{t('home.view_all')}</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* --- MEDICINE LIST --- */}
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
                ) : medicines.length === 0 ? (
                    <Animated.View entering={FadeInUp.delay(400)} style={styles.emptyState}>
                        <View style={[styles.emptyIcon, { backgroundColor: theme.input }]}>
                            <Ionicons name="medical-outline" size={60} color={theme.border} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('home.empty_title')}</Text>
                        <Text style={[styles.emptySub, { color: theme.textDim }]}>{t('home.empty_sub')}</Text>
                    </Animated.View>
                ) : (
                    medicines.map((med, index) => {
                        const isTaken = med.todayStatus === 'taken';
                        const isMissed = med.todayStatus === 'missed';
                        const isPending = !isTaken && !isMissed;

                        return (
                            <Animated.View
                                key={med.id}
                                entering={FadeInRight.delay(700 + index * 100).duration(600)}
                                style={[
                                    styles.medCard,
                                    {
                                        backgroundColor: theme.surface,
                                        ...theme.cardShadow,
                                        borderLeftWidth: 4,
                                        borderLeftColor: isTaken ? theme.success : isMissed ? theme.error : theme.warning,
                                    }
                                ]}
                            >
                                {/* Medicine icon/image */}
                                <View style={styles.medIconBox}>
                                    {med.imageUrl ? (
                                        <Image source={{ uri: med.imageUrl }} style={styles.medImage} />
                                    ) : (
                                        <View style={[styles.iconCircle, { backgroundColor: theme.input }]}>
                                            <Ionicons name="medkit" size={28} color={theme.primary} />
                                        </View>
                                    )}
                                </View>

                                {/* Details */}
                                <View style={styles.medDetails}>
                                    <Text style={[styles.medNameText, { color: theme.text }]}>{med.name}</Text>
                                    <View style={styles.medTimeBadge}>
                                        <Ionicons name="alarm-outline" size={14} color={theme.textDim} />
                                        <Text style={[styles.medTimeText, { color: theme.textDim }]}>{med.time}</Text>
                                    </View>
                                    {med.notes ? (
                                        <Text style={[styles.medNotes, { color: theme.textDim }]} numberOfLines={1}>{med.notes}</Text>
                                    ) : null}
                                </View>

                                {/* Status / Action */}
                                <View style={styles.medAction}>
                                    {isTaken ? (
                                        <View style={[styles.statusChip, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                                            <Ionicons name="checkmark-circle" size={28} color={theme.success} />
                                            <Text style={[styles.statusChipText, { color: theme.success }]}>{t('home.status.taken')}</Text>
                                        </View>
                                    ) : isMissed ? (
                                        <View style={[styles.statusChip, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                                            <Ionicons name="close-circle" size={28} color={theme.error} />
                                            <Text style={[styles.statusChipText, { color: theme.error }]}>{t('home.status.missed')}</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.actionButtons}>
                                            <TouchableOpacity
                                                style={[styles.takeBtn, { backgroundColor: theme.success }]}
                                                onPress={() => markStatus(med.id, 'taken')}
                                            >
                                                <Ionicons name="checkmark" size={20} color="#FFF" />
                                            </TouchableOpacity>
                                            
                                            {med.isSnoozed ? (
                                                <View style={[styles.snoozedChip, { backgroundColor: theme.input }]}>
                                                    <ActivityIndicator size="small" color={theme.primary} />
                                                </View>
                                            ) : (
                                                <TouchableOpacity
                                                    style={[styles.snoozeBtn, { borderColor: theme.primary }]}
                                                    onPress={() => handleSnooze(med)}
                                                >
                                                    <Ionicons name="time-outline" size={18} color={theme.primary} />
                                                    <Text style={styles.snoozeBtnText}>{t('home.action.snooze')}</Text>
                                                </TouchableOpacity>
                                            )}
 
                                            <TouchableOpacity
                                                style={[styles.missBtn, { borderColor: theme.error }]}
                                                onPress={() => markStatus(med.id, 'missed')}
                                            >
                                                <Ionicons name="close" size={18} color={theme.error} />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </Animated.View>
                        );
                    })
                )}
            </ScrollView>
 
            {/* COMPACT EXTENDED FAB */}
            <TouchableOpacity 
                style={[styles.efab, { ...theme.cardShadow }]}
                onPress={() => router.push('/add')}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[theme.primary, theme.secondary]}
                    style={styles.efabGradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                    <Ionicons name="add" size={24} color="#FFF" />
                    <Text style={styles.efabText}>{t('home.add_medicine')}</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: 140 },
    header: {
        paddingTop: Platform.OS === 'ios' ? 70 : 50,
        paddingBottom: 70,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    greetingHeader: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    userNameText: { fontSize: 26, fontWeight: '900', color: '#FFF' },
    statusDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    timeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 14,
        gap: 6,
    },
    currentTimeText: { fontSize: 18, fontWeight: '800', color: '#FFF' },
    dateHeader: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
    profileBtn: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    statsCard: {
        marginHorizontal: 24,
        marginTop: -35,
        borderRadius: 28,
        padding: 24,
    },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
    statItem: { alignItems: 'center' },
    statNumber: { fontSize: 32, fontWeight: '900' },
    statLabel: { fontSize: 13, fontWeight: '700', marginTop: 2 },
    statDivider: { width: 1, height: '80%', alignSelf: 'center' },
    progressBarBase: { height: 10, borderRadius: 5, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 5 },
    progressLabel: { fontSize: 13, fontWeight: '700', marginTop: 8, textAlign: 'right' },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginTop: 28,
        marginBottom: 16,
    },
    sectionTitle: { fontSize: 22, fontWeight: '900' },
    historyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
    },
    historyBtnText: { fontSize: 14, fontWeight: '800' },
    medCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 24,
        marginBottom: 14,
        padding: 16,
        borderRadius: 22,
    },
    medIconBox: { marginRight: 14 },
    medImage: { width: 58, height: 58, borderRadius: 16 },
    iconCircle: { width: 58, height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    medDetails: { flex: 1 },
    medNameText: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
    medTimeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    medTimeText: { fontSize: 13, fontWeight: '700' },
    medNotes: { fontSize: 12, fontWeight: '600', marginTop: 4 },
    medAction: { paddingLeft: 10 },
    statusChip: {
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 14,
        gap: 4,
    },
    statusChipText: { fontSize: 11, fontWeight: '900' },
    actionButtons: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    takeBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    snoozeBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        borderWidth: 1.5, 
        paddingHorizontal: 10, 
        height: 44, 
        borderRadius: 12,
        gap: 4,
    },
    snoozeBtnText: { fontSize: 13, fontWeight: '800' },
    snoozedChip: { 
        width: 44, 
        height: 44, 
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center',
    },
    missBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
    nagBanner: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        zIndex: 100,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    nagGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    nagText: {
        flex: 1,
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 20,
    },
    nagTakenBtn: {
        backgroundColor: '#FFF',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
    },
    nagTakenText: {
        color: '#991B1B',
        fontSize: 13,
        fontWeight: '900',
    },
    efab: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 8,
        zIndex: 999,
    },
    efabGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    efabText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    emptySub: { fontSize: 15, fontWeight: '600', textAlign: 'center', lineHeight: 22 },
    emptyState: { alignItems: 'center', marginTop: 50, paddingHorizontal: 40 },
    emptyIcon: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
    addMainContainer: {
        marginHorizontal: 24,
        marginTop: 20,
    },
    addCard: {
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#3B6CF6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    addGradient: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    addContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    addIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 20,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFF',
    },
    addSub: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
    },
    apptCard: {
        marginHorizontal: 24,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 10,
    },
    apptGradient: {
        padding: 16,
    },
    apptInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    apptDateBox: {
        width: 50,
        height: 54,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    apptDateText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '900',
        textAlign: 'center',
    },
    apptDetails: {
        flex: 1,
    },
    apptDrName: {
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 2,
    },
    apptTime: {
        fontSize: 13,
        fontWeight: '600',
    }
});