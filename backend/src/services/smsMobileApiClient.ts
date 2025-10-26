/**
 * SMSMobileAPI Client
 * Handles sending SMS via SMSMobileAPI REST API
 */

import axios from 'axios';

const API_BASE_URL = 'https://api.smsmobileapi.com';

/**
 * Validate phone number is Indian (+91)
 */
function isValidIndianNumber(phoneNumber: string): boolean {
  const normalized = phoneNumber.trim();
  const pattern = /^\+91\d{10}$/;
  return pattern.test(normalized);
}

/**
 * Normalize phone number to +91 format
 */
function normalizePhoneNumber(phone: string): string {
  let normalized = phone.trim();
  normalized = normalized.replace(/[\s\-\(\)]/g, '');
  
  if (normalized.startsWith('0')) {
    normalized = normalized.substring(1);
  }
  
  if (normalized.match(/^91\d{10}$/)) {
    return '+' + normalized;
  }
  
  if (normalized.match(/^\d{10}$/)) {
    return '+91' + normalized;
  }
  
  if (normalized.startsWith('+91') && normalized.length === 13) {
    return normalized;
  }
  
  return normalized;
}

/**
 * Send SMS to a user via SMSMobileAPI
 */
export async function sendSMSToUser(phoneNumber: string, message: string): Promise<boolean> {
  try {
    const apiKey = process.env.SMSMOBILEAPI_KEY;
    
    if (!apiKey) {
      console.error('❌ SMSMOBILEAPI_KEY not configured');
      return false;
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    if (!isValidIndianNumber(normalizedPhone)) {
      console.error('❌ Invalid phone number format:', phoneNumber);
      return false;
    }

    const params = new URLSearchParams({
      apikey: apiKey,
      recipients: normalizedPhone,
      message: message,
      sendsms: '1'
    });

    console.log(`📤 Sending SMS to ${normalizedPhone} via SMSMobileAPI...`);
    
    const response = await axios.post(
      `${API_BASE_URL}/sendsms/`,
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    console.log('✅ SMSMobileAPI response:', response.data);
    return true;
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ SMSMobileAPI error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    } else {
      console.error('❌ Failed to send SMS:', error);
    }
    return false;
  }
}

/**
 * Get received SMS from SMSMobileAPI
 */
export async function getReceivedSMS(onlyUnread: boolean = true): Promise<any[]> {
  try {
    const apiKey = process.env.SMSMOBILEAPI_KEY;
    
    if (!apiKey) {
      console.error('❌ SMSMOBILEAPI_KEY not configured');
      return [];
    }

    const params = {
      apikey: apiKey,
      onlyunread: onlyUnread ? 'yes' : 'no'
    };

    const response = await axios.get(`${API_BASE_URL}/getsms/`, { 
      params,
      timeout: 10000
    });

    return response.data || [];
    
  } catch (error) {
    console.error('❌ Failed to get SMS:', error);
    return [];
  }
}
