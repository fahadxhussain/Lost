const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const babel = require("@babel/core");
const React = require("react");
const renderer = require("react-test-renderer");
const { act } = renderer;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function harness() {
  const cache = new Map();
  const calls = [];
  const socketHandlers = new Map();
  const keyboardCallbacks = new Map();
  let now = Date.now();
  class TestDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  }
  const intervals = new Set();
  const storage = {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  };
  const picker = {
    requestCameraPermissionsAsync: async () => ({ granted: true }),
    requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
    launchCameraAsync: async () => ({ canceled: true }),
    launchImageLibraryAsync: async () => ({ canceled: true }),
  };
  const socket = {
    on: (event, handler) => {
      socketHandlers.set(event, handler);
      return socket;
    },
    emit: () => {},
    disconnect: () => {},
  };
  const FlashList = React.forwardRef((props, ref) => {
    React.useImperativeHandle(
      ref,
      () => ({ scrollToEnd: () => calls.push(["scroll-to-end"]) }),
      [],
    );
    return React.createElement("FlashList", props);
  });
  let resourceData = null;
  const auth = {
    user: {
      id: "me",
      name: "Ihtisham",
      email: "student@isbstudent.comsats.edu.pk",
    },
    token: "jwt",
    acceptSession: async (session) => calls.push(["session", session]),
    updateUser: (user) => {
      auth.user = user;
      calls.push(["profile-updated", user]);
    },
  };
  const api = {
    createChatSocket: () => socket,
    errorMessage: (err) => err.message,
    userError: (message) => new Error(message),
    setUnauthorizedHandler: () => {},
    TOKEN_KEY: "token",
    notificationsApi: {
      markRead: async (id) => {
        calls.push(["notification-read", id]);
      },
    },
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
      forgotPassword: async (email) => {
        calls.push(["reset-link", email]);
        return {
          data: {
            message: "If an active account exists, a reset link will be sent.",
          },
        };
      },
      updateProfile: async (payload) => {
        calls.push(["update-profile", payload]);
        return { data: { data: { user: { ...auth.user, ...payload } } } };
      },
      register: async (payload) => {
        calls.push(["register", payload]);
        return { data: { data: { userId: "new-user" } } };
      },
      verifyOtp: async (payload) => {
        calls.push(["verify", payload]);
        return { data: { data: {} } };
      },
      resendOtp: async () => {
        calls.push(["resend"]);
        return {};
      },
      login: async (payload) => {
        calls.push(["login", payload]);
        return { data: { data: { token: "real-token", user: auth.user } } };
      },
    },
    chatApi: {
      getMessages: async () => ({ data: { data: [] } }),
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
      "Pressable",
      "ScrollView",
      "KeyboardAvoidingView",
      "Image",
      "ActivityIndicator",
      "Modal",
    ].map((name) => [name, name]),
  );
  native.Platform = { OS: "android" };
  native.Dimensions = { get: () => ({ width: 390, height: 844 }) };
  native.Text = (props) => {
    calls.push(["text-render", props.children]);
    return React.createElement("Text", props);
  };
  native.StyleSheet = { create: (value) => value };
  native.Keyboard = {
    addListener: (event, callback) => {
      keyboardCallbacks.set(event, callback);
      return { remove: () => keyboardCallbacks.delete(event) };
    },
  };
  native.AccessibilityInfo = {
    isReduceMotionEnabled: async () => false,
    addEventListener: () => ({ remove: () => {} }),
  };
  native.Animated = {
    View: "AnimatedView",
    Value: class {
      constructor(value) {
        this.value = value;
      }
      setValue(value) {
        this.value = value;
      }
      interpolate(options) {
        return { value: this.value, ...options };
      }
    },
    spring: (value, config) => ({
      start: () => {
        value.setValue(config.toValue);
        calls.push(["tab-animation", config]);
      },
      stop: () => {},
    }),
  };
  native.Alert = { alert: (...args) => calls.push(["alert", ...args]) };
  native.Linking = { openSettings: async () => calls.push(["settings"]) };
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
        Date: TestDate,
        setInterval: (callback) => {
          intervals.add(callback);
          return callback;
        },
        clearInterval: (callback) => intervals.delete(callback),
        setTimeout,
        clearTimeout,
        require: (name) => {
          if (name === "react") return React;
          if (name === "react-native") return native;
          if (name === "@react-navigation/native")
            return {
              useFocusEffect: (effect) => React.useEffect(effect, [effect]),
              NavigationContainer: "NavigationContainer",
              DefaultTheme: { colors: {} },
            };
          if (name === "@react-navigation/native-stack")
            return {
              createNativeStackNavigator: () => ({
                Navigator: "StackNavigator",
                Screen: "StackScreen",
                Group: "StackGroup",
              }),
            };
          if (name === "@react-navigation/bottom-tabs")
            return {
              createBottomTabNavigator: () => ({
                Navigator: "TabsNavigator",
                Screen: "TabScreen",
              }),
            };
          if (name === "@react-navigation/elements")
            return { useHeaderHeight: () => 96 };
          if (name === "@expo/vector-icons") return { Ionicons: "Icon" };
          if (name === "expo-image") return { Image: "CachedImage" };
          if (name === "@shopify/flash-list") return { FlashList };
          if (name === "react-native-safe-area-context")
            return {
              SafeAreaView: "SafeAreaView",
              SafeAreaProvider: "SafeAreaProvider",
              useSafeAreaInsets: () => ({
                top: 24,
                bottom: 20,
                left: 0,
                right: 0,
              }),
            };
          if (name === "expo-image-picker") return picker;
          if (name === "@react-native-async-storage/async-storage")
            return storage;
          if (name === "expo-haptics")
            return {
              ImpactFeedbackStyle: { Light: "light" },
              selectionAsync: async () => {
                calls.push(["haptic", "selection"]);
              },
              impactAsync: async (style) => {
                calls.push(["haptic", style]);
              },
            };
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
    api,
    auth,
    picker,
    storage,
    advanceTime: (ms) => {
      now += ms;
      intervals.forEach((tick) => tick());
    },
    calls,
    navigation,
    socketHandlers,
    keyboardCallbacks,
    native,
    setResource: (data) => {
      resourceData = data;
    },
  };
}
function button(tree, label) {
  return tree.root
    .findAllByType("Pressable")
    .find((node) =>
      node.findAllByType("Text").some((text) => text.props.children === label),
    );
}
function sendButton(tree) {
  return tree.root
    .findAllByType("Pressable")
    .find((node) => node.props.accessibilityLabel === "Send message");
}
test("touch feedback preserves actions, hover and press styles, and suppresses disabled taps", async () => {
  const h = harness();
  const TouchTarget = h.load("src/components/TouchTarget.js").default;
  const event = { nativeEvent: {} };
  let presses = 0;
  const props = {
    onPress: (received) => {
      assert.equal(received, event);
      presses += 1;
      return "action-result";
    },
    style: { borderRadius: 20 },
  };
  let tree;
  await act(async () => {
    tree = renderer.create(React.createElement(TouchTarget, props));
  });
  const target = () => tree.root.findByType("Pressable");
  act(() => assert.equal(target().props.onPress(event), "action-result"));
  assert.equal(presses, 1);
  assert.ok(
    h.calls.some(([kind, type]) => kind === "haptic" && type === "selection"),
  );
  act(() => target().props.onHoverIn(event));
  assert.ok(
    target()
      .props.style({ pressed: false })
      .some((style) => style?.opacity === 0.86),
  );
  act(() => target().props.onHoverOut(event));
  assert.ok(
    !target()
      .props.style({ pressed: false })
      .some((style) => style?.opacity),
  );
  assert.ok(
    target()
      .props.style({ pressed: true })
      .some((style) => style?.opacity === 0.7),
  );
  await act(async () => {
    tree.update(React.createElement(TouchTarget, { ...props, disabled: true }));
  });
  h.calls.length = 0;
  act(() => target().props.onPress(event));
  assert.equal(presses, 1);
  assert.equal(
    h.calls.some(([kind]) => kind === "haptic"),
    false,
  );
  act(() => tree.unmount());
});

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
  act(() => tree.unmount());
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
  act(() => tree.unmount());
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
  act(() => tree.unmount());
});

