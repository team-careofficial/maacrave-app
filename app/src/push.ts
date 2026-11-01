import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { API } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Asks for permission once and registers this device for order updates. */
export async function registerForPush() {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', { name: 'Order updates', importance: Notifications.AndroidImportance.HIGH });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await API.pushToken(token, Platform.OS).catch(() => undefined);
}
