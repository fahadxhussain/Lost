import React, { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { chatApi, createChatSocket, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useResource } from "../hooks/useResource";
import {
  Button,
  CompactSeparator,
  DataList,
  Empty,
  ErrorNotice,
  Loading,
  Screen,
  s,
} from "../components/ui";
import { mergeMessages } from "../utils/reports";
import { COLORS as C } from "../constants/theme";
import { ConversationRow, MessageRow } from "../components/listRows";

const EMPTY_ITEMS = [];

export function ConversationsScreen({ navigation }) {
  const { user } = useAuth();
  const resource = useResource(
    async () => (await chatApi.getConversations()).data.data,
    [],
    10000,
  );
  const openConversation = useCallback(
    (id, name) => navigation.navigate("Chat", { id, name }),
    [navigation],
  );
  const refresh = useCallback(() => resource.reload(), [resource.reload]);
  const renderConversation = useCallback(
    ({ item }) => (
      <ConversationRow
        id={item.id}
        name={item.otherParticipant?.name || "Student"}
        content={item.latestMessage?.content}
        unread={
          !!item.latestMessage &&
          item.latestMessage.senderId !== user.id &&
          !item.latestMessage.isRead
        }
        onPress={openConversation}
      />
    ),
    [openConversation, user.id],
  );
  return (
    <Screen scroll={false}>
      <DataList
        data={resource.data || EMPTY_ITEMS}
        estimatedItemSize={110}
        renderItem={renderConversation}
        refreshing={resource.loading}
        onRefresh={refresh}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={s.body}>
              Coordinate a safe return with your campus.
            </Text>
            <ErrorNotice
              message={resource.error}
              onRetry={() => resource.reload()}
            />
          </View>
        }
        ListEmptyComponent={
          <>
            {resource.loading && !resource.data && <Loading />}
            {resource.data?.length === 0 && (
              <Empty
                title="Start a conversation."
                body="Contact a student from an item or potential match to start messaging."
                icon="chatbubbles-outline"
              />
            )}
          </>
        }
        ListFooterComponent={
          <Button
            title="Refresh conversations"
            onPress={refresh}
            busy={resource.loading}
          />
        }
      />
    </Screen>
  );
}
export function ChatScreen({ route }) {
  const { user, token } = useAuth();
  const id = route.params.id;
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const alive = useRef(false);
  const activeConversation = useRef(id);
  const list = useRef(null);
  const nearBottom = useRef(true);
  const trackScroll = useCallback(
    ({ nativeEvent: { contentOffset, contentSize, layoutMeasurement } }) => {
      nearBottom.current =
        contentSize.height - layoutMeasurement.height - contentOffset.y < 80;
    },
    [],
  );
  const scrollToLatest = useCallback(() => {
    if (nearBottom.current) list.current?.scrollToEnd({ animated: true });
  }, []);
  const renderMessage = useCallback(
    ({ item }) => (
      <MessageRow
        content={item.content}
        createdAt={item.createdAt}
        own={item.senderId === user.id}
        isRead={item.isRead}
      />
    ),
    [user.id],
  );
  const add = useCallback(
    (items) => setMessages((old) => mergeMessages(old, items)),
    [],
  );
  const refresh = useCallback(async () => {
    try {
      const response = await chatApi.getMessages(id);
      if (alive.current && activeConversation.current === id) {
        add(response.data.data);
        setError("");
      }
    } catch (err) {
      if (alive.current && activeConversation.current === id)
        setError(errorMessage(err));
    } finally {
      if (alive.current && activeConversation.current === id) setLoading(false);
    }
  }, [id, add]);
  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      activeConversation.current = id;
      setMessages([]);
      setLoading(true);
      setBusy(false);
      nearBottom.current = true;
      refresh();
      const socket = createChatSocket(token);
      socketRef.current = socket;
      socket.on("connect", () => {
        setConnected(true);
        socket.emit("join_conversation", { conversationId: id });
        refresh();
      });
      socket.on("disconnect", () => setConnected(false));
      socket.on("connect_error", () => setConnected(false));
      socket.on("new_message", (message) => {
        if (message.conversationId === id) {
          add([message]);
          refresh();
        }
      });
      // REST sends do not broadcast in the current backend. Poll for those and read receipts.
      const timer = setInterval(refresh, 6000);
      return () => {
        alive.current = false;
        clearInterval(timer);
        socket.emit("leave_conversation", { conversationId: id });
        socket.disconnect();
        socketRef.current = null;
      };
    }, [id, token, refresh, add]),
  );
  async function send() {
    const content = draft.trim();
    if (!content || busy) return;
    setBusy(true);
    setError("");
    try {
      let message;
      const socket = socketRef.current;
      if (socket?.connected) {
        message = await new Promise((resolve, reject) => {
          socket
            .timeout(10000)
            .emit(
              "send_message",
              { conversationId: id, content },
              (timeout, result) => {
                if (timeout)
                  reject(
                    new Error(
                      "Delivery could not be confirmed. Refresh messages before retrying.",
                    ),
                  );
                else if (result?.status !== "ok")
                  reject(
                    new Error(result?.message || "Message could not be sent."),
                  );
                else resolve(result.data);
              },
            );
        });
      } else message = (await chatApi.sendMessage(id, content)).data.data;
      if (alive.current && activeConversation.current === id) {
        nearBottom.current = true;
        add([message]);
        setDraft("");
      }
    } catch (err) {
      if (alive.current && activeConversation.current === id)
        setError(errorMessage(err));
    } finally {
      if (alive.current && activeConversation.current === id) setBusy(false);
    }
  }
  return (
    <Screen scroll={false}>
      <Text style={[s.label, { padding: 12 }]}>
        {connected
          ? "Connected · Campus conversation"
          : "Reconnecting · Checking for new messages"}
      </Text>
      <ErrorNotice message={error} onRetry={refresh} />
      {loading && <Loading />}
      <DataList
        ref={list}
        data={messages}
        estimatedItemSize={80}
        contentContainerStyle={styles.messageContent}
        ItemSeparatorComponent={CompactSeparator}
        onScroll={trackScroll}
        scrollEventThrottle={16}
        onContentSizeChange={scrollToLatest}
        ListEmptyComponent={
          !loading && !error ? (
            <Empty
              title="Say hello."
              body="Compare identifying details and arrange a safe return."
              icon="chatbubble-outline"
            />
          ) : null
        }
        renderItem={renderMessage}
      />
      <View style={[s.row, { backgroundColor: C.cardBg }]}>
        <TextInput
          accessibilityLabel="Message"
          placeholder="Write a message…"
          placeholderTextColor={C.placeholder}
          editable={!busy}
          multiline
          value={draft}
          onChangeText={setDraft}
          style={[s.input, { flex: 1, maxHeight: 110 }]}
        />
        <Button
          title="Send"
          onPress={send}
          disabled={!draft.trim()}
          busy={busy}
        />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  header: { gap: 16 },
  messageContent: { padding: 20 },
});
