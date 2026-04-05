import type { EpubBook } from "./epub-parser.js";

export type ReadingProgress = {
  bookId: string;
  chapterIndex: number;
  paragraphIndex: number;
};

export type StoredBook = {
  id: string;
  title: string;
  author: string;
  book: EpubBook;
  addedAt: number;
};

const DB_NAME = "TypingPracticeEbooks";
const DB_VERSION = 1;
const BOOKS_STORE = "books";
const PROGRESS_STORE = "progress";

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  // Convert to unsigned hex string for a clean ID
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(BOOKS_STORE)) {
        db.createObjectStore(BOOKS_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
        db.createObjectStore(PROGRESS_STORE, { keyPath: "bookId" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveBook(book: EpubBook): Promise<string> {
  const id = hashString(book.title + book.author);
  const db = await openDB();

  const storedBook: StoredBook = {
    id,
    title: book.title,
    author: book.author,
    book,
    addedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BOOKS_STORE, "readwrite");
    const store = transaction.objectStore(BOOKS_STORE);
    const request = store.put(storedBook);

    request.onsuccess = () => {
      resolve(id);
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function getBook(id: string): Promise<StoredBook | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BOOKS_STORE, "readonly");
    const store = transaction.objectStore(BOOKS_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve((request.result as StoredBook) ?? null);
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function listBooks(): Promise<StoredBook[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BOOKS_STORE, "readonly");
    const store = transaction.objectStore(BOOKS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve((request.result as StoredBook[]) ?? []);
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function deleteBook(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [BOOKS_STORE, PROGRESS_STORE],
      "readwrite",
    );
    const booksStore = transaction.objectStore(BOOKS_STORE);
    const progressStore = transaction.objectStore(PROGRESS_STORE);

    booksStore.delete(id);
    progressStore.delete(id);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

export async function saveProgress(progress: ReadingProgress): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PROGRESS_STORE, "readwrite");
    const store = transaction.objectStore(PROGRESS_STORE);
    const request = store.put(progress);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function getProgress(
  bookId: string,
): Promise<ReadingProgress | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PROGRESS_STORE, "readonly");
    const store = transaction.objectStore(PROGRESS_STORE);
    const request = store.get(bookId);

    request.onsuccess = () => {
      resolve((request.result as ReadingProgress) ?? null);
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}
