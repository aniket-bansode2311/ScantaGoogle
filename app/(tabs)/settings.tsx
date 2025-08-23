import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, Info, Trash2, Star, LogOut, User, Settings as SettingsIcon, Shield, Globe, Cloud, PenTool } from "lucide-react-native";
import { useDocuments } from "@/contexts/DocumentContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOCRSettings } from "@/contexts/OCRSettingsContext";
import LanguageSelector from "@/components/LanguageSelector";
import CloudSyncToggle from "@/components/CloudSyncToggle";
import SavedSignaturesManager from "@/components/SavedSignaturesManager";

export default function SettingsScreen() {
  const { clearAllDocuments, documents } = useDocuments();
  const { user, signOut } = useAuth();
  const { selectedLanguage, getLanguageNativeName } = useOCRSettings();

  const confirmClearHistory = () => {
    const documentCount = documents.length;
    Alert.alert(
      "Clear All Documents",
      `Are you sure you want to delete all ${documentCount} scanned document${documentCount !== 1 ? 's' : ''}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear All", style: "destructive", onPress: clearAllDocuments },
      ]
    );
  };

  const showAbout = () => {
    Alert.alert(
      "About Document Scanner",
      "A powerful document scanner app that extracts text from images using AI technology and stores them securely in the cloud.\n\nVersion 1.0.0\nPowered by Supabase & Rork AI",
      [{ text: "OK" }]
    );
  };

  const showRateApp = () => {
    Alert.alert(
      "Rate This App",
      "If you enjoy using Document Scanner, please consider rating it in the App Store!",
      [
        { text: "Maybe Later", style: "cancel" },
        { text: "Rate Now", onPress: () => console.log("Rate app") },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? Your documents will remain safely stored in your account.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: signOut },
      ]
    );
  };

  const showDataInfo = () => {
    const documentCount = documents.length;
    Alert.alert(
      "Your Data",
      `You have ${documentCount} document${documentCount !== 1 ? 's' : ''} stored securely in your account. All data is encrypted and only accessible by you.`,
      [{ text: "OK" }]
    );
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showChevron = true,
    textColor = "#000000",
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress: () => void;
    showChevron?: boolean;
    textColor?: string;
  }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>{icon}</View>
        <View style={styles.textContainer}>
          <Text style={[styles.settingTitle, { color: textColor }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.settingSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      {showChevron && <ChevronRight size={20} color="#C7C7CC" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <SettingsIcon size={28} color="#0066CC" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Manage your account & preferences</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={<User size={20} color="#0066CC" />}
              title="Signed in as"
              subtitle={user?.email || 'Unknown user'}
              onPress={showDataInfo}
              showChevron={false}
            />
            <SettingItem
              icon={<LogOut size={20} color="#FF3B30" />}
              title="Sign Out"
              subtitle="Sign out of your account"
              onPress={handleSignOut}
              textColor="#FF3B30"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cloud Sync</Text>
          <View style={styles.sectionContent}>
            <CloudSyncToggle />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OCR Settings</Text>
          <View style={styles.sectionContent}>
            <LanguageSelector />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Signatures</Text>
          <View style={styles.sectionContent}>
            <SavedSignaturesManager />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={<Info size={20} color="#0066CC" />}
              title="My Data"
              subtitle={`${documents.length} document${documents.length !== 1 ? 's' : ''} stored securely`}
              onPress={showDataInfo}
            />
            <SettingItem
              icon={<Trash2 size={20} color="#FF3B30" />}
              title="Clear All Documents"
              subtitle="Delete all scanned documents"
              onPress={confirmClearHistory}
              textColor="#FF3B30"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={<Star size={20} color="#FF9500" />}
              title="Rate This App"
              subtitle="Help us improve by leaving a review"
              onPress={showRateApp}
            />
            <SettingItem
              icon={<Info size={20} color="#0066CC" />}
              title="About"
              subtitle="Version and app information"
              onPress={showAbout}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Document Scanner</Text>
          <Text style={styles.footerSubtext}>Version 1.0.0</Text>
          <Text style={styles.footerSubtext}>Powered by AI & Cloud Storage</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
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
  content: {
    flex: 1,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  sectionContent: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 3,
  },
  settingSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
    textAlign: "center",
    lineHeight: 20,
  },
});