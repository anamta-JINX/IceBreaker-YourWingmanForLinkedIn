(() => {
  const DB_NAME = "icebreaker-profile-files";
  const DB_VERSION = 1;
  const STORE_NAME = "files";
  const PRIMARY_KEY = "primary-resume";

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Resume storage could not be opened."));
    });
  }

  async function withStore(mode, operation) {
    const database = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = operation(store);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error("Resume storage operation failed."));
        transaction.onabort = () => reject(transaction.error || new Error("Resume storage transaction was cancelled."));
      });
    } finally {
      database.close();
    }
  }

  async function save(file) {
    if (!(file instanceof Blob)) throw new Error("A valid résumé file is required.");
    const record = {
      id: PRIMARY_KEY,
      name: String(file.name || "resume").slice(0, 240),
      type: String(file.type || "application/octet-stream").slice(0, 160),
      size: Number(file.size || 0),
      lastModified: Number(file.lastModified || Date.now()),
      uploadedAt: new Date().toISOString(),
      blob: file
    };
    await withStore("readwrite", (store) => store.put(record));
    return record;
  }

  async function get() {
    return withStore("readonly", (store) => store.get(PRIMARY_KEY));
  }

  async function remove() {
    await withStore("readwrite", (store) => store.delete(PRIMARY_KEY));
  }

  async function download() {
    const record = await get();
    if (!record?.blob) throw new Error("The original résumé file is not available. Upload it again once to store it locally.");
    const url = URL.createObjectURL(record.blob);
    try {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = record.name || "resume";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
  }

  window.IceBreakerResumeStore = { save, get, remove, download };
})();
