import { View, Text, TouchableOpacity, Linking, Image } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import backgroundVideo from "@/assets/videos/opening_video.mov";

const BOTTOM_SHEET_HEIGHT = 320;

const App = () => {
    const router = useRouter();
    const videoRef = React.useRef(null);
    const [isPressedEmail, setIsPressedEmail] = useState(false);
    const [isPressedPhone, setIsPressedPhone] = useState(false);
    const [isPressedGoogle, setIsPressedGoogle] = useState(false);

    React.useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playAsync();
        }
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View className="flex-1 bg-white">
                {/* Video container taking full height */}
                <View className="absolute top-0 left-0 right-0 bottom-0">
                    <Video
                        ref={videoRef}
                        source={backgroundVideo}
                        resizeMode="cover"
                        isLooping
                        isMuted
                        shouldPlay
                        style={{
                            width: '100%',
                            height: '100%',
                        }}
                    />
                </View>

                {/* Fixed Bottom Sheet */}
                <View 
                    className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-lg px-4 pt-2 pb-6"
                    style={{
                        height: BOTTOM_SHEET_HEIGHT,
                        shadowColor: '#000',
                        shadowOffset: {
                            width: 0,
                            height: -2,
                        },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                        elevation: 5,
                    }}
                >
                    <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />
                    
                    <View className="space-y-3">
                        <TouchableOpacity 
                            className={`p-4 rounded-lg flex-row items-center justify-center border border-gray-300 ${isPressedEmail ? 'bg-[#5eead4]' : 'bg-white'}`}
                            onPress={() => router.push("/user_auth/cognito-email-auth")}
                            onPressIn={() => setIsPressedEmail(true)}
                            onPressOut={() => setIsPressedEmail(false)}
                        >
                            <Ionicons name="mail" size={20} color="black" style={{marginRight: 8}} />
                            <Text className="text-black font-semibold text-base">
                                Continue with Email
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            className={`p-4 rounded-lg flex-row items-center justify-center border border-gray-300 ${isPressedPhone ? 'bg-[#5eead4]' : 'bg-white'}`}
                            // onPress={() => router.push("/user_auth/cognito-phone-auth")}
                            onPressIn={() => setIsPressedPhone(true)}
                            onPressOut={() => setIsPressedPhone(false)}
                        >
                            <Ionicons name="call" size={20} color="gray" style={{marginRight: 8}} />
                            <Text className="text-gray-400 font-semibold text-base">
                                Continue with Phone
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            className={`p-4 rounded-lg flex-row items-center justify-center border border-gray-300 ${isPressedGoogle ? 'bg-[#5eead4]' : 'bg-white'}`}
                            // onPress={() => router.push("/user_auth/cognito-google-auth")}
                            onPressIn={() => setIsPressedGoogle(true)}
                            onPressOut={() => setIsPressedGoogle(false)}
                        >
                            <Image 
                                source={{ uri: 'https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png' }}
                                style={{ width: 20, height: 20, marginRight: 8, opacity: 0.5 }}
                            />
                            <Text className="text-gray-400 font-semibold text-base">
                                Continue with Google
                            </Text>
                        </TouchableOpacity>

                        <Text className="text-center text-gray-500 text-sm mt-2 px-16">
                            By continuing, you agree to Dwellner's <Text 
                                className="text-gray-700 underline"
                                onPress={() => Linking.openURL('https://dwellner.com/terms')}
                            >Terms of use</Text> and <Text 
                                className="text-gray-700 underline"
                                onPress={() => Linking.openURL('https://dwellner.com/policy')}
                            >Privacy Policy</Text>.
                        </Text>
                    </View>
                </View>
            </View>
        </GestureHandlerRootView>
    );
};

export default App;