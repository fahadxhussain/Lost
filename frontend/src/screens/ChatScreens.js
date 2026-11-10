import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { chatApi, createChatSocket, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useResource } from "../hooks/useResource";
import {
  Button,
  Empty,
  ErrorNotice,
  Icon,
  Loading,
  Screen,
  s,
} from "../components/ui";
import { mergeMessages } from "../utils/reports";
import { COLORS as C } from "../constants/theme";

export function ConversationsScreen({ navigation }) {
  const { user } = useAuth();
  const resource = useResource(
    async () => (await chatApi.getConversations()).data.data,
    [],
    10000,
  );
  return (
    <Screen>
      <Text style={s.body}>Coordinate a safe return with your campus.</Text>
      <ErrorNotice message={resource.error} onRetry={() => resource.reload()} />
      {resource.loading && !resource.data && <Loading />}
      {resource.data?.length === 0 && (
        <Empty
          title="Start a conversation."
          body="Contact a student from an item or potential match to start messaging."
          icon="chatbubbles-outline"
        />
      )}
      {(resource.data || []).map((conversation) => (
        <TouchableOpacity
          key={conversation.id}
          accessibilityRole="button"
          style={[s.card, s.row]}
          onPress={() =>
            navigation.navigate("Chat", {
              id: conversation.id,
              name: conversation.otherParticipant?.name || "Student",
            })
          }
        >
          <Icon name="chatbubble-outline" />
          <View style={{ flex: 1, gap: 7 }}>
            <Text style={s.cardTitle}>
              {conversation.otherParticipant?.name}
            </Text>
            <Text style={s.body} numberOfLines={2}>
              {conversation.latestMessage?.content ||
                "Say hello to arrange a return."}
            </Text>
            {conversation.latestMessage &&
              conversation.latestMessage.senderId !== user.id &&
              !conversation.latestMessage.isRead && (
                <Text style={s.label}>Unread message</Text>
              )}
          </View>
        </TouchableOpacity>
      ))}
      <Button
        title="Refresh conversations"
        onPress={() => resource.reload()}
        busy={resource.loading}
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
      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        onContentSizeChange={() =>
          list.current?.scrollToEnd({ animated: true })
        }
        ListEmptyComponent={
          !loading && !error ? (
            <Empty
              title="Say hello."
              body="Compare identifying details and arrange a safe return."
              icon="chatbubble-outline"
            />
          ) : null
        }
        renderItem={({ item }) => {
          const own = item.senderId === user.id;
          return (
            <View
              style={{
                alignSelf: own ? "flex-end" : "flex-start",
                backgroundColor: own ? C.primary : C.cardBg,
                padding: 14,
                borderRadius: 18,
                maxWidth: "85%",
                gap: 5,
              }}
            >
              <Text style={{ color: own ? C.cardBg : C.text, lineHeight: 21 }}>
                {item.content}
              </Text>
              <Text
                style={{ fontSize: 10, color: own ? C.border : C.textMuted }}
              >
                {new Date(item.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {own ? ` · ${item.isRead ? "Read" : "Sent"}` : ""}
              </Text>
            </View>
          );
        }}
      />
      <View style={[s.row, { backgroundColor: C.cardBg }]}>
        <TextInput
          accessibilityLabel="Message"
          placeholder="Write a message…"
          placeholderTextColor={C.textMuted}
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
