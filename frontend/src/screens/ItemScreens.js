import React, { useState } from "react";
import { Alert, Modal, Text, View } from "react-native";
import { useResource } from "../hooks/useResource";
import { useAuth } from "../context/AuthContext";
import { chatApi, reportsApi, errorMessage } from "../services/api";
import {
  Button,
  Chips,
  Empty,
  ErrorNotice,
  Loading,
  Notice,
  Photo,
  ReportCard,
  Screen,
  s,
} from "../components/ui";
import { COLORS as C } from "../constants/theme";
import { formatDate } from "../utils/reports";

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
  const reports = (resource.data || []).filter(
    (r) => !watches || r.type === "LOST",
  );
  return (
    <Screen>
      <Text style={s.body}>
        {watches
          ? "Your search doesn’t stop here."
          : "Your reports and returns, all together."}
      </Text>
      {watches ? (
        <Notice title="Always on the lookout" dark>
          New reports can become potential matches for your active lost items.
          Check matches or notifications for updates.
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
      <ErrorNotice message={resource.error} onRetry={() => resource.reload()} />
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
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          compact
          onPress={() => navigation.navigate("Details", { id: report.id })}
        >
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            <Button
              title={`View potential matches (${(report._count?.lostMatches || 0) + (report._count?.foundMatches || 0)})`}
              secondary
              onPress={() =>
                navigation.navigate("Matches", { id: report.id, report })
              }
            />
          </View>
        </ReportCard>
      ))}
      <Button
        title="Refresh items"
        onPress={() => resource.reload()}
        busy={resource.loading}
      />
    </Screen>
  );
}
export function DetailsScreen({ navigation, route }) {
  const { user } = useAuth();
  const resource = useResource(
    async () => (await reportsApi.getById(route.params.id)).data.data,
    [route.params.id],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const report = resource.data;
  const own = report && (report.userId || report.user?.id) === user.id;
  async function changeStatus(status) {
    setBusy(true);
    setError("");
    try {
      await reportsApi.updateStatus(report.id, status);
      await resource.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function contact() {
    setBusy(true);
    setError("");
    try {
      const response = await chatApi.createConversation({
        otherUserId: report.user?.id || report.userId,
      });
      navigation.navigate("Chat", {
        id: response.data.data.id,
        name: report.user?.name || "Student",
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
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
  const resource = useResource(
    async () => (await reportsApi.getMatches(route.params.id)).data.data,
    [route.params.id],
    15000,
  );
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function contact(match) {
    setBusy(true);
    setError("");
    try {
      const response = await chatApi.createConversation({
        otherUserId: match.candidateReport.owner.id,
        matchId: match.matchId,
      });
      setSelected(null);
      navigation.navigate("Chat", {
        id: response.data.data.id,
        name: match.candidateReport.owner.name,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      {route.params.published && (
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
      <ErrorNotice message={resource.error} onRetry={() => resource.reload()} />
      {resource.loading && !resource.data && <Loading />}
      {resource.data?.length === 0 && (
        <Empty
          title="No matches. Yet."
          body="Matching runs in the background. New potential matches will appear here and in your notifications. Keep your report active while you’re looking."
          icon="sparkles-outline"
        />
      )}
      {(resource.data || []).map((match) => (
        <ReportCard
          key={match.matchId}
          report={match.candidateReport}
          onPress={() =>
            navigation.navigate("Details", { id: match.candidateReport.id })
          }
        >
          <View style={{ padding: 14, gap: 8 }}>
            <Text style={s.cardTitle}>
              {Math.round(match.score * 100)}% match
            </Text>
            <Text style={s.body}>{match.aiReasoning}</Text>
            <Button
              title="Why it matched"
              secondary
              onPress={() => {
                setSelected(match);
                setError("");
              }}
            />
          </View>
        </ReportCard>
      ))}
      <Button
        title="Check for matches"
        busy={resource.loading}
        onPress={() => resource.reload()}
      />
      {route.params.published && (
        <Button
          title="Done · Go to feed"
          secondary
          onPress={() => navigation.navigate("Main", { screen: "Feed" })}
        />
      )}
      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <Screen>
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
                {route.params.report?.title || "Your item"}
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
                onPress={() => setSelected(null)}
              />
            </>
          )}
        </Screen>
      </Modal>
    </Screen>
  );
}
