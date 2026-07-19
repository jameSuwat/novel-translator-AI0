// Replaces the Claude-artifact-only `window.storage` API with a localStorage-backed
// version, so NovelTranslatorApp's existing get/set/delete/list calls work unchanged
// as a normal standalone web app.
//
// IMPORTANT: this keeps everything in the current browser only. There is no server,
// no account system, and no sync between devices — clearing browser data (or opening
// the app in a different browser/device) means starting over. If you outgrow that,
// swap this file for a real backend (Supabase/Firebase/etc.) later; the rest of the
// app doesn't need to change since it only talks to `window.storage`.

const DATA_KEY = "novel-translator:data";

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(DATA_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeAll(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

window.storage = {
  async get(key) {
    const data = readAll();
    if (!(key in data)) return null;
    return { key, value: data[key], shared: false };
  },

  async set(key, value) {
    const data = readAll();
    data[key] = value;
    writeAll(data);
    return { key, value, shared: false };
  },

  async delete(key) {
    const data = readAll();
    const existed = key in data;
    delete data[key];
    writeAll(data);
    return { key, deleted: existed, shared: false };
  },

  async list(prefix) {
    const data = readAll();
    const keys = Object.keys(data).filter((k) => !prefix || k.startsWith(prefix));
    return { keys, prefix, shared: false };
  },
};
