import { Colors, Radius, Gaps } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, View, StatusBar, Platform } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { auth, db } from '../../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Animated, { FadeInUp, FadeInDown, SlideInRight } from 'react-native-reanimated';

const screenWidth = Dimensions.get('window').width;

export default function Reports() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    
    const [stats, setStats] = useState({ taken: 0, missed: 0, pending: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(collection(db, 'users', user.uid, 'medicines'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let taken = 0, missed = 0, pending = 0;
            const today = new Date().toISOString().split('T')[0];

            snapshot.forEach((doc) => {
                const data = doc.data();
                
                if (data.history) {
                    Object.entries(data.history).forEach(([date, details]: [string, any]) => {
                        const status = typeof details === 'string' ? details : details.status;
                        if (status === 'taken') taken++;
                        else if (status === 'missed') missed++;
                    });
                }

                if (!data.history?.[today]) {
                    pending++;
                }
            });
            setStats({ taken, missed, pending });
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const chartConfig = {
        backgroundGradientFrom: theme.surface,
        backgroundGradientTo: theme.surface,
        color: (opacity = 1) => theme.primary,
        labelColor: (opacity = 1) => theme.text,
    };

    const data = [
        {
            name: 'Taken',
            population: stats.taken,
            color: theme.success,
            legendFontColor: theme.textDim,
            legendFontSize: 13,
        },
        {
            name: 'Missed',
            population: stats.missed,
            color: theme.error,
            legendFontColor: theme.textDim,
            legendFontSize: 13,
        },
        {
            name: 'Pending',
            population: stats.pending,
            color: theme.warning,
            legendFontColor: theme.textDim,
            legendFontSize: 13,
        },
    ];

    const total = stats.taken + stats.missed + stats.pending;
    const hasData = total > 0;

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
            <StatusBar barStyle="light-content" />
            <LinearGradient 
                colors={[theme.primary, colorScheme === 'dark' ? '#1E1B4B' : '#4338CA']} 
                style={styles.header}
            >
                <Animated.View entering={FadeInUp.duration(600)}>
                    <Text style={styles.headerTitle}>Adherence Reports</Text>
                    <Text style={styles.headerSubtitle}>Analyze your medication consistency</Text>
                </Animated.View>
            </LinearGradient>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <View style={styles.content}>
                    <Animated.View entering={FadeInUp.delay(200).duration(800)} style={[styles.chartCard, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>Medication Distribution</Text>
                        
                        {hasData ? (
                            <View style={styles.chartWrapper}>
                                <PieChart
                                    data={data}
                                    width={screenWidth - 48}
                                    height={200}
                                    chartConfig={chartConfig}
                                    accessor={"population"}
                                    backgroundColor={"transparent"}
                                    paddingLeft={"15"}
                                    center={[10, 0]}
                                    absolute
                                />
                            </View>
                        ) : (
                            <View style={styles.emptyChart}>
                                <Ionicons name="stats-chart-outline" size={60} color={theme.border} />
                                <Text style={[styles.emptyText, { color: theme.textDim }]}>Gathering your data...</Text>
                            </View>
                        )}
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(400).duration(800)} style={[styles.summaryCard, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                        <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 20 }]}>Overview Breakdown</Text>
                        
                        {[
                            { label: 'Successfully Taken', value: stats.taken, icon: 'checkmark-circle', color: theme.success, bg: 'rgba(16, 185, 129, 0.1)' },
                            { label: 'Doses Missed', value: stats.missed, icon: 'close-circle', color: theme.error, bg: 'rgba(239, 68, 68, 0.1)' },
                            { label: 'Doses Pending', value: stats.pending, icon: 'time', color: theme.warning, bg: 'rgba(245, 158, 11, 0.1)' }
                        ].map((stat, idx) => (
                            <View key={stat.label}>
                                <View style={styles.statRow}>
                                    <View style={[styles.iconBox, { backgroundColor: stat.bg }]}>
                                        <Ionicons name={stat.icon as any} size={22} color={stat.color} />
                                    </View>
                                    <View style={styles.statInfo}>
                                        <Text style={[styles.statLabel, { color: theme.textDim }]}>{stat.label}</Text>
                                        <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
                                    </View>
                                    <View style={styles.percentBox}>
                                        <Text style={[styles.statPercent, { color: stat.color }]}>
                                            {hasData ? Math.round((stat.value / total) * 100) : 0}%
                                        </Text>
                                    </View>
                                </View>
                                {idx < 2 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                            </View>
                        ))}
                    </Animated.View>

                    <Animated.View entering={SlideInRight.delay(600).duration(800)} style={[styles.insightCard, { backgroundColor: theme.primary }]}>
                        <Ionicons name="bulb-outline" size={32} color="#FFF" />
                        <View style={styles.insightInfo}>
                            <Text style={styles.insightTitle}>Health Insight</Text>
                            <Text style={styles.insightText}>
                                {stats.taken > stats.missed 
                                    ? "Great job! Your consistency is helping you achieve better health outcomes." 
                                    : "Keep going! Setting specific reminders can help reduce missed doses."}
                            </Text>
                        </View>
                    </Animated.View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 70 : 50,
        paddingBottom: 60,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FFF',
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
        fontWeight: '600',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    content: {
        padding: 24,
        paddingBottom: 120,
    },
    chartCard: {
        borderRadius: 32,
        padding: 24,
        marginBottom: 24,
        alignItems: 'center',
    },
    chartWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginLeft: -10,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '900',
        alignSelf: 'flex-start',
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    emptyChart: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '700',
        marginTop: 12,
    },
    summaryCard: {
        borderRadius: 32,
        padding: 24,
        marginBottom: 24,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
    },
    iconBox: {
        width: 46,
        height: 46,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    statInfo: {
        flex: 1,
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '800',
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '900',
    },
    percentBox: {
        backgroundColor: 'rgba(0,0,0,0.03)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statPercent: {
        fontSize: 14,
        fontWeight: '900',
    },
    divider: {
        height: 1,
        marginHorizontal: 0,
    },
    insightCard: {
        borderRadius: 32,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    insightInfo: {
        flex: 1,
    },
    insightTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 4,
    },
    insightText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
    },
});
