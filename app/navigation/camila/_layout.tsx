import React from 'react';
import { Stack } from 'expo-router';

export default function CamilaLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="home" />
      <Stack.Screen name="listing-map" />
      <Stack.Screen name="search-results" />
      <Stack.Screen name="view-more" />
      <Stack.Screen name="google-map" />
      {/* Add other Camila-related screens here */}
    </Stack>
  );
}