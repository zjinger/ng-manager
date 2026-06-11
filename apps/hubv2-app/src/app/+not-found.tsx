import React from 'react';
import { View, Text } from 'react-native';
import { Link, Stack } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-foreground text-2xl font-bold">404</Text>
        <Text className="text-muted mt-2">Page not found</Text>
        <Link href="/" className="text-primary-500 mt-4 underline">
          Go to home
        </Link>
      </View>
    </>
  );
}
