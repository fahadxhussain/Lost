/* Reset tokens stay in the URL fragment until read, then are removed from history. */
const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
window.history.replaceState(null, '', window.location.pathname);
const feedback = document.getElementById('feedback');
const resetForm = document.getElementById('reset-form');
const password = document.getElementById('password');
const confirmation = document.getElementById('confirmation');
function tell(message, error = false) {
  feedback.textContent = message;
  feedback.dataset.error = String(error);
  feedback.scrollIntoView({ block: 'nearest' });
}
if (token && /^[a-f0-9]{64}$/.test(token)) resetForm.hidden = false;
else
  tell(
    'This reset link is missing or invalid. Request a new link below.',
    true,
  );
document.getElementById('show-password').addEventListener('change', (event) => {
  password.type = confirmation.type = event.target.checked
    ? 'text'
    : 'password';
});
async function post(path, data) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        response.status >= 500
          ? 'The campus server is unavailable. Please try again later.'
          : typeof result.message === 'string'
            ? result.message
            : 'We could not complete that request. Please try again.',
      );
      error.status = response.status;
      throw error;
    }
    return result;
  } catch (error) {
    if (!error.status)
      throw new Error(
        'Could not reach the campus server. Check your connection and try again.',
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
resetForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.getElementById('save');
  if (button.disabled) return;
  if (password.value !== confirmation.value) {
    tell('Passwords do not match. Enter the same password again.', true);
    confirmation.focus();
    return;
  }
  if (
    password.value.length < 8 ||
    !password.value.trim() ||
    new TextEncoder().encode(password.value).length > 72
  ) {
    tell('Use at least 8 characters and no more than 72 UTF-8 bytes.', true);
    password.focus();
    return;
  }
  button.disabled = true;
  try {
    const result = await post('/api/v1/auth/reset-password', {
      token,
      password: password.value,
      confirmation: confirmation.value,
    });
    resetForm.reset();
    resetForm.hidden = true;
    document.getElementById('request-section').hidden = true;
    tell(result.message);
  } catch (error) {
    tell(error.message, true);
  } finally {
    button.disabled = false;
  }
});
document
  .getElementById('request-form')
  .addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = document.getElementById('request');
    if (button.disabled) return;
    button.disabled = true;
    try {
      const result = await post('/api/v1/auth/forgot-password', {
        email: document.getElementById('email').value.trim().toLowerCase(),
      });
      tell(result.message);
    } catch (error) {
      tell(error.message, true);
    } finally {
      button.disabled = false;
    }
  });