test("memoized report rows skip unchanged poll results and keep navigation tied to the displayed item", async () => {
  const h = harness();
  const { ReportCard } = h.load("src/components/ui.js");
  const open = (id) => h.calls.push(["open-report", id]);
  const props = {
    id: "r1",
    title: "Wallet",
    type: "LOST",
    status: "ACTIVE",
    incidentDate: null,
    compact: true,
    onPress: open,
  };
  let tree;
  await act(async () => {
    tree = renderer.create(React.createElement(ReportCard, props));
  });
  h.calls.length = 0;
  await act(async () => {
    tree.update(React.createElement(ReportCard, { ...props }));
  });
  assert.equal(h.calls.filter(([kind]) => kind === "text-render").length, 0);
  await act(async () => {
    tree.update(
      React.createElement(ReportCard, { ...props, id: "r2", title: "Charger" }),
    );
  });
  assert.ok(
    h.calls.some(
      ([kind, text]) => kind === "text-render" && text === "Charger",
    ),
  );
  act(() => tree.root.findByType("Pressable").props.onPress());
  assert.equal(h.calls.find(([kind]) => kind === "open-report")[1], "r2");
  act(() => tree.unmount());
});

test("recycled photo cells recover after failure and do not apply an old error to a new image", async () => {
  const h = harness();
  const { Photo } = h.load("src/components/ui.js");
  let tree;
  await act(async () => {
    tree = renderer.create(
      React.createElement(Photo, { uri: "https://campus/first.jpg" }),
    );
  });
  const oldError = tree.root.findByType("CachedImage").props.onError;
  act(oldError);
  assert.equal(tree.root.findAllByType("CachedImage").length, 0);
  await act(async () => {
    tree.update(
      React.createElement(Photo, { uri: "https://campus/second.jpg" }),
    );
  });
  act(oldError);
  const image = tree.root.findByType("CachedImage");
  assert.equal(image.props.source, "https://campus/second.jpg");
  assert.equal(image.props.recyclingKey, image.props.source);
  assert.equal(image.props.cachePolicy, "memory-disk");
  act(() => tree.unmount());
});

