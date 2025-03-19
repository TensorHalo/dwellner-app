// @/app/navigation/_layout.tsx
// This file is a custom tab bar component that will be used as the footer navigation for the app.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

// Get screen dimensions for responsive design
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calculate footer height based on screen size (larger for bigger screens)
const FOOTER_HEIGHT = Math.max(80, Math.min(90, SCREEN_HEIGHT * 0.1));
const FOOTER_PADDING_BOTTOM = Math.max(10, Math.min(20, SCREEN_HEIGHT * 0.025));

// Side margin percentage for more compact tabs
const SIDE_MARGIN_PERCENTAGE = 0.18; // 18% margin on each side (increased for more spacing)

// SVG Components
const ChatIcon = ({ color, size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
    <Path
      d="M4.33331 13C4.33331 8.21357 8.21351 4.33337 13 4.33337V4.33337C17.7864 4.33337 21.6666 8.21357 21.6666 13V18.5152C21.6666 19.5896 21.6666 20.1268 21.4656 20.5406C21.2697 20.9439 20.9439 21.2697 20.5405 21.4657C20.1267 21.6667 19.5895 21.6667 18.5151 21.6667H13C8.21351 21.6667 4.33331 17.7865 4.33331 13V13Z"
      stroke={color}
      strokeWidth="2"
    />
    <Path
      d="M9.75 11.9166L16.25 11.9166"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M13 16.25H16.25"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HeartIcon = ({ color, size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M20.559 7.5908C19.0662 6.13645 16.6346 6.13645 15.1418 7.5908L13 9.67751L10.8582 7.5908C9.36546 6.13645 6.93383 6.13645 5.44107 7.5908C3.96411 9.02976 3.96411 11.3508 5.44107 12.7897L13 20.1542L20.559 12.7897C22.0359 11.3508 22.0359 9.02976 20.559 7.5908ZM13.6299 6.0389C15.9639 3.76486 19.7369 3.76486 22.0709 6.0389C24.4208 8.32833 24.4208 12.0522 22.0709 14.3416L13.756 22.4427C13.3353 22.8525 12.6647 22.8525 12.244 22.4427L3.9291 14.3416C1.57922 12.0522 1.57922 8.32833 3.9291 6.0389C6.26319 3.76486 10.0361 3.76486 12.3702 6.0389L13 6.65254L13.6299 6.0389Z"
      fill={color}
    />
  </Svg>
);

const CamilaFrameIcon = ({ color, size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 19 20" fill="none">
    <Path
      d="M10.2649 19L12.2709 18.7202L13.9122 18.4403L15.4623 17.6941L16.4653 16.9478C17.5596 15.7352 17.2176 13.7696 16.4653 13C15.9859 12.5095 17.0124 14.3593 17.0124 8.45928C16.5565 5.9407 16.3742 5.9407 17.7419 4.72805C18.2315 3.39665 18.0269 2.39603 16.7389 1.36994C16.7389 1.36994 14.6417 0.122304 13.3879 2.20947C10.8393 1.53044 7.98077 1.53044 5.43215 2.20947C4.15558 0.34385 2.14954 1.5565 2.14954 1.5565C0.985901 3 0.751251 3.39665 1.24081 4.72805C2.79092 6.12726 1.87752 6.36682 1.87599 7.89959C1.87599 10.2316 1.3917 9.54861 2.4859 13C1.24081 13.5 1.56825 15.0822 1.69363 16.1083L2.42309 16.9478L3.88203 17.9739L5.43215 18.4403L6.89109 18.7202L8.71476 19H10.2649Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M2 12C5.83093 14.9796 10.749 14.3355 12.1267 14.0781C12.3783 14.0311 12.6215 13.9595 12.8643 13.8786L12.9586 13.8471C13.6508 13.6164 14.3156 13.3106 14.9413 12.9352L16.5 12"
      stroke={color}
      strokeWidth="2"
    />
  </Svg>
);

// This custom tab bar will handle the footer navigation
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const router = useRouter();
  
  return (
    <View style={[styles.tabBarContainer, { height: FOOTER_HEIGHT, paddingBottom: FOOTER_PADDING_BOTTOM }]}>
      <View style={styles.tabsWrapper}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          let label;
          
          switch (route.name) {
            case 'chats':
              label = 'Chats';
              break;
            case 'camila':
              label = 'Camila';
              break;
            case 'collect':
              label = 'Collect';
              break;
            default:
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
                <View style={styles.focusedTabItem}>
                  <View style={styles.camilaIconCircle}>
                    <Image 
                      source={require('@/assets/camila-avatar.jpg')}
                      style={styles.camilaIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={[styles.tabText, styles.tabTextActive]}>
                    {label}
                  </Text>
                </View>
              ) : route.name === 'camila' ? (
                <View style={styles.tabItem}>
                  <CamilaFrameIcon color="#999" size={28} />
                  <Text style={styles.tabText}>
                    {label}
                  </Text>
                </View>
              ) : route.name === 'chats' && isFocused ? (
                <View style={styles.focusedTabItem}>
                  <ChatIcon color="#54B4AF" size={36} />
                  <Text style={[styles.tabText, styles.tabTextActive]}>
                    {label}
                  </Text>
                </View>
              ) : route.name === 'chats' ? (
                <View style={styles.tabItem}>
                  <ChatIcon color="#999" size={28} />
                  <Text style={styles.tabText}>
                    {label}
                  </Text>
                </View>
              ) : route.name === 'collect' && isFocused ? (
                <View style={styles.focusedTabItem}>
                  <HeartIcon color="#54B4AF" size={36} />
                  <Text style={[styles.tabText, styles.tabTextActive]}>
                    {label}
                  </Text>
                </View>
              ) : (
                <View style={styles.tabItem}>
                  <HeartIcon color="#999" size={28} />
                  <Text style={styles.tabText}>
                    {label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
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
      {/* <Tabs.Screen name="home" /> */}
      <Tabs.Screen name="chats" />
      <Tabs.Screen name="camila" />
      <Tabs.Screen name="collect" />
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsWrapper: {
    flexDirection: 'row',
    width: `${(1 - 1.5 * SIDE_MARGIN_PERCENTAGE) * 100}%`, // Apply side margins
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20, // Add some horizontal padding for more space between tabs
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusedTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -15,
  },
  camilaIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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