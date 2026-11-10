import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { COLORS } from './src/constants/theme';

export default function App() {
  const [activeTab, setActiveTab] = useState('feed');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>COMSATS Lost & Found</Text>
        <Text style={styles.headerSubtitle}>Islamabad Campus Community</Text>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'feed' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Campus Lost & Found Feed</Text>
            <Text style={styles.cardText}>
              Browse recently lost and found items submitted by verified COMSATS students.
            </Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={{ color: '#DC2626', fontWeight: 'bold' }}>LOST ITEMS</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
                <Text style={{ color: '#16A34A', fontWeight: 'bold' }}>FOUND ITEMS</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'report' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Report an Item</Text>
            <Text style={styles.cardText}>
              Category and description are mandatory. Photos are optional.
            </Text>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.buttonText}>+ Create New Report</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'matches' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Potential AI Matches</Text>
            <Text style={styles.cardText}>
              When candidate pairs are processed, Gemini AI scores confidence and provides explanatory rationale.
            </Text>
          </View>
        )}

        {activeTab === 'auth' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Student Authentication</Text>
            <Text style={styles.cardText}>
              Restricted to @*.comsats.edu.pk email addresses. Email OTP verification is required.
            </Text>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.buttonText}>Go to Login / Register</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'feed' && styles.tabItemActive]}
          onPress={() => setActiveTab('feed')}
        >
          <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>Feed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'report' && styles.tabItemActive]}
          onPress={() => setActiveTab('report')}
        >
          <Text style={[styles.tabText, activeTab === 'report' && styles.tabTextActive]}>Report</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'matches' && styles.tabItemActive]}
          onPress={() => setActiveTab('matches')}
        >
          <Text style={[styles.tabText, activeTab === 'matches' && styles.tabTextActive]}>Matches</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'auth' && styles.tabItemActive]}
          onPress={() => setActiveTab('auth')}
        >
          <Text style={[styles.tabText, activeTab === 'auth' && styles.tabTextActive]}>Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 4,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  tabItemActive: {
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});