test("Watchlist virtualizes lost reports and preserves item and match navigation", async () => {
  const h = harness();
  h.setResource([
    {
      id: "lost",
      type: "LOST",
      status: "ACTIVE",
      title: "My wallet",
      _count: { lostMatches: 2 },
    },
    { id: "found", type: "FOUND", status: "ACTIVE", title: "Found phone" },
  ]);
  const { MyItemsScreen } = h.load("src/screens/ItemScreens.js");
  let tree, row;
  await act(async () => {
    tree = renderer.create(
      React.createElement(MyItemsScreen, {
        navigation: h.navigation,
        route: { name: "Watchlist" },
      }),
    );
  });
  const list = tree.root.findByType("FlashList");
  assert.equal(list.props.data.length, 1);
  assert.equal(list.props.data[0].id, "lost");
  assert.ok(list.props.estimatedItemSize > 0);
  assert.ok(
    tree.root
      .findAllByType("ScrollView")
      .every((node) => node.props.horizontal),
  );
  await act(async () => {
    row = renderer.create(list.props.renderItem({ item: list.props.data[0] }));
  });
  act(() => button(row, "View potential matches (2)").props.onPress());
  assert.ok(
    h.calls.some(
      ([kind, screen, params]) =>
        kind === "navigate" && screen === "Matches" && params.id === "lost",
    ),
  );
  act(() => row.unmount());
  act(() => tree.unmount());
});

test("match explanation opens with modal safe areas and contacts the correct match participant", async () => {
  const h = harness();
  const match = {
    matchId: "m1",
    score: 0.8,
    aiReasoning: "Same identifying details",
    candidateReport: {
      id: "found",
      type: "FOUND",
      title: "Wallet",
      owner: { id: "finder", name: "Finder" },
    },
  };
  h.setResource([match]);
  const { MatchesScreen } = h.load("src/screens/ItemScreens.js");
  let tree, row;
  await act(async () => {
    tree = renderer.create(
      React.createElement(MatchesScreen, {
        navigation: h.navigation,
        route: { params: { id: "lost", report: { title: "My wallet" } } },
      }),
    );
  });
  const list = tree.root.findByType("FlashList");
  assert.equal(list.props.keyExtractor(match), "m1");
  await act(async () => {
    row = renderer.create(list.props.renderItem({ item: match }));
  });
  await act(async () => {
    button(row, "Why it matched").props.onPress();
  });
  assert.equal(tree.root.findByType("Modal").props.visible, true);
  const edges = tree.root.findByType("SafeAreaView").props.edges;
  assert.ok(edges.includes("top") && edges.includes("bottom"));
  const modalScroll = tree.root
    .findAllByType("ScrollView")
    .find((node) => !node.props.horizontal);
  assert.equal(modalScroll.props.contentInsetAdjustmentBehavior, "never");
  await act(async () => {
    await button(tree, "Contact student").props.onPress();
  });
  const contact = h.calls.find(([kind]) => kind === "conversation")[1];
  assert.equal(contact.matchId, "m1");
  assert.equal(contact.otherUserId, "finder");
  act(() => row.unmount());
  act(() => tree.unmount());
});

test("virtualized conversation rows retain stable render callbacks across polling responses", async () => {
  const h = harness();
  const conversation = {
    id: "c1",
    otherParticipant: { name: "Finder" },
    latestMessage: {
      senderId: "finder",
      content: "Found your wallet",
      isRead: false,
    },
  };
  h.setResource([conversation]);
  const { ConversationsScreen } = h.load("src/screens/ChatScreens.js");
  let tree, row;
  await act(async () => {
    tree = renderer.create(
      React.createElement(ConversationsScreen, { navigation: h.navigation }),
    );
  });
  const renderRow = tree.root.findByType("FlashList").props.renderItem;
  h.setResource([{ ...conversation }]);
  await act(async () => {
    tree.update(
      React.createElement(ConversationsScreen, { navigation: h.navigation }),
    );
  });
  assert.equal(tree.root.findByType("FlashList").props.renderItem, renderRow);
  await act(async () => {
    row = renderer.create(renderRow({ item: conversation }));
  });
  assert.ok(
    row.root
      .findAllByType("Text")
      .some((node) => node.props.children === "Unread message"),
  );
  act(() => row.root.findByType("Pressable").props.onPress());
  assert.ok(
    h.calls.some(
      ([kind, screen, params]) =>
        kind === "navigate" &&
        screen === "Chat" &&
        params.id === "c1" &&
        params.name === "Finder",
    ),
  );
  act(() => row.unmount());
  act(() => tree.unmount());
});

