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

const { width } = Dimensions.get('window');

export default function Home() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const [medicines, setMedicines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');
    const [takenCount, setTakenCount] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [nextAppointment, setNextAppointment] = useState<any>(null);

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
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString().split('T')[0];

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

        return () => {
            unsubscribe();
            unsubscribeAppt();
            clearInterval(timer);
        };
    }, []);

    const markStatus = async (medId: string, status: 'taken' | 'missed') => {
        const user = auth.currentUser;
        if (!user) return;
        const todayStr = new Date().toISOString().split('T')[0];

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
                    if (data.notificationId) {
                        await Notifications.cancelScheduledNotificationAsync(data.notificationId).catch(() => {});
                    }
                    if (data.preNotificationId) {
                        await Notifications.cancelScheduledNotificationAsync(data.preNotificationId).catch(() => {});
                    }
                }
            }
        } catch (error: any) {
            console.log('Error updating status:', error);
        }
    };

    const progressValue = medicines.length > 0 ? takenCount / medicines.length : 0;
    const pendingCount = medicines.filter(m => m.todayStatus !== 'taken').length;

    const getGreeting = () => {
        const h = currentTime.getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const formatDateShort = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
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

                {/* --- ADHERENCE CARD --- */}
                <Animated.View entering={FadeInDown.delay(500).duration(800)} style={[styles.statsCard, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: theme.success }]}>{takenCount}</Text>
                            <Text style={[styles.statLabel, { color: theme.textDim }]}>Taken</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: pendingCount > 0 ? theme.error : theme.textDim }]}>{pendingCount}</Text>
                            <Text style={[styles.statLabel, { color: theme.textDim }]}>Pending</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: theme.text }]}>{medicines.length}</Text>
                            <Text style={[styles.statLabel, { color: theme.textDim }]}>Total</Text>
                        </View>
                    </View>
                    <View style={[styles.progressBarBase, { backgroundColor: theme.input }]}>
                        <Animated.View style={[styles.progressBarFill, { width: `${progressValue * 100}%`, backgroundColor: progressValue === 1 ? theme.success : theme.primary }]} />
                    </View>
                    <Text style={[styles.progressLabel, { color: theme.textDim }]}>
                        {Math.round(progressValue * 100)}% daily adherence
                    </Text>
                </Animated.View>

                {/* --- BIG ADD MEDICINE BUTTON --- */}
                <Animated.View entering={FadeInDown.delay(550)} style={styles.addMainContainer}>
                    <TouchableOpacity 
                        style={[styles.addCard, { backgroundColor: theme.primary }]}
                        onPress={() => router.push('/add')}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={[theme.primary, theme.secondary]}
                            style={styles.addGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <View style={styles.addContent}>
                                <View style={styles.addIconCircle}>
                                    <Ionicons name="add" size={32} color={theme.primary} />
                                </View>
                                <View>
                                    <Text style={styles.addTitle}>Add Medicine</Text>
                                    <Text style={styles.addSub}>Schedule a new dose</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#FFF" style={{ opacity: 0.7 }} />
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

                {/* --- NEXT APPOINTMENT SUMMARY --- */}
                {nextAppointment && (
                    <Animated.View entering={FadeInDown.delay(600)} style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Next Appointment</Text>
                    </Animated.View>
                )}
                {nextAppointment && (
                    <Animated.View entering={FadeInDown.delay(700)}>
                        <TouchableOpacity 
                            style={[styles.apptCard, { backgroundColor: theme.card, ...theme.cardShadow }]}
                            onPress={() => router.push('/appointments')}
                        >
                            <LinearGradient
                                colors={[theme.primary + '20', theme.secondary + '10']}
                                style={styles.apptGradient}
                            >
                                <View style={styles.apptInfo}>
                                    <View style={[styles.apptDateBox, { backgroundColor: theme.primary }]}>
                                        <Text style={styles.apptDateText}>
                                            {formatDateShort(nextAppointment.date)}
                                        </Text>
                                    </View>
                                    <View style={styles.apptDetails}>
                                        <Text style={[styles.apptDrName, { color: theme.text }]} numberOfLines={1}>
                                            Dr. {nextAppointment.doctorName}
                                        </Text>
                                        <Text style={[styles.apptTime, { color: theme.textDim }]}>
                                            {nextAppointment.time} • {nextAppointment.hospitalName}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* --- RECENT DOSES SECTION --- */}
                <Animated.View entering={FadeInDown.delay(800)} style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Doses</Text>
                    <TouchableOpacity onPress={() => router.push('/medicine-list')} style={[styles.historyBtn, { backgroundColor: theme.input }]}>
                        <Ionicons name="list-outline" size={16} color={theme.primary} />
                        <Text style={[styles.historyBtnText, { color: theme.primary }]}>View All</Text>
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
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>All Clear!</Text>
                        <Text style={[styles.emptySub, { color: theme.textDim }]}>No medicines scheduled today.</Text>
                    </Animated.View>
                ) : (
                    medicines.slice(0, 3).map((med, index) => {
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
                                            <Text style={[styles.statusChipText, { color: theme.success }]}>Taken</Text>
                                        </View>
                                    ) : isMissed ? (
                                        <View style={[styles.statusChip, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                                            <Ionicons name="close-circle" size={28} color={theme.error} />
                                            <Text style={[styles.statusChipText, { color: theme.error }]}>Missed</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.actionButtons}>
                                            <TouchableOpacity
                                                style={[styles.takeBtn, { backgroundColor: theme.success }]}
                                                onPress={() => markStatus(med.id, 'taken')}
                                            >
                                                <Ionicons name="checkmark" size={20} color="#FFF" />
                                            </TouchableOpacity>
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
    actionButtons: { gap: 8 },
    takeBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    missBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
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