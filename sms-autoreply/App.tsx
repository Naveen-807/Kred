import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  StatusBar,
} from 'react-native';
import { smsReceiver, SMSMessage } from './services/SMSReceiver';
import { nativeSMSSender } from './services/NativeSMSSender';
import { debugLogger } from './services/DebugLogger';

export default function App() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    debugLogger.info('APP', 'Initializing SMS Auto-Reply App');
    const granted = await smsReceiver.initialize();
    setPermissionGranted(granted);
    setInitialized(true);
    debugLogger.success('APP', `Initialization complete. Permissions: ${granted}`);
    
    // Request to set as default SMS app for Android 15+ compatibility
    if (granted) {
      await smsReceiver.requestDefaultSmsApp();
    }
  };

  const toggleAutoReply = async () => {
    if (!permissionGranted) {
      debugLogger.error('APP', 'Cannot toggle - permissions not granted');
      return;
    }

    if (isEnabled) {
      // Stop listening
      smsReceiver.stopListening();
      setIsEnabled(false);
      debugLogger.info('APP', 'Auto-reply disabled');
    } else {
      // Start listening
      smsReceiver.startListening(handleIncomingSMS);
      setIsEnabled(true);
      debugLogger.info('APP', 'Auto-reply enabled');
    }
  };

  const handleIncomingSMS = async (message: SMSMessage) => {
    debugLogger.info('APP', 'Processing incoming SMS', {
      from: message.address,
      body: message.body,
    });

    // Add to message list
    setMessages((prev) => [message, ...prev].slice(0, 50)); // Keep last 50 messages

    // Send auto-reply
    if (isEnabled) {
      const result = await nativeSMSSender.sendAutoReply(
        message.address,
        message.body
      );

      if (result.success) {
        debugLogger.success('APP', 'Auto-reply sent successfully', {
          to: message.address,
        });
      } else {
        debugLogger.error('APP', 'Failed to send auto-reply', {
          error: result.error,
        });
      }
    }
  };

  if (!initialized) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  if (!permissionGranted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.errorText}>SMS Permissions Required</Text>
        <Text style={styles.errorSubtext}>
          Please grant SMS permissions to use this app.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeApp}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📱 SMS Auto-Reply</Text>
        <Text style={styles.subtitle}>
          {isEnabled ? '🟢 Active' : '🔴 Inactive'}
        </Text>
      </View>

      {/* Toggle Switch */}
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>Auto-Reply</Text>
        <Switch
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isEnabled ? '#4CAF50' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
          onValueChange={toggleAutoReply}
          value={isEnabled}
        />
      </View>

      {/* Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {isEnabled
            ? 'Listening for incoming SMS messages'
            : 'Auto-reply is paused'}
        </Text>
      </View>

      {/* Messages List */}
      <View style={styles.messagesContainer}>
        <Text style={styles.messagesTitle}>
          Recent Messages ({messages.length})
        </Text>
        <ScrollView style={styles.messagesList}>
          {messages.length === 0 ? (
            <Text style={styles.noMessagesText}>
              No messages yet. Send an SMS to this device to test.
            </Text>
          ) : (
            messages.map((msg, index) => (
              <View key={index} style={styles.messageItem}>
                <Text style={styles.messageFrom}>From: {msg.address}</Text>
                <Text style={styles.messageBody}>{msg.body}</Text>
                <Text style={styles.messageDate}>
                  {new Date(msg.date).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by OfflinePay • SMS Gateway
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
    paddingTop: 50,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1f2937',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 10,
  },
  toggleLabel: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  statusContainer: {
    padding: 15,
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#1f2937',
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#1f2937',
    borderRadius: 10,
    overflow: 'hidden',
  },
  messagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  messagesList: {
    flex: 1,
  },
  noMessagesText: {
    color: '#6b7280',
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
  },
  messageItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  messageFrom: {
    fontSize: 14,
    fontWeight: '600',
    color: '#60a5fa',
    marginBottom: 5,
  },
  messageBody: {
    fontSize: 14,
    color: '#e5e7eb',
    marginBottom: 5,
  },
  messageDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  footer: {
    padding: 15,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 20,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
