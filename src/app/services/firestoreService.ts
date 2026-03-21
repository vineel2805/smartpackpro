import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  AppUser,
  HistoryEntry,
  PackingItem,
  StudentEngagement,
  UserRole,
} from '../types/models';

const quickSuggestions = [
  'Textbook',
  'Workbook',
  'Notebook',
  'Calculator',
  'Lab Coat',
  'Art Supplies',
  'Sports Shoes',
  'Drawing Book',
  'Color Pencils',
  'Ruler',
  'Compass',
  'Dictionary',
];

export async function getFirstUserByRole(role: UserRole): Promise<AppUser | null> {
  const q = query(collection(db, 'users'), where('role', '==', role), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const userDoc = snapshot.docs[0];
  const data = userDoc.data();

  return {
    id: userDoc.id,
    name: data.name ?? '',
    role: data.role,
    email: data.email ?? '',
    class: data.class,
    school: data.school,
    subject: data.subject,
    assignedClasses: Array.isArray(data.assignedClasses) ? data.assignedClasses : [],
    isClassTeacher: Boolean(data.isClassTeacher),
    classTeacherOf: data.classTeacherOf,
  } as AppUser;
}

export async function getClasses(): Promise<string[]> {
  const snapshot = await getDocs(collection(db, 'classes'));
  if (snapshot.empty) return [];

  return snapshot.docs
    .map(item => {
      const data = item.data();
      return (data.name ?? item.id) as string;
    })
    .filter(Boolean)
    .sort();
}

export async function getTeachers(): Promise<AppUser[]> {
  const q = query(collection(db, 'users'), where('role', '==', 'teacher'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(item => {
    const data = item.data();
    return {
      id: item.id,
      name: data.name ?? '',
      role: 'teacher',
      email: data.email ?? '',
      subject: data.subject,
      school: data.school,
      assignedClasses: Array.isArray(data.assignedClasses) ? data.assignedClasses : [],
      isClassTeacher: Boolean(data.isClassTeacher),
      classTeacherOf: data.classTeacherOf,
    } satisfies AppUser;
  });
}

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function dailyItemsDocId(className: string, date = todayKey()) {
  return `${className}_${date}`;
}

export async function getTodayPackingItems(className: string): Promise<PackingItem[]> {
  const ref = doc(db, 'dailyItems', dailyItemsDocId(className));
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];

  const data = snap.data();
  const items = Array.isArray(data.items) ? data.items : [];

  return items.map((item: Record<string, unknown>, index: number) => ({
    id: (item.id as string) || `${index}-${String(item.name ?? '')}`,
    name: String(item.name ?? ''),
    subject: item.subject ? String(item.subject) : undefined,
    type: item.type === 'do-not-bring' ? 'do-not-bring' : 'bring',
    addedBy: item.addedBy === 'student' ? 'student' : 'teacher',
  }));
}

export async function upsertTodayPackingItems(params: {
  className: string;
  items: PackingItem[];
  teacherId: string;
  teacherName: string;
}) {
  const { className, items, teacherId, teacherName } = params;
  const bringNames = items.filter(i => i.type === 'bring').map(i => i.name);
  const doNotBringNames = items.filter(i => i.type === 'do-not-bring').map(i => i.name);

  await setDoc(
    doc(db, 'dailyItems', dailyItemsDocId(className)),
    {
      className,
      date: todayKey(),
      items,
      teacherId,
      teacherName,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await addDoc(collection(db, 'history'), {
    className,
    date: todayKey(),
    itemsAdded: bringNames,
    itemsRemoved: doNotBringNames,
    teacherId,
    teacherName,
    createdAt: serverTimestamp(),
  });
}

export async function getHistoryByClasses(classes: string[]): Promise<HistoryEntry[]> {
  if (!classes.length) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < classes.length; i += 10) {
    chunks.push(classes.slice(i, i + 10));
  }

  const allDocs = await Promise.all(
    chunks.map(async chunk => {
      const q = query(
        collection(db, 'history'),
        where('className', 'in', chunk),
        orderBy('date', 'desc'),
        limit(30),
      );
      return getDocs(q);
    }),
  );

  const entries = allDocs.flatMap(snapshot =>
    snapshot.docs.map(item => {
      const data = item.data();
      return {
        id: item.id,
        date: String(data.date ?? ''),
        class: String(data.className ?? ''),
        itemsAdded: Array.isArray(data.itemsAdded) ? data.itemsAdded : [],
        itemsRemoved: Array.isArray(data.itemsRemoved) ? data.itemsRemoved : [],
        teacherName: data.teacherName ? String(data.teacherName) : undefined,
      } satisfies HistoryEntry;
    }),
  );

  return entries.sort((a, b) => (a.date > b.date ? -1 : 1));
}

export async function getRecentHistory(limitCount = 10): Promise<HistoryEntry[]> {
  const q = query(collection(db, 'history'), orderBy('date', 'desc'), limit(limitCount));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(item => {
    const data = item.data();
    return {
      id: item.id,
      date: String(data.date ?? ''),
      class: String(data.className ?? ''),
      itemsAdded: Array.isArray(data.itemsAdded) ? data.itemsAdded : [],
      itemsRemoved: Array.isArray(data.itemsRemoved) ? data.itemsRemoved : [],
      teacherName: data.teacherName ? String(data.teacherName) : undefined,
    } satisfies HistoryEntry;
  });
}

export async function getStudentEngagementByClass(className: string): Promise<StudentEngagement[]> {
  const q = query(collection(db, 'studentEngagement'), where('class', '==', className));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(item => {
    const data = item.data();
    return {
      id: item.id,
      name: String(data.name ?? 'Unknown Student'),
      class: String(data.class ?? className),
      status: data.status ?? 'not-seen',
      lastSeen: data.lastSeen ? String(data.lastSeen) : undefined,
    } satisfies StudentEngagement;
  });
}

export async function getStudentEngagementByClasses(classNames: string[]): Promise<StudentEngagement[]> {
  if (!classNames.length) return [];

  const all = await Promise.all(classNames.map(className => getStudentEngagementByClass(className)));
  return all.flat();
}

export function getQuickSuggestions() {
  return quickSuggestions;
}
