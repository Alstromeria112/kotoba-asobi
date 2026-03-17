/** @param {string} key */
export function getEnv(key) {
  const value = process.env[key]?.trim();
  if (typeof value !== "string") {
    console.error(`${key} is not set`);
    process.exit(1);
  }
  return value;
}

/**
 * @param {Date} date
 * @returns {string}
 */
function getDateString(date = new Date()) {
  return date
    .toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(",", "");
}

/** @param {string} text */
export function log(text) {
  console.log(`[${getDateString()}] ${text}`);
}
