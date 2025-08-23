import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Trash2, Copy, FileText, Edit3, Search, Clock, Calendar, ChevronDown } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useDocuments } from "@/contexts/DocumentContext";
import { Document } from "@/lib/supabase";
import TextFormatter from "@/components/TextFormatter";

const { width } = Dimensions.get('window');

export default function HistoryScreen() {
  const { 
    documents, 
    loading, 
    loadingMore, 
    hasMore, 
    totalCount,
    deleteDocument, 
    refreshDocuments,
    loadMoreDocuments 
  } = useDocuments();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showFormatter, setShowFormatter] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearch, setShowSearch] = useState(false);

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    return documents.filter(doc => 
      doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery]);

  const groupedDocuments = useMemo(() => {
    const groups: { [key: string]: Document[] } = {};
    
    filteredDocuments.forEach(doc => {
      const date = new Date(doc.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(doc);
    });
    
    return Object.entries(groups).sort(([a], [b]) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
  }, [filteredDocuments]);

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Text copied to clipboard!");
  };

  const confirmDelete = (id: string) => {
    Alert.alert(
      "Delete Document",
      "Are you sure you want to delete this document?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteDocument(id) },
      ]
    );
  };

  const openFormatter = (document: Document) => {
    setSelectedDocument(document);
    setShowFormatter(true);
  };

  const closeFormatter = () => {
    setShowFormatter(false);
    setSelectedDocument(null);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(date);
    }
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).length;
  };

  const renderDocumentItem = ({ item }: { item: Document }) => (
    <TouchableOpacity 
      style={styles.scanItem}
      onPress={() => openFormatter(item)}
      activeOpacity={0.7}
    >
      <View style={styles.scanContent}>
        <View style={styles.scanImageContainer}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
              <FileText size={24} color="#6B7280" />
            </View>
          )}
          <View style={styles.imageOverlay}>
            <FileText size={16} color="#FFFFFF" />
          </View>
        </View>
        
        <View style={styles.scanInfo}>
          <View style={styles.scanMetadata}>
            <View style={styles.timeContainer}>
              <Clock size={12} color="#6B7280" />
              <Text style={styles.scanTime}>{formatTime(new Date(item.created_at))}</Text>
            </View>
            <View style={styles.wordCountContainer}>
              <Text style={styles.wordCount}>{getWordCount(item.content)} words</Text>
            </View>
          </View>
          
          <Text style={styles.documentTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.scanPreview} numberOfLines={2}>
            {item.content}
          </Text>
        </View>
      </View>
      
      <View style={styles.scanActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={(e) => {
            e.stopPropagation();
            openFormatter(item);
          }}
        >
          <Edit3 size={16} color="#0066CC" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.copyButton]}
          onPress={(e) => {
            e.stopPropagation();
            copyToClipboard(item.content);
          }}
        >
          <Copy size={16} color="#34C759" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={(e) => {
            e.stopPropagation();
            confirmDelete(item.id);
          }}
        >
          <Trash2 size={16} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderDateSection = ({ item }: { item: [string, Document[]] }) => {
    const [dateString, documentsForDate] = item;
    
    return (
      <View style={styles.dateSection}>
        <View style={styles.dateSectionHeader}>
          <Calendar size={16} color="#6B7280" />
          <Text style={styles.dateSectionTitle}>{formatDateHeader(dateString)}</Text>
          <View style={styles.scanCountBadge}>
            <Text style={styles.scanCountText}>{documentsForDate.length}</Text>
          </View>
        </View>
        
        {documentsForDate.map((document) => (
          <View key={document.id}>
            {renderDocumentItem({ item: document })}
          </View>
        ))}
      </View>
    );
  };

  const renderEmptyState = () => {
    const isSearching = searchQuery.trim().length > 0;
    
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          {isSearching ? (
            <Search size={48} color="#8E8E93" />
          ) : (
            <FileText size={48} color="#8E8E93" />
          )}
        </View>
        <Text style={styles.emptyTitle}>
          {isSearching ? "No Results Found" : "No Documents Yet"}
        </Text>
        <Text style={styles.emptyDescription}>
          {isSearching 
            ? `No documents match "${searchQuery}"` 
            : "Your scanned documents will appear here"}
        </Text>
        {isSearching && (
          <TouchableOpacity 
            style={styles.clearSearchButton}
            onPress={() => setSearchQuery("")}
          >
            <Text style={styles.clearSearchText}>Clear Search</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    // Don't show footer when searching (search shows all results)
    if (searchQuery.trim().length > 0) {
      return null;
    }

    // Don't show footer if no documents or no more to load
    if (documents.length === 0) {
      return null;
    }

    return (
      <View style={styles.footerContainer}>
        {hasMore ? (
          <TouchableOpacity 
            style={styles.loadMoreButton}
            onPress={loadMoreDocuments}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <View style={styles.loadMoreContent}>
                <ActivityIndicator size="small" color="#0066CC" />
                <Text style={styles.loadMoreText}>Loading...</Text>
              </View>
            ) : (
              <View style={styles.loadMoreContent}>
                <ChevronDown size={20} color="#0066CC" />
                <Text style={styles.loadMoreText}>Load More Documents</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.endOfListContainer}>
            <View style={styles.endOfListLine} />
            <Text style={styles.endOfListText}>You've reached the end</Text>
            <View style={styles.endOfListLine} />
          </View>
        )}
      </View>
    );
  };

  if (showFormatter && selectedDocument) {
    return (
      <TextFormatter
        initialText={selectedDocument.content}
        onBack={closeFormatter}
        documentId={selectedDocument.id}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleContainer}>
            <View style={styles.headerIcon}>
              <Clock size={24} color="#0066CC" />
            </View>
            <Text style={styles.headerTitle}>Scan History</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.headerButton, showSearch && styles.headerButtonActive]}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Search size={20} color={showSearch ? "#FFFFFF" : "#6B7280"} />
            </TouchableOpacity>
            

          </View>
        </View>
        
        {showSearch && (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Search size={16} color="#6B7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search in scanned text..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Text style={styles.clearSearchIcon}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        
        {filteredDocuments.length > 0 && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {searchQuery 
                ? `${filteredDocuments.length} document${filteredDocuments.length !== 1 ? 's' : ''} found`
                : `Showing ${documents.length} of ${totalCount} document${totalCount !== 1 ? 's' : ''}`
              }
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={groupedDocuments}
        renderItem={renderDateSection}
        keyExtractor={([dateString]) => dateString}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshDocuments}
            tintColor="#0066CC"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonActive: {
    backgroundColor: "#0066CC",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1A1A1A",
  },
  clearSearchIcon: {
    fontSize: 20,
    color: "#6B7280",
    fontWeight: "bold",
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#F8F9FA",
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
  },
  dateSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginLeft: 8,
    flex: 1,
  },
  scanCountBadge: {
    backgroundColor: "#0066CC",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: "center",
  },
  scanCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scanItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  scanContent: {
    flexDirection: "row",
    padding: 20,
  },
  scanImageContainer: {
    position: "relative",
    marginRight: 16,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 102, 204, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0066CC",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  scanInfo: {
    flex: 1,
  },
  scanMetadata: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scanTime: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  wordCountContainer: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  wordCount: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  scanPreview: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
    fontWeight: "400",
  },
  scanActions: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  editButton: {
    backgroundColor: "#E3F2FD",
  },
  copyButton: {
    backgroundColor: "#E8F5E8",
  },
  deleteButton: {
    backgroundColor: "#FEE2E2",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  clearSearchButton: {
    backgroundColor: "#0066CC",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#0066CC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  clearSearchText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  placeholderThumbnail: {
    backgroundColor: "#F8F9FA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E8E8E8",
    borderStyle: "dashed",
  },
  documentTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 6,
    lineHeight: 24,
  },
  footerContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  loadMoreButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    minWidth: 200,
  },
  loadMoreContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0066CC",
  },
  endOfListContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  endOfListLine: {
    height: 1,
    backgroundColor: "#E8E8E8",
    flex: 1,
  },
  endOfListText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    paddingHorizontal: 12,
  },
});