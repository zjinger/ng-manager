import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './button';

interface ErrorBoundaryProps {
  error?: Error | null;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<ErrorBoundaryProps>,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError || this.props.error) {
      const error = this.state.error || this.props.error;
      return (
        <View className="flex-1 items-center justify-center bg-background px-6">
          <View className="w-16 h-16 bg-destructive/10 rounded-full items-center justify-center mb-4">
            <Text className="text-destructive text-2xl">!</Text>
          </View>
          <Text className="text-foreground font-semibold text-lg text-center">
            出错了
          </Text>
          <Text className="text-muted text-sm mt-2 text-center">
            {error?.message || '发生了未知错误'}
          </Text>
          {this.props.onRetry && (
            <Button
              title="重试"
              variant="outline"
              size="sm"
              onPress={() => {
                this.setState({ hasError: false, error: null });
                this.props.onRetry?.();
              }}
              className="mt-6"
            />
          )}
        </View>
      );
    }

    return this.props.children;
  }
}
