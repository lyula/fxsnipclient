import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GOLD = '#a99d6b';
const GRAY = '#6b7280';

export default function Header({ activeTab, setActiveTab, onSearch, onCreatePost }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>  
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('forYou')}
        >
          <Text style={[styles.tabText, activeTab === 'forYou' && styles.tabTextActive]}>For you</Text>
          {activeTab === 'forYou' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>Following</Text>
          {activeTab === 'following' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>
      {/* Search Icon */}
      <TouchableOpacity style={styles.searchButton} onPress={onSearch}>
        <Icon name="search" size={16} color={GRAY} />
      </TouchableOpacity>
      {/* Create Post */}
      <TouchableOpacity style={styles.createButton} onPress={onCreatePost}>
        <Icon name="plus" size={12} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.createButtonText}>Create Post</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingBottom: 4,
    minHeight: 56,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tabButton: {
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAY,
    paddingVertical: 8,
  },
  tabTextActive: {
    color: GOLD,
  },
  tabUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: GOLD,
    borderRadius: 2,
  },
  searchButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GOLD,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 4,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
