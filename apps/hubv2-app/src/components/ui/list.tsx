import React from 'react';
import {
  FlatList,
  type FlatListProps,
  type ListRenderItem,
  RefreshControl,
} from 'react-native';
import { EmptyList } from './empty-list';

interface ListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  renderItem: ListRenderItem<T>;
  emptyTitle?: string;
  emptyDescription?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function List<T>({
  renderItem,
  emptyTitle,
  emptyDescription,
  refreshing = false,
  onRefresh,
  ...props
}: ListProps<T>) {
  return (
    <FlatList
      renderItem={renderItem}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563eb']}
            tintColor="#2563eb"
          />
        ) : undefined
      }
      ListEmptyComponent={
        <EmptyList title={emptyTitle} description={emptyDescription} />
      }
      showsVerticalScrollIndicator={false}
      {...props}
    />
  );
}