test("virtualized notification rows mark the selected notification read and open its candidate", async () => {
  const h = harness();
  const notification = {
    id: "n1",
    title: "Possible match",
    body: "Take a look",
    createdAt: "2026-11-10T10:00:00Z",
    isRead: false,
    metadata: { oppositeReportId: "found" },
  };
  h.setResource({ data: [notification], unreadCount: 1 });
  const Notifications = h.load("src/screens/NotificationsScreen.js").default;
  let tree, row;
  await act(async () => {
    tree = renderer.create(
      React.createElement(Notifications, { navigation: h.navigation }),
    );
  });
  const list = tree.root.findByType("FlashList");
  await act(async () => {
    row = renderer.create(list.props.renderItem({ item: notification }));
  });
  await act(async () => {
    await row.root.findByType("Pressable").props.onPress();
  });
  assert.ok(
    h.calls.some(([kind, id]) => kind === "notification-read" && id === "n1"),
  );
  assert.ok(
    h.calls.some(
      ([kind, screen, params]) =>
        kind === "navigate" && screen === "Details" && params.id === "found",
    ),
  );
  act(() => row.unmount());
  act(() => tree.unmount());
});

test("chat keeps row callbacks stable while typing and follows new messages only near the bottom", async () => {
  const h = harness();
  const { ChatScreen } = h.load("src/screens/ChatScreens.js");
  let tree;
  await act(async () => {
    tree = renderer.create(
      React.createElement(ChatScreen, { route: { params: { id: "c1" } } }),
    );
  });
  const list = () => tree.root.findByType("FlashList");
  const renderMessage = list().props.renderItem;
  act(() =>
    tree.root
      .findByType("TextInput")
      .props.onChangeText("Is this your wallet?"),
  );
  assert.equal(list().props.renderItem, renderMessage);
  act(() =>
    list().props.onScroll({
      nativeEvent: {
        contentSize: { height: 1000 },
        layoutMeasurement: { height: 300 },
        contentOffset: { y: 0 },
      },
    }),
  );
  await act(async () => {
    h.socketHandlers.get("new_message")({
      id: "m1",
      conversationId: "c1",
      senderId: "finder",
      content: "Found it",
      createdAt: "2026-11-10T10:00:00Z",
    });
  });
  assert.equal(list().props.data.length, 1);
  act(() => list().props.onContentSizeChange());
  assert.equal(h.calls.filter(([kind]) => kind === "scroll-to-end").length, 0);
  act(() =>
    list().props.onScroll({
      nativeEvent: {
        contentSize: { height: 1000 },
        layoutMeasurement: { height: 300 },
        contentOffset: { y: 700 },
      },
    }),
  );
  act(() => list().props.onContentSizeChange());
  assert.equal(h.calls.filter(([kind]) => kind === "scroll-to-end").length, 1);
  act(() => tree.unmount());
});

const input = (tree, label) =>
  tree.root
    .findAllByType("TextInput")
    .find((node) => node.props.accessibilityLabel === label);
const visibleText = (tree) =>
  tree.root
    .findAllByType("Text")
    .map((node) => node.props.children)
    .flat(Infinity)
    .filter((text) => typeof text === "string" || typeof text === "number")
    .join(" ")
    .replace(/\s+/g, " ");

test("registration shows field errors and requires matching passwords before calling the API", async () => {
  const h = harness();
  const { AuthScreen } = h.load("src/screens/AuthScreens.js");
  let tree;
  await act(async () => {
    tree = renderer.create(
      React.createElement(AuthScreen, {
        navigation: h.navigation,
        route: { name: "Register" },
      }),
    );
  });
  await act(async () => {
    await button(tree, "Create account").props.onPress();
  });
  assert.equal(
    h.calls.some(([kind]) => kind === "register"),
    false,
  );
  assert.equal(input(tree, "Your name").props["aria-invalid"], true);
  act(() => {
    input(tree, "Your name").props.onChangeText(" Alex Khan ");
    input(tree, "Student email").props.onChangeText(
      " FA25-BCS-000@ISBSTUDENT.COMSATS.EDU.PK ",
    );
    input(tree, "Password").props.onChangeText("password123");
    input(tree, "Confirm password").props.onChangeText("different");
  });
  await act(async () => {
    await button(tree, "Create account").props.onPress();
  });
  assert.match(visibleText(tree), /Passwords do not match/);
  assert.equal(
    h.calls.some(([kind]) => kind === "register"),
    false,
  );
  act(() => input(tree, "Confirm password").props.onChangeText("password123"));
  await act(async () => {
    await button(tree, "Create account").props.onPress();
  });
  const payload = h.calls.find(([kind]) => kind === "register")[1];
  assert.equal(payload.name, "Alex Khan");
  assert.equal(payload.email, "fa25-bcs-000@isbstudent.comsats.edu.pk");
  assert.equal("confirmation" in payload, false);
  assert.ok(
    h.calls.some(
      ([kind, screen]) => kind === "navigate" && screen === "VerifyOtp",
    ),
  );
  act(() => tree.unmount());
});

