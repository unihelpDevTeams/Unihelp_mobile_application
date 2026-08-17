import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  Keyboard,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../shared/theme/ThemeContext';
import { useThemeStyles } from '../../shared/theme/createStyles';

export default function SearchableDropdown({
  data = [],
  value,
  onSelect,
  placeholder = 'Search...',
  label,
  error,
  loading = false,
  searchText = '',
  onSearchChange,
  onLoadMore,
  hasMore = false,
  renderItemLabel,
  icon,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSearch, setInternalSearch] = useState('');

  const isControlledSearch = onSearchChange !== undefined;
  const effectiveSearch = isControlledSearch ? searchText : internalSearch;

  const handleSearchChange = useCallback((text) => {
    if (onSearchChange) onSearchChange(text);
    else setInternalSearch(text);
  }, [onSearchChange]);

  const handleSelect = useCallback((item) => {
    onSelect(item);
    setIsOpen(false);
    Keyboard.dismiss();
  }, [onSelect]);

  const { colors } = useTheme();

  const st = useThemeStyles((c, s, r) => ({
    container: { gap: 6 },
    label: { color: c.inkLight, fontSize: 12.5, fontWeight: '700' },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.greyLight,
      borderRadius: r.xl,
      paddingHorizontal: s.lg,
      paddingVertical: s.md,
      backgroundColor: c.surface,
      minHeight: 48,
    },
    triggerOpen: { borderColor: c.brand, borderWidth: 2 },
    triggerError: { borderColor: c.rose, borderWidth: 1.5 },
    triggerPressed: { opacity: 0.8 },
    triggerDisabled: { opacity: 0.5 },
    triggerIcon: { marginRight: s.sm },
    triggerText: { flex: 1, fontSize: 15, color: c.ink },
    triggerPlaceholder: { color: c.greyLight },
    errorText: { color: c.rose, fontSize: 12, fontWeight: '500' },
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    dropdown: {
      backgroundColor: c.surface,
      borderTopLeftRadius: r['3xl'],
      borderTopRightRadius: r['3xl'],
      maxHeight: '70%',
      paddingTop: s.xl,
      paddingBottom: s['3xl'],
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: s.xl,
      marginBottom: s.md,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: r.xl,
      paddingHorizontal: s.md,
      backgroundColor: c.canvasLight,
    },
    searchIcon: { marginRight: s.sm },
    searchInput: { flex: 1, fontSize: 15, color: c.ink, paddingVertical: s.md },
    list: { maxHeight: 350 },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: s.xl,
      paddingVertical: s.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderLight,
      gap: s.sm,
    },
    itemSelected: { backgroundColor: c.brandLight },
    itemPressed: { backgroundColor: c.canvasLight },
    itemText: { flex: 1, fontSize: 15, color: c.ink, lineHeight: 21 },
    itemTextSelected: { fontWeight: '700', color: c.brandText },
    centerState: { alignItems: 'center', justifyContent: 'center', paddingVertical: s['4xl'], gap: s.sm },
    stateText: { color: c.grey, fontSize: 13 },
    loadMoreButton: { alignItems: 'center', paddingVertical: s.md },
    loadMoreText: { color: c.brandText, fontWeight: '700', fontSize: 13 },
  }));

  const selectedItem = value ? data.find((item) => item.id === value) : null;
  const close = useCallback(() => setIsOpen(false), []);

  // Clear any locally-managed search text once the dropdown closes, so it
  // doesn't show stale results the next time it's opened. Only applies when
  // this component owns the search state (no onSearchChange from parent).
  useEffect(() => {
    if (!isOpen && !isControlledSearch && internalSearch) {
      setInternalSearch('');
    }
  }, [isOpen, isControlledSearch]);

  return (
    <View style={st.container}>
      {label && <Text style={st.label}>{label}</Text>}

      <Pressable
        style={({ pressed }) => [
          st.trigger,
          isOpen && st.triggerOpen,
          error && st.triggerError,
          pressed && st.triggerPressed,
          disabled && st.triggerDisabled,
        ]}
        onPress={() => {
          if (disabled) return;
          Keyboard.dismiss();
          setIsOpen((p) => !p);
        }}
        disabled={disabled}
        accessibilityRole="combobox"
        accessibilityLabel={label || placeholder}
        accessibilityState={{ disabled, expanded: isOpen }}
      >
        {icon && <Ionicons name={icon} size={18} color={colors.grey} style={st.triggerIcon} />}
        <Text style={[st.triggerText, !selectedItem && st.triggerPlaceholder]} numberOfLines={1}>
          {selectedItem
            ? renderItemLabel ? renderItemLabel(selectedItem) : selectedItem.name || selectedItem.label || 'Selected'
            : placeholder}
        </Text>
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.grey} />
      </Pressable>

      {error && <Text style={st.errorText}>{error}</Text>}

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={close}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={st.overlay} onPress={close}>
            <Pressable style={st.dropdown} onPress={() => {}}>
            <View style={st.searchContainer}>
              <Ionicons name="search" size={18} color={colors.grey} style={st.searchIcon} />
              <TextInput
                style={st.searchInput}
                placeholder={placeholder}
                placeholderTextColor={colors.greyLight}
                value={effectiveSearch}
                onChangeText={handleSearchChange}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              {effectiveSearch ? (
                <Pressable onPress={() => handleSearchChange('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.grey} />
                </Pressable>
              ) : null}
            </View>

            <FlatList
              data={data}
              keyExtractor={(item, index) => (item?.id != null ? String(item.id) : String(index))}
              style={st.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                loading ? (
                  <View style={st.centerState}>
                    <ActivityIndicator size="small" color={colors.brand} />
                    <Text style={st.stateText}>Loading...</Text>
                  </View>
                ) : (
                  <View style={st.centerState}>
                    <Ionicons name="search-outline" size={32} color={colors.greyLight} />
                    <Text style={st.stateText}>No results found</Text>
                  </View>
                )
              }
              renderItem={({ item }) => {
                const isSelected = value === item.id;
                return (
                  <Pressable
                    style={({ pressed }) => [st.item, isSelected && st.itemSelected, pressed && st.itemPressed]}
                    onPress={() => handleSelect(item)}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[st.itemText, isSelected && st.itemTextSelected]} numberOfLines={2}>
                      {renderItemLabel ? renderItemLabel(item) : item.name || item.label || item.id}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.brand} />}
                  </Pressable>
                );
              }}
              onEndReached={onLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                hasMore && !loading ? (
                  <Pressable style={st.loadMoreButton} onPress={onLoadMore} hitSlop={8}>
                    <Text style={st.loadMoreText}>Load more</Text>
                  </Pressable>
                ) : null
              }
            />
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}