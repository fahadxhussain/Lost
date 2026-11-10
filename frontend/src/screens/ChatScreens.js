import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Pressable from "../components/TouchTarget";
import { useFocusEffect } from "@react-navigation/native";
import {
  chatApi,
  createChatSocket,
  errorMessage,
  userError,
} from "../services/api";
import { LIMITS } from "../utils/validation";
import { useSubmission } from "../hooks/useSubmission";
import { useAuth } from "../context/AuthContext";
import { useResource } from "../hooks/useResource";
import {
  Button,
  CompactSeparator,
  DataList,
  Empty,
  ErrorNotice,
  Loading,
  Icon,
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
            {!resource.loading &&
              !resource.error &&
              resource.data?.length === 0 && (
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
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const id = route.params?.id;
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const { busy, run } = useSubmission();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const alive = useRef(false);
  const activeConversation = useRef(id);
  const generation = useRef(0);
  const refreshing = useRef(false);
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
    if (!id || refreshing.current) return;
    const request = generation.current;
    refreshing.current = true;
    try {
      const response = await chatApi.getMessages(id);
      if (
        alive.current &&
        request === generation.current &&
        activeConversation.current === id
      ) {
        add(response.data.data);
        setError("");
      }
    } catch (err) {
      if (
        alive.current &&
        request === generation.current &&
        activeConversation.current === id
      )
        setError(errorMessage(err));
    } finally {
      if (request === generation.current) {
        refreshing.current = false;
        if (alive.current) setLoading(false);
      }
    }
  }, [id, add]);
  useFocusEffect(
    useCallback(() => {
      ++generation.current;
      refreshing.current = false;
      alive.current = true;
      if (activeConversation.current !== id) setDraft("");
      activeConversation.current = id;
      setMessages([]);
      setLoading(true);
      setConnected(false);
      setError("");
      setSendError("");
      nearBottom.current = true;
      if (!id) {
        setLoading(false);
        setError(
          "This conversation could not be opened. Go back to Messages and select it again.",
        );
        return () => {
          alive.current = false;
          ++generation.current;
        };
      }
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
        ++generation.current;
        clearInterval(timer);
        socket.emit("leave_conversation", { conversationId: id });
        socket.disconnect();
        socketRef.current = null;
      };
    }, [id, token, refresh, add]),
  );
  async function send() {
    const content = draft.trim();
    if (!id || !content || busy) return;
    if (content.length > LIMITS.message)
      return setSendError(
        `Keep your message within ${LIMITS.message} characters.`,
      );
    const request = generation.current;
    setSendError("");
    return run(async () => {
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
                      userError(
                        "Delivery could not be confirmed. Refresh messages before retrying.",
                      ),
                    );
                  else if (result?.status !== "ok")
                    reject(
                      userError(
                        "Message could not be sent. Your message is still here; check your connection and try again.",
                      ),
                    );
                  else resolve(result.data);
                },
              );
          });
        } else message = (await chatApi.sendMessage(id, content)).data.data;
        if (!message?.id)
          throw userError(
            "Delivery could not be confirmed. Refresh messages before retrying.",
          );
        if (
          alive.current &&
          request === generation.current &&
          activeConversation.current === id
        ) {
          nearBottom.current = true;
          add([message]);
          setDraft("");
        }
      } catch (err) {
        if (
          alive.current &&
          request === generation.current &&
          activeConversation.current === id
        )
          setSendError(errorMessage(err));
      }
    });
  }
  return (
    <Screen scroll={false} keyboardVerticalOffset={headerHeight}>
      <Text style={[s.label, { padding: 12 }]}>
        {connected
          ? "Connected · Campus conversation"
          : "Reconnecting · Checking for new messages"}
      </Text>
      <ErrorNotice message={error} onRetry={id ? refresh : undefined} />
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
      <ErrorNotice message={sendError} />
      {draft.length > LIMITS.message && (
        <Text
          accessibilityRole="alert"
          style={[s.label, { color: C.danger, paddingHorizontal: 14 }]}
        >
          Keep your message within {LIMITS.message} characters ({draft.length}{" "}
          entered).
        </Text>
      )}
      <View
        style={[
          styles.composer,
          { paddingBottom: Math.max(12, insets.bottom) },
        ]}
      >
        <TextInput
          accessibilityLabel="Message"
          placeholder="Write a message…"
          placeholderTextColor={C.placeholder}
          editable={!busy && !!id}
          multiline
          value={draft}
          onChangeText={(value) => {
            setDraft(value);
            setSendError("");
          }}
          style={[s.input, { flex: 1, maxHeight: 110 }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{
            disabled:
              busy ||
              !id ||
              !draft.trim() ||
              draft.trim().length > LIMITS.message,
            busy,
          }}
          onPress={send}
          disabled={
            busy || !id || !draft.trim() || draft.trim().length > LIMITS.message
          }
          style={[
            styles.sendButton,
            (busy ||
              !id ||
              !draft.trim() ||
              draft.trim().length > LIMITS.message) && { opacity: 0.45 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={C.cardBg} />
          ) : (
            <Icon name="send" color={C.cardBg} size={21} />
          )}
        </Pressable>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  header: { gap: 16 },
  messageContent: { padding: 20 },
  composer: {
    backgroundColor: C.cardBg,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
