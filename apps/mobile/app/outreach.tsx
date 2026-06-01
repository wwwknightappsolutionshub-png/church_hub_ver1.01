import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { v4 as uuidv4 } from 'uuid';
import { addToQueue, getQueue, syncQueue } from '../lib/sync';
import { registerForPushNotifications } from '../lib/push';

export default function OutreachScreen() {
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(0);

  const refreshPending = useCallback(async () => {
    setPending((await getQueue()).length);
  }, []);

  useEffect(() => {
    refreshPending();
    syncQueue().then(() => refreshPending()).catch(() => {});
    registerForPushNotifications().catch(() => {});
  }, [refreshPending]);

  const capture = async () => {
    if (!firstName.trim()) {
      Alert.alert('Required', 'First name is required');
      return;
    }
    setSaving(true);
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }

      await addToQueue({
        clientId: uuidv4(),
        entityType: 'OUTREACH_CAPTURE',
        payload: { firstName, phone, latitude, longitude, photoConsent: false },
        capturedAt: new Date().toISOString(),
      });

      try {
        const result = await syncQueue();
        Alert.alert('Saved', result.synced > 0 ? `${result.synced} synced to server` : 'Queued for sync');
      } catch {
        Alert.alert('Saved offline', 'Queued — tap Sync when API is online');
      }

      setFirstName('');
      setPhone('');
      await refreshPending();
    } finally {
      setSaving(false);
    }
  };

  const manualSync = async () => {
    try {
      const result = await syncQueue();
      Alert.alert('Sync complete', `${result.synced} synced, ${result.failed} failed`);
      await refreshPending();
    } catch {
      Alert.alert('Sync failed', 'Start API and run: pnpm --filter @church-hub/api prisma:seed');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.pending}>{pending} pending in queue</Text>
      </View>
      <Text style={styles.heading}>Quick Outreach Capture</Text>
      <TextInput style={styles.input} placeholder="First name" value={firstName} onChangeText={setFirstName} />
      <TextInput style={styles.input} placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Pressable style={styles.button} onPress={capture} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Capture Contact'}</Text>
      </Pressable>
      {pending > 0 && (
        <Pressable style={styles.syncBtn} onPress={manualSync}>
          <Text style={styles.syncBtnText}>Sync now ({pending})</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8f9fc' },
  statusBar: { marginBottom: 16 },
  pending: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  heading: { fontSize: 22, fontWeight: '600', marginBottom: 24 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3b4cca',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  syncBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#3b4cca',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  syncBtnText: { color: '#3b4cca', fontWeight: '600' },
});
