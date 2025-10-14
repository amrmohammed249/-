// A simple key-value store using IndexedDB
// This is a simplified version of the 'idb-keyval' library

let db: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
  if (db) {
    return Promise.resolve(db);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open('erp-keyval-db', 1);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = () => {
      request.result.createObjectStore('keyval');
    };
  });
}

function withStore(
  type: IDBTransactionMode,
  callback: (store: IDBObjectStore) => void
): Promise<void> {
  return getDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('keyval', type);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        callback(transaction.objectStore('keyval'));
      })
  );
}

export function get<T>(key: IDBValidKey): Promise<T | undefined> {
  let req: IDBRequest;
  return withStore('readonly', (store) => {
    req = store.get(key);
  }).then(() => req.result);
}

export function set(key: IDBValidKey, value: any): Promise<void> {
  return withStore('readwrite', (store) => {
    store.put(value, key);
  });
}
