import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { fetchConversations } from '../../services/firestoreSync';
import { searchUsers } from '../../src/shared/services/community';
import {
  listenFriends,
  listenIncomingFriendRequests,
  listenOutgoingFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
} from '../../src/shared/services/friendships';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';

const TABS = [
  { key: 'chats', label: 'Chats', icon: 'chatbubbles-outline' },
  { key: 'friends', label: 'Friends', icon: 'people-outline' },
  { key: 'requests', label: 'Requests', icon: 'person-add-outline' },
];

const formatShortTime = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value?.toDate ? value.toDate() : value;
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const getPeerInfo = (item, currentUid) => {
  const peerId = item.memberIds?.find((memberId) => memberId !== currentUid);
  return { peerId, peerInfo: item.memberInfo?.[peerId] || {} };
};

function ConversationItem({
  item,
  currentUid,
  router,
  colors,
  styles,
  getConversationRelationshipLabel,
  getPeerInfo,
}) {
  const { peerId, peerInfo } = getPeerInfo(item, currentUid);
  const unread = item.unread?.[currentUid] || 0;
  const relationshipLabel = getConversationRelationshipLabel(peerId);
  const avatar = typeof peerInfo.avatar === 'string' ? peerInfo.avatar.trim() : peerInfo.avatar || '';
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatar]);

  return (
    <Pressable style={styles.chatCard} onPress={() => router.push(`/messages/${item.id}`)}>
      <View style={styles.avatarWrapper}>
        {avatar && !avatarFailed ? (
          <Image source={{ uri: avatar }} style={styles.avatar} onError={() => setAvatarFailed(true)} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{(peerInfo.name || 'Student')[0].toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.chatCopy}>
        <View style={styles.chatHeaderRow}>
          <Text style={styles.chatTitle}>{peerInfo.name || 'Student'}</Text>
          <Text style={styles.chatTime}>{formatShortTime(item.updatedAt)}</Text>
        </View>
        <Text style={styles.chatMessage} numberOfLines={1}>{item.lastMessage || 'Start the conversation.'}</Text>
        {relationshipLabel ? (
          <View style={[
            styles.relationshipPill,
            relationshipLabel.tone === 'warning' && styles.relationshipPillWarning,
          ]}>
            <Ionicons
              name={relationshipLabel.icon}
              size={12}
              color={relationshipLabel.tone === 'warning' ? colors.error : colors.brandText}
            />
            <Text style={[
              styles.relationshipPillText,
              relationshipLabel.tone === 'warning' && styles.relationshipPillTextWarning,
            ]}>
              {relationshipLabel.text}
            </Text>
          </View>
        ) : null}
      </View>
      {unread > 0 ? (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('chats');

  // Chats state
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Friends state
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  // Requests state
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  // Find friend modal
  const [findModalVisible, setFindModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState([]);
  const [searching, setSearching] = useState(false);

  const styles = useThemeStyles((c, s, r) => ({
    tabBar: {
      flexDirection: 'row', backgroundColor: c.surfacePrimary, borderRadius: 16,
      padding: 4, marginBottom: 16, borderWidth: 1, borderColor: c.borderDefault,
    },
    tab: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 10, borderRadius: 12, gap: 6, position: 'relative',
    },
    tabActive: { backgroundColor: c.brandLight },
    tabLabel: { fontSize: 13, fontWeight: '600', color: c.textTertiary },
    tabLabelActive: { color: c.brandText, fontWeight: '700' },
    tabBadge: {
      position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18, borderRadius: 9,
      backgroundColor: c.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    },
    tabBadgeText: { color: c.onBrand, fontSize: 10, fontWeight: '800' },
    tabContent: { flex: 1 },
    listContent: { paddingBottom: 24 },
    sectionLabel: {
      fontSize: 13, fontWeight: '800', color: c.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 4,
    },
    chatCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.card,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: 18, padding: 14, marginBottom: 10,
    },
    avatarWrapper: { width: 48, height: 48, marginRight: 12 },
    avatar: { width: 48, height: 48, borderRadius: 16 },
    avatarFallback: {
      width: 48, height: 48, borderRadius: 16, backgroundColor: c.brandLight,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarInitial: { color: c.brandDark, fontWeight: '800', fontSize: 18 },
    chatCopy: { flex: 1 },
    chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    chatTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary, flex: 1, marginRight: 8 },
    chatTime: { color: c.textSecondary, fontSize: 11 },
    chatMessage: { color: c.textSecondary, fontSize: 13, lineHeight: 18 },
    relationshipPill: {
      alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4,
      marginTop: 7, paddingHorizontal: 8, paddingVertical: 4,
      borderRadius: 999, backgroundColor: c.brandLight,
    },
    relationshipPillWarning: { backgroundColor: c.dangerLight },
    relationshipPillText: { color: c.brandText, fontSize: 11, fontWeight: '800' },
    relationshipPillTextWarning: { color: c.error },
    unreadBadge: {
      marginLeft: 12, minWidth: 26, paddingHorizontal: 8, backgroundColor: c.brand,
      borderRadius: 999, alignItems: 'center', justifyContent: 'center', height: 26,
    },
    unreadText: { color: c.onBrand, fontWeight: '800', fontSize: 12 },
    findFriendBtn: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.card,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: 18, padding: 14, marginBottom: 16,
    },
    findFriendIconWrap: {
      width: 44, height: 44, borderRadius: 14, backgroundColor: c.brand,
      alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    findFriendTextWrap: { flex: 1 },
    findFriendTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
    findFriendSubtitle: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    friendCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.card,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: 18, padding: 14, marginBottom: 10,
    },
    friendInfo: { flex: 1, marginRight: 8 },
    friendName: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
    friendDetail: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    messageBtn: {
      width: 38, height: 38, borderRadius: 12, backgroundColor: c.brandLight,
      alignItems: 'center', justifyContent: 'center',
    },
    requestSection: { marginBottom: 20 },
    requestCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.card,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: 18, padding: 14, marginBottom: 10,
    },
    requestInfo: { flex: 1, marginRight: 8 },
    requestName: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
    requestLabel: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    requestActions: { flexDirection: 'row', gap: 8 },
    acceptBtn: {
      width: 38, height: 38, borderRadius: 12, backgroundColor: c.success,
      alignItems: 'center', justifyContent: 'center',
    },
    declineBtn: {
      width: 38, height: 38, borderRadius: 12, backgroundColor: c.dangerLight,
      borderWidth: 1, borderColor: c.dangerBorder, alignItems: 'center', justifyContent: 'center',
    },
    cancelBtn: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
      backgroundColor: c.skeleton, borderWidth: 1, borderColor: c.borderDefault,
    },
    cancelBtnText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
    modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    modalContainer: {
      backgroundColor: c.modalBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingTop: 20, paddingHorizontal: 20, paddingBottom: 40, maxHeight: '85%', minHeight: '60%',
    },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: c.textPrimary },
    modalSearchWrap: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBackground,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: 14, paddingHorizontal: 12, marginBottom: 16,
    },
    modalSearchIcon: { marginRight: 8 },
    modalSearchInput: { flex: 1, color: c.textPrimary, paddingVertical: 12, fontSize: 15 },
    modalList: { paddingBottom: 20 },
    modalEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
    modalEmptyText: { fontSize: 14, color: c.textTertiary, textAlign: 'center' },
    searchResultCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.card,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: 16, padding: 12, marginBottom: 10,
    },
    searchResultInfo: { flex: 1, marginRight: 8 },
    searchResultName: { fontSize: 14, fontWeight: '800', color: c.textPrimary },
    searchResultDetail: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    addFriendBtn: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.brand,
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 4,
    },
    addFriendBtnText: { color: c.onBrand, fontSize: 12, fontWeight: '700' },
  }));

  // Load conversations
  const loadConversations = useCallback(async () => {
    const data = await fetchConversations(profile?.uid);
    setItems(data);
    setLoading(false);
  }, [profile?.uid]);

  useEffect(() => {
    loadConversations().catch(() => setLoading(false));
  }, [loadConversations]);

  // Listen to friends
  useEffect(() => {
    if (!profile?.uid) return;
    setFriendsLoading(true);
    const unsub = listenFriends(profile.uid, (data) => {
      setFriends(data);
      setFriendsLoading(false);
    });
    return unsub;
  }, [profile?.uid]);

  // Listen to incoming requests
  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = listenIncomingFriendRequests(profile.uid, (data) => {
      setIncomingRequests(data);
      setRequestsLoading(false);
    });
    return unsub;
  }, [profile?.uid]);

  // Listen to outgoing requests
  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = listenOutgoingFriendRequests(profile.uid, (data) => {
      setOutgoingRequests(data);
    });
    return unsub;
  }, [profile?.uid]);

  // Search users for find friend
  useEffect(() => {
    const run = async () => {
      if (!search.trim() || !profile?.uid) {
        setMatches([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      const results = await searchUsers(search, profile.uid);
      setMatches(results);
      setSearching(false);
    };

    const timer = setTimeout(() => {
      run().catch(() => setSearching(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [profile?.uid, search]);

  const handleSendRequest = async (targetUser) => {
    try {
      await sendFriendRequest({
        currentUid: profile?.uid,
        targetUid: targetUser.id || targetUser.uid,
        currentProfile: profile,
        targetProfile: targetUser,
      });
    } catch (err) {
      console.log('Send request error:', err.message);
    }
  };

  const handleAcceptRequest = async (request) => {
    try {
      await acceptFriendRequest({
        request,
        currentUid: profile?.uid,
        currentProfile: profile,
      });
    } catch (err) {
      console.log('Accept error:', err.message);
    }
  };

  const handleDeclineRequest = async (request) => {
    try {
      await declineFriendRequest({
        request,
        currentUid: profile?.uid,
        currentProfile: profile,
      });
    } catch (err) {
      console.log('Decline error:', err.message);
    }
  };

  const handleCancelRequest = async (request) => {
    try {
      await cancelFriendRequest({
        requestId: request.id,
        currentUid: profile?.uid,
      });
    } catch (err) {
      console.log('Cancel error:', err.message);
    }
  };

  const handleRemoveFriend = async (friend) => {
    const otherUid = friend.users?.find((id) => id !== profile?.uid);
    if (!otherUid) return;
    try {
      await removeFriend({
        currentUid: profile?.uid,
        friendUid: otherUid,
        currentProfile: profile,
      });
    } catch (err) {
      console.log('Remove friend error:', err.message);
    }
  };

  const openConversation = async (person) => {
    if (!user || !person?.id) return;
    router.push(`/view-user-profile/${person.id}`);
  };

  const openFriendChat = (friend) => {
    const otherUid = friend.users?.find((id) => id !== profile?.uid);
    if (!otherUid) return;
    const conversationId = [profile?.uid, otherUid].sort().join('_');
    router.push(`/messages/${conversationId}`);
  };

  const emptyMessage = useMemo(() => 'Search for a student and start a direct conversation.', []);
  const friendIds = useMemo(() => {
    const ids = new Set();
    friends.forEach((friend) => {
      friend.users?.forEach?.((id) => {
        if (id !== profile?.uid) ids.add(id);
      });
    });
    return ids;
  }, [friends, profile?.uid]);

  const incomingRequestByUser = useMemo(() => {
    const map = new Map();
    incomingRequests.forEach((request) => {
      if (request.from) map.set(request.from, request);
    });
    return map;
  }, [incomingRequests]);

  const outgoingRequestByUser = useMemo(() => {
    const map = new Map();
    outgoingRequests.forEach((request) => {
      if (request.to) map.set(request.to, request);
    });
    return map;
  }, [outgoingRequests]);

  const getConversationRelationshipLabel = (peerId) => {
    if (!peerId || friendIds.has(peerId)) return null;
    if (incomingRequestByUser.has(peerId)) return { text: 'Friend request received', icon: 'person-add-outline', tone: 'default' };
    if (outgoingRequestByUser.has(peerId)) return { text: 'Friend request sent', icon: 'time-outline', tone: 'default' };
    return { text: 'Not friends yet', icon: 'alert-circle-outline', tone: 'warning' };
  };

  // --- Render: Chats Tab ---
  const renderConversation = ({ item }) => (
    <ConversationItem
      item={item}
      currentUid={profile?.uid}
      router={router}
      colors={colors}
      styles={styles}
      getConversationRelationshipLabel={getConversationRelationshipLabel}
      getPeerInfo={getPeerInfo}
    />
  );

  const renderChatsTab = () => (
    <View style={styles.tabContent}>
      {items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState
          title="No conversations yet"
          description={emptyMessage}
        />
      )}
    </View>
  );

  // --- Render: Friends Tab ---
  const getFriendProfile = (friend) => {
    const otherUid = friend.users?.find((id) => id !== profile?.uid);
    return otherUid ? friend.profiles?.[otherUid] || {} : {};
  };

  const renderFriendItem = ({ item }) => {
    const friendProfile = getFriendProfile(item);
    const name = friendProfile.name || friendProfile.username || 'Student';
    const avatar = friendProfile.avatar || '';
    const school = friendProfile.school || friendProfile.university || '';
    const department = friendProfile.department || '';

    return (
      <Pressable style={styles.friendCard} onPress={() => openFriendChat(item)}>
        <View style={styles.avatarWrapper}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{name[0].toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{name}</Text>
          {school ? <Text style={styles.friendDetail}>{school}</Text> : null}
          {department ? <Text style={styles.friendDetail}>{department}</Text> : null}
        </View>
        <TouchableOpacity
          style={styles.messageBtn}
          onPress={() => openFriendChat(item)}
          hitSlop={8}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.brandText} />
        </TouchableOpacity>
      </Pressable>
    );
  };

  const renderFriendsTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={styles.findFriendBtn}
        onPress={() => setFindModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.findFriendIconWrap}>
          <Ionicons name="search" size={20} color={colors.onBrand} />
        </View>
        <View style={styles.findFriendTextWrap}>
          <Text style={styles.findFriendTitle}>Find Friends</Text>
          <Text style={styles.findFriendSubtitle}>Search and connect with students</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>
        Friends {friends.length > 0 ? `(${friends.length})` : ''}
      </Text>

      {friends.length > 0 ? (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={renderFriendItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState
          title="No friends yet"
          description="Find and connect with other students to start chatting."
        />
      )}
    </View>
  );

  // --- Render: Requests Tab ---
  const renderIncomingRequest = (request) => {
    const fromProfile = request.fromProfile || {};
    const name = fromProfile.name || fromProfile.username || 'Student';
    const avatar = fromProfile.avatar || '';

    return (
      <View key={request.id} style={styles.requestCard}>
        <View style={styles.avatarWrapper}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{name[0].toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.requestInfo}>
          <Text style={styles.requestName}>{name}</Text>
          <Text style={styles.requestLabel}>Wants to connect</Text>
        </View>
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => handleAcceptRequest(request)}
          >
            <Ionicons name="checkmark" size={18} color={colors.onBrand} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={() => handleDeclineRequest(request)}
          >
            <Ionicons name="close" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderOutgoingRequest = (request) => {
    const toProfile = request.toProfile || {};
    const name = toProfile.name || toProfile.username || 'Student';
    const avatar = toProfile.avatar || '';

    return (
      <View key={request.id} style={styles.requestCard}>
        <View style={styles.avatarWrapper}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{name[0].toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.requestInfo}>
          <Text style={styles.requestName}>{name}</Text>
          <Text style={styles.requestLabel}>Request sent</Text>
        </View>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => handleCancelRequest(request)}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRequestsTab = () => (
    <View style={styles.tabContent}>
      {incomingRequests.length > 0 && (
        <View style={styles.requestSection}>
          <Text style={styles.sectionLabel}>
            Received ({incomingRequests.length})
          </Text>
          {incomingRequests.map(renderIncomingRequest)}
        </View>
      )}

      {outgoingRequests.length > 0 && (
        <View style={styles.requestSection}>
          <Text style={styles.sectionLabel}>
            Sent ({outgoingRequests.length})
          </Text>
          {outgoingRequests.map(renderOutgoingRequest)}
        </View>
      )}

      {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
        <EmptyState
          title="No pending requests"
          description="Friend requests you send or receive will appear here."
        />
      )}
    </View>
  );

  // --- Find Friend Modal ---
  const renderFindFriendModal = () => (
    <Modal visible={findModalVisible} transparent animationType="slide" onRequestClose={() => setFindModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Find Friends</Text>
            <TouchableOpacity onPress={() => { setFindModalVisible(false); setSearch(''); setMatches([]); }}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchWrap}>
            <Ionicons name="search-outline" size={18} color={colors.placeholder} style={styles.modalSearchIcon} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, email, or school..."
              placeholderTextColor={colors.placeholder}
              style={styles.modalSearchInput}
              autoFocus
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.placeholder} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={matches}
            keyExtractor={(item) => item.id || item.uid}
            contentContainerStyle={styles.modalList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              searching ? (
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>Searching...</Text>
                </View>
              ) : search.length >= 2 ? (
                <View style={styles.modalEmpty}>
                  <Ionicons name="search-outline" size={40} color={colors.icon} />
                  <Text style={styles.modalEmptyText}>No students found</Text>
                </View>
              ) : (
                <View style={styles.modalEmpty}>
                  <Ionicons name="people-outline" size={40} color={colors.icon} />
                  <Text style={styles.modalEmptyText}>Type at least 2 characters to search</Text>
                </View>
              )
            }
            renderItem={({ item }) => {
              const name = item.username || item.name || item.email || 'Student';
              const avatar = item.photo || item.avatar || '';
              const detail = item.school || item.department || item.email || '';

              return (
                <View style={styles.searchResultCard}>
                  <View style={styles.avatarWrapper}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarInitial}>{name[0].toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName}>{name}</Text>
                    {detail ? <Text style={styles.searchResultDetail}>{detail}</Text> : null}
                  </View>
                  <TouchableOpacity
                    style={styles.addFriendBtn}
                    onPress={() => handleSendRequest(item)}
                  >
                    <Ionicons name="person-add-outline" size={18} color={colors.onBrand} />
                    <Text style={styles.addFriendBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );

  // --- Main Render ---
  return (
    <ScreenShell title="Messenger" subtitle="Direct messages" showBack loading={loading} scrollable={false}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={isActive ? colors.brandText : colors.textTertiary}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {tab.key === 'requests' && (incomingRequests.length + outgoingRequests.length) > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {incomingRequests.length + outgoingRequests.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      {activeTab === 'chats' && renderChatsTab()}
      {activeTab === 'friends' && renderFriendsTab()}
      {activeTab === 'requests' && renderRequestsTab()}

      {/* Find Friend Modal */}
      {renderFindFriendModal()}
    </ScreenShell>
  );
}