test("rapid sign-in submissions send one request and a failed sign-in keeps entered credentials", async () => {
  const h = harness();
  const { AuthScreen } = h.load("src/screens/AuthScreens.js");
  let release,
    requests = 0,
    tree;
  h.api.authApi.login = () => {
    requests++;
    return new Promise((resolve, reject) => {
      release = () => reject(new Error("Check your email or password."));
    });
  };
  await act(async () => {
    tree = renderer.create(
      React.createElement(AuthScreen, {
        navigation: h.navigation,
        route: { name: "Login" },
      }),
    );
  });
  act(() => {
    input(tree, "Student email").props.onChangeText(
      "student@isbstudent.comsats.edu.pk",
    );
    input(tree, "Password").props.onChangeText("password123");
  });
  const submit = input(tree, "Password").props.onSubmitEditing;
  await act(async () => {
    const first = submit();
    const second = submit();
    assert.equal(requests, 1);
    release();
    await Promise.all([first, second]);
  });
  assert.equal(input(tree, "Password").props.value, "password123");
  assert.match(visibleText(tree), /Check your email or password/);
  act(() => tree.unmount());
});

test("OTP guards missing account context and resend cooldown, including time spent in background", async () => {
  const h = harness();
  const { OtpScreen } = h.load("src/screens/AuthScreens.js");
  let tree;
  await act(async () => {
    tree = renderer.create(
      React.createElement(OtpScreen, { navigation: h.navigation, route: {} }),
    );
  });
  assert.equal(button(tree, "Verify email").props.disabled, true);
  act(() => tree.unmount());
  await act(async () => {
    tree = renderer.create(
      React.createElement(OtpScreen, {
        navigation: h.navigation,
        route: {
          params: {
            userId: "student",
            email: "student@isbstudent.comsats.edu.pk",
          },
        },
      }),
    );
  });
  await act(async () => {
    await button(tree, "Resend code in 30s").props.onPress();
  });
  assert.equal(
    h.calls.some(([kind]) => kind === "resend"),
    false,
  );
  act(() => h.advanceTime(60000));
  await act(async () => {
    await button(tree, "Resend code").props.onPress();
  });
  assert.equal(h.calls.filter(([kind]) => kind === "resend").length, 1);
  assert.match(visibleText(tree), /older codes no longer work/);
  act(() => input(tree, "Verification code").props.onChangeText("12 34 56"));
  assert.equal(input(tree, "Verification code").props.value, "123456");
  await act(async () => {
    await button(tree, "Verify email").props.onPress();
  });
  assert.ok(
    h.calls.some(
      ([kind, screen, params]) =>
        kind === "replace" && screen === "Login" && params.verified,
    ),
  );
  act(() => tree.unmount());
});

test("report photo denial offers settings and a canceled picker keeps the form intact", async () => {
  const h = harness();
  h.picker.requestCameraPermissionsAsync = async () => ({ granted: false });
  const Report = h.load("src/screens/ReportScreen.js").default;
  let tree;
  await act(async () => {
    tree = renderer.create(
      React.createElement(Report, { navigation: h.navigation, route: {} }),
    );
  });
  act(() =>
    input(tree, "Description · Required").props.onChangeText(
      "Black phone with a case",
    ),
  );
  await act(async () => {
    await button(tree, "Take a photo").props.onPress();
  });
  assert.match(visibleText(tree), /Allow camera access/);
  await act(async () => {
    await button(tree, "Open device settings").props.onPress();
  });
  assert.ok(h.calls.some(([kind]) => kind === "settings"));
  await act(async () => {
    await button(tree, "Choose from gallery").props.onPress();
  });
  assert.equal(
    input(tree, "Description · Required").props.value,
    "Black phone with a case",
  );
  act(() => tree.unmount());
});

test("category outage cannot publish an invalid report and recovery makes the category selectable", async () => {
  const h = harness();
  const Report = h.load("src/screens/ReportScreen.js").default;
  h.api.categoriesApi.getAll = async () => ({ data: { data: [] } });
  let tree;
  await act(async () => {
    tree = renderer.create(
      React.createElement(Report, { navigation: h.navigation, route: {} }),
    );
  });
  assert.match(visibleText(tree), /No categories are available/);
  act(() =>
    input(tree, "Description · Required").props.onChangeText(
      "Black phone with a case",
    ),
  );
  await act(async () => {
    await button(tree, "Publish found report").props.onPress();
  });
  assert.equal(
    h.calls.some(([kind]) => kind === "create"),
    false,
  );
  h.api.categoriesApi.getAll = async () => ({
    data: { data: [{ id: "phone", name: "Mobile Phone" }] },
  });
  await act(async () => {
    await button(tree, "Try again").props.onPress();
  });
  act(() => button(tree, "Mobile Phone").props.onPress());
  await act(async () => {
    await button(tree, "Publish found report").props.onPress();
  });
  assert.ok(h.calls.some(([kind]) => kind === "create"));
  act(() => tree.unmount());
});

