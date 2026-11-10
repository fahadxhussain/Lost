import React, { useEffect, useRef, useState } from "react";
import { Linking, Modal, Platform, ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import Pressable from "../components/TouchTarget";
import {
  categoriesApi,
  reportsApi,
  errorMessage,
  userError,
} from "../services/api";
import {
  Button,
  ErrorNotice,
  Field,
  Icon,
  Notice,
  Photo,
  Screen,
  s,
} from "../components/ui";
import { COLORS as C } from "../constants/theme";
import { reportFields, reportErrors } from "../utils/reports";
import { LIMITS, photoError } from "../utils/validation";
import { useSubmission } from "../hooks/useSubmission";

export default function ReportScreen({ route, navigation }) {
  const existing = route.params?.report;
  const editing = !!existing;
  const [values, setValues] = useState({
    type: existing?.type || route.params?.type || "FOUND",
    title: existing?.title || "",
    description: existing?.description || "",
    categoryId: existing?.categoryId || existing?.category?.id || "",
    incidentLocation: existing?.incidentLocation || "",
    incidentDate: existing?.incidentDate?.slice(0, 10) || "",
  });
  const [photo, setPhoto] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState("");
  const [chooseCategory, setChooseCategory] = useState(false);
  const [choosePhoto, setChoosePhoto] = useState(false);
  const { busy, run } = useSubmission();
  const picker = useSubmission();
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const fields = useRef({});
  const [error, setError] = useState("");
  const set = (key) => (value) => {
    if (busy) return;
    setValues((old) => ({ ...old, [key]: value }));
    setFieldErrors((old) => ({ ...old, [key]: undefined }));
    setError("");
  };
  useEffect(() => {
    if (!editing && route.params?.type) set("type")(route.params.type);
  }, [route.params?.type]);
  async function loadCategories() {
    setCategoryLoading(true);
    try {
      const data = (await categoriesApi.getAll()).data.data;
      if (!Array.isArray(data) || !data.length) {
        setCategoryError(
          "No categories are available right now. Try loading them again before publishing.",
        );
        setCategories([]);
        return;
      }
      setCategories(data);
      setCategoryError("");
    } catch (err) {
      setCategoryError(errorMessage(err));
    } finally {
      setCategoryLoading(false);
    }
  }
  useEffect(() => {
    loadCategories();
  }, []);
  async function pick(camera) {
    if (busy) return;
    return picker.run(async () => {
      setChoosePhoto(false);
      setError("");
      setPermissionDenied(false);
      try {
        const permission = camera
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setPermissionDenied(true);
          return setError(
            `Allow ${camera ? "camera" : "photo"} access in your device settings, or continue without a photo.`,
          );
        }
        const options = {
          mediaTypes: ["images"],
          quality: 0.8,
        };
        const result = camera
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
        if (result.canceled) return;
        const asset = result.assets?.[0];
        const invalid = photoError(asset, Platform.OS);
        if (invalid) return setError(invalid);
        setPhoto(asset);
      } catch (err) {
        setError(
          "The photo could not be opened. Try choosing it again, use the gallery, or continue without a photo.",
        );
      }
    });
  }
  async function submit() {
    if (picker.busy) return;
    if (route.name === "EditReport" && !existing?.id)
      return setError(
        "This report could not be opened for editing. Go back and reopen it from My items.",
      );
    if (editing && existing.status && existing.status !== "ACTIVE")
      return setError(
        "This report is closed or resolved. Reopen it from its details before editing.",
      );
    const errors = reportErrors(values);
    if (
      !editing &&
      !categories.some((category) => category.id === values.categoryId)
    )
      errors.categoryId = categoryLoading
        ? "Categories are still loading. Please wait a moment."
        : "Choose an available category. If none appear, reload the categories below.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      fields.current[Object.keys(errors)[0]]?.focus();
      return setError(Object.values(errors)[0]);
    }
    setError("");
    return run(async () => {
      try {
        const fields = reportFields(values, editing);
        let payload = fields;
        if (photo) {
          payload = new FormData();
          Object.entries(fields).forEach(([key, value]) =>
            payload.append(key, value),
          );
          if (Platform.OS === "web") payload.append("image", photo.file);
          else
            payload.append("image", {
              uri: photo.uri,
              name:
                photo.fileName ||
                `report.${photo.mimeType === "image/png" ? "png" : photo.mimeType === "image/webp" ? "webp" : "jpg"}`,
              type: photo.mimeType || "image/jpeg",
            });
        }
        const response = editing
          ? await reportsApi.update(existing.id, payload)
          : await reportsApi.create(payload);
        if (editing) navigation.replace("Details", { id: existing.id });
        else {
          if (!response.data?.data?.id)
            throw userError(
              "Your report may have been saved, but we could not open it. Check My items before publishing again.",
            );
          setValues({
            type: values.type,
            title: "",
            description: "",
            categoryId: "",
            incidentLocation: "",
            incidentDate: "",
          });
          setPhoto(null);
          navigation.navigate("Matches", {
            id: response.data.data.id,
            report: response.data.data,
            published: true,
          });
        }
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  }
  return (
    <Screen>
      <Text style={s.eyebrow}>
        {editing ? "EDIT YOUR REPORT" : "ITEM DETAILS"}
      </Text>
      {!editing && (
        <>
          <Text style={s.heading}>
            {values.type === "LOST"
              ? "Tell us what you lost."
              : "Tell us what you found."}
          </Text>
          <Text style={s.body}>
            {values.type === "LOST"
              ? "Include the last place you remember having it."
              : "Include where you found it so the owner can recognise it."}
          </Text>
        </>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add or change item photo"
        disabled={busy || picker.busy}
        onPress={() => setChoosePhoto(true)}
      >
        {photo || existing?.imageUrl ? (
          <Photo uri={photo?.uri || existing.imageUrl} />
        ) : (
          <View style={[s.placeholder, { height: 145, borderRadius: 16 }]}>
            <Icon name="camera-outline" size={30} />
            <Text style={s.cardTitle}>Add a photo</Text>
            <Text style={s.label}>Camera / Gallery · Optional</Text>
          </View>
        )}
      </Pressable>
      {photo && (
        <Button
          title="Remove selected photo"
          secondary
          disabled={busy || picker.busy}
          onPress={() => setPhoto(null)}
        />
      )}
      <View>
        <Field
          label="Item title"
          ref={(node) => {
            fields.current.title = node;
          }}
          error={fieldErrors.title}
          hint="Optional. A short title helps students recognise your item."
          editable={!busy}
          maxLength={LIMITS.title}
          value={values.title}
          onChangeText={set("title")}
          placeholder="e.g. Black leather wallet"
        />
        <Field
          label="Description · Required"
          ref={(node) => {
            fields.current.description = node;
          }}
          error={fieldErrors.description}
          hint={`At least 10 characters. Include colour, brand, and distinctive details. ${values.description.length}/${LIMITS.description}`}
          editable={!busy}
          maxLength={LIMITS.description}
          value={values.description}
          onChangeText={set("description")}
          placeholder="Describe the item, including useful identifying details"
          multiline
        />
        <Field
          label="Location"
          ref={(node) => {
            fields.current.incidentLocation = node;
          }}
          error={fieldErrors.incidentLocation}
          hint="Optional. Where was the item lost or found?"
          editable={!busy}
          maxLength={LIMITS.location}
          value={values.incidentLocation}
          onChangeText={set("incidentLocation")}
          placeholder="e.g. CS Lab, Block A"
        />
        <View style={{ flexDirection: "row", gap: 14 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.label}>Category · Required</Text>
            <Pressable
              disabled={editing || busy || categoryLoading}
              accessibilityRole="button"
              onPress={() => setChooseCategory(true)}
              style={s.input}
            >
              <Text style={{ color: C.text }}>
                {categories.find((c) => c.id === values.categoryId)?.name ||
                  existing?.category?.name ||
                  (categoryLoading
                    ? "Loading categories…"
                    : "Choose category")}{" "}
                ▾
              </Text>
            </Pressable>
            {fieldErrors.categoryId && (
              <Text
                accessibilityRole="alert"
                style={[s.label, { color: C.danger }]}
              >
                {fieldErrors.categoryId}
              </Text>
            )}
          </View>
          <Field
            style={{ flex: 1 }}
            label={`Date ${values.type === "LOST" ? "lost" : "found"}`}
            ref={(node) => {
              fields.current.incidentDate = node;
            }}
            error={fieldErrors.incidentDate}
            hint="Optional. YYYY-MM-DD; leave blank if unsure."
            editable={!busy}
            value={values.incidentDate}
            onChangeText={set("incidentDate")}
            placeholder="YYYY-MM-DD"
            maxLength={10}
          />
        </View>
      </View>
      <ErrorNotice message={categoryError} onRetry={loadCategories} />
      <Notice title="A little detail helps.">
        Describe the item even if you add a photo. Enter the day it was lost or
        found, if known.
      </Notice>
      <ErrorNotice message={error} />
      {permissionDenied && (
        <Button
          title="Open device settings"
          secondary
          onPress={async () => {
            try {
              await Linking.openSettings();
            } catch {
              setError(
                "Open your device settings manually and allow camera or photo access for this app.",
              );
            }
          }}
        />
      )}
      <Button
        title={
          editing
            ? "Save changes"
            : `Publish ${values.type.toLowerCase()} report`
        }
        onPress={submit}
        busy={busy}
        disabled={picker.busy}
      />
      <Modal
        visible={chooseCategory}
        transparent
        animationType="slide"
        onRequestClose={() => setChooseCategory(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "#0B304866",
          }}
        >
          <View
            style={{
              backgroundColor: C.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              maxHeight: "75%",
            }}
          >
            <Text style={s.heading}>Choose category</Text>
            <ErrorNotice message={categoryError} onRetry={loadCategories} />
            <ScrollView>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  secondary
                  title={category.name}
                  onPress={() => {
                    set("categoryId")(category.id);
                    setChooseCategory(false);
                  }}
                />
              ))}
            </ScrollView>
            <Button title="Cancel" onPress={() => setChooseCategory(false)} />
          </View>
        </View>
      </Modal>
      <Modal
        visible={choosePhoto}
        transparent
        animationType="slide"
        onRequestClose={() => setChoosePhoto(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "#0B304866",
          }}
        >
          <View
            style={{
              backgroundColor: C.background,
              padding: 24,
              borderRadius: 24,
            }}
          >
            <Text style={s.heading}>Add item photo</Text>
            <Button title="Take a photo" onPress={() => pick(true)} />
            <Button
              title="Choose from gallery"
              secondary
              onPress={() => pick(false)}
            />
            <Button title="Cancel" onPress={() => setChoosePhoto(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
