const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const validationUrl = `data:text/javascript;base64,${Buffer.from(fs.readFileSync(require.resolve("../src/utils/validation.js"), "utf8")).toString("base64")}`;
const source = fs
  .readFileSync(require.resolve("../src/utils/reports.js"), "utf8")
  .replace('"./validation"', JSON.stringify(validationUrl));
const helpers = import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const values = {
  type: "LOST",
  categoryId: "phone-category",
  title: " My phone ",
  description: " Black phone with a cracked case ",
  incidentLocation: " CS lab ",
  incidentDate: "",
};
test("description and category are mandatory even when an image exists", async () => {
  const { validateReport } = await helpers;
  assert.match(
    validateReport({ ...values, description: "", image: "photo.jpg" }),
    /10 characters/,
  );
  assert.match(validateReport({ ...values, categoryId: "" }), /category/);
  assert.equal(validateReport(values), null);
});
test("incident dates reject impossible days and accept leap days", async () => {
  const { parseIncidentDate } = await helpers;
  assert.equal(parseIncidentDate("2026-02-29"), null);
  assert.equal(parseIncidentDate("2026-04-31"), null);
  assert.equal(parseIncidentDate("2026-13-01"), null);
  assert.equal(parseIncidentDate("10/11/2026"), null);
  assert.ok(parseIncidentDate("2028-02-29"));
});
test("report checks use the incident calendar date, allow today and optional fields, and reject future dates", async () => {
  const { reportErrors, validateReport } = await helpers;
  const now = new Date(2026, 10, 10, 0, 1);
  assert.equal(
    validateReport(
      {
        ...values,
        title: "",
        incidentLocation: "",
        incidentDate: "2026-11-10",
      },
      now,
    ),
    null,
  );
  assert.equal(
    validateReport({ ...values, incidentDate: "2020-01-01" }, now),
    null,
  );
  assert.match(
    reportErrors({ ...values, incidentDate: "2026-11-11" }, now).incidentDate,
    /future/,
  );
  assert.match(
    reportErrors({ ...values, incidentDate: "2026-02-30" }, now).incidentDate,
    /real date/,
  );
  const errors = reportErrors(
    {
      ...values,
      title: "a".repeat(151),
      description: "a".repeat(5001),
      incidentLocation: "a".repeat(251),
    },
    now,
  );
  assert.equal(Object.keys(errors).length, 3);
  assert.ok(reportErrors().description);
});
test("submission contains only supported fields and edit preserves category/type", async () => {
  const { reportFields } = await helpers;
  const create = reportFields(values);
  assert.equal(create.description, "Black phone with a cracked case");
  assert.equal(create.incidentDate, "");
  assert.equal(create.categoryId, "phone-category");
  const edit = reportFields(values, true);
  assert.equal("categoryId" in edit, false);
  assert.equal("type" in edit, false);
  assert.equal("createdAt" in create, false);
});
test("pagination handles both backend feed totals and keyword search count", async () => {
  const { hasNextPage } = await helpers;
  assert.equal(hasNextPage({ page: 2, totalPages: 2 }, 20), false);
  assert.equal(hasNextPage({ page: 1, totalPages: 3 }, 20), true);
  assert.equal(hasNextPage({ page: 1, count: 20 }, 20), true);
  assert.equal(hasNextPage({ page: 2, count: 7 }, 7), false);
});
test("socket echoes and HTTP refreshes deduplicate messages and update read receipts", async () => {
  const { mergeMessages } = await helpers;
  const one = {
    id: "1",
    content: "Hello",
    isRead: false,
    createdAt: "2026-11-10T10:00:00Z",
  };
  const two = {
    id: "2",
    content: "Found it",
    createdAt: "2026-11-10T10:01:00Z",
  };
  const result = mergeMessages([two, one], [{ ...one, isRead: true }, two]);
  assert.equal(result.length, 2);
  assert.equal(result[0].id, "1");
  assert.equal(result[0].isRead, true);
});
