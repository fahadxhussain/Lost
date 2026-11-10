const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const babel = require("@babel/core");
const React = require("react");
const renderer = require("react-test-renderer");
const { act } = renderer;

function harness() {
  const cache = new Map();
  const calls = [];
  let resourceData = null;
  const auth = {
    user: {
      id: "me",
      name: "Ihtisham",
      email: "student@isbstudent.comsats.edu.pk",
    },
    token: "jwt",
    acceptSession: async (session) => calls.push(["session", session]),
  };
  const api = {
    errorMessage: (err) => err.message,
    categoriesApi: {
      getAll: async () => ({
        data: {
          data: [
            { id: "phone", name: "Mobile Phone" },
            { id: "charger", name: "Laptop Charger" },
          ],
        },
      }),
    },
    reportsApi: {
      create: async (payload) => {
        calls.push(["create", payload]);
        return { data: { data: { id: "new", ...payload } } };
      },
      update: async () => ({}),
    },
    authApi: {
      login: async (payload) => {
        calls.push(["login", payload]);
        return { data: { data: { token: "real-token", user: auth.user } } };
      },
    },
    chatApi: {
      createConversation: async (payload) => {
        calls.push(["conversation", payload]);
        return { data: { data: { id: "c1" } } };
      },
    },
  };
  const native = Object.fromEntries(
    [
      "View",
      "Text",
      "TextInput",
      "TouchableOpacity",
      "ScrollView",
      "KeyboardAvoidingView",
      "Image",
      "ActivityIndicator",
      "Modal",
    ].map((name) => [name, name]),
  );
  native.Platform = { OS: "android" };
  native.StyleSheet = { create: (value) => value };
  native.Alert = { alert: (...args) => calls.push(["alert", ...args]) };
  function load(file) {
    const filename = path.resolve(__dirname, "..", file);
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const code = babel.transformSync(fs.readFileSync(filename, "utf8"), {
      filename,
      presets: ["babel-preset-expo"],
    }).code;
    vm.runInNewContext(
      code,
      {
        exports,
        process,
        console,
        FormData,
        setInterval,
        clearInterval,
        setTimeout,
        clearTimeout,
        require: (name) => {
          if (name === "react") return React;
          if (name === "react-native") return native;
          if (name === "@expo/vector-icons") return { Ionicons: "Icon" };
          if (name === "react-native-safe-area-context")
            return { SafeAreaView: "SafeAreaView" };
          if (name === "expo-image-picker") return {};
          if (name.endsWith("/services/api")) return api;
          if (name.endsWith("/context/AuthContext"))
            return { useAuth: () => auth };
          if (name.endsWith("/hooks/useResource"))
            return {
              useResource: () => ({
                data: resourceData,
                loading: false,
                error: "",
                reload: () => {},
              }),
            };
          if (name.startsWith("."))
            return load(
              path.relative(
                path.resolve(__dirname, ".."),
                path.resolve(path.dirname(filename), name + ".js"),
              ),
            );
          return require(name);
        },
      },
      { filename },
    );
    return exports;
  }
  const navigation = {
    navigate: (...args) => calls.push(["navigate", ...args]),
    replace: (...args) => calls.push(["replace", ...args]),
  };
  return {
    load,
    calls,
    navigation,
    setResource: (data) => {
      resourceData = data;
    },
  };
}
function button(tree, label) {
  return tree.root
    .findAllByType("TouchableOpacity")
    .find((node) =>
      node.findAllByType("Text").some((text) => text.props.children === label),
    );
}
test("sign-in screen sends normalized university email and accepts nested backend session", async () => {
  const h = harness();
  const { AuthScreen } = h.load("src/screens/AuthScreens.js");
  let tree;
  await act(async () => {
    tree = renderer.create(
      React.createElement(AuthScreen, {
        navigation: h.navigation,
        route: { name: "Login" },
      }),
    );
  });
  const fields = tree.root.findAllByType("TextInput");
  act(() => {
    fields[0].props.onChangeText("  SP23-BSE-011@ISBSTUDENT.COMSATS.EDU.PK ");
    fields[1].props.onChangeText("password123");
  });
  await act(async () => {
    await button(tree, "Sign in").props.onPress();
  });
  assert.equal(
    h.calls.find(([kind]) => kind === "login")[1].email,
    "sp23-bse-011@isbstudent.comsats.edu.pk",
  );
  assert.equal(
    h.calls.find(([kind]) => kind === "session")[1].token,
    "real-token",
  );
  tree.unmount();
});
test("report screen rejects photo-only input and publishes a valid text-only report", async () => {
  const h = harness();
  const Report = h.load("src/screens/ReportScreen.js").default;
  let tree;
  await act(async () => {
    tree = renderer.create(
      React.createElement(Report, {
        navigation: h.navigation,
        route: { params: { type: "LOST" } },
      }),
    );
  });
  await act(async () => {
    await button(tree, "Publish lost report").props.onPress();
  });
  assert.equal(
    h.calls.some(([kind]) => kind === "create"),
    false,
  );
  await act(async () => {
    button(tree, "Mobile Phone").props.onPress();
  });
  const description = tree.root
    .findAllByType("TextInput")
    .find((field) => field.props.multiline);
  act(() =>
    description.props.onChangeText("Black Samsung phone lost near the lab"),
  );
  await act(async () => {
    await button(tree, "Publish lost report").props.onPress();
  });
  const payload = h.calls.find(([kind]) => kind === "create")[1];
  assert.equal(payload.type, "LOST");
  assert.equal(payload.categoryId, "phone");
  assert.equal(payload.description, "Black Samsung phone lost near the lab");
  assert.ok(
    h.calls.some(
      ([kind, screen, params]) =>
        kind === "navigate" && screen === "Matches" && params.id === "new",
    ),
  );
  tree.unmount();
});
test("report details exposes edit/status only to the report owner and opens contact via API", async () => {
  const h = harness();
  h.setResource({
    id: "report",
    userId: "other",
    type: "FOUND",
    status: "ACTIVE",
    title: "Phone",
    description: "Black phone found in lab",
    user: { id: "other", name: "Finder" },
    category: { name: "Mobile Phone" },
  });
  const Details = h.load("src/screens/ItemScreens.js").DetailsScreen;
  let tree;
  await act(async () => {
    tree = renderer.create(
      React.createElement(Details, {
        navigation: h.navigation,
        route: { params: { id: "report" } },
      }),
    );
  });
  assert.equal(button(tree, "Edit report"), undefined);
  await act(async () => {
    await button(tree, "Contact finder").props.onPress();
  });
  assert.equal(
    h.calls.find(([kind]) => kind === "conversation")[1].otherUserId,
    "other",
  );
  assert.ok(
    h.calls.some(([kind, screen]) => kind === "navigate" && screen === "Chat"),
  );
  tree.unmount();
});
