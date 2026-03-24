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

const generalQuickSuggestions = [
  'Notebook',
  'Homework Folder',
  'School Diary',
  'ID Card',
  'Water Bottle',
];

const subjectQuickSuggestionMap: Record<string, string[]> = {
  mathematics: [
    'Textbook',
    'Workbook',
    'Math Notebook',
    'Calculator',
    'Ruler',
    'Compass',
    'Protractor',
    'Graph Book',
  ],
  science: [
    'Science Textbook',
    'Science Notebook',
    'Lab Coat',
    'Practical Record Book',
    'Safety Goggles',
  ],
  english: [
    'English Reader',
    'Grammar Book',
    'Literature Notebook',
    'Dictionary',
    'Workbook',
  ],
  'social studies': [
    'Social Studies Textbook',
    'History Notebook',
    'Geography Notebook',
    'Atlas',
    'Map Book',
  ],
  hindi: [
    'Hindi Textbook',
    'Hindi Workbook',
    'Hindi Notebook',
    'Grammar Book',
    'Dictionary',
  ],
  art: [
    'Art Supplies',
    'Drawing Book',
    'Color Pencils',
    'Sketch Pens',
  ],
  'physical education': [
    'Sports Shoes',
    'Water Bottle',
    'Sports Uniform',
  ],
};

export interface SchoolOption {
  id: string;
  name: string;
}

export async function getSchools(): Promise<SchoolOption[]> {
  const snapshot = await getDocs(collection(db, 'users'));
  if (snapshot.empty) return [];

  const seen = new Map<string, SchoolOption>();

  snapshot.docs.forEach(item => {
    const data = item.data();
    const schoolName = String(data.school ?? '').trim();
    if (!schoolName) return;

    const normalized = schoolName.toLowerCase();
    if (!seen.has(normalized)) {
      seen.set(normalized, {
        id: normalized.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        name: schoolName,
      });
    }
  });

  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}

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

