// components/ListingsButton.tsx
import React from 'react';
import { TouchableOpacity, Text, View, Image } from 'react-native';

interface ListingsButtonProps {
    onPress: () => void;
}

const ListingsButton: React.FC<ListingsButtonProps> = ({ onPress }) => {
    return (
        <TouchableOpacity 
            onPress={onPress}
            className="w-[85%] ml-10"
        >
            <View className="flex-row bg-[#8CD0CB] rounded-2xl overflow-hidden border-2 border-[#8CD0CB]">
                <View className="bg-[#8CD0CB] py-3 pl-6 pr-5">
                    <Image 
                        source={require('@/assets/logo_white.png')}
                        className="w-10 h-10"
                        resizeMode="contain"
                    />
                </View>
                <View className="flex-1 bg-white py-3 px-4 justify-center rounded-r-xl">
                    <Text className="text-black text-base font-medium">Your listings are ready.</Text>
                    <Text className="text-gray-400 text-sm">Click to check →</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default ListingsButton;