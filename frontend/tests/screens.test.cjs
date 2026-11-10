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
  const socketHandlers = new Map();
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
  };
  const api = {
    createChatSocket: () => socket,
    errorMessage: (err) => err.message,
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
  native.Text = (props) => {
    calls.push(["text-render", props.children]);
    return React.createElement("Text", props);
  };
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
          if (name === "@react-navigation/native")
            return {
              useFocusEffect: (effect) => React.useEffect(effect, [effect]),
            };
          if (name === "@expo/vector-icons") return { Ionicons: "Icon" };
          if (name === "expo-image") return { Image: "CachedImage" };
          if (name === "@shopify/flash-list") return { FlashList };
          if (name === "react-native-safe-area-context")
            return {
              SafeAreaView: "SafeAreaView",
              SafeAreaProvider: "SafeAreaProvider",
            };
          if (name === "expo-image-picker") return {};
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
    calls,
    navigation,
    socketHandlers,
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
  tree.unmount();
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
  tree.unmount();
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
  row.unmount();
  tree.unmount();
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
  row.unmount();
  tree.unmount();
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
  row.unmount();
  tree.unmount();
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
  row.unmount();
  tree.unmount();
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
