import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { notificationsApi, errorMessage } from "../services/api";
import { useResource } from "../hooks/useResource";
import {
  Button,
  DataList,
  Empty,
  ErrorNotice,
  Loading,
  Screen,
  s,
} from "../components/ui";
import { NotificationRow } from "../components/listRows";

const EMPTY_ITEMS = [];
function Separator() {
  return <View style={{ height: 14 }} />;
}

export default function NotificationsScreen({ navigation }) {
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const resource = useResource(
    async () => (await notificationsApi.getAll({ page, limit: 20 })).data,
    [page],
    30000,
  );
  const read = useCallback(
    async (id, oppositeReportId) => {
      setBusy(true);
      setError("");
      try {
        await notificationsApi.markRead(id);
        resource.reload(true);
        if (oppositeReportId)
          navigation.navigate("Details", {
            id: oppositeReportId,
          });
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [navigation, resource.reload],
  );
  const refresh = useCallback(() => resource.reload(), [resource.reload]);
  const renderNotification = useCallback(
    ({ item }) => (
      <NotificationRow
        id={item.id}
        title={item.title}
        body={item.body}
        createdAt={item.createdAt}
        isRead={item.isRead}
        oppositeReportId={item.metadata?.oppositeReportId}
        disabled={busy}
        onRead={read}
      />
    ),
    [busy, read],
  );
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
      <DataList
        estimatedItemSize={145}
        data={resource.data?.data || EMPTY_ITEMS}
        refreshing={resource.loading}
        onRefresh={refresh}
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
        ItemSeparatorComponent={Separator}
        renderItem={renderNotification}
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
