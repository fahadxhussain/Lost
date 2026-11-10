export function validateReport(values) {
  if (!["LOST", "FOUND"].includes(values.type)) return "Choose lost or found.";
  if (!values.categoryId) return "Choose a category.";
  if (values.description.trim().length < 10)
    return "Describe the item in at least 10 characters.";
  if (values.incidentDate && !parseIncidentDate(values.incidentDate))
    return "Enter a valid incident date as YYYY-MM-DD.";
  return null;
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
