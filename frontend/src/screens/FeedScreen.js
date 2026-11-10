import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Pressable from "../components/TouchTarget";
import { useFocusEffect } from "@react-navigation/native";
import {
  categoriesApi,
  reportsApi,
  searchApi,
  errorMessage,
  userError,
} from "../services/api";
import {
  Button,
  CompactSeparator,
  DataList,
  Chips,
  Empty,
  ErrorNotice,
  Field,
  Notice,
  ReportCard,
  ReportCardSkeleton,
  reportCardProps,
  Screen,
  Segments,
  s,
} from "../components/ui";
import { hasNextPage } from "../utils/reports";
import { LIMITS } from "../utils/validation";

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
  const failedPage = useRef(1);
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
      const categories = (await categoriesApi.getAll()).data.data;
      if (!Array.isArray(categories))
        throw userError(
          "Categories could not be loaded. You can still search by keyword, or try loading categories again.",
        );
      setCategories(categories);
      setCategoryError("");
    } catch (err) {
      setCategoryError(errorMessage(err));
    }
  };
  useEffect(() => {
    loadCategories();
  }, []);
  const load = useCallback(
    async (nextPage = 1, reset = false) => {
      if (nextPage > 1 && pending.current) return;
      const request = ++generation.current;
      pending.current = true;
      setLoading(true);
      setError("");
      if (reset) {
        setReports([]);
        setPage(1);
      }
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
        if (!Array.isArray(result.data))
          throw userError(
            "Items could not be loaded. Please refresh and try again.",
          );
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
        if (request === generation.current) {
          failedPage.current = nextPage;
          setError(errorMessage(err));
        }
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
      load(1, true);
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
        maxLength={LIMITS.search}
        hint="Search by item name, brand, or identifying details. Use the filters below to narrow the results."
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
      <ErrorNotice message={error} onRetry={() => load(failedPage.current)} />
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
            <View style={{ gap: 16, paddingTop: 8 }}>
              {[0,1,2,3,4].map(i => <ReportCardSkeleton key={i} />)}
            </View>
          ) : !error ? (
            <Empty
              title={
                search || categoryId
                  ? "No items match your search."
                  : "Nothing here just yet."
              }
              body={
                search || categoryId
                  ? "Try a shorter keyword, check the spelling, choose another category, or switch between Lost and Found."
                  : "Be the first to help something find its way home. Report an item to get started."
              }
              action={
                search || categoryId
                  ? "Clear search and filters"
                  : "Report an item"
              }
              onAction={() => {
                if (search || categoryId) {
                  setQuery("");
                  setSearch("");
                  setCategoryId("");
                } else navigation.navigate("Report");
              }}
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