export async function loginWithSchoolCredentials(params: {
  schoolName: string;
  role: UserRole;
  email: string;
  password: string;
}): Promise<AppUser | null> {
  const schoolName = params.schoolName.trim();
  const email = params.email.trim().toLowerCase();
  const password = params.password.trim();

  const q = query(
    collection(db, 'users'),
    where('school', '==', schoolName),
    where('role', '==', params.role),
    where('email', '==', email),
    limit(1),
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const userDoc = snapshot.docs[0];
  const data = userDoc.data();
  const storedPassword = String(data.password ?? '').trim();

  if (!storedPassword || storedPassword !== password) {
    return null;
  }

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

function normalizeItemName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeSubject(subject?: string) {
  return String(subject ?? '').trim().toLowerCase();
}

const defaultSubjectKeywordMap: Record<string, string[]> = {
  mathematics: ['math', 'maths', 'mathematics', 'algebra', 'geometry'],
  science: ['science', 'lab', 'chemistry', 'physics', 'biology'],
  english: ['english', 'grammar', 'literature', 'reading'],
  'social studies': ['social', 'history', 'civics', 'geography'],
  hindi: ['hindi'],
};

function hasCrossSubjectKeyword(
  itemName: string,
  teacherSubject?: string,
  keywordMap: Record<string, string[]> = defaultSubjectKeywordMap,
) {
  const text = normalizeItemName(itemName);
  const ownSubject = normalizeSubject(teacherSubject);

  const ownKeywords = new Set(keywordMap[ownSubject] ?? []);

  return Object.values(keywordMap)
    .flat()
    .some(keyword => !ownKeywords.has(keyword) && text.includes(keyword));
}

async function getSchoolConfig(schoolName: string) {
  const schoolsQuery = query(
    collection(db, 'schools'),
    where('name', '==', schoolName),
    limit(1),
  );
  const snapshot = await getDocs(schoolsQuery);
  if (snapshot.empty) {
    return { subjectKeywordMap: defaultSubjectKeywordMap };
  }

  const data = snapshot.docs[0].data();
  const keywordMap = data.subjectKeywordMap ?? defaultSubjectKeywordMap;

  return { subjectKeywordMap: keywordMap };
}

type TeacherUpdateRecord = {
  className: string;
  date: string;
  items: Array<{
    id?: string;
    name?: string;
    subject?: string;
    type?: 'bring' | 'do-not-bring';
  }>;
  teacherId: string;
  teacherName: string;
  teacherRoleType: 'class-teacher' | 'subject-teacher';
  teacherSubject?: string;
};

function mergeChecklistFromUpdates(updates: TeacherUpdateRecord[]): PackingItem[] {
  const resolved = new Map<
    string,
    {
      priority: number;
      item: PackingItem;
    }
  >();

  updates.forEach(update => {
    const priority = update.teacherRoleType === 'class-teacher' ? 2 : 1;

    (update.items ?? []).forEach((rawItem, index) => {
      const name = String(rawItem.name ?? '').trim();
      if (!name) return;

      const normalized = normalizeItemName(name);
      const next: PackingItem = {
        id: rawItem.id || `${normalized}-${index}`,
        name,
        subject: rawItem.subject ? String(rawItem.subject) : undefined,
        type: rawItem.type === 'do-not-bring' ? 'do-not-bring' : 'bring',
        addedBy: 'teacher',
      };

      const prev = resolved.get(normalized);
      if (!prev || priority >= prev.priority) {
        resolved.set(normalized, {
          priority,
          item: next,
        });
      }
    });
  });

  return Array.from(resolved.values()).map(entry => entry.item);
}

type AuditSource = {
  teacherName: string;
  teacherRoleType: 'class-teacher' | 'subject-teacher';
  teacherSubject?: string;
  priority: number;
  won: boolean;
};

type AuditItem = {
  name: string;
  type: 'bring' | 'do-not-bring';
  sources: AuditSource[];
};

function mergeChecklistWithAuditTracking(updates: TeacherUpdateRecord[]): AuditItem[] {
  const resolved = new Map<
    string,
    {
      priority: number;
      item: AuditItem;
    }
  >();

  updates.forEach(update => {
    const priority = update.teacherRoleType === 'class-teacher' ? 2 : 1;

    (update.items ?? []).forEach(rawItem => {
      const name = String(rawItem.name ?? '').trim();
      if (!name) return;

      const normalized = normalizeItemName(name);
      const source: AuditSource = {
        teacherName: update.teacherName,
        teacherRoleType: update.teacherRoleType,
        teacherSubject: update.teacherSubject,
        priority,
        won: false,
      };

      const prev = resolved.get(normalized);
      if (!prev) {
        resolved.set(normalized, {
          priority,
          item: {
            name,
            type: rawItem.type === 'do-not-bring' ? 'do-not-bring' : 'bring',
            sources: [source],
          },
        });
      } else {
        if (priority > prev.priority) {
          prev.priority = priority;
          prev.item.sources = [source];
        } else if (priority === prev.priority) {
          prev.item.sources.push(source);
        } else {
          prev.item.sources.push(source);
        }
      }
    });
  });

  return Array.from(resolved.values()).map(entry => {
    const maxPriority = Math.max(...entry.item.sources.map(s => s.priority));
    return {
      ...entry.item,
      sources: entry.item.sources.map(s => ({
        ...s,
        won: s.priority === maxPriority,
      })),
    };
  });
}

async function regenerateChecklistForClassDate(className: string, date: string) {
  const updatesQuery = query(
    collection(db, 'teacherUpdates'),
    where('className', '==', className),
    where('date', '==', date),
  );

  const updatesSnapshot = await getDocs(updatesQuery);
  const updates = updatesSnapshot.docs.map(item => item.data() as TeacherUpdateRecord);
  const mergedItems = mergeChecklistFromUpdates(updates);

  // Keep finalChecklists as source of truth and mirror to dailyItems for existing screens.
  await setDoc(
    doc(db, 'finalChecklists', dailyItemsDocId(className, date)),
    {
      className,
      date,
      items: mergedItems,
      generatedAt: serverTimestamp(),
      sourceUpdateCount: updates.length,
    },
    { merge: true },
  );

  await setDoc(
    doc(db, 'dailyItems', dailyItemsDocId(className, date)),
    {
      className,
      date,
      items: mergedItems,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return mergedItems;
}

export async function submitTeacherUpdates(params: {
  classNames: string[];
  items: PackingItem[];
  teacherId: string;
  teacherName: string;
  teacherRoleType: 'class-teacher' | 'subject-teacher';
  teacherSubject?: string;
}) {
  const {
    classNames,
    items,
    teacherId,
    teacherName,
    teacherRoleType,
    teacherSubject,
  } = params;

  if (!classNames.length) {
    throw new Error('At least one class is required');
  }

  if (!items.length) {
    throw new Error('At least one item is required');
  }

  const teacherSnap = await getDoc(doc(db, 'users', teacherId));
  if (!teacherSnap.exists()) {
    throw new Error('Teacher account not found');
  }

  const teacherData = teacherSnap.data();
  if (teacherData.role !== 'teacher') {
    throw new Error('Only teachers can send updates');
  }

  const schoolName = String(teacherData.school ?? '');
  const schoolConfig = await getSchoolConfig(schoolName);

  const assignedClasses = Array.isArray(teacherData.assignedClasses) ? teacherData.assignedClasses : [];
  const invalidClasses = classNames.filter(className => !assignedClasses.includes(className));
  if (invalidClasses.length) {
    throw new Error(`You are not assigned to: ${invalidClasses.join(', ')}`);
  }

  const isClassTeacher = Boolean(teacherData.isClassTeacher);
  const subjectFromDb = String(teacherData.subject ?? '').trim();

  if (teacherRoleType === 'class-teacher' && !isClassTeacher) {
    throw new Error('Only class teachers can send general updates');
  }

  if (teacherRoleType === 'subject-teacher') {
    if (!subjectFromDb) {
      throw new Error('Subject not configured for this teacher');
    }

    const badSubjectItems = items.filter(
      item => normalizeSubject(item.subject) !== normalizeSubject(subjectFromDb),
    );

    if (badSubjectItems.length) {
      throw new Error('Subject teachers can only send updates for their own subject');
    }

    const crossSubjectItems = items.filter(item =>
      hasCrossSubjectKeyword(item.name, subjectFromDb, schoolConfig.subjectKeywordMap),
    );
    if (crossSubjectItems.length) {
      throw new Error('Item list contains content that belongs to another subject');
    }
  }

  const date = todayKey();

  const classUpdateTasks = classNames.map(async className => {
    await addDoc(collection(db, 'teacherUpdates'), {
      className,
      date,
      items,
      teacherId,
      teacherName,
      teacherRoleType,
      teacherSubject: teacherSubject ?? null,
      createdAt: serverTimestamp(),
    });

    const mergedItems = await regenerateChecklistForClassDate(className, date);

    const bringNames = mergedItems.filter(i => i.type === 'bring').map(i => i.name);
    const doNotBringNames = mergedItems.filter(i => i.type === 'do-not-bring').map(i => i.name);

    await addDoc(collection(db, 'history'), {
      className,
      date,
      itemsAdded: bringNames,
      itemsRemoved: doNotBringNames,
      teacherId,
      teacherName,
      createdAt: serverTimestamp(),
    });
  });

  await Promise.all(classUpdateTasks);
}

async function getClassDocBySchoolAndName(school: string, className: string) {
  const q = query(collection(db, 'classes'), where('name', '==', className), limit(20));
  const snapshot = await getDocs(q);

  const match = snapshot.docs.find(item => String(item.data().school ?? '') === school) ?? snapshot.docs[0];
  if (!match) return null;
  return match;
}

export async function updateTeacherAssignments(params: {
  teacherId: string;
  assignedClasses: string[];
  isClassTeacher: boolean;
  classTeacherOf?: string;
}) {
  const { teacherId, assignedClasses, isClassTeacher, classTeacherOf } = params;

  const teacherRef = doc(db, 'users', teacherId);
  const teacherSnap = await getDoc(teacherRef);
  if (!teacherSnap.exists()) {
    throw new Error('Teacher not found');
  }

  const teacherData = teacherSnap.data();
  if (teacherData.role !== 'teacher') {
    throw new Error('Only teacher assignments can be changed here');
  }

  const schoolName = String(teacherData.school ?? '');
  const previousClassTeacherOf = String(teacherData.classTeacherOf ?? '');

  const normalizedAssignedClasses = Array.from(
    new Set(
      assignedClasses
        .map(item => item.trim())
        .filter(Boolean),
    ),
  );

  const normalizedClassTeacherOf = String(classTeacherOf ?? '').trim();

  if (isClassTeacher && !normalizedClassTeacherOf) {
    throw new Error('Class teacher must have a class assigned');
  }

  if (normalizedClassTeacherOf && !normalizedAssignedClasses.includes(normalizedClassTeacherOf)) {
    throw new Error('Class teacher class must be included in assigned classes');
  }

  if (normalizedClassTeacherOf) {
    const existingClassTeacherQuery = query(
      collection(db, 'users'),
      where('role', '==', 'teacher'),
      where('school', '==', schoolName),
      where('classTeacherOf', '==', normalizedClassTeacherOf),
    );
    const existingClassTeacherSnapshot = await getDocs(existingClassTeacherQuery);

    await Promise.all(
      existingClassTeacherSnapshot.docs
        .filter(item => item.id !== teacherId)
        .map(item =>
          setDoc(
            doc(db, 'users', item.id),
            {
              isClassTeacher: false,
              classTeacherOf: null,
            },
            { merge: true },
          ),
        ),
    );
  }

  await setDoc(
    teacherRef,
    {
      assignedClasses: normalizedAssignedClasses,
      isClassTeacher,
      classTeacherOf: normalizedClassTeacherOf || null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  if (previousClassTeacherOf && previousClassTeacherOf !== normalizedClassTeacherOf) {
    const previousClassDoc = await getClassDocBySchoolAndName(schoolName, previousClassTeacherOf);
    if (previousClassDoc) {
      const previousClassData = previousClassDoc.data();
      const classTeacher = previousClassData.classTeacher as { teacherId?: string } | undefined;
      if (classTeacher?.teacherId === teacherId) {
        await setDoc(
          doc(db, 'classes', previousClassDoc.id),
          {
            classTeacher: null,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
    }
  }

  if (normalizedClassTeacherOf) {
    const nextClassDoc = await getClassDocBySchoolAndName(schoolName, normalizedClassTeacherOf);
    if (nextClassDoc) {
      await setDoc(
        doc(db, 'classes', nextClassDoc.id),
        {
          classTeacher: {
            teacherId,
            teacherName: String(teacherData.name ?? ''),
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
  }
}

export async function getTodayPackingItems(className: string): Promise<PackingItem[]> {
  const finalRef = doc(db, 'finalChecklists', dailyItemsDocId(className));
  const finalSnap = await getDoc(finalRef);

  if (finalSnap.exists()) {
    const data = finalSnap.data();
    const items = Array.isArray(data.items) ? data.items : [];

    return items.map((item: Record<string, unknown>, index: number) => ({
      id: (item.id as string) || `${index}-${String(item.name ?? '')}`,
      name: String(item.name ?? ''),
      subject: item.subject ? String(item.subject) : undefined,
      type: item.type === 'do-not-bring' ? 'do-not-bring' : 'bring',
      addedBy: item.addedBy === 'student' ? 'student' : 'teacher',
    }));
  }

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

export async function recordStudentSeen(studentId: string, studentName: string, className: string) {
  const engagementId = `${className}_${studentId}`;
  try {
    await setDoc(
      doc(db, 'studentEngagement', engagementId),
      {
        studentId,
        name: studentName,
        class: className,
        status: 'seen',
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error('Failed to record student seen status:', error);
  }
}

export async function recordStudentProgress(studentId: string, studentName: string, className: string, itemsMarked: number) {
  const engagementId = `${className}_${studentId}`;
  try {
    await setDoc(
      doc(db, 'studentEngagement', engagementId),
      {
        studentId,
        name: studentName,
        class: className,
        status: itemsMarked > 0 ? 'in-progress' : 'seen',
        itemsMarked,
        lastUpdated: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error('Failed to record student progress:', error);
  }
}

export async function recordStudentCompleted(studentId: string, studentName: string, className: string) {
  const engagementId = `${className}_${studentId}`;
  try {
    await setDoc(
      doc(db, 'studentEngagement', engagementId),
      {
        studentId,
        name: studentName,
        class: className,
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error('Failed to record student completion:', error);
  }
}

export function getQuickSuggestions(params?: {
  subject?: string;
  scope?: 'subject' | 'general';
}) {
  const scope = params?.scope ?? 'subject';
  if (scope === 'general') {
    return generalQuickSuggestions;
  }

  const subject = normalizeSubject(params?.subject);
  const subjectSuggestions = subjectQuickSuggestionMap[subject] ?? [];

  if (subjectSuggestions.length > 0) {
    return subjectSuggestions;
  }

  return generalQuickSuggestions;
}

export async function getChecklistAuditData(className: string, date: string) {
  const updatesQuery = query(
    collection(db, 'teacherUpdates'),
    where('className', '==', className),
    where('date', '==', date),
  );

  const updatesSnapshot = await getDocs(updatesQuery);
  const updates = updatesSnapshot.docs.map(item => item.data() as TeacherUpdateRecord);

  return mergeChecklistWithAuditTracking(updates);
}

export async function getSchoolKeywordConfig(schoolName: string): Promise<Record<string, string[]>> {
  const result = await getSchoolConfig(schoolName);
  return result.subjectKeywordMap;
}

export async function updateSchoolKeywordConfig(
  schoolName: string,
  keywordMap: Record<string, string[]>,
): Promise<void> {
  const schoolsQuery = query(
    collection(db, 'schools'),
    where('name', '==', schoolName),
    limit(1),
  );
  const snapshot = await getDocs(schoolsQuery);
  if (snapshot.empty) {
    throw new Error('School not found');
  }

  const schoolId = snapshot.docs[0].id;
  await setDoc(
    doc(db, 'schools', schoolId),
    { subjectKeywordMap: keywordMap },
    { merge: true },
  );
}

export async function createTeacher(params: {
  name: string;
  email: string;
  password: string;
  subject: string;
  school: string;
  assignedClasses: string[];
  isClassTeacher: boolean;
  classTeacherOf: string | null;
}): Promise<string> {
  const {
    name,
    email,
    password,
    subject,
    school,
    assignedClasses,
    isClassTeacher,
    classTeacherOf,
  } = params;

  // Validate input
  if (!name.trim()) throw new Error('Teacher name is required');
  if (!email.trim()) throw new Error('Email is required');
  if (!email.includes('@')) throw new Error('Invalid email format');
  if (!password.trim()) throw new Error('Password is required');
  if (!subject) throw new Error('Subject is required');
  if (!assignedClasses.length) throw new Error('At least one class must be assigned');

  // Check if email already exists in this school
  const existingQuery = query(
    collection(db, 'users'),
    where('school', '==', school),
    where('email', '==', email.toLowerCase()),
  );
  const existingSnapshot = await getDocs(existingQuery);
  if (!existingSnapshot.empty) {
    throw new Error('Email already exists in this school');
  }

  // If making this teacher a class teacher, clear any existing class teacher for that class
  if (isClassTeacher && classTeacherOf) {
    const existingClassTeacherQuery = query(
      collection(db, 'users'),
      where('school', '==', school),
      where('classTeacherOf', '==', classTeacherOf),
    );
    const existingClassTeacherSnapshot = await getDocs(existingClassTeacherQuery);

    await Promise.all(
      existingClassTeacherSnapshot.docs.map(doc =>
        setDoc(
          doc.ref,
          {
            isClassTeacher: false,
            classTeacherOf: null,
          },
          { merge: true },
        ),
      ),
    );
  }

  // Create teacher document
  const newTeacherId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const teacherData = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password, // ⚠️ NOTE: In production, this should be hashed
    role: 'teacher' as const,
    school,
    subject: subject.trim(),
    assignedClasses,
    isClassTeacher,
    classTeacherOf: isClassTeacher && classTeacherOf ? classTeacherOf : null,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'users', newTeacherId), teacherData);

  // If class teacher, update the classes collection
  if (isClassTeacher && classTeacherOf) {
    const classQuery = query(
      collection(db, 'classes'),
      where('name', '==', classTeacherOf),
      where('school', '==', school),
    );
    const classSnapshot = await getDocs(classQuery);

    if (!classSnapshot.empty) {
      await setDoc(
        doc(db, 'classes', classSnapshot.docs[0].id),
        {
          classTeacher: {
            teacherId: newTeacherId,
            teacherName: name.trim(),
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
  }

  return newTeacherId;
}