test("chat preserves failed drafts and send errors across background refresh, then recovers", async () => {
  const h = harness();
  const { ChatScreen } = h.load("src/screens/ChatScreens.js");
  h.api.chatApi.sendMessage = async () => {
    throw new Error("Cannot reach the campus server.");
  };
  let tree;
  await act(async () => {
    tree = renderer.create(
      React.createElement(ChatScreen, { route: { params: { id: "c1" } } }),
    );
  });
  act(() => input(tree, "Message").props.onChangeText("Is this your wallet?"));
  await act(async () => {
    await sendButton(tree).props.onPress();
  });
  assert.equal(input(tree, "Message").props.value, "Is this your wallet?");
  await act(async () => h.advanceTime(6000));
  assert.match(visibleText(tree), /Cannot reach the campus server/);
  h.api.chatApi.sendMessage = async (id, content) => ({
    data: {
      data: {
        id: "m1",
        content,
        senderId: "me",
        createdAt: new Date().toISOString(),
      },
    },
  });
  await act(async () => {
    await sendButton(tree).props.onPress();
  });
  assert.equal(input(tree, "Message").props.value, "");
  assert.equal(tree.root.findByType("FlashList").props.data.length, 1);
  assert.doesNotMatch(visibleText(tree), /Cannot reach the campus server/);
  act(() => tree.unmount());
});

test("chat safely handles missing conversation and overlong messages", async () => {
  const h = harness();
  const { ChatScreen } = h.load("src/screens/ChatScreens.js");
  let tree;
  await act(async () => {
    tree = renderer.create(React.createElement(ChatScreen, { route: {} }));
  });
  assert.match(visibleText(tree), /Go back to Messages/);
  assert.equal(input(tree, "Message").props.editable, false);
  act(() => tree.unmount());
  await act(async () => {
    tree = renderer.create(
      React.createElement(ChatScreen, { route: { params: { id: "c1" } } }),
    );
  });
  act(() => input(tree, "Message").props.onChangeText("a".repeat(5001)));
  assert.match(visibleText(tree), /5000 characters/);
  assert.equal(sendButton(tree).props.disabled, true);
  act(() => tree.unmount());
});

test("resource polling skips overlapping requests and a newer response wins over a stale one", async () => {
  const h = harness();
  const { useResource } = h.load("src/hooks/useResource.js");
  const pending = [];
  const fetcher = () =>
    new Promise((resolve, reject) => pending.push({ resolve, reject }));
  let current, tree;
  function Probe() {
    current = useResource(fetcher, [], 1000);
    return null;
  }
  await act(async () => {
    tree = renderer.create(React.createElement(Probe));
  });
  await act(async () => h.advanceTime(5000));
  assert.equal(pending.length, 1);
  let next;
  act(() => {
    next = current.reload();
  });
  assert.equal(pending.length, 2);
  await act(async () => {
    pending[1].resolve(["new"]);
    await next;
  });
  await act(async () => pending[0].resolve(["old"]));
  assert.equal(current.data[0], "new");
  await act(async () => {
    const refresh = current.reload();
    pending[2].reject(new Error("Offline. Try again."));
    await refresh;
  });
  assert.equal(current.data[0], "new");
  assert.equal(current.error, "Offline. Try again.");
  act(() => tree.unmount());
});

test("session storage failure remains recoverable without losing the active sign-in", async () => {
  const h = harness();
  const { AuthProvider, useAuth } = h.load("src/context/AuthContext.js");
  let current, tree;
  function Probe() {
    current = useAuth();
    return null;
  }
  await act(async () => {
    tree = renderer.create(
      React.createElement(AuthProvider, null, React.createElement(Probe)),
    );
  });
  await act(async () =>
    current.acceptSession({
      token: "token",
      user: { id: "me", status: "ACTIVE" },
    }),
  );
  h.storage.removeItem = async () => {
    throw new Error("disk failed");
  };
  await act(async () => {
    await assert.rejects(
      current.signOut(),
      /could not clear your saved sign-in/,
    );
  });
  assert.equal(current.user.id, "me");
  await act(async () => current.useAnotherAccount());
  assert.match(current.restoreError, /could not clear/);
  h.storage.removeItem = async () => {};
  await act(async () => current.useAnotherAccount());
  assert.equal(current.user, null);
  assert.equal(current.restoreError, "");
  act(() => tree.unmount());
});

