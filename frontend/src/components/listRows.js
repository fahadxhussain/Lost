import React, { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Icon, ReportCard, s } from "./ui";
import { COLORS as C } from "../constants/theme";
import { formatDate } from "../utils/reports";

// Primitives let unchanged rows skip renders even after a polling response
// replaces every report/conversation object.
export const MyReportRow = memo(function MyReportRow({
  onMatches,
  matchCount,
  ...props
}) {
  const { id, title } = props;
  const showMatches = useCallback(
    () => onMatches(id, title),
    [id, title, onMatches],
  );
  return (
    <ReportCard {...props} compact>
      <View style={styles.reportActions}>
        <Button
          title={`View potential matches (${matchCount})`}
          secondary
          onPress={showMatches}
        />
      </View>
    </ReportCard>
  );
});

export const MatchRow = memo(function MatchRow({
  matchId,
  score,
  aiReasoning,
  onExplain,
  ...props
}) {
  const explain = useCallback(() => onExplain(matchId), [matchId, onExplain]);
  return (
    <ReportCard {...props}>
      <View style={styles.matchBody}>
        <Text style={s.cardTitle}>{Math.round(score * 100)}% match</Text>
        <Text style={s.body}>{aiReasoning}</Text>
        <Button title="Why it matched" secondary onPress={explain} />
      </View>
    </ReportCard>
  );
});

export const ConversationRow = memo(function ConversationRow({
  id,
  name,
  content,
  unread,
  onPress,
}) {
  const open = useCallback(() => onPress(id, name), [id, name, onPress]);
  return (
    <Pressable
      accessibilityRole="button"
      style={styles.conversation}
      onPress={open}
    >
      <Icon name="chatbubble-outline" />
      <View style={styles.conversationBody}>
        <Text style={s.cardTitle}>{name}</Text>
        <Text style={s.body} numberOfLines={2}>
          {content || "Say hello to arrange a return."}
        </Text>
        {unread ? <Text style={s.label}>Unread message</Text> : null}
      </View>
    </Pressable>
  );
});

export const NotificationRow = memo(function NotificationRow({
  id,
  title,
  body,
  createdAt,
  isRead,
  oppositeReportId,
  disabled,
  onRead,
}) {
  const read = useCallback(
    () => onRead(id, oppositeReportId),
    [id, oppositeReportId, onRead],
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isRead ? "Read" : "Unread"}: ${title}`}
      disabled={disabled}
      onPress={read}
      style={[styles.conversation, !isRead && styles.unread]}
    >
      <Icon name={isRead ? "notifications-outline" : "notifications"} />
      <View style={styles.conversationBody}>
        <Text style={s.cardTitle}>{title}</Text>
        <Text style={s.body}>{body}</Text>
        <Text style={s.label}>
          {formatDate(createdAt)} · {isRead ? "Read" : "Unread"}
        </Text>
      </View>
    </Pressable>
  );
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});
export const MessageRow = memo(function MessageRow({
  content,
  createdAt,
  own,
  isRead,
}) {
  return (
    <View style={own ? styles.ownBubble : styles.otherBubble}>
      <Text style={own ? styles.ownText : styles.otherText}>{content}</Text>
      <Text style={own ? styles.ownTime : styles.otherTime}>
        {timeFormatter.format(new Date(createdAt))}
        {own ? ` · ${isRead ? "Read" : "Sent"}` : ""}
      </Text>
    </View>
  );
});

const bubble = { padding: 14, borderRadius: 18, maxWidth: "85%", gap: 5 };
const styles = StyleSheet.create({
  reportActions: { paddingHorizontal: 14, paddingBottom: 14 },
  matchBody: { padding: 14, gap: 8 },
  conversation: { ...s.card, ...s.row },
  conversationBody: { flex: 1, gap: 7 },
  unread: { borderColor: C.primary },
  ownBubble: { ...bubble, alignSelf: "flex-end", backgroundColor: C.primary },
  otherBubble: {
    ...bubble,
    alignSelf: "flex-start",
    backgroundColor: C.cardBg,
  },
  ownText: { color: C.cardBg, lineHeight: 21 },
  otherText: { color: C.text, lineHeight: 21 },
  ownTime: { fontSize: 10, color: C.border },
  otherTime: { fontSize: 10, color: C.textMuted },
});
