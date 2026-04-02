import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Radius, Gaps } from '@/constants/theme';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function AppointmentDetails() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const { id } = useLocalSearchParams();

    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const fetchAppointment = async () => {
            const user = auth.currentUser;
            if (!user || !id) return;

            try {
                const docRef = doc(db, 'users', user.uid, 'appointments', id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setAppointment({ id: docSnap.id, ...docSnap.data() });
                } else {
                    Alert.alert('Error', 'Appointment not found');
                    router.back();
                }
            } catch (error: any) {
                Alert.alert('Error', error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAppointment();
    }, [id]);

    const updateStatus = async (newStatus: string) => {
        const user = auth.currentUser;
        if (!user || !id) return;

        setActionLoading(true);
        try {
            const docRef = doc(db, 'users', user.uid, 'appointments', id as string);
            await updateDoc(docRef, { status: newStatus });
            setAppointment((prev: any) => ({ ...prev, status: newStatus }));
            Alert.alert('Success', `Appointment marked as ${newStatus}`);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert('Cancel Appointment', 'Are you sure you want to cancel this appointment?', [
            { text: 'No', style: 'cancel' },
            { 
                text: 'Yes, Cancel', 
                style: 'destructive',
                onPress: async () => {
                    const user = auth.currentUser;
                    if (!user || !id) return;
                    try {
                        await deleteDoc(doc(db, 'users', user.uid, 'appointments', id as string));
                        router.back();
                    } catch (e) {}
                }
            }
        ]);
    };

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

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
            
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(appointment.status) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
                            {appointment.status?.toUpperCase() || 'SCHEDULED'}
                        </Text>
                    </View>
                    <Text style={[styles.title, { color: theme.text }]}>Dr. {appointment.doctorName}</Text>
                    <Text style={[styles.subtitle, { color: theme.textDim }]}>{appointment.speciality}</Text>
                </Animated.View>

                {/* Date/Time Section */}
                <Animated.View entering={FadeInDown.delay(200)} style={[styles.sectionCard, { backgroundColor: theme.card, ...theme.cardShadow }]}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                            <View>
                                <Text style={[styles.infoLabel, { color: theme.textDim }]}>DATE</Text>
                                <Text style={[styles.infoValue, { color: theme.text }]}>{new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
                            </View>
                        </View>
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />
                        <View style={styles.infoItem}>
                            <Ionicons name="time-outline" size={20} color={theme.primary} />
                            <View>
                                <Text style={[styles.infoLabel, { color: theme.textDim }]}>TIME</Text>
                                <Text style={[styles.infoValue, { color: theme.text }]}>{appointment.time}</Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* Location Section */}
                <Animated.View entering={FadeInDown.delay(400)} style={[styles.sectionCard, { backgroundColor: theme.card, ...theme.cardShadow }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Hospital Details</Text>
                    <View style={styles.detailRow}>
                        <View style={[styles.iconCircle, { backgroundColor: theme.input }]}>
                            <Ionicons name="business-outline" size={24} color={theme.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.detailValue, { color: theme.text }]}>{appointment.hospitalName}</Text>
                            <Text style={[styles.detailLabel, { color: theme.textDim }]}>{appointment.address || 'Address not provided'}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Patient Section */}
                <Animated.View entering={FadeInDown.delay(600)} style={[styles.sectionCard, { backgroundColor: theme.card, ...theme.cardShadow }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Patient Information</Text>
                    <View style={styles.detailRow}>
                        <View style={[styles.iconCircle, { backgroundColor: theme.input }]}>
                            <Ionicons name="person-outline" size={24} color={theme.secondary} />
                        </View>
                        <View>
                            <Text style={[styles.detailValue, { color: theme.text }]}>{appointment.patientName}</Text>
                            <Text style={[styles.detailLabel, { color: theme.textDim }]}>Age: {appointment.patientAge || 'N/A'}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Medical Reports Section */}
                <Animated.View entering={FadeInDown.delay(700)} style={[styles.sectionCard, { backgroundColor: theme.card, ...theme.cardShadow }]}>
                    <View style={styles.rowBetween}>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>Medical Reports</Text>
                        <TouchableOpacity>
                            <Ionicons name="add-circle" size={24} color={theme.primary} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.emptyReports}>
                        <Ionicons name="document-text-outline" size={40} color={theme.border} />
                        <Text style={[styles.emptyLabel, { color: theme.textDim }]}>No reports attached</Text>
                    </View>
                </Animated.View>

                {/* Notes Section */}
                {appointment.notes ? (
                    <Animated.View entering={FadeInDown.delay(800)} style={[styles.sectionCard, { backgroundColor: theme.card, ...theme.cardShadow }]}>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>Notes</Text>
                        <Text style={[styles.notesText, { color: theme.textDim }]}>{appointment.notes}</Text>
                    </Animated.View>
                ) : null}

                <View style={styles.actionButtons}>
                    {appointment.status !== 'completed' && (
                        <TouchableOpacity 
                            style={[styles.primaryBtn, { ...theme.cardShadow }]}
                            onPress={() => updateStatus('completed')}
                            disabled={actionLoading}
                        >
                            <LinearGradient
                                colors={['#16A34A', '#059669']}
                                style={styles.btnGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                                <Text style={styles.btnText}>MARK AS COMPLETED</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    <View style={styles.secondaryActions}>
                        <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.border, backgroundColor: theme.card }]}>
                            <Ionicons name="calendar-outline" size={20} color={theme.text} />
                            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Reschedule</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.secondaryBtn, { borderColor: 'rgba(220, 38, 38, 0.1)', backgroundColor: 'rgba(220, 38, 38, 0.05)' }]}
                            onPress={handleDelete}
                        >
                            <Ionicons name="close-circle-outline" size={20} color={theme.error} />
                            <Text style={[styles.secondaryBtnText, { color: theme.error }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 60,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: Radius.full,
        marginBottom: 20,
        gap: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    sectionCard: {
        borderRadius: Radius.md,
        padding: 24,
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    infoLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '800',
    },
    divider: {
        width: 1,
        height: 40,
        marginHorizontal: 16,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailValue: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    emptyReports: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 12,
    },
    emptyLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    notesText: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 24,
    },
    actionButtons: {
        marginTop: 20,
        gap: 16,
    },
    primaryBtn: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    btnGradient: {
        height: 70,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    btnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    secondaryActions: {
        flexDirection: 'row',
        gap: 12,
    },
    secondaryBtn: {
        flex: 1,
        height: 60,
        borderRadius: 20,
        borderWidth: 1.5,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    secondaryBtnText: {
        fontSize: 15,
        fontWeight: '800',
    },
});