test("a failed report submission keeps the draft and locks duplicate publishing attempts", async () => {
  const h = harness();
  let release,
    submissions = 0;
  h.api.reportsApi.create = () => {
    submissions++;
    return new Promise((resolve, reject) => {
      release = () =>
        reject(new Error("Server unavailable. Please try again later."));
    });
  };
  const Report = h.load("src/screens/ReportScreen.js").default;
  let tree;
  await act(async () => {
    tree = renderer.create(
      React.createElement(Report, { navigation: h.navigation, route: {} }),
    );
  });
  act(() => {
    input(tree, "Description · Required").props.onChangeText(
      "Black phone with a distinctive blue case",
    );
    button(tree, "Mobile Phone").props.onPress();
  });
  const submit = button(tree, "Publish found report").props.onPress;
  await act(async () => {
    const first = submit();
    const second = submit();
    assert.equal(submissions, 1);
    release();
    await Promise.all([first, second]);
  });
  assert.equal(
    input(tree, "Description · Required").props.value,
    "Black phone with a distinctive blue case",
  );
  assert.match(visibleText(tree), /Server unavailable/);
  assert.equal(
    h.calls.some(([kind]) => kind === "navigate"),
    false,
  );
  act(() => tree.unmount());
});

test("a malformed report success keeps the draft and advises checking My items before retrying", async () => {
  const h = harness();
  h.api.reportsApi.create = async () => ({ data: { data: {} } });
  const Report = h.load("src/screens/ReportScreen.js").default;
  let tree;
  await act(async () => {
    tree = renderer.create(
      React.createElement(Report, { navigation: h.navigation, route: {} }),
    );
  });
  act(() => {
    input(tree, "Description · Required").props.onChangeText(
      "Black phone with a blue case",
    );
    button(tree, "Mobile Phone").props.onPress();
  });
  await act(async () => {
    await button(tree, "Publish found report").props.onPress();
  });
  assert.match(visibleText(tree), /Check My items before publishing again/);
  assert.equal(
    input(tree, "Description · Required").props.value,
    "Black phone with a blue case",
  );
  act(() => tree.unmount());
});

test("sign-in storage failure keeps credentials and pending accounts cannot establish a session", async () => {
  const h = harness();
  h.auth.acceptSession = async () => {
    throw new Error("We could not save your sign-in on this device.");
  };
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
  act(() => {
    input(tree, "Student email").props.onChangeText(
      "student@isbstudent.comsats.edu.pk",
    );
    input(tree, "Password").props.onChangeText("password123");
  });
  await act(async () => {
    await button(tree, "Sign in").props.onPress();
  });
  assert.equal(input(tree, "Password").props.value, "password123");
  assert.match(visibleText(tree), /could not save your sign-in/);
  act(() => tree.unmount());
  const { AuthProvider, useAuth } = h.load("src/context/AuthContext.js");
  let current;
  function Probe() {
    current = useAuth();
    return null;
  }
  await act(async () => {
    tree = renderer.create(
      React.createElement(AuthProvider, null, React.createElement(Probe)),
    );
  });
  await act(async () =>
    assert.rejects(
      current.acceptSession({
        token: "jwt",
        user: { id: "me", status: "PENDING_VERIFICATION" },
      }),
      /verified account/,
    ),
  );
  assert.equal(current.user, null);
  act(() => tree.unmount());
});

test("Report choice navigates to the selected form instead of displaying lost/found toggles", async () => {
  const h = harness();
  const Choice = h.load("src/screens/ReportChoiceScreen.js").default;
  let tree;
  await act(async () => {
    tree = renderer.create(
      React.createElement(Choice, { navigation: h.navigation }),
    );
  });
  act(() => button(tree, "I lost something").props.onPress());
  act(() => button(tree, "I found something").props.onPress());
  assert.equal(
    h.calls.filter(
      ([kind, route]) => kind === "navigate" && route === "CreateReport",
    ).length,
    2,
  );
  assert.equal(
    h.calls.find(
      ([kind, route]) => kind === "navigate" && route === "CreateReport",
    )[2].type,
    "LOST",
  );
  act(() => tree.unmount());
  const Report = h.load("src/screens/ReportScreen.js").default;
  await act(async () => {
    tree = renderer.create(
      React.createElement(Report, {
        navigation: h.navigation,
        route: { name: "CreateReport", params: { type: "LOST" } },
      }),
    );
  });
  assert.match(visibleText(tree), /Tell us what you lost/);
  assert.equal(button(tree, "I found something"), undefined);
  act(() => tree.unmount());
});

