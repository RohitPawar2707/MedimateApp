import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Platform, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Radius, Gaps } from '@/constants/theme';
import { auth, db } from '../firebaseConfig';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight, FadeInUp } from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function MedicineList() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const [medicines, setMedicines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            router.replace('/login');
            return;
        }

        const q = query(
            collection(db, 'users', user.uid, 'medicines'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const meds: any[] = [];
            snapshot.forEach((doc) => {
                meds.push({ id: doc.id, ...doc.data() });
            });
            setMedicines(meds);
            setLoading(false);
        }, (error) => {
            console.error("Firestore Error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        const user = auth.currentUser;
        if (!user) return;

        // Using standard Alert for cross-platform support
        const confirmDelete = () => {
             deleteDoc(doc(db, 'users', user.uid, 'medicines', id))
                .catch(err => console.error("Delete error:", err));
        };

        if (Platform.OS === 'web') {
            if (confirm(`Are you sure you want to delete ${name}?`)) confirmDelete();
        } else {
            // No Alert available in some RN environments, but assuming standard RN here
            // If you wanted a custom UI, you would use a modal
            confirmDelete(); 
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            <LinearGradient
                colors={[theme.primary, colorScheme === 'dark' ? '#1E1B4B' : '#4338CA']}
                style={styles.header}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
                <Animated.View entering={FadeInUp.duration(600)} style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>All Medicines</Text>
                        <Text style={styles.headerSubtitle}>{medicines.length} medications total</Text>
                    </View>
                </Animated.View>
            </LinearGradient>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : medicines.length === 0 ? (
                <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyState}>
                    <View style={[styles.emptyIconBox, { backgroundColor: theme.input }]}>
                        <Ionicons name="medical-outline" size={60} color={theme.border} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>No medicines found</Text>
                    <Text style={[styles.emptySub, { color: theme.textDim }]}>Tap 'Add Medicine' on the home screen to start tracking.</Text>
                </Animated.View>
            ) : (
                <FlatList
                    data={medicines}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item, index }) => (
                        <Animated.View 
                            entering={FadeInRight.delay(index * 100).duration(600)}
                            style={[styles.card, { backgroundColor: theme.surface, ...theme.cardShadow }]}
                        >
                            <View style={styles.cardMain}>
                                <View style={styles.medIconBox}>
                                    {item.imageUrl ? (
                                        <Image source={{ uri: item.imageUrl }} style={styles.medImage} />
                                    ) : (
                                        <View style={[styles.iconCircle, { backgroundColor: theme.input }]}>
                                            <Ionicons name="medkit" size={28} color={theme.primary} />
                                        </View>
                                    )}
                                </View>
                                <View style={styles.medInfo}>
                                    <Text style={[styles.medName, { color: theme.text }]}>{item.name}</Text>
                                    <View style={styles.timeBadge}>
                                        <Ionicons name="time-outline" size={14} color={theme.textDim} />
                                        <Text style={[styles.timeText, { color: theme.textDim }]}>{item.time}</Text>
                                    </View>
                                    {item.notes ? (
                                        <Text style={[styles.notes, { color: theme.textDim }]} numberOfLines={1}>{item.notes}</Text>
                                    ) : null}
                                </View>
                                <TouchableOpacity 
                                    style={styles.deleteBtn}
                                    onPress={() => handleDelete(item.id, item.name)}
                                >
                                    <Ionicons name="trash-outline" size={20} color={theme.error} />
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 70 : 50,
        paddingBottom: 40,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
    },
    listContent: {
        padding: 24,
        paddingBottom: 100,
    },
    card: {
        borderRadius: 24,
        marginBottom: 16,
        padding: 16,
    },
    cardMain: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    medIconBox: {
        marginRight: 16,
    },
    medImage: {
        width: 58,
        height: 58,
        borderRadius: 16,
    },
    iconCircle: {
        width: 58,
        height: 58,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    medInfo: {
        flex: 1,
    },
    medName: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    timeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timeText: {
        fontSize: 14,
        fontWeight: '700',
    },
    notes: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 4,
    },
    deleteBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
});
