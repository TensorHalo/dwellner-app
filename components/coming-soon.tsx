import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ComingSoonProps {
  featureName: string;
}

const ComingSoon = ({ featureName }: ComingSoonProps) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={require('@/assets/dwellnerlogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        
        <Text style={styles.title}>{featureName}</Text>
        
        <Text style={styles.message}>
          We're working hard to bring you exciting new features.
          Stay tuned for updates coming soon!
        </Text>
        
        <View style={styles.separator} />
        
        <Text style={styles.subtitle}>
          In the meantime, you can chat with Camila to find your perfect home.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 80, // Add extra padding for the tab bar
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  separator: {
    width: 60,
    height: 4,
    backgroundColor: '#54B4AF',
    borderRadius: 2,
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#888',
    lineHeight: 20,
  },
});

export default ComingSoon;