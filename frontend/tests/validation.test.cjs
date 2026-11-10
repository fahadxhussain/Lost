const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const helpers = import(
  `data:text/javascript;base64,${Buffer.from(fs.readFileSync(require.resolve("../src/utils/validation.js"), "utf8")).toString("base64")}`
);

test("student emails normalize case and spaces without accepting another campus or malformed local part", async () => {
  const { emailError, normalizeEmail } = await helpers;
  assert.equal(
    normalizeEmail(" FA25-BCS-000@ISBSTUDENT.COMSATS.EDU.PK "),
    "fa25-bcs-000@isbstudent.comsats.edu.pk",
  );
  assert.equal(emailError(" FA25-BCS-000@ISBSTUDENT.COMSATS.EDU.PK "), null);
  for (const email of [
    "",
    " ",
    "x@gmail.com",
    "x@comsats.edu.pk",
    "x@isbstudent.comsats.edu.pk.evil.com",
    "a@@isbstudent.comsats.edu.pk",
    ".a@isbstudent.comsats.edu.pk",
    "a..b@isbstudent.comsats.edu.pk",
    "a.@isbstudent.comsats.edu.pk",
    "a b@isbstudent.comsats.edu.pk",
    `${"a".repeat(255)}@isbstudent.comsats.edu.pk`,
  ]) {
    assert.ok(emailError(email), email);
  }
  // Do not make one roll-number format the only eligible student account.
  assert.equal(emailError("student.name@isbstudent.comsats.edu.pk"), null);
});

test("registration validates all fields, confirmation and password boundaries without imposing sign-up policy on sign-in", async () => {
  const { authErrors, LIMITS } = await helpers;
  const valid = {
    name: "  Alex Khan  ",
    email: "student@isbstudent.comsats.edu.pk",
    password: "12345678",
    confirmation: "12345678",
  };
  assert.deepEqual(authErrors(valid, true), {});
  assert.equal(Object.keys(authErrors({}, true)).length, 3);
  assert.ok(authErrors({ ...valid, name: " " }, true).name);
  assert.ok(
    authErrors({ ...valid, name: "a".repeat(LIMITS.name + 1) }, true).name,
  );
  assert.ok(authErrors({ ...valid, password: "1234567" }, true).password);
  assert.ok(authErrors({ ...valid, password: "        " }, true).password);
  assert.ok(
    authErrors({ ...valid, confirmation: "12345679" }, true).confirmation,
  );
  assert.deepEqual(authErrors({ ...valid, password: "short" }, false), {});
});

test("photo validation matches the 10 MB server limit and handles empty, missing, HEIC and web assets", async () => {
  const { photoError, LIMITS } = await helpers;
  const photo = {
    uri: "file:///photo.jpg",
    mimeType: "image/jpeg",
    fileSize: LIMITS.photoBytes,
  };
  assert.equal(photoError(photo, "android"), null);
  assert.equal(photoError({ ...photo, mimeType: "image/png" }, "ios"), null);
  assert.equal(photoError({ ...photo, mimeType: "image/webp" }, "ios"), null);
  assert.match(
    photoError({ ...photo, fileSize: LIMITS.photoBytes + 1 }, "android"),
    /10 MB/,
  );
  assert.match(photoError({ ...photo, fileSize: 0 }, "android"), /empty/);
  assert.match(photoError(undefined, "android"), /opened/);
  assert.match(photoError({ ...photo, mimeType: "image/heic" }, "ios"), /HEIC/);
  assert.match(photoError({ ...photo, mimeType: undefined }, "ios"), /JPG/);
  assert.match(photoError(photo, "web"), /opened/);
  assert.equal(
    photoError({ ...photo, file: { type: "image/jpeg", size: 1000 } }, "web"),
    null,
  );
});
