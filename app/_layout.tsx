import TimerProvider from "@/context/TimerContext";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { View } from "react-native";

// this will prevent the flash screen from auto hiding until loading all the assets is complete
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [fontsLoaded, error] = useFonts({
        "Roboto-Mono": require("../assets/fonts/RobotoMono-Regular.ttf"),
    });

    useEffect(() => {
        if (error) throw error;
        if (fontsLoaded) SplashScreen.hideAsync();
    }, [fontsLoaded, error]);

    if (!fontsLoaded) {
        return null;
    }

    if (!fontsLoaded && !error) {
        return null;
    }

    return (
        <SafeAreaProvider>
            <TimerProvider>
                <View style={{ flex: 1 }}>
                    <Stack screenOptions={{ headerShown: false }}>
                        {/* Auth and Landing Screens */}
                        <Stack.Screen
                            name="index"
                            options={{ headerShown: false }}
                        />
                        
                        {/* Individual auth screen routes */}
                        <Stack.Screen
                            name="user_auth/cognito-email-auth"
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="user_auth/cognito-email-code-login"
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="user_auth/cognito-email-forgot-password"
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="user_auth/cognito-email-signin"
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="user_auth/cognito-email-signup"
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="user_auth/cognito-email-verify"
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="user_auth/cognito-google-auth"
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="user_auth/cognito-phone-auth"
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="user_auth/cognito-phone-verify"
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="user_auth/onboarding"
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="user_auth/user-info-google"
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="user_auth/user-info"
                            options={{ headerShown: false }}
                        />
                        
                        {/* Navigation Screens - using a separate layout */}
                        <Stack.Screen
                            name="navigation"
                            options={{ headerShown: false }}
                        />
                    </Stack>
                    <Toast />
                </View>
            </TimerProvider>
        </SafeAreaProvider>
    );
}