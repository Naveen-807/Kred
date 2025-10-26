// SMSSender.ts - Send SMS responses from backend
import { Platform, PermissionsAndroid } from 'react-native';
import { debugLogger } from './DebugLogger';
import * as SMS from 'expo-sms';

export interface SMSSendResult {
  success: boolean;
  message?: string;
  error?: string;
}

export class SMSSender {
  async checkSMSPermissions(): Promise<boolean> {
    try {
      debugLogger.info('PERMISSION', 'Checking SMS sending permissions...');

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.SEND_SMS,
          {
            title: 'SMS Permission',
            message: 'This app needs SMS permission to send messages',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        debugLogger.success('PERMISSION', `SMS send permission: ${hasPermission}`);
        return hasPermission;
      }

      debugLogger.success('PERMISSION', 'SMS sending available on iOS (composer only)');
      return true;
    } catch (error) {
      debugLogger.error('PERMISSION', 'Error checking SMS permissions', error);
      return false;
    }
  }

  async sendSMS(phoneNumber: string, message: string): Promise<SMSSendResult> {
    try {
      debugLogger.info('SMS_SEND', `Sending SMS to ${phoneNumber}`, { message });

      if (!phoneNumber || !message) {
        const error = 'Phone number and message are required';
        debugLogger.error('SMS_SEND', error);
        return { success: false, error };
      }

      const hasPermission = await this.checkSMSPermissions();
      if (!hasPermission) {
        const error = 'SMS sending permission not granted';
        debugLogger.error('SMS_SEND', error);
        return { success: false, error };
      }

      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        const error = 'SMS not available on this device';
        debugLogger.error('SMS_SEND', error);
        return { success: false, error };
      }

      const result = await SMS.sendSMSAsync([phoneNumber], message);

      if (result.result === 'sent') {
        debugLogger.success('SMS_SEND', 'SMS sent successfully', { to: phoneNumber });
        return { success: true, message: 'SMS sent successfully' };
      } else if (result.result === 'cancelled') {
        const error = 'SMS was cancelled by user';
        debugLogger.warning('SMS_SEND', error);
        return { success: false, error };
      } else {
        const error = `SMS sending failed: ${result.result}`;
        debugLogger.error('SMS_SEND', error);
        return { success: false, error };
      }
    } catch (error) {
      debugLogger.error('SMS_SEND', 'Error sending SMS', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

export const smsSender = new SMSSender();
