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
    setToken: (token) => {
      savedToken = token;
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
  assert.equal(calls[0].headers.Authorization, undefined);
  await api.authApi.resendOtp({ userId: "student" });
  assert.equal(calls[1].url, "/auth/resend-otp");
  await api.authApi.getMe();
  assert.equal(calls[2].headers.Authorization, "Bearer student-token");
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

test("error messages explain recovery and never expose raw server, HTML, or database errors", () => {
  const { api } = client();
  assert.match(api.errorMessage({ request: {} }), /connection/);
  assert.match(api.errorMessage({ code: "ECONNABORTED" }), /too long/);
  assert.match(
    api.errorMessage({
      response: {
        status: 500,
        data: { message: "Prisma secret DB connection failure" },
      },
    }),
    /server is having trouble/,
  );
  assert.doesNotMatch(
    api.errorMessage(new Error("private-file.js:12 secret")),
    /private|secret/,
  );
  for (const message of [
    { bad: "value" },
    "<html>proxy failure</html>",
    "Prisma constraint failed",
    "",
  ]) {
    assert.match(
      api.errorMessage({ response: { status: 400, data: { message } } }),
      /Check your entries/,
    );
  }
  assert.match(
    api.errorMessage({
      response: { status: 429, headers: { "retry-after": "90" } },
    }),
    /2 minutes/,
  );
  assert.match(
    api.errorMessage({
      response: {
        status: 429,
        data: {
          message: "Please wait 10 minutes before requesting a new code.",
        },
      },
    }),
    /10 minutes/,
  );
  assert.match(api.errorMessage({ response: { status: 413 } }), /10 MB/);
  assert.match(
    api.errorMessage({
      response: { status: 401 },
      config: { url: "/auth/login" },
    }),
    /email or password/,
  );
  assert.match(
    api.errorMessage({ response: { status: 401 } }),
    /session has expired/,
  );
  assert.match(
    api.errorMessage({
      response: { status: 404 },
      config: { url: "/conversations/gone/messages" },
    }),
    /conversation/,
  );
  assert.match(
    api.errorMessage({
      response: {
        status: 400,
        data: {
          message: "Verification code has expired. Please request a new code.",
        },
      },
    }),
    /code has expired/,
  );
  assert.equal(
    api.errorMessage(api.userError("Choose a category first.")),
    "Choose a category first.",
  );
  assert.equal(typeof api.errorMessage(null), "string");
});

test("a storage failure during session expiry preserves the original request failure", async () => {
  const { api, instance } = client();
  api.setUnauthorizedHandler(async () => {
    throw new Error("storage failed");
  });
  instance.defaults.adapter = async (config) => {
    throw { response: { status: 401 }, config };
  };
  await assert.rejects(
    api.authApi.getMe(),
    (error) => error.response.status === 401,
  );
});

test("concurrent expired requests share cleanup and a stale token cannot expire a new session", async () => {
  const { api, instance, setToken } = client();
  let cleanup = 0;
  api.setUnauthorizedHandler(async () => {
    cleanup++;
    await new Promise((resolve) => setImmediate(resolve));
  });
  instance.defaults.adapter = async (config) => {
    throw { response: { status: 401 }, config };
  };
  await Promise.allSettled([
    api.authApi.getMe(),
    api.authApi.getMe(),
    api.authApi.getMe(),
  ]);
  assert.equal(cleanup, 1);
  instance.defaults.adapter = async (config) => {
    setToken("new-session-token");
    throw { response: { status: 401 }, config };
  };
  await assert.rejects(api.authApi.getMe());
  assert.equal(cleanup, 1);
});
