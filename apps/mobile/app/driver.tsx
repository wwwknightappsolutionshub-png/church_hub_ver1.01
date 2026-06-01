import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginDemo } from '../lib/api';
import {
  fetchDriverProfile,
  fetchDriverRides,
  updateRideStatus,
  postDriverLocation,
  postBusEmergency,
  type DriverRide,
} from '../lib/bus-api';
import { registerForPushNotifications } from '../lib/push';
import {
  requestLocationPermissions,
  startForegroundTracking,
  startBackgroundTracking,
  stopBackgroundTracking,
  setBackgroundLocationCallback,
} from '../lib/driver-location';

const TOKEN_KEY = 'church_hub_access_token';

export default function DriverScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [rides, setRides] = useState<DriverRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async (accessToken: string) => {
    const profile = await fetchDriverProfile(accessToken);
    if (!profile?.id) {
      setError('No active driver profile for this account. Ask an admin to assign the DRIVER role.');
      setLoading(false);
      return;
    }
    setDriverId(profile.id);
    const list = await fetchDriverRides(accessToken, profile.id, today);
    setRides(list);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    (async () => {
      let accessToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (!accessToken) {
        accessToken = await loginDemo();
        if (accessToken) await AsyncStorage.setItem(TOKEN_KEY, accessToken);
      }
      if (!accessToken) {
        setError('Could not sign in. Start the API and try again.');
        setLoading(false);
        return;
      }
      setToken(accessToken);
      await registerForPushNotifications();
      await load(accessToken);
    })();
  }, [load]);

  const pushLocation = useCallback(
    async (coords: {
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
    }) => {
      if (!token || !driverId) return;
      try {
        await postDriverLocation(driverId, token, coords);
      } catch (e) {
        console.warn('Location sync failed', e);
      }
    },
    [token, driverId],
  );

  useEffect(() => {
    setBackgroundLocationCallback(pushLocation);
  }, [pushLocation]);

  const toggleTracking = async () => {
    if (!token || !driverId) return;
    if (tracking) {
      await stopBackgroundTracking();
      setTracking(false);
      return;
    }
    const ok = await requestLocationPermissions();
    if (!ok) {
      Alert.alert('Permission required', 'Location access is needed for live bus tracking.');
      return;
    }
    await startForegroundTracking(pushLocation);
    await startBackgroundTracking();
    setTracking(true);
  };

  const onStatus = async (rideId: string, status: 'PICKED_UP' | 'DROPPED_OFF' | 'NO_SHOW') => {
    if (!token) return;
    try {
      await updateRideStatus(token, rideId, status);
      setRides((prev) => prev.map((r) => (r.id === rideId ? { ...r, status } : r)));
      Alert.alert('Updated', `Ride marked as ${status.replace('_', ' ')}`);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Update failed');
    }
  };

  const onEmergency = async () => {
    if (!token || !driverId) return;
    try {
      await postBusEmergency(token, driverId, 'Driver emergency button pressed');
      Alert.alert('Emergency sent', 'Church admins have been alerted.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not send alert');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3b4cca" />
        <Text style={styles.muted}>Loading driver route…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Today&apos;s Route</Text>
        <Pressable
          style={[styles.trackBtn, tracking && styles.trackBtnActive]}
          onPress={toggleTracking}
        >
          <Text style={styles.trackBtnText}>{tracking ? 'Tracking ON' : 'Start Tracking'}</Text>
        </Pressable>
      </View>

      <FlatList
        data={rides}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.muted}>No scheduled rides for today.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>
              {item.member.firstName} {item.member.lastName}
            </Text>
            <Text style={styles.address}>{item.pickupAddress}</Text>
            <Text style={styles.status}>
              {item.status}
              {item.etaMinutes != null ? ` · ETA ${item.etaMinutes} min` : ''}
            </Text>
            <View style={styles.actions}>
              <Pressable style={styles.actionBtn} onPress={() => onStatus(item.id, 'PICKED_UP')}>
                <Text style={styles.actionText}>Picked Up</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => onStatus(item.id, 'DROPPED_OFF')}>
                <Text style={styles.actionText}>Dropped Off</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.noShow]}
                onPress={() => onStatus(item.id, 'NO_SHOW')}
              >
                <Text style={styles.actionText}>No Show</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <Pressable style={styles.emergencyBtn} onPress={onEmergency}>
        <Text style={styles.emergencyText}>EMERGENCY</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8f9fc' },
  centered: { justifyContent: 'center', alignItems: 'center', gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heading: { fontSize: 22, fontWeight: '600' },
  trackBtn: { backgroundColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  trackBtnActive: { backgroundColor: '#22c55e' },
  trackBtnText: { fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  name: { fontSize: 18, fontWeight: '600' },
  address: { color: '#64748b', marginTop: 4 },
  status: { marginTop: 8, fontSize: 12, color: '#3b4cca', fontWeight: '600' },
  muted: { color: '#64748b', textAlign: 'center', marginTop: 24 },
  error: { color: '#b91c1c', textAlign: 'center', paddingHorizontal: 16 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, backgroundColor: '#3b4cca', padding: 10, borderRadius: 8, alignItems: 'center' },
  noShow: { backgroundColor: '#94a3b8' },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  emergencyBtn: { backgroundColor: '#dc2626', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  emergencyText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
