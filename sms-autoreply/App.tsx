import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { smsReceiver, SMSMessage } from './services/SMSReceiver';
import { smsSender } from './services/SMSSender';
import { backendService } from './services/BackendService';
import { debugLogger } from './services/DebugLogger';

export default function App() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [backendUrl, setBackendUrl] = useState('http://10.232.97.88:8080');
  const [backendConnected, setBackendConnected] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    debugLogger.info('APP', 'Initializing SMS Gateway App');
    const granted = await smsReceiver.initialize();
    setPermissionGranted(granted);
    setInitialized(true);
    debugLogger.success('APP', `Initialization complete. Permissions: ${granted}`);
  };

  const testBackendConnection = async () => {
    backendService.setBackendUrl(backendUrl);
    const connected = await backendService.testConnection();
    setBackendConnected(connected);
    
    if (connected) {
      Alert.alert('✅ Connected', 'Backend connection successful!');
    } else {
      Alert.alert('❌ Failed', 'Could not connect to backend. Check the URL and ensure your Mac server is running.');
    }
  };

  const toggleGateway = async () => {
    if (!permissionGranted) {
      debugLogger.error('APP', 'Cannot toggle - permissions not granted');
      return;
    }

    if (!backendConnected) {
      Alert.alert('⚠️ Backend Not Connected', 'Please test backend connection first.');
      return;
    }

    if (isEnabled) {
      smsReceiver.stopListening();
      setIsEnabled(false);
      debugLogger.info('APP', 'SMS Gateway disabled');
    } else {
      smsReceiver.startListening(handleIncomingSMS);
      setIsEnabled(true);
      debugLogger.info('APP', 'SMS Gateway enabled');
    }
  };

  const handleIncomingSMS = async (message: SMSMessage) => {
    debugLogger.info('APP', 'SMS received, forwarding to backend', {
      from: message.address,
      body: message.body,
    });

    setMessages((prev: any) => [message, ...prev].slice(0, 50));

    // Forward to backend
    const result = await backendService.forwardSMS(message.address, message.body);

    if (result.success && result.reply) {
      debugLogger.info('APP', 'Backend replied, sending SMS', { reply: result.reply });
      
      // Send reply from backend
      const sendResult = await smsSender.sendSMS(message.address, result.reply);
      
      if (sendResult.success) {
        debugLogger.success('APP', 'Reply sent successfully');
      } else {
        debugLogger.error('APP', 'Failed to send reply', { error: sendResult.error });
      }
    } else if (!result.success) {
      debugLogger.error('APP', 'Backend error', { error: result.error });
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
        <Text style={styles.errorText}>❌ SMS Permissions Required</Text>
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
        <Text style={styles.title}>📱 SMS Gateway</Text>
        <Text style={styles.subtitle}>
          {isEnabled ? '🟢 Active' : '🔴 Inactive'}
        </Text>
      </View>

      {/* Backend URL Configuration */}
      <View style={styles.configContainer}>
        <Text style={styles.configLabel}>Backend URL (Mac IP:Port)</Text>
        <TextInput
          style={styles.input}
          value={backendUrl}
          onChangeText={setBackendUrl}
          placeholder="http://10.232.97.88:8080"
          placeholderTextColor="#6b7280"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.testButton} onPress={testBackendConnection}>
          <Text style={styles.testButtonText}>
            {backendConnected ? '✅ Connected' : '🔍 Test Connection'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Toggle Switch */}
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>SMS Gateway</Text>
        <Switch
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isEnabled ? '#4CAF50' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
          onValueChange={toggleGateway}
          value={isEnabled}
          disabled={!backendConnected}
        />
      </View>

      {/* Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {!backendConnected
            ? '⚠️ Backend not connected - test connection first'
            : isEnabled
            ? '✅ Forwarding SMS to backend'
            : '⏸️ Gateway is paused'}
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
              No messages yet. Configure backend and enable gateway to start.
            </Text>
          ) : (
            messages.map((msg: any, index: any) => (
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
  configContainer: {
    padding: 20,
    backgroundColor: '#1f2937',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 10,
  },
  configLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 10,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#374151',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 10,
  },
  testButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
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
