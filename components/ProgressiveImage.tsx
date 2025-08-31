import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ImageStyle,
  ViewStyle,
} from 'react-native';
import { trackPerformance } from '@/lib/performanceMonitor';


interface ProgressiveImageProps {
  lowResUri?: string;
  mediumResUri?: string;
  highResUri?: string;
  fullResUri?: string;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  loadFullResOnMount?: boolean;
  onLoadComplete?: () => void;
  onError?: (error: any) => void;
  placeholder?: React.ReactNode;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

export default function ProgressiveImage({
  lowResUri,
  mediumResUri,
  highResUri,
  fullResUri,
  style,
  containerStyle,
  loadFullResOnMount = false,
  onLoadComplete,
  onError,
  placeholder,
  resizeMode = 'cover',
}: ProgressiveImageProps) {
  const [currentUri, setCurrentUri] = useState<string | undefined>(lowResUri);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedUris, setLoadedUris] = useState<Set<string>>(new Set());
  const [shouldLoadHighRes, setShouldLoadHighRes] = useState(loadFullResOnMount);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const performanceTrackerRef = useRef<{ onLoad: () => void; onError: (error: any) => void } | null>(null);

  // Progressive loading sequence
  useEffect(() => {
    const loadSequence = async () => {
      try {
        // Start with low-res if available
        if (lowResUri && !loadedUris.has(lowResUri)) {
          console.log('📱 Loading low-res image:', lowResUri);
          setCurrentUri(lowResUri);
          setIsLoading(true);
          
          // Start performance tracking
          performanceTrackerRef.current = trackPerformance.imageLoad(lowResUri, { resolution: 'low' });
        }
        
        // Load medium-res after a short delay
        if (mediumResUri) {
          setTimeout(() => {
            if (!loadedUris.has(mediumResUri)) {
              console.log('📱 Loading medium-res image:', mediumResUri);
              setCurrentUri(mediumResUri);
            }
          }, 100);
        }
        
        // Load high-res if requested
        if (shouldLoadHighRes && (highResUri || fullResUri)) {
          const targetUri = fullResUri || highResUri;
          if (targetUri) {
            setTimeout(() => {
              if (!loadedUris.has(targetUri)) {
                console.log('📱 Loading high-res image:', targetUri);
                setCurrentUri(targetUri);
              }
            }, 300);
          }
        }
      } catch (error) {
        console.error('❌ Error in progressive loading:', error);
        onError?.(error);
      }
    };

    loadSequence();
  }, [lowResUri, mediumResUri, highResUri, fullResUri, shouldLoadHighRes, loadedUris, onError]);

  // Handle image load success
  const handleImageLoad = () => {
    if (currentUri) {
      setLoadedUris(prev => new Set([...prev, currentUri]));
    }
    
    setIsLoading(false);
    
    // Track performance
    if (performanceTrackerRef.current) {
      performanceTrackerRef.current.onLoad();
      performanceTrackerRef.current = null;
    }
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    // Clear loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    onLoadComplete?.();
  };

  // Handle image load error
  const handleImageError = (error: any) => {
    console.error('❌ Image load error:', error);
    setIsLoading(false);
    
    // Track performance error
    if (performanceTrackerRef.current) {
      performanceTrackerRef.current.onError(error);
      performanceTrackerRef.current = null;
    }
    
    onError?.(error);
    
    // Try fallback to previous resolution
    if (currentUri === fullResUri && highResUri) {
      setCurrentUri(highResUri);
    } else if (currentUri === highResUri && mediumResUri) {
      setCurrentUri(mediumResUri);
    } else if (currentUri === mediumResUri && lowResUri) {
      setCurrentUri(lowResUri);
    }
  };

  // Set loading timeout
  useEffect(() => {
    if (isLoading && currentUri) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('⚠️ Image loading timeout for:', currentUri);
        setIsLoading(false);
      }, 5000); // 5 second timeout
    }
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading, currentUri]);

  // Trigger high-res loading when component becomes visible
  const loadHighRes = () => {
    if (!shouldLoadHighRes) {
      setShouldLoadHighRes(true);
    }
  };

  // Reset fade animation when URI changes
  useEffect(() => {
    fadeAnim.setValue(0);
    
    // Start new performance tracking when URI changes
    if (currentUri) {
      const resolution = currentUri === lowResUri ? 'low' : 
                        currentUri === mediumResUri ? 'medium' : 
                        currentUri === highResUri ? 'high' : 'full';
      performanceTrackerRef.current = trackPerformance.imageLoad(currentUri, { resolution });
    }
  }, [currentUri, fadeAnim, lowResUri, mediumResUri, highResUri]);

  if (!currentUri) {
    return (
      <View style={[styles.container, containerStyle]}>
        {placeholder || (
          <View style={[styles.placeholder, style]}>
            <ActivityIndicator size="small" color="#0066CC" />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <Image
          source={{ uri: currentUri }}
          style={[styles.image, style]}
          resizeMode={resizeMode}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onLayout={loadHighRes} // Trigger high-res loading when visible
        />
      </Animated.View>
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#0066CC" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
});