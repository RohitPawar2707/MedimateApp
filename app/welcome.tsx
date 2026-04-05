import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar, FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { router } from 'expo-router';
import { Colors, Radius, Gaps } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    useAnimatedScrollHandler,
    interpolate,
    Extrapolate,
    FadeInDown,
    FadeInUp,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width, height } = Dimensions.get('window');

const slides = [
    {
        id: '1',
        title: 'Medimate',
        subtitle: 'ELITE HEALTH MANAGEMENT',
        description: 'Advanced medication tracking and clinical management designed for precision care.',
        icon: 'medkit',
        iconColor: '#3B6CF6',
    },
    {
        id: '2',
        title: 'Smart Alarms',
        subtitle: 'CRITICAL DOSE REMINDERS',
        description: 'Our zero-delay "Nagging" system ensures strict adherence to your medication protocol.',
        icon: 'notifications',
        iconColor: '#0EA5A0',
    },
    {
        id: '3',
        title: 'Clinical Care',
        subtitle: 'SEAMLESS APPOINTMENTS',
        description: 'A unified professional dashboard for tracking doctor visits and clinical follow-ups.',
        icon: 'calendar',
        iconColor: '#8B5CF6',
    },
    {
        id: '4',
        title: 'Health Data',
        subtitle: 'SECURE MEDICAL RECORDS',
        description: 'Generate comprehensive analytical reports and access your full history with ease.',
        icon: 'document-text',
        iconColor: '#EC4899',
    }
];

export default function Welcome() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const scrollX = useSharedValue(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);

    // Automatic Swiping Logic
    useEffect(() => {
        const startAutoScroll = () => {
            autoScrollTimer.current = setInterval(() => {
                if (currentIndex < slides.length - 1) {
                    flatListRef.current?.scrollToIndex({ 
                        index: currentIndex + 1, 
                        animated: true 
                    });
                } else {
                    // Loop back to start or stop
                    flatListRef.current?.scrollToIndex({ index: 0, animated: true });
                }
            }, 4000); // 4 seconds interval
        };

        startAutoScroll();

        return () => {
            if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
        };
    }, [currentIndex]);

    const onScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const renderItem = ({ item, index }: { item: typeof slides[0], index: number }) => {
        return (
            <View style={styles.slide}>
                <View style={styles.upperContent}>
                    <Animated.View 
                        entering={FadeInUp.delay(200).duration(800)}
                        style={[styles.iconContainer, { backgroundColor: theme.surface }]}
                    >
                        <LinearGradient
                            colors={['#FFFFFF', '#F8FAFC']}
                            style={styles.iconCircle}
                        >
                            <Ionicons name={item.icon as any} size={80} color={item.iconColor} />
                        </LinearGradient>
                        <View style={[styles.iconRing, { borderColor: item.iconColor }]} />
                    </Animated.View>
                </View>

                <View style={styles.lowerContent}>
                    <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.textWrapper}>
                        <Text style={[styles.slideTitle, { color: theme.text }]}>{item.title}</Text>
                        <View style={[styles.professionalBadge, { backgroundColor: item.iconColor + '15' }]}>
                            <Text style={[styles.slideSubtitle, { color: item.iconColor }]}>{item.subtitle}</Text>
                        </View>
                        <Text style={[styles.slideDescription, { color: theme.textDim }]}>
                            {item.description}
                        </Text>
                    </Animated.View>
                </View>
            </View>
        );
    };

    const nextSlide = () => {
        // Clearing timer on manual interaction
        if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
        
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            router.push('/Signup');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
            
            <Animated.FlatList
                ref={flatListRef}
                data={slides}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                renderItem={renderItem}
                scrollEventThrottle={16}
                onScrollBeginDrag={() => {
                    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
                }}
            />

            <View style={styles.footer}>
                <View style={styles.paginationContainer}>
                    {slides.map((_, index) => {
                        const dotStyle = useAnimatedStyle(() => {
                            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
                            const dotWidth = interpolate(
                                scrollX.value,
                                inputRange,
                                [10, 24, 10],
                                Extrapolate.CLAMP
                            );
                            const opacity = interpolate(
                                scrollX.value,
                                inputRange,
                                [0.3, 1, 0.3],
                                Extrapolate.CLAMP
                            );
                            return {
                                width: dotWidth,
                                opacity,
                                backgroundColor: currentIndex === index ? slides[index].iconColor : theme.border
                            };
                        });
                        return <Animated.View key={index} style={[styles.dot, dotStyle]} />;
                    })}
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                        style={styles.mainButton} 
                        onPress={nextSlide}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={currentIndex === slides.length - 1 ? [theme.primary, theme.secondary] : [slides[currentIndex].iconColor, slides[currentIndex].iconColor]}
                            style={styles.btnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.buttonText}>
                                {currentIndex === slides.length - 1 ? 'GET STARTED' : 'CONTINUE'}
                            </Text>
                            <Ionicons 
                                name={currentIndex === slides.length - 1 ? 'rocket' : 'arrow-forward'} 
                                size={20} 
                                color="#FFF" 
                                style={{ marginLeft: 10 }} 
                            />
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.secondaryButton} 
                        onPress={() => router.push('/login')}
                    >
                        <Text style={[styles.secondaryButtonText, { color: theme.textDim }]}>
                            Access existing profile? <Text style={{ color: theme.primary, fontWeight: '900' }}>Sign In</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    slide: {
        width,
        flex: 1,
    },
    upperContent: {
        flex: 0.55,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 220,
        height: 220,
        borderRadius: 110,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
    },
    iconCircle: {
        width: 190,
        height: 190,
        borderRadius: 95,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconRing: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: 120,
        borderWidth: 2,
        borderStyle: 'dashed',
        opacity: 0.2,
    },
    lowerContent: {
        flex: 0.45,
        paddingHorizontal: 40,
    },
    textWrapper: {
        alignItems: 'center',
    },
    slideTitle: {
        fontSize: 48,
        fontWeight: '900',
        letterSpacing: -1,
        marginBottom: 12,
    },
    professionalBadge: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 20,
    },
    slideSubtitle: {
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2.5,
    },
    slideDescription: {
        fontSize: 17,
        textAlign: 'center',
        lineHeight: 28,
        fontWeight: '600',
        paddingHorizontal: 10,
    },
    footer: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        paddingHorizontal: 40,
        alignItems: 'center',
    },
    paginationContainer: {
        flexDirection: 'row',
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    dot: {
        height: 10,
        borderRadius: 5,
        marginHorizontal: 5,
    },
    buttonContainer: {
        width: '100%',
        gap: 15,
    },
    mainButton: {
        width: '100%',
        borderRadius: 25,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    btnGradient: {
        height: 65,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
    },
    secondaryButton: {
        paddingVertical: 10,
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
    },
});
