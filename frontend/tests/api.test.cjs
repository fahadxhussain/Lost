const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const babel = require("@babel/core");
const axios = require("axios");
function client(platform = "android") {
  let savedToken = "student-token";
  const calls = [];
  const instance = axios.create();
  instance.defaults.adapter = async (config) => {
    calls.push(config);
    return {
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data: {
        status: "success",
        data: { token: "jwt", user: { id: "student" } },
      },
    };
  };
  const filename = require.resolve("../src/services/api.js");
  const code = babel.transformSync(fs.readFileSync(filename, "utf8"), {
    filename,
    presets: ["babel-preset-expo"],
  }).code;
  const exports = {};
  const context = {
    exports,
    process: { env: {} },
    FormData,
    require: (name) => {
      if (name === "axios")
        return {
          ...axios,
          create: (config) => {
            Object.assign(instance.defaults, config);
            return instance;
          },
        };
      if (name === "@react-native-async-storage/async-storage")
        return { getItem: async () => savedToken };
      if (name === "react-native") return { Platform: { OS: platform } };
      return require(name);
    },
  };
  vm.runInNewContext(code, context, { filename });
  return {
    api: exports,
    calls,
    instance,
    clearToken: () => {
      savedToken = null;
    },
  };
}
test("API auth uses nested response data, OTP resend, and bearer token", async () => {
  const { api, calls } = client();
  const response = await api.authApi.login({
    email: "a@isbstudent.comsats.edu.pk",
    password: "password",
  });
  assert.equal(response.data.data.token, "jwt");
  assert.equal(calls[0].url, "/auth/login");
  assert.equal(calls[0].headers.Authorization, "Bearer student-token");
  await api.authApi.resendOtp({ userId: "student" });
  assert.equal(calls[1].url, "/auth/resend-otp");
  assert.equal(api.SOCKET_URL, "http://10.0.2.2:5000");
});
test("search, report status, match, chat and notification contracts match current backend", async () => {
  const { api, calls } = client();
  await api.searchApi.search({
    query: "charger",
    categoryId: "charger",
    type: "LOST",
    page: 2,
  });
  assert.equal(calls[0].url, "/reports/search");
  assert.equal(calls[0].params.query, "charger");
  await api.reportsApi.updateStatus("r1", "RESOLVED");
  assert.equal(calls[1].method, "patch");
  assert.deepEqual(JSON.parse(calls[1].data), { status: "RESOLVED" });
  await api.reportsApi.getMatches("r1");
  assert.equal(calls[2].url, "/reports/r1/matches");
  await api.chatApi.createConversation({
    otherUserId: "student2",
    matchId: "m1",
  });
  assert.deepEqual(JSON.parse(calls[3].data), {
    otherUserId: "student2",
    matchId: "m1",
  });
  await api.notificationsApi.markRead("n1");
  await api.notificationsApi.markAllRead();
  assert.equal(calls[4].url, "/notifications/n1/read");
  assert.equal(calls[5].url, "/notifications/read-all");
});
test("photo-free JSON and native multipart reports use the correct content types", async () => {
  const { api, calls } = client();
  await api.reportsApi.create({
    type: "FOUND",
    categoryId: "wallet",
    description: "Black leather wallet",
  });
  assert.match(calls[0].headers["Content-Type"], /application\/json/);
  const form = new FormData();
  form.append("description", "Black leather wallet");
  await api.reportsApi.create(form);
  assert.match(calls[1].headers["Content-Type"], /multipart\/form-data/);
  assert.equal(calls[1].data, form);
});
test("expired authenticated requests clear session but unauthenticated login failures do not", async () => {
  const { api, instance, clearToken } = client();
  let expired = 0;
  api.setUnauthorizedHandler(async () => {
    expired++;
  });
  instance.defaults.adapter = async (config) => {
    throw { response: { status: 401 }, config };
  };
  await assert.rejects(api.authApi.getMe());
  assert.equal(expired, 1);
  clearToken();
  await assert.rejects(
    api.authApi.login({ email: "student", password: "wrong" }),
  );
  assert.equal(expired, 1);
});
