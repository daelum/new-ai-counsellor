import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Svg, Circle, Path, G } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);
  const pathProgress = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    // Initial animation sequence
    scale.value = withSequence(
      withTiming(1, { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      withDelay(2000, withTiming(0, { duration: 500 }))
    );

    opacity.value = withSequence(
      withTiming(1, { duration: 800 }),
      withDelay(2000, withTiming(0, { duration: 300 }))
    );

    rotation.value = withSequence(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      withTiming(720, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );

    pathProgress.value = withTiming(1, { duration: 1500 });
    
    glowOpacity.value = withSequence(
      withTiming(1, { duration: 1000 }),
      withTiming(0.3, { duration: 1000 }),
      withTiming(1, { duration: 1000 })
    );

    // Trigger onAnimationComplete after animations
    setTimeout(onAnimationComplete, 3000);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, containerStyle]}>
        <Animated.View style={[styles.svgContainer, circleStyle]}>
          <Svg width={200} height={200} viewBox="0 0 100 100">
            {/* Outer circle */}
            <Circle
              cx="50"
              cy="50"
              r="45"
              stroke="#10a37f"
              strokeWidth="2"
              fill="none"
            />
            
            {/* Inner geometric pattern */}
            <G>
              <Path
                d="M50 5 L95 50 L50 95 L5 50 Z"
                stroke="#10a37f"
                strokeWidth="1"
                fill="none"
              />
              <Path
                d="M50 20 L80 50 L50 80 L20 50 Z"
                stroke="#10a37f"
                strokeWidth="1"
                fill="none"
              />
              <Circle
                cx="50"
                cy="50"
                r="15"
                stroke="#10a37f"
                strokeWidth="1"
                fill="none"
              />
            </G>
          </Svg>
        </Animated.View>
        
        <Animated.View style={[styles.glow, glowStyle]} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: width,
    height: height,
    backgroundColor: '#343541',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(16, 163, 127, 0.2)',
    transform: [{ scale: 1.2 }],
  },
});

export default SplashScreen; 