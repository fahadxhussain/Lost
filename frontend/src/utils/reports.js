import { LIMITS } from "./validation";

export function reportErrors(values = {}, now = new Date()) {
  const errors = {};
  if (!["LOST", "FOUND"].includes(values.type))
    errors.type = "Choose lost or found.";
  if (!values.categoryId)
    errors.categoryId = "Choose the category that best describes your item.";
  if ((values.description || "").trim().length < 10)
    errors.description =
      "Describe the item in at least 10 characters, including its colour or identifying details.";
  for (const field of ["title", "description", "incidentLocation"]) {
    const max = LIMITS[field === "incidentLocation" ? "location" : field];
    if ((values[field] || "").trim().length > max)
      errors[field] =
        `Keep ${field === "incidentLocation" ? "the location" : `the ${field}`} within ${max} characters.`;
  }
  if (values.incidentDate) {
    if (!parseIncidentDate(values.incidentDate))
      errors.incidentDate =
        "Enter a real date as YYYY-MM-DD, for example 2026-11-01, or leave it blank.";
    else {
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      if (values.incidentDate > today)
        errors.incidentDate =
          "The date lost or found cannot be in the future. Choose today or an earlier date.";
    }
  }
  return errors;
}
export function validateReport(values, now) {
  return Object.values(reportErrors(values, now))[0] || null;
}
export function parseIncidentDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const [y, m, d] = value.split("-").map(Number);
  return date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
    ? date.toISOString()
    : null;
}
export function reportFields(values, editing = false) {
  return {
    ...(!editing && { type: values.type, categoryId: values.categoryId }),
    title: values.title.trim(),
    description: values.description.trim(),
    incidentLocation: values.incidentLocation.trim(),
    incidentDate: values.incidentDate
      ? parseIncidentDate(values.incidentDate)
      : "",
  };
}
export function formatDate(value) {
  if (!value) return "Date not specified";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date not specified"
    : date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}
export function hasNextPage(pagination, count, limit = 20) {
  return pagination?.totalPages !== undefined
    ? pagination.page < pagination.totalPages
    : count === limit;
}
export function mergeMessages(previous, incoming) {
  const messages = new Map(previous.map((message) => [message.id, message]));
  incoming.forEach((message) => messages.set(message.id, message));
  return [...messages.values()].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );
}
