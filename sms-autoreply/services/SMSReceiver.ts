import { Alert, PermissionsAndroid, Platform, DeviceEventEmitter } from 'react-native';
import { debugLogger } from './DebugLogger';
import SmsAndroid from 'react-native-get-sms-android';

export interface SMSMessage {
  address: string;
  body: string;
  date: string;
  type: 'sent' | 'received';
}

export class SMSReceiver {
  private isListening = false;
  private onMessageReceived?: (message: SMSMessage) => void;
  private smsListener?: any;
  private lastProcessedId = '';
  private pollingInterval?: NodeJS.Timeout;

  async initialize(): Promise<boolean> {
    try {
      debugLogger.info('PERMISSION', 'Initializing SMS receiver...');
      console.log('Initializing SMS receiver...');

      if (Platform.OS === 'android') {
        // First check if permissions are already granted
        const readSMSCheck = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
        const receiveSMSCheck = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
        const sendSMSCheck = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS);

        debugLogger.info('PERMISSION', 'Current permission status', {
          readSMS: readSMSCheck,
          receiveSMS: receiveSMSCheck,
          sendSMS: sendSMSCheck
        });

        if (readSMSCheck && receiveSMSCheck && sendSMSCheck) {
          debugLogger.success('PERMISSION', 'All SMS permissions already granted');
          return true;
        }

        // Request missing permissions
        const permissionsToRequest = [];
        if (!readSMSCheck) permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.READ_SMS);
        if (!receiveSMSCheck) permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
        if (!sendSMSCheck) permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.SEND_SMS);

        debugLogger.info('PERMISSION', 'Requesting SMS permissions...', {
          permissions: permissionsToRequest
        });

        const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);

        // Check results
        const readSMSGranted = readSMSCheck || granted[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;
        const receiveSMSGranted = receiveSMSCheck || granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED;
        const sendSMSGranted = sendSMSCheck || granted[PermissionsAndroid.PERMISSIONS.SEND_SMS] === PermissionsAndroid.RESULTS.GRANTED;

        debugLogger.info('PERMISSION', 'Permission request results', {
          readSMS: readSMSGranted,
          receiveSMS: receiveSMSGranted,
          sendSMS: sendSMSGranted,
          grantedResults: granted
        });

        if (!readSMSGranted || !receiveSMSGranted) {
          debugLogger.error('PERMISSION', 'Essential SMS permissions not granted', {
            readSMS: readSMSGranted,
            receiveSMS: receiveSMSGranted,
            sendSMS: sendSMSGranted
          });

          Alert.alert(
            'SMS Permissions Required',
            'This app needs SMS permissions to automatically reply to messages.\n\n' +
            'To grant permissions:\n' +
            '1. Go to Settings > Apps > SMS Auto-Reply\n' +
            '2. Tap Permissions\n' +
            '3. Enable SMS permissions\n\n' +
            'Then restart the app.',
            [
              { text: 'Open Settings', onPress: () => this.openAppSettings() },
              { text: 'OK' }
            ]
          );
          return false;
        }

        if (!sendSMSGranted) {
          debugLogger.warning('PERMISSION', 'Send SMS permission not granted - auto-reply may not work');
        }

        debugLogger.success('PERMISSION', 'SMS permissions initialized successfully');
        console.log('SMS permissions granted');
        return true;
      } else {
        debugLogger.warning('PERMISSION', 'SMS reading not supported on iOS');
        Alert.alert(
          'Not Supported',
          'SMS reading is only supported on Android devices.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (error) {
      debugLogger.error('PERMISSION', 'Failed to initialize SMS receiver', error);
      console.error('Error initializing SMS permissions:', error);
      return false;
    }
  }

  private openAppSettings(): void {
    try {
      const pkg = 'com.sauravnk30.smsautoreply';
      const settingsURL = `android.settings.APPLICATION_DETAILS_SETTINGS`;
      // This would need a native module to properly open settings
      // For now, just log the instruction
      debugLogger.info('PERMISSION', 'User requested to open app settings');
      console.log('Please manually open Settings > Apps > SMS Auto-Reply > Permissions');
    } catch (error) {
      debugLogger.error('PERMISSION', 'Failed to open app settings', error);
    }
  }

  startListening(onMessageReceived: (message: SMSMessage) => void): void {
    if (this.isListening) {
      debugLogger.warning('SMS_RECEIVE', 'SMS listener already running');
      console.log('SMS listener is already running');
      return;
    }

    this.onMessageReceived = onMessageReceived;

    try {
      debugLogger.info('SMS_RECEIVE', 'Starting real SMS listener...');
      console.log('Starting real SMS listener...');

      this.isListening = true;

      if (Platform.OS === 'android') {
        // Start listening for incoming SMS messages using polling approach
        this.startSMSPolling();

        debugLogger.success('SMS_RECEIVE', 'SMS polling started successfully');
        console.log('SMS polling started successfully');

        Alert.alert(
          'SMS Listener Started',
          'SMS listener is now active. The app will automatically reply to incoming SMS messages.',
          [{ text: 'OK' }]
        );
      } else {
        debugLogger.error('SMS_RECEIVE', 'SMS listening not supported on this platform');
        console.error('SMS listening not supported on this platform');
        this.isListening = false;
      }
    } catch (error) {
      debugLogger.error('SMS_RECEIVE', 'Failed to start SMS listener', error);
      console.error('Failed to start SMS listener:', error);
      this.isListening = false;
    }
  }

  private startSMSPolling(): void {
    // Poll for new SMS messages every 2 seconds
    this.pollingInterval = setInterval(() => {
      if (!this.isListening) return;

      SmsAndroid.list(
        JSON.stringify({
          box: 'inbox',
          maxCount: 5,
          indexFrom: 0,
        }),
        (fail: any) => {
          debugLogger.error('SMS_RECEIVE', 'Failed to read SMS', fail);
        },
        (count: number, smsList: string) => {
          try {
            const messages = JSON.parse(smsList);

            // Process new messages (check for messages newer than last processed)
            for (const sms of messages) {
              if (sms._id && sms._id !== this.lastProcessedId && this.onMessageReceived) {
                // Check if this is a recent message (within last 30 seconds)
                const messageTime = parseInt(sms.date);
                const now = Date.now();
                const timeDiff = now - messageTime;

                if (timeDiff < 30000) { // 30 seconds
                  const message: SMSMessage = {
                    address: sms.address || 'Unknown',
                    body: sms.body || '',
                    date: new Date(messageTime).toISOString(),
                    type: 'received'
                  };

                  debugLogger.success('SMS_RECEIVE', 'New SMS detected', {
                    from: message.address,
                    message: message.body,
                    id: sms._id
                  });

                  this.lastProcessedId = sms._id;
                  this.onMessageReceived(message);
                  break; // Process only the newest message
                }
              }
            }
          } catch (error) {
            debugLogger.error('SMS_RECEIVE', 'Error parsing SMS list', error);
          }
        }
      );
    }, 2000);
  }

  stopListening(): void {
    this.isListening = false;
    this.onMessageReceived = undefined;

    // Stop the polling interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
      debugLogger.info('SMS_RECEIVE', 'SMS polling stopped');
      console.log('SMS polling stopped');
    } else {
      debugLogger.info('SMS_RECEIVE', 'SMS listener stopped');
      console.log('SMS listener stopped');
    }
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }
}

export const smsReceiver = new SMSReceiver();
