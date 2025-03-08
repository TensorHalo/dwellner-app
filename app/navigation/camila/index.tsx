import React, { useEffect } from 'react';
import { Redirect, useRouter } from 'expo-router';

export default function CamilaIndex() {
  const router = useRouter();
  
  useEffect(() => {
    // This ensures proper navigation to the home screen
    router.replace('/navigation/camila/home');
  }, []);
  
  // This is a fallback in case the useEffect doesn't fire immediately
  return <Redirect href="/navigation/camila/home" />;
}