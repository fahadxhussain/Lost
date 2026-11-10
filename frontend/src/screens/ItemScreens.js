import React, { useCallback, useMemo, useState } from "react";
import { Alert, Modal, Text, View } from "react-native";
import { useResource } from "../hooks/useResource";
import { useAuth } from "../context/AuthContext";
import { chatApi, reportsApi, errorMessage, userError } from "../services/api";
import { useSubmission } from "../hooks/useSubmission";
import {
  Button,
  Chips,
  DataList,
  Empty,
  ErrorNotice,
  Loading,
  Notice,
  ModalScreen,
  Photo,
  reportCardProps,
  matchKey,
  Screen,
  s,
} from "../components/ui";
import { formatDate } from "../utils/reports";
import { MyReportRow, MatchRow } from "../components/listRows";

const EMPTY_ITEMS = [];

export function MyItemsScreen({ navigation, route }) {
  const watches = route.name === "Watchlist";
  const [status, setStatus] = useState("");
  const resource = useResource(
    async () =>
      (
        await reportsApi.getMyReports(
          watches ? { status: "ACTIVE" } : status ? { status } : {},
        )
      ).data.data,
    [status, watches],
    watches ? 30000 : 0,
  );
  const reports = useMemo(
    () =>
      (resource.data || EMPTY_ITEMS).filter(
        (r) => !watches || r.type === "LOST",
      ),
    [resource.data, watches],
  );
  const openDetails = useCallback(
    (id) => navigation.navigate("Details", { id }),
    [navigation],
  );
  const openMatches = useCallback(
    (id, title) => navigation.navigate("Matches", { id, report: { title } }),
    [navigation],
  );
  const refresh = useCallback(() => resource.reload(), [resource.reload]);
  const renderReport = useCallback(
    ({ item }) => (
      <MyReportRow
        {...reportCardProps(item)}
        onPress={openDetails}
        onMatches={openMatches}
        matchCount={
          (item._count?.lostMatches || 0) + (item._count?.foundMatches || 0)
        }
      />
    ),
    [openDetails, openMatches],
  );
  return (
    <Screen scroll={false}>
      <DataList
        data={reports}
        estimatedItemSize={200}
        renderItem={renderReport}
        refreshing={resource.loading}
        onRefresh={refresh}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <Text style={s.body}>
              {watches
                ? "Your search doesn’t stop here."
                : "Your reports and returns, all together."}
            </Text>
            {watches ? (
              <Notice title="Always on the lookout" dark>
                New reports can become potential matches for your active lost
                items. Check matches or notifications for updates.
              </Notice>
            ) : (
              <Chips
                value={status}
                onChange={setStatus}
                options={[
                  { value: "", label: "All" },
                  { value: "ACTIVE", label: "Open" },
                  { value: "RESOLVED", label: "Resolved" },
                  { value: "CLOSED", label: "Closed" },
                ]}
              />
            )}
            <ErrorNotice
              message={resource.error}
              onRetry={() => resource.reload()}
            />
          </View>
        }
        ListEmptyComponent={
          <>
            {resource.loading && !resource.data ? <Loading /> : null}
            {!resource.loading && !resource.error && !reports.length && (
              <Empty
                title={
                  watches
                    ? "Nothing on your watchlist."
                    : "Your first report starts here."
                }
                body={
                  watches
                    ? "Publish a lost report to start looking for potential matches."
                    : "Lost something or found something? Create a report and track it here."
                }
                action="Create a report"
                onAction={() => navigation.navigate("Report", { type: "LOST" })}
              />
            )}
          </>
        }
        ListFooterComponent={
          <Button
            title="Refresh items"
            onPress={refresh}
            busy={resource.loading}
          />
        }
      />
    </Screen>
  );
}
export function DetailsScreen({ navigation, route }) {
  const { user } = useAuth();
  const id = route.params?.id;
  const resource = useResource(async () => {
    if (!id)
      throw userError(
        "This report could not be opened. Go back and choose it again from the feed or My items.",
      );
    const report = (await reportsApi.getById(id)).data.data;
    if (!report?.id)
      throw userError(
        "This report could not be loaded. Go back and refresh the feed or My items.",
      );
    return report;
  }, [id]);
  const { busy, run } = useSubmission();
  const [error, setError] = useState("");
  const report = resource.data;
  const own = report && (report.userId || report.user?.id) === user.id;
  async function changeStatus(status) {
    if (!own || !report || !["ACTIVE", "RESOLVED", "CLOSED"].includes(status))
      return;
    setError("");
    return run(async () => {
      try {
        await reportsApi.updateStatus(report.id, status);
        await resource.reload();
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  }
  async function contact() {
    const recipient = report?.user?.id || report?.userId;
    if (!recipient || recipient === user.id)
      return setError(
        "This student's contact details are unavailable. Refresh the report and try again.",
      );
    setError("");
    return run(async () => {
      try {
        const response = await chatApi.createConversation({
          otherUserId: recipient,
        });
        if (!response.data?.data?.id)
          throw userError(
            "We could not open the conversation. Check Messages before trying again.",
          );
        navigation.navigate("Chat", {
          id: response.data.data.id,
          name: report.user?.name || "Student",
        });
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  }
  return (
    <Screen>
      <ErrorNotice message={resource.error} onRetry={() => resource.reload()} />
      {resource.loading && !report && <Loading />}
      {report && (
        <>
          <Photo uri={report.imageUrl} style={{ height: 240 }} />
          <Text style={s.eyebrow}>
            {report.type} · {report.status}
          </Text>
          <Text style={s.heading}>{report.title}</Text>
          <Text style={s.cardTitle}>
            {report.incidentLocation || "Location not specified"}
          </Text>
          <Text style={s.body}>
            {report.type === "LOST" ? "Lost" : "Found"}:{" "}
            {formatDate(report.incidentDate)}
            {report.user?.name ? ` · Posted by ${report.user.name}` : ""}
          </Text>
          <Text style={s.body}>{report.description}</Text>
          <Chips
            options={[
              { value: "category", label: report.category?.name || "Item" },
            ]}
            value="category"
            onChange={() => {}}
          />
          <Notice title="A safer way to get it back">
            A potential match is a clue, not proof of ownership. Compare
            identifying details with the other student before arranging a
            return.
          </Notice>
          <ErrorNotice message={error} />
          {own ? (
            <>
              <Button
                title="View potential matches"
                secondary
                onPress={() =>
                  navigation.navigate("Matches", { id: report.id, report })
                }
              />
              {report.status === "ACTIVE" && (
                <Button
                  title="Edit report"
                  disabled={busy}
                  onPress={() => navigation.navigate("EditReport", { report })}
                />
              )}
              <View style={{ flexDirection: "row", gap: 12 }}>
                {["ACTIVE", "RESOLVED", "CLOSED"]
                  .filter((v) => v !== report.status)
                  .map((v) => (
                    <Button
                      key={v}
                      style={{ flex: 1 }}
                      title={
                        v === "ACTIVE"
                          ? "Reopen report"
                          : v === "RESOLVED"
                            ? "Mark resolved"
                            : "Close report"
                      }
                      disabled={busy}
                      onPress={() =>
                        Alert.alert(
                          "Update report?",
                          v === "ACTIVE"
                            ? "Make this report active again?"
                            : `Mark this report as ${v.toLowerCase()}?`,
                          [
                            { text: "Cancel", style: "cancel" },
                            { text: "Confirm", onPress: () => changeStatus(v) },
                          ],
                        )
                      }
                    />
                  ))}
              </View>
            </>
          ) : (
            <Button
              title={
                report.type === "FOUND" ? "Contact finder" : "Contact owner"
              }
              onPress={contact}
              busy={busy}
            />
          )}
          <Text style={s.label}>Submitted {formatDate(report.createdAt)}</Text>
        </>
      )}
    </Screen>
  );
}
export function MatchesScreen({ navigation, route }) {
  const { user } = useAuth();
  const id = route.params?.id;
  const resource = useResource(
    async () => {
      if (!id)
        throw userError(
          "Open potential matches from one of your reports in My items.",
        );
      const matches = (await reportsApi.getMatches(id)).data.data;
      if (
        !Array.isArray(matches) ||
        matches.some((match) => !match?.matchId || !match.candidateReport?.id)
      )
        throw userError(
          "Potential matches could not be loaded. Please refresh and try again.",
        );
      return matches;
    },
    [id],
    15000,
  );
  const [selectedId, setSelectedId] = useState(null);
  const selected =
    resource.data?.find((match) => match.matchId === selectedId) || null;
  const { busy, run } = useSubmission();
  const [error, setError] = useState("");
  const openDetails = useCallback(
    (id) => navigation.navigate("Details", { id }),
    [navigation],
  );
  const explain = useCallback((matchId) => {
    setSelectedId(matchId);
    setError("");
  }, []);
  const refresh = useCallback(() => resource.reload(), [resource.reload]);
  const renderMatch = useCallback(
    ({ item }) => (
      <MatchRow
        {...reportCardProps(item.candidateReport)}
        matchId={item.matchId}
        score={item.score}
        aiReasoning={item.aiReasoning}
        onPress={openDetails}
        onExplain={explain}
      />
    ),
    [openDetails, explain],
  );
  async function contact(match) {
    const owner = match?.candidateReport?.owner;
    if (!owner?.id || owner.id === user.id)
      return setError(
        "This student's contact details are unavailable. Close this view and refresh the matches.",
      );
    setError("");
    return run(async () => {
      try {
        const response = await chatApi.createConversation({
          otherUserId: owner.id,
          matchId: match.matchId,
        });
        if (!response.data?.data?.id)
          throw userError(
            "We could not open the conversation. Check Messages before trying again.",
          );
        setSelectedId(null);
        navigation.navigate("Chat", {
          id: response.data.data.id,
          name: owner.name || "Student",
        });
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  }
  return (
    <Screen scroll={false}>
      <DataList
        data={resource.data || EMPTY_ITEMS}
        estimatedItemSize={350}
        renderItem={renderMatch}
        keyExtractor={matchKey}
        refreshing={resource.loading}
        onRefresh={refresh}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            {route.params?.published && (
              <Text style={s.eyebrow}>REPORT PUBLISHED</Text>
            )}
            <Text style={s.heading}>
              {resource.data?.length
                ? "This looks promising."
                : "Your search is in good hands."}
            </Text>
            <Text style={s.body}>
              A match score is a clue, not proof of ownership.
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
                  title="No matches. Yet."
                  body="Matching runs in the background. New potential matches will appear here and in your notifications. Keep your report active while you’re looking."
                  icon="sparkles-outline"
                />
              )}
          </>
        }
        ListFooterComponent={
          <>
            <Button
              title="Check for matches"
              busy={resource.loading}
              onPress={refresh}
            />
            {route.params?.published && (
              <Button
                title="Done · Go to feed"
                secondary
                onPress={() => navigation.navigate("Main", { screen: "Feed" })}
              />
            )}
          </>
        }
      />
      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelectedId(null)}
      >
        <ModalScreen>
          {selected && (
            <>
              <Text style={s.heading}>Why it matched</Text>
              <Text style={s.cardTitle}>
                {Math.round(selected.score * 100)}% potential match
              </Text>
              <Text style={s.body}>
                {selected.aiReasoning || "No explanation provided."}
              </Text>
              <Notice title="Your report">
                {route.params?.report?.title || "Your item"}
              </Notice>
              <Notice title="Candidate report">
                {selected.candidateReport.title}
                {"\n"}
                {selected.candidateReport.description}
              </Notice>
              <Text style={s.body}>
                AI is advisory. Ownership must be checked by the students.
              </Text>
              <ErrorNotice message={error} />
              {selected.candidateReport.owner?.id !== user.id && (
                <Button
                  title="Contact student"
                  onPress={() => contact(selected)}
                  busy={busy}
                />
              )}
              <Button
                title="Close"
                secondary
                onPress={() => setSelectedId(null)}
              />
            </>
          )}
        </ModalScreen>
      </Modal>
    </Screen>
  );
}
