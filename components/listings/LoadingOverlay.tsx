// @/components/listings/LoadingOverlay.tsx
import React, { useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  Animated, 
  Easing 
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LoadingOverlayProps {
  progress: number;
  visible: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible }) => {
  // Animation value for the shimmer effect
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  // Start animation when overlay becomes visible
  useEffect(() => {
    if (visible) {
      // Create infinite loop animation for the shimmer effect
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ).start();
    } else {
      // Stop animation when not visible
      shimmerAnim.stopAnimation();
    }
    
    return () => {
      shimmerAnim.stopAnimation();
    };
  }, [visible, shimmerAnim]);
  
  // Interpolate shimmer animation
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH]
  });
  
  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.cardMask}>
        <Animated.View 
          style={[
            styles.shimmer, 
            { transform: [{ translateX: shimmerTranslate }] }
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50, // Position between the right panel and content
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16
  },
  cardMask: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    width: '30%',
    height: '200%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    position: 'absolute',
    top: -5,
    transform: [{ skewX: '-20deg' }, { translateX: -SCREEN_WIDTH }],
  }
});

export default LoadingOverlay;