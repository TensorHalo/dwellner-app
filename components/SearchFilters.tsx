// components/SearchFilters.tsx
import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated, PanResponder, Dimensions } from 'react-native';

interface FilterTag {
    text: string;
}

interface SearchFiltersProps {
    visible: boolean;
    onDismiss: () => void;
    filters: FilterTag[];
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

const SearchFilters: React.FC<SearchFiltersProps> = ({ visible, onDismiss, filters }) => {
    const panY = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    const resetPositionAnim = Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
    });

    const closeAnim = Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
    });

    const panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => false,
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy > 0) {
                panY.setValue(gestureState.dy);
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            if (gestureState.dy > 50) {
                onDismiss();
            } else {
                Animated.spring(panY, {
                    toValue: 0,
                    useNativeDriver: true,
                }).start();
            }
        },
    })).current;

    React.useEffect(() => {
        if (visible) {
            resetPositionAnim.start();
        }
    }, [visible]);

    const handleDismiss = () => {
        closeAnim.start(() => onDismiss());
    };

    const overlayStyle = {
        backgroundColor: '#000',
        opacity: translateY.interpolate({
            inputRange: [0, SCREEN_HEIGHT],
            outputRange: [0.5, 0],
        }),
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleDismiss}
        >
            <View className="flex-1">
                <Animated.View 
                    style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, overlayStyle]} 
                />
                
                <TouchableOpacity 
                    style={{ flex: 1 }}
                    onPress={handleDismiss}
                    activeOpacity={1}
                >
                    <Animated.View 
                        style={{
                            flex: 1,
                            justifyContent: 'flex-end',
                            transform: [{ translateY }],
                        }}
                    >
                        <View 
                            className="bg-white rounded-t-[40px] p-8 pb-12 relative"
                            style={{ marginTop: 'auto' }}
                        >
                            {/* Centered drag indicator */}
                            <View {...panResponder.panHandlers} className="absolute left-0 right-0 items-center top-3">
                                <View className="w-12 h-1.5 rounded-full bg-gray-300" />
                            </View>

                            <TouchableOpacity activeOpacity={1}>
                                <Text className="text-xl font-semibold text-center mt-4 mb-6">
                                    The filters have been applied
                                </Text>

                                <View className="flex-row flex-wrap gap-2 mb-8">
                                    {filters.map((filter, index) => (
                                        <View 
                                            key={index} 
                                            className="bg-gray-50 rounded-full px-3 py-1"
                                        >
                                            <Text className="text-sm">{filter.text}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View className="items-center">
                                    <TouchableOpacity 
                                        onPress={handleDismiss}
                                        className="bg-[#54B4AF] rounded-xl py-3 px-8 w-1/2"
                                    >
                                        <Text className="text-white text-center font-medium">Got it</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

export default SearchFilters;