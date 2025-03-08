import React from 'react';
import { Stack } from 'expo-router';

export default function CollectLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      {/* Add more screens here in the future */}
    </Stack>
  );
}