import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { FileText } from 'lucide-react-native';

export default function ScannerHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerIcon}>
          <FileText size={28} color="#0066CC" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Document Scanner</Text>
          <Text style={styles.headerSubtitle}>AI-powered text extraction</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
});