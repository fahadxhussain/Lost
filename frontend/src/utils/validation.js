export const LIMITS = {
  name: 100,
  email: 254,
  title: 150,
  description: 5000,
  location: 250,
  search: 200,
  message: 5000,
  photoBytes: 10 * 1024 * 1024,
};

export const normalizeEmail = (value = "") => value.trim().toLowerCase();

export function emailError(value) {
  const email = normalizeEmail(value);
  if (!email) return "Enter your student email address.";
  if (
    email.length > LIMITS.email ||
    !/^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@isbstudent\.comsats\.edu\.pk$/i.test(
      email,
    ) ||
    email.startsWith(".") ||
    email.includes("..") ||
    email.includes(".@")
  )
    return "Use your Islamabad student email, such as fa25-bcs-000@isbstudent.comsats.edu.pk.";
  return null;
}

export function authErrors(
  { name = "", email = "", password = "", confirmation = "" },
  register = false,
) {
  const errors = {};
  if (register && !name.trim())
    errors.name =
      "Enter your name so other students know who they are contacting.";
  else if (register && name.trim().length > LIMITS.name)
    errors.name = `Keep your name within ${LIMITS.name} characters.`;
  const invalidEmail = emailError(email);
  if (invalidEmail) errors.email = invalidEmail;
  if (!password.trim()) errors.password = "Enter your password.";
  else if (register && password.length < 8)
    errors.password = "Use at least 8 characters for your password.";
  if (register && confirmation !== password)
    errors.confirmation =
      "Passwords do not match. Enter the same password again.";
  return errors;
}

export function photoError(asset, platform) {
  if (!asset?.uri || (platform === "web" && !asset.file))
    return "This photo could not be opened. Choose it again or continue without a photo.";
  const size = asset.fileSize ?? asset.file?.size;
  if (size === 0) return "This photo is empty. Please choose another photo.";
  if (size > LIMITS.photoBytes)
    return "Choose a photo of 10 MB or less, or continue without a photo.";
  const mime = asset.mimeType || asset.file?.type;
  if (
    !mime ||
    !["image/jpeg", "image/png", "image/webp"].includes(mime.toLowerCase())
  )
    return "Choose a JPG, PNG, or WebP photo. Convert HEIC photos to JPG first, or continue without a photo.";
  return null;
}
