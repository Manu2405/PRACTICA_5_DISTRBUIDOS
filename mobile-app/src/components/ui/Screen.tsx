import { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
}

export function Screen({ title, subtitle, children, scroll = true }: Props) {
  const body = (
    <>
      {title ? <Text className="text-2xl font-bold text-white mb-1">{title}</Text> : null}
      {subtitle ? <Text className="text-semapa-accent text-sm mb-4">{subtitle}</Text> : null}
      {children}
    </>
  );

  return (
    <SafeAreaView className="flex-1 bg-semapa-dark">
      {scroll ? (
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
          {body}
        </ScrollView>
      ) : (
        <View className="flex-1 px-4">{body}</View>
      )}
    </SafeAreaView>
  );
}
