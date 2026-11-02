import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  message: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

export function ScreenState({
  title,
  message,
  loading = false,
  actionLabel,
  onAction,
}: Props) {
  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator size="large" color="#3478F6" /> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
    backgroundColor: '#F3F6FA',
  },
  title: { color: '#182230', fontWeight: '700', fontSize: 20, textAlign: 'center' },
  message: { color: '#667085', textAlign: 'center', fontSize: 14, lineHeight: 20 },
  action: { backgroundColor: '#3478F6', paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12 },
  actionPressed: { opacity: 0.8 },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
