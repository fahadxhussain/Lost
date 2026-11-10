import React, { useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { notificationsApi, errorMessage } from "../services/api";
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
import { formatDate } from "../utils/reports";
import { COLORS as C } from "../constants/theme";

export default function NotificationsScreen({ navigation }) {
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const resource = useResource(
    async () => (await notificationsApi.getAll({ page, limit: 20 })).data,
    [page],
    30000,
  );
  async function read(notification) {
    setBusy(true);
    setError("");
    try {
      await notificationsApi.markRead(notification.id);
      resource.reload(true);
      if (notification.metadata?.oppositeReportId)
        navigation.navigate("Details", {
          id: notification.metadata.oppositeReportId,
        });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function readAll() {
    setBusy(true);
    setError("");
    try {
      await notificationsApi.markAllRead();
      await resource.reload(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen scroll={false}>
      <FlatList
        contentContainerStyle={s.content}
        data={resource.data?.data || []}
        keyExtractor={(item) => item.id}
        refreshing={resource.loading}
        onRefresh={() => resource.reload()}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <Text style={s.body}>
              {resource.data?.unreadCount || 0} unread notifications
            </Text>
            <ErrorNotice
              message={resource.error || error}
              onRetry={() => resource.reload()}
            />
            <Button
              title="Mark all as read"
              secondary
              disabled={busy || !resource.data?.unreadCount}
              onPress={readAll}
            />
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${item.isRead ? "Read" : "Unread"}: ${item.title}`}
            disabled={busy}
            style={[s.card, s.row, !item.isRead && { borderColor: C.primary }]}
            onPress={() => read(item)}
          >
            <Icon
              name={item.isRead ? "notifications-outline" : "notifications"}
            />
            <View style={{ flex: 1, gap: 7 }}>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Text style={s.body}>{item.body}</Text>
              <Text style={s.label}>
                {formatDate(item.createdAt)} · {item.isRead ? "Read" : "Unread"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          resource.loading ? (
            <Loading />
          ) : !resource.error ? (
            <Empty
              title="A quiet inbox."
              body="Potential match alerts will appear here when there’s something to check."
              icon="notifications-outline"
            />
          ) : null
        }
        ListFooterComponent={
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Button
              title="Previous"
              style={{ flex: 1 }}
              disabled={page === 1 || resource.loading}
              onPress={() => setPage((p) => p - 1)}
            />
            <Button
              title="Next"
              style={{ flex: 1 }}
              disabled={
                page >= (resource.data?.pagination?.totalPages || 1) ||
                resource.loading
              }
              onPress={() => setPage((p) => p + 1)}
            />
          </View>
        }
      />
    </Screen>
  );
}
