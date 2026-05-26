import { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface Props {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: Props) {
  return (
    <View className={`bg-semapa-primary/80 rounded-2xl p-4 mb-3 border border-semapa-secondary/30 ${className}`}>
      {title ? <Text className="text-semapa-accent font-semibold mb-2">{title}</Text> : null}
      {children}
    </View>
  );
}