test("navigation starts on Main, replaces the report tab with Messages, and hides the Report FAB for the keyboard", async () => {
  const h = harness();
  const Navigator = h.load("src/navigation/AppNavigator.js").default;
  let tree, tabs;
  await act(async () => {
    tree = renderer.create(React.createElement(Navigator));
  });
  const screens = tree.root.findAllByType("StackScreen");
  assert.equal(screens[0].props.name, "Main");
  const Main = screens[0].props.component;
  await act(async () => {
    tabs = renderer.create(
      React.createElement(Main, { navigation: h.navigation }),
    );
  });
  assert.deepEqual(
    tabs.root.findAllByType("TabScreen").map((screen) => screen.props.name),
    ["Feed", "Watchlist", "Messages", "MyItems", "Profile"],
  );
  assert.equal(
    tabs.root
      .findAllByType("TabScreen")
      .find((screen) => screen.props.name === "MyItems").props.options
      .tabBarLabel,
    "My Reports",
  );
  act(() => button(tabs, "Report").props.onPress());
  assert.ok(
    h.calls.some(([kind, route]) => kind === "navigate" && route === "Report"),
  );
  act(() => h.keyboardCallbacks.get("keyboardDidShow")());
  assert.equal(button(tabs, "Report"), undefined);
  act(() => {
    tabs.unmount();
    tree.unmount();
  });
  h.auth.user = null;
  await act(async () => {
    tree = renderer.create(React.createElement(Navigator));
  });
  assert.equal(tree.root.findAllByType("StackScreen")[0].props.name, "Welcome");
  assert.ok(
    tree.root
      .findAllByType("StackScreen")
      .some((screen) => screen.props.name === "ForgotPassword"),
  );
  act(() => tree.unmount());
});

test("selected tabs animate with the native driver and respect reduced motion", async () => {
  const h = harness();
  const Tab = h.load("src/components/AnimatedTabButton.js").default;
  let tree;
  await act(async () => {
    tree = renderer.create(
      React.createElement(Tab, { "aria-selected": false }),
    );
  });
  h.calls.length = 0;
  await act(async () =>
    tree.update(React.createElement(Tab, { "aria-selected": true })),
  );
  assert.ok(
    h.calls.some(
      ([kind, config]) =>
        kind === "tab-animation" &&
        config.toValue === 1 &&
        config.useNativeDriver,
    ),
  );
  act(() => tree.unmount());
  h.native.AccessibilityInfo.isReduceMotionEnabled = async () => true;
  h.calls.length = 0;
  await act(async () => {
    tree = renderer.create(
      React.createElement(Tab, { "aria-selected": false }),
    );
  });
  await act(async () =>
    tree.update(React.createElement(Tab, { "aria-selected": true })),
  );
  assert.equal(
    h.calls.some(([kind]) => kind === "tab-animation"),
    false,
  );
  act(() => tree.unmount());
});

test("chat composer uses the measured header offset and an accessible send icon", async () => {
  const h = harness();
  const { ChatScreen } = h.load("src/screens/ChatScreens.js");
  let tree;
  await act(async () => {
    tree = renderer.create(
      React.createElement(ChatScreen, { route: { params: { id: "c1" } } }),
    );
  });
  const keyboardView = tree.root.findByType("KeyboardAvoidingView");
  assert.equal(keyboardView.props.keyboardVerticalOffset, 96);
  assert.equal(keyboardView.props.behavior, "height");
  assert.equal(sendButton(tree).findAllByType("Text").length, 0);
  assert.equal(sendButton(tree).props.disabled, true);
  act(() => tree.unmount());
});

test("forgot password validates email, requests a link, and prevents repeated requests during cooldown", async () => {
  const h = harness();
  const Forgot = h.load("src/screens/ForgotPasswordScreen.js").default;
  let tree;
  await act(async () => {
    tree = renderer.create(
      React.createElement(Forgot, { navigation: h.navigation, route: {} }),
    );
  });
  await act(async () => button(tree, "Send reset link").props.onPress());
  assert.equal(
    h.calls.some(([kind]) => kind === "reset-link"),
    false,
  );
  act(() =>
    input(tree, "Student email").props.onChangeText(
      " STUDENT@ISBSTUDENT.COMSATS.EDU.PK ",
    ),
  );
  await act(async () => button(tree, "Send reset link").props.onPress());
  assert.equal(
    h.calls.find(([kind]) => kind === "reset-link")[1],
    "student@isbstudent.comsats.edu.pk",
  );
  assert.match(visibleText(tree), /If an active account exists/);
  await act(async () => button(tree, "Send again in 60s").props.onPress());
  assert.equal(h.calls.filter(([kind]) => kind === "reset-link").length, 1);
  act(() => tree.unmount());
});

test("profile saves username without changing fixed details and requests a reset link", async () => {
  const h = harness();
  const Profile = h.load("src/screens/ProfileScreen.js").default;
  let tree;
  await act(async () => {
    tree = renderer.create(React.createElement(Profile));
  });
  assert.equal(input(tree, "Registration number").props.editable, false);
  assert.equal(input(tree, "Campus email").props.editable, false);
  assert.doesNotMatch(visibleText(tree), /YOUR CAMPUS/);
  act(() => input(tree, "Username").props.onChangeText(" New username "));
  await act(async () => button(tree, "Save profile").props.onPress());
  assert.equal(
    h.calls.find(([kind]) => kind === "update-profile")[1].name,
    "New username",
  );
  assert.equal(h.auth.user.name, "New username");
  await act(async () =>
    button(tree, "Send password reset link").props.onPress(),
  );
  assert.equal(
    h.calls.find(([kind]) => kind === "reset-link")[1],
    h.auth.user.email,
  );
  act(() => tree.unmount());
});
