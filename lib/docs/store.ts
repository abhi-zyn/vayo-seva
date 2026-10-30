// Temporary, on-device storage for scanned PDFs (IndexedDB), so a large scan
// isn't held only in memory. Cleared after sending and when starting again.
// Nothing here leaves the phone until the application is sent.

const DB = "vayoseva-docs";
const STORE = "pdfs";

function open(): Promise<IDBDatabase> {
  return new Promise((ok, fail) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => ok(req.result);
    req.onerror = () => fail(req.error);
  });
}

async function run(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((ok, fail) => {
      const tx = db.transaction(STORE, mode);
      fn(tx.objectStore(STORE));
      tx.oncomplete = () => ok();
      tx.onerror = () => fail(tx.error);
    });
    db.close();
  } catch (err) {
    // Storage blocked (private mode): the scan still lives in memory for this visit.
    console.warn("temporary document storage unavailable:", err);
  }
}

export const saveDoc = (key: string, pdf: Blob) => run("readwrite", (s) => s.put(pdf, key));
export const clearDocs = () => run("readwrite", (s) => s.clear());
