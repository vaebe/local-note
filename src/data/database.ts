import type { AppSettings, Group, Note } from "../domain/models";
import { SETTING_KEYS } from "../domain/models";

const DB_NAME = "local-note-db";
const DB_VERSION = 1;

const STORE_GROUPS = "groups";
const STORE_NOTES = "notes";
const STORE_SETTINGS = "settings";

interface SettingRecord {
  key: string;
  value: unknown;
}

/** 将 IDBRequest 包装为 Promise，失败时保留原始错误信息 */
function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB 请求失败"));
    };
  });
}

/** 等待事务完成；任一步失败都会 reject */
function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      reject(tx.error ?? new Error("IndexedDB 事务失败"));
    };
    tx.onabort = () => {
      reject(tx.error ?? new Error("IndexedDB 事务已中止"));
    };
  });
}

/** 打开数据库；首次或升级时创建对象仓库与索引 */
export function openLocalNoteDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("当前浏览器不支持 IndexedDB"));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_GROUPS)) {
        const groups = db.createObjectStore(STORE_GROUPS, { keyPath: "id" });
        groups.createIndex("order", "order", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        const notes = db.createObjectStore(STORE_NOTES, { keyPath: "id" });
        notes.createIndex("groupId", "groupId", { unique: false });
        notes.createIndex("updatedAt", "updatedAt", { unique: false });
        // 复合索引便于按分组取最近更新笔记
        notes.createIndex("groupId_updatedAt", ["groupId", "updatedAt"], {
          unique: false,
        });
      }

      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("无法打开 IndexedDB"));
    };
    request.onblocked = () => {
      reject(new Error("IndexedDB 被其他标签页阻塞，请关闭后重试"));
    };
  });
}

/** 并行读取分组、笔记与界面设置的原始值 */
export async function loadInitialData(db: IDBDatabase): Promise<{
  groups: Group[];
  notes: Note[];
  settings: Partial<AppSettings>;
}> {
  const tx = db.transaction([STORE_GROUPS, STORE_NOTES, STORE_SETTINGS], "readonly");
  const groupsStore = tx.objectStore(STORE_GROUPS);
  const notesStore = tx.objectStore(STORE_NOTES);
  const settingsStore = tx.objectStore(STORE_SETTINGS);

  const [groups, notes, settingRecords] = await Promise.all([
    requestToPromise(groupsStore.getAll()) as Promise<Group[]>,
    requestToPromise(notesStore.getAll()) as Promise<Note[]>,
    requestToPromise(settingsStore.getAll()) as Promise<SettingRecord[]>,
    transactionDone(tx),
  ]);

  const settings: Partial<AppSettings> = {};
  for (const record of settingRecords) {
    if (record.key === SETTING_KEYS.activeFilter) {
      settings.activeFilter = record.value as AppSettings["activeFilter"];
    } else if (record.key === SETTING_KEYS.selectedNoteId) {
      settings.selectedNoteId = record.value as AppSettings["selectedNoteId"];
    } else if (record.key === SETTING_KEYS.expandedGroupIds) {
      settings.expandedGroupIds = record.value as AppSettings["expandedGroupIds"];
    } else if (record.key === SETTING_KEYS.sidebarCollapsed) {
      settings.sidebarCollapsed = record.value as AppSettings["sidebarCollapsed"];
    }
  }

  return { groups, notes, settings };
}

export async function createNoteRecord(db: IDBDatabase, note: Note): Promise<void> {
  const tx = db.transaction(STORE_NOTES, "readwrite");
  tx.objectStore(STORE_NOTES).put(note);
  await transactionDone(tx);
}

export async function updateNoteRecord(db: IDBDatabase, note: Note): Promise<void> {
  const tx = db.transaction(STORE_NOTES, "readwrite");
  tx.objectStore(STORE_NOTES).put(note);
  await transactionDone(tx);
}

export async function deleteNoteRecord(db: IDBDatabase, noteId: string): Promise<void> {
  const tx = db.transaction(STORE_NOTES, "readwrite");
  tx.objectStore(STORE_NOTES).delete(noteId);
  await transactionDone(tx);
}

export async function createGroupRecord(db: IDBDatabase, group: Group): Promise<void> {
  const tx = db.transaction(STORE_GROUPS, "readwrite");
  tx.objectStore(STORE_GROUPS).put(group);
  await transactionDone(tx);
}

export async function updateGroupRecord(db: IDBDatabase, group: Group): Promise<void> {
  const tx = db.transaction(STORE_GROUPS, "readwrite");
  tx.objectStore(STORE_GROUPS).put(group);
  await transactionDone(tx);
}

/**
 * 在同一事务中删除分组，并将该分组下笔记迁移到目标分组（通常是默认分组）。
 * 任一步失败则整笔事务回滚。
 */
export async function deleteGroupAndMoveNotes(
  db: IDBDatabase,
  groupId: string,
  targetGroupId: string,
): Promise<Note[]> {
  const tx = db.transaction([STORE_GROUPS, STORE_NOTES], "readwrite");
  const groupsStore = tx.objectStore(STORE_GROUPS);
  const notesStore = tx.objectStore(STORE_NOTES);
  const groupIdIndex = notesStore.index("groupId");

  const related = (await requestToPromise(groupIdIndex.getAll(groupId))) as Note[];
  const now = Date.now();
  const migrated: Note[] = [];

  for (const note of related) {
    const next: Note = {
      ...note,
      groupId: targetGroupId,
      updatedAt: now,
    };
    notesStore.put(next);
    migrated.push(next);
  }

  groupsStore.delete(groupId);
  await transactionDone(tx);
  return migrated;
}

export async function getSetting(db: IDBDatabase, key: string): Promise<unknown> {
  const tx = db.transaction(STORE_SETTINGS, "readonly");
  const result = (await requestToPromise(tx.objectStore(STORE_SETTINGS).get(key))) as
    | SettingRecord
    | undefined;
  await transactionDone(tx);
  return result?.value;
}

export async function setSetting(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  const tx = db.transaction(STORE_SETTINGS, "readwrite");
  tx.objectStore(STORE_SETTINGS).put({ key, value } satisfies SettingRecord);
  await transactionDone(tx);
}

/** 批量写入设置，减少频繁选择时的事务开销 */
export async function setSettings(
  db: IDBDatabase,
  entries: Array<{ key: string; value: unknown }>,
): Promise<void> {
  const tx = db.transaction(STORE_SETTINGS, "readwrite");
  const store = tx.objectStore(STORE_SETTINGS);
  for (const entry of entries) {
    store.put({ key: entry.key, value: entry.value } satisfies SettingRecord);
  }
  await transactionDone(tx);
}
