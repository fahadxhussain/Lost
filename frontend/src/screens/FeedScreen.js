import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, Pressable, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  categoriesApi,
  reportsApi,
  searchApi,
  errorMessage,
} from "../services/api";
import {
  Button,
  CompactSeparator,
  DataList,
  Chips,
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Notice,
  ReportCard,
  reportCardProps,
  Screen,
  Segments,
  s,
} from "../components/ui";
import { hasNextPage } from "../utils/reports";

export default function FeedScreen({ navigation }) {
  const [type, setType] = useState("FOUND");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState("");
  const [reports, setReports] = useState([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const pending = useRef(false);
  const openDetails = useCallback(
    (id) => navigation.navigate("Details", { id }),
    [navigation],
  );
  const renderReport = useCallback(
    ({ item }) => (
      <ReportCard {...reportCardProps(item)} compact onPress={openDetails} />
    ),
    [openDetails],
  );
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);
  const loadCategories = async () => {
    try {
      setCategories((await categoriesApi.getAll()).data.data);
      setCategoryError("");
    } catch (err) {
      setCategoryError(errorMessage(err));
    }
  };
  useEffect(() => {
    loadCategories();
  }, []);
  const load = useCallback(
    async (nextPage = 1) => {
      if (nextPage > 1 && pending.current) return;
      const request = ++generation.current;
      pending.current = true;
      setLoading(true);
      setError("");
      if (nextPage === 1) setReports([]);
      try {
        const params = {
          type,
          ...(categoryId && { categoryId }),
          page: nextPage,
          limit: 20,
        };
        const response = search
          ? await searchApi.search({ ...params, query: search })
          : await reportsApi.getAll(params);
        if (request !== generation.current) return;
        const result = response.data;
        setReports((old) =>
          nextPage === 1
            ? result.data
            : [
                ...old,
                ...result.data.filter(
                  (item) => !old.some((r) => r.id === item.id),
                ),
              ],
        );
        setPage(nextPage);
        setMore(hasNextPage(result.pagination, result.data.length));
      } catch (err) {
        if (request === generation.current) setError(errorMessage(err));
      } finally {
        if (request === generation.current) {
          setLoading(false);
          pending.current = false;
        }
      }
    },
    [type, categoryId, search],
  );
  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        ++generation.current;
        pending.current = false;
      };
    }, [load]),
  );
  const header = (
    <View style={{ gap: 16 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Report a lost item"
        onPress={() => navigation.navigate("Report", { type: "LOST" })}
      >
        <Notice title="Lost something? Report it" dark>
          Let your campus help you find it. Start looking for potential matches.
        </Notice>
      </Pressable>
      <Field
        label="Search campus items"
        placeholder="Wallet, charger, student card…"
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        onSubmitEditing={() => setSearch(query.trim())}
      />
      <Segments
        value={type}
        onChange={setType}
        options={[
          { value: "LOST", label: "Lost" },
          { value: "FOUND", label: "Found" },
        ]}
      />
      <Chips
        value={categoryId}
        onChange={setCategoryId}
        options={[
          { value: "", label: "All categories" },
          ...categories.map((c) => ({ value: c.id, label: c.name })),
        ]}
      />
      <ErrorNotice message={categoryError} onRetry={loadCategories} />
      <Text style={s.cardTitle}>
        {search ? "Search results" : "Around your campus"}
      </Text>
      <ErrorNotice message={error} onRetry={() => load()} />
    </View>
  );
  return (
    <Screen scroll={false}>
      <DataList
        data={reports}
        estimatedItemSize={126}
        keyboardShouldPersistTaps="handled"
        refreshing={loading && page === 1}
        onRefresh={() => load()}
        ListHeaderComponent={header}
        ItemSeparatorComponent={CompactSeparator}
        renderItem={renderReport}
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : !error ? (
            <Empty
              title="Nothing here just yet."
              body="Try another category or be the first to help something find its way home."
              action="Report an item"
              onAction={() => navigation.navigate("Report")}
            />
          ) : null
        }
        ListFooterComponent={
          reports.length > 0 && more ? (
            <Button
              title="Load more items"
              busy={loading}
              onPress={() => load(page + 1)}
            />
          ) : null
        }
      />
    </Screen>
  );
}
