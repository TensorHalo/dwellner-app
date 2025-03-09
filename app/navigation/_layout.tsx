// @/app/navigation/_layout.tsx
// This file is a custom tab bar component that will be used as the footer navigation for the app.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Get screen dimensions for responsive design
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calculate footer height based on screen size (larger for bigger screens)
const FOOTER_HEIGHT = Math.max(80, Math.min(90, SCREEN_HEIGHT * 0.1));
const FOOTER_PADDING_BOTTOM = Math.max(10, Math.min(20, SCREEN_HEIGHT * 0.025));

// This custom tab bar will handle the footer navigation
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const router = useRouter();
  
  return (
    <View style={[styles.tabBarContainer, { height: FOOTER_HEIGHT, paddingBottom: FOOTER_PADDING_BOTTOM }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        // Custom styling for each tab based on route
        let icon;
        let label;
        
        switch (route.name) {
          case 'home':
            icon = isFocused ? 'home' : 'home-outline';
            label = 'Home';
            break;
          case 'camila':
            icon = isFocused ? 'chatbox' : 'chatbox-outline';
            label = 'Camila';
            break;
          case 'collect':
            icon = isFocused ? 'heart' : 'heart-outline';
            label = 'Collect';
            break;
          case 'chats':
            icon = isFocused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
            label = 'Chats';
            break;
          default:
            icon = 'help-circle-outline';
            label = route.name;
        }

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.7}
            onPress={onPress}
            style={styles.tabButton}
          >
            {route.name === 'camila' && isFocused ? (
              <View style={styles.camilaTabItem}>
                <View style={styles.camilaIconCircle}>
                  <Image 
                    source={require('@/assets/camila-avatar.jpg')}
                    style={styles.camilaIcon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.tabText, isFocused && styles.tabTextActive]}>
                  {label}
                </Text>
              </View>
            ) : (
              <View style={styles.tabItem}>
                <Ionicons 
                  name={icon} 
                  size={24} 
                  color={isFocused ? '#54B4AF' : '#999'} 
                />
                <Text style={[styles.tabText, isFocused && styles.tabTextActive]}>
                  {label}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default function NavigationLayout() {
  // Export the footer height so it can be used in other components
  React.useEffect(() => {
    global.FOOTER_HEIGHT = FOOTER_HEIGHT;
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={props => <CustomTabBar {...props} />}
      initialRouteName="camila"
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="camila" />
      <Tabs.Screen name="collect" />
      <Tabs.Screen name="chats" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  camilaTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -15,
  },
  camilaIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#54B4AF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  camilaIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  tabText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  tabTextActive: {
    color: '#54B4AF',
  },
});