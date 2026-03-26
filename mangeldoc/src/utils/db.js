import { openDB } from 'idb';

const DB_NAME = 'mangeldoc';
const DB_VERSION = 1;

let dbPromise;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('defects')) {
          const store = db.createObjectStore('defects', { keyPath: 'id' });
          store.createIndex('projectId', 'projectId');
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllProjects() {
  const db = await getDB();
  return db.getAll('projects');
}

export async function getProject(id) {
  const db = await getDB();
  return db.get('projects', id);
}

export async function saveProject(project) {
  const db = await getDB();
  return db.put('projects', project);
}

export async function deleteProject(id) {
  const db = await getDB();
  const tx = db.transaction(['projects', 'defects'], 'readwrite');
  await tx.objectStore('projects').delete(id);
  const defectStore = tx.objectStore('defects');
  const defects = await defectStore.index('projectId').getAll(id);
  for (const d of defects) {
    await defectStore.delete(d.id);
  }
  await tx.done;
}

export async function getDefectsByProject(projectId) {
  const db = await getDB();
  return db.getAllFromIndex('defects', 'projectId', projectId);
}

export async function getDefect(id) {
  const db = await getDB();
  return db.get('defects', id);
}

export async function saveDefect(defect) {
  const db = await getDB();
  return db.put('defects', defect);
}

export async function deleteDefect(id) {
  const db = await getDB();
  return db.delete('defects', id);
}
