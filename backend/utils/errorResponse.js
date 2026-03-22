function defaultCodeForStatus(status) {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 422:
      return "VALIDATION_ERROR";
    case 429:
      return "RATE_LIMITED";
    default:
      return "INTERNAL_ERROR";
  }
}

function buildErrorPayload({ status, code, message }) {
  return {
    error: {
      code,
      message,
      status,
    },
  };
}

function resolveErrorPayload(error, fallback = {}) {
  const status =
    Number.isInteger(error?.statusCode) && error.statusCode > 0
      ? error.statusCode
      : fallback.status || 500;
  const code = error?.code || fallback.code || defaultCodeForStatus(status);
  const message =
    typeof error?.message === "string" && error.message.trim()
      ? error.message
      : fallback.message || "Internal server error.";

  return buildErrorPayload({ status, code, message });
}

function sendError(res, status, code, message) {
  return res.status(status).json(
    buildErrorPayload({
      status,
      code: code || defaultCodeForStatus(status),
      message,
    })
  );
}

module.exports = {
  buildErrorPayload,
  resolveErrorPayload,
  sendError,
  defaultCodeForStatus,
};
