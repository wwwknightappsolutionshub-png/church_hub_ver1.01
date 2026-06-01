import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Church_Hub</Text>
      <Text style={styles.subtitle}>Mobile ministry tools</Text>

      <Link href="/outreach" asChild>
        <Pressable style={styles.card}>
          <Text style={styles.cardTitle}>Evangelism Capture</Text>
          <Text style={styles.cardDesc}>Offline-first outreach form with GPS</Text>
        </Pressable>
      </Link>

      <Link href="/driver" asChild>
        <Pressable style={styles.card}>
          <Text style={styles.cardTitle}>Driver App</Text>
          <Text style={styles.cardDesc}>Routes, pickup/dropoff, live location</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8f9fc' },
  title: { fontSize: 28, fontWeight: '700', color: '#3b4cca' },
  subtitle: { fontSize: 16, color: '#64748b', marginBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#64748b' },
});
