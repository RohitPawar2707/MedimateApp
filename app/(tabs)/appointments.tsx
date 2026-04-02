import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Radius, Gaps } from '@/constants/theme';
import { auth, db } from '../../firebaseConfig';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight, FadeInUp } from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width } = Dimensions.get('window');

export default function AppointmentsDashboard() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            router.replace('/login');
            return;
        }

        const q = query(
            collection(db, 'users', user.uid, 'appointments'),
            orderBy('date', 'asc'),
            orderBy('time', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const appts: any[] = [];
            snapshot.forEach((doc) => {
                appts.push({ id: doc.id, ...doc.data() });
            });
            setAppointments(appts);
            setLoading(false);
        }, (error) => {
            console.error("Firestore Error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return theme.success;
            case 'scheduled': return theme.primary;
            case 'upcoming': return theme.warning;
            case 'missed':
            case 'cancelled': return theme.error;
            default: return theme.primary;
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
            
            <View style={styles.header}>
                <Animated.View entering={FadeInUp.duration(600)} style={styles.headerTop}>
                    <View>
                        <Text style={[styles.headerSubtitle, { color: theme.textDim }]}>Manage your</Text>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>Appointments</Text>
                    </View>
                    <TouchableOpacity 
                        style={[styles.voiceBtn, { backgroundColor: theme.input }]}
                        onPress={() => router.push('/voice-assistant' as any)}
                    >
                        <Ionicons name="mic" size={24} color={theme.primary} />
                    </TouchableOpacity>
                </Animated.View>
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
                ) : appointments.length === 0 ? (
                    <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyState}>
                        <View style={[styles.emptyIconBox, { backgroundColor: theme.input }]}>
                            <Ionicons name="calendar-outline" size={60} color={theme.border} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>No appointments yet</Text>
                        <Text style={[styles.emptySub, { color: theme.textDim }]}>Tap the + button to schedule your first doctor visit.</Text>
                    </Animated.View>
                ) : (
                    appointments.map((appt, index) => (
                        <Animated.View 
                            key={appt.id}
                            entering={FadeInRight.delay(index * 100).duration(600)}
                        >
                            <TouchableOpacity 
                                style={[styles.card, { backgroundColor: theme.card, ...theme.cardShadow }]}
                                onPress={() => router.push({
                                    pathname: '/appointment-details',
                                    params: { id: appt.id }
                                })}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.dateTimeContainer}>
                                        <Text style={[styles.dateBig, { color: theme.primary }]}>
                                            {formatDate(appt.date)}
                                        </Text>
                                        <View style={[styles.timeBadge, { backgroundColor: theme.input }]}>
                                            <Ionicons name="time-outline" size={14} color={theme.textDim} />
                                            <Text style={[styles.timeText, { color: theme.textDim }]}>{appt.time}</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appt.status) + '20' }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(appt.status) }]}>
                                            {appt.status?.toUpperCase() || 'SCHEDULED'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.cardContent}>
                                    <View style={styles.doctorInfo}>
                                        <View style={[styles.iconCircle, { backgroundColor: theme.input }]}>
                                            <Ionicons name="person-outline" size={20} color={theme.primary} />
                                        </View>
                                        <View>
                                            <Text style={[styles.drName, { color: theme.text }]}>{appt.doctorName}</Text>
                                            <Text style={[styles.speciality, { color: theme.textDim }]}>{appt.speciality}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.hospitalInfo}>
                                        <View style={[styles.iconCircle, { backgroundColor: theme.input }]}>
                                            <Ionicons name="location-outline" size={20} color={theme.secondary} />
                                        </View>
                                        <Text style={[styles.hospitalName, { color: theme.textDim }]} numberOfLines={1}>
                                            {appt.hospitalName}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    ))
                )}
            </ScrollView>

            <TouchableOpacity 
                style={styles.fab}
                onPress={() => router.push('/add-appointment')}
            >
                <LinearGradient
                    colors={[theme.primary, theme.secondary]}
                    style={styles.fabGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons name="add" size={32} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 70 : 50,
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerSubtitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
    },
    voiceBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 120,
    },
    card: {
        borderRadius: Radius.md,
        padding: 20,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    dateTimeContainer: {
        flex: 1,
    },
    dateBig: {
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 6,
    },
    timeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 5,
    },
    timeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    cardContent: {
        gap: 12,
    },
    doctorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    drName: {
        fontSize: 17,
        fontWeight: '800',
    },
    speciality: {
        fontSize: 13,
        fontWeight: '600',
    },
    hospitalInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    hospitalName: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 40,
    },
    emptyIconBox: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 22,
    },
    fab: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 120 : 100,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        elevation: 10,
        shadowColor: '#3B6CF6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    fabGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
