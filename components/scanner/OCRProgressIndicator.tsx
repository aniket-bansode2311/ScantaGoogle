import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Activity } from 'lucide-react-native';

interface OCRProgressIndicatorProps {
  visible: boolean;
  progress: string;
  queueLength?: number;
  activeTasks?: number;
}

export default function OCRProgressIndicator({ 
  visible, 
  progress, 
  queueLength = 0, 
  activeTasks = 0 
}: OCRProgressIndicatorProps) {
  const spinValue = React.useRef(new Animated.Value(0)).current;
  const fadeValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      // Start spinning animation
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      
      // Fade in
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      spinAnimation.start();
      
      return () => {
        spinAnimation.stop();
      };
    } else {
      // Fade out
      Animated.timing(fadeValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, spinValue, fadeValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeValue }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, { transform: [{ rotate: spin }] }]}>
          <Activity size={24} color="#007AFF" />
        </Animated.View>
        
        <View style={styles.textContainer}>
          <Text style={styles.progressText}>{progress}</Text>
          {(queueLength > 0 || activeTasks > 0) && (
            <Text style={styles.queueText}>
              {activeTasks > 0 && `Processing ${activeTasks} task${activeTasks > 1 ? 's' : ''}`}
              {queueLength > 0 && activeTasks > 0 && ' • '}
              {queueLength > 0 && `${queueLength} in queue`}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  textContainer: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  queueText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});