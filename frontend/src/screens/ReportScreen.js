import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { categoriesApi, reportsApi, errorMessage } from "../services/api";
import {
  Button,
  ErrorNotice,
  Field,
  Icon,
  Notice,
  Photo,
  Screen,
  Segments,
  s,
} from "../components/ui";
import { COLORS as C } from "../constants/theme";
import { reportFields, validateReport } from "../utils/reports";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (value) =>
    setValues((old) => ({ ...old, [key]: value }));
  useEffect(() => {
    if (!editing && route.params?.type) set("type")(route.params.type);
  }, [route.params?.type]);
  async function loadCategories() {
    try {
      setCategories((await categoriesApi.getAll()).data.data);
      setCategoryError("");
    } catch (err) {
      setCategoryError(errorMessage(err));
    }
  }
  useEffect(() => {
    loadCategories();
  }, []);
  async function pick(camera) {
    setChoosePhoto(false);
    setError("");
    try {
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted)
        return setError(
          "Allow photo access in your device settings, or continue without a photo.",
        );
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.fileSize > 5 * 1024 * 1024)
        return setError("Choose an image smaller than 5 MB.");
      if (
        asset.mimeType &&
        !["image/jpeg", "image/png", "image/webp"].includes(asset.mimeType)
      )
        return setError("Choose a JPG, PNG, or WebP photo.");
      setPhoto(asset);
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  async function submit() {
    const validation = validateReport(values);
    if (validation) return setError(validation);
    setBusy(true);
    setError("");
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
            name: photo.fileName || "report.jpg",
            type: photo.mimeType || "image/jpeg",
          });
      }
      const response = editing
        ? await reportsApi.update(existing.id, payload)
        : await reportsApi.create(payload);
      if (editing) navigation.replace("Details", { id: existing.id });
      else {
        setValues({
          type: "FOUND",
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
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={s.eyebrow}>
        {editing ? "EDIT YOUR REPORT" : "ITEM DETAILS"}
      </Text>
      {!editing && (
        <Segments
          value={values.type}
          onChange={set("type")}
          options={[
            { value: "LOST", label: "I lost something" },
            { value: "FOUND", label: "I found something" },
          ]}
        />
      )}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Add or change item photo"
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
      </TouchableOpacity>
      {photo && (
        <Button
          title="Remove selected photo"
          secondary
          onPress={() => setPhoto(null)}
        />
      )}
      <View>
        <Field
          label="Item title"
          value={values.title}
          onChangeText={set("title")}
          placeholder="Black leather wallet"
        />
        <Field
          label="Description · Required"
          value={values.description}
          onChangeText={set("description")}
          placeholder="Describe the item, including useful identifying details"
          multiline
        />
        <Field
          label="Location"
          value={values.incidentLocation}
          onChangeText={set("incidentLocation")}
          placeholder="CS Lab, Block A"
        />
        <View style={{ flexDirection: "row", gap: 14 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.label}>Category · Required</Text>
            <TouchableOpacity
              disabled={editing}
              accessibilityRole="button"
              onPress={() => setChooseCategory(true)}
              style={s.input}
            >
              <Text style={{ color: C.text }}>
                {categories.find((c) => c.id === values.categoryId)?.name ||
                  existing?.category?.name ||
                  "Choose category"}{" "}
                ▾
              </Text>
            </TouchableOpacity>
          </View>
          <Field
            style={{ flex: 1 }}
            label={`Date ${values.type === "LOST" ? "lost" : "found"}`}
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
      <Button
        title={
          editing
            ? "Save changes"
            : `Publish ${values.type.toLowerCase()} report`
        }
        onPress={submit}
        busy={busy}
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
