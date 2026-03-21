import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import {
  doc,
  getFirestore,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

const BATCH_LIMIT = 450;
const STUDENTS_PER_CLASS = 40;

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    if (!key || process.env[key]) continue;

    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function getRootDir() {
  const fileName = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(fileName), '..');
}

function loadEnv() {
  const root = getRootDir();
  parseDotEnv(path.join(root, '.env'));
  parseDotEnv(path.join(root, '.env.local'));
}

function assertFirebaseConfig(config, isDryRun) {
  if (isDryRun) return;

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Missing Firebase config: ${missing.join(', ')}`);
  }
}

function createNameGenerator() {
  const firstNames = [
    'Aarav', 'Aanya', 'Advik', 'Anika', 'Arjun', 'Diya', 'Ishaan', 'Ira',
    'Kabir', 'Kiara', 'Krish', 'Meera', 'Nivaan', 'Nitya', 'Pranav', 'Riya',
    'Sai', 'Saanvi', 'Shaurya', 'Tara', 'Veer', 'Vihaan', 'Yash', 'Zara',
  ];
  const lastNames = [
    'Agarwal', 'Bhat', 'Chopra', 'Desai', 'Ghosh', 'Iyer', 'Jain', 'Kapoor',
    'Kulkarni', 'Malhotra', 'Mehta', 'Menon', 'Nair', 'Patel', 'Rao', 'Reddy',
    'Shah', 'Sharma', 'Singh', 'Srinivasan', 'Verma',
  ];

  let firstIndex = 0;
  let lastIndex = 0;

  return function nextName() {
    const name = `${firstNames[firstIndex]} ${lastNames[lastIndex]}`;
    firstIndex = (firstIndex + 1) % firstNames.length;
    if (firstIndex === 0) {
      lastIndex = (lastIndex + 1) % lastNames.length;
    }
    return name;
  };
}

function buildSchoolBlueprints() {
  return [
    {
      name: 'Green Valley Public School',
      principal: { name: 'Priya Raman', email: 'principal@gvps.edu', password: 'Admin@123' },
      grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      subjects: ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi'],
      teachers: [
        {
          name: 'Nithya Menon',
          email: 'nithya.menon@gvps.edu',
          password: 'Teach@123',
          subject: 'Mathematics',
          teachesGrades: [6, 7, 8, 9, 10],
          classTeacherGrade: 7,
        },
        {
          name: 'Ravi Kumar',
          email: 'ravi.kumar@gvps.edu',
          password: 'Teach@123',
          subject: 'Science',
          teachesGrades: [6, 7, 8, 9, 10],
          classTeacherGrade: 9,
        },
        {
          name: 'Sita Iyer',
          email: 'sita.iyer@gvps.edu',
          password: 'Teach@123',
          subject: 'English',
          teachesGrades: [6, 7, 8, 9, 10],
          classTeacherGrade: 6,
        },
        {
          name: 'Kumar Shah',
          email: 'kumar.shah@gvps.edu',
          password: 'Teach@123',
          subject: 'Social Studies',
          teachesGrades: [6, 7, 8, 9, 10],
          classTeacherGrade: 8,
        },
        {
          name: 'Anjali Verma',
          email: 'anjali.verma@gvps.edu',
          password: 'Teach@123',
          subject: 'Hindi',
          teachesGrades: [6, 7, 8, 9, 10],
          classTeacherGrade: 10,
        },
        {
          name: 'Manoj Reddy',
          email: 'manoj.reddy@gvps.edu',
          password: 'Teach@123',
          subject: 'Mathematics',
          teachesGrades: [1, 2, 3, 4, 5],
          classTeacherGrade: 5,
        },
        {
          name: 'Leela Nair',
          email: 'leela.nair@gvps.edu',
          password: 'Teach@123',
          subject: 'Science',
          teachesGrades: [1, 2, 3, 4, 5],
          classTeacherGrade: 4,
        },
        {
          name: 'Farah Khan',
          email: 'farah.khan@gvps.edu',
          password: 'Teach@123',
          subject: 'English',
          teachesGrades: [1, 2, 3, 4, 5],
          classTeacherGrade: 3,
        },
        {
          name: 'Joseph Dsouza',
          email: 'joseph.dsouza@gvps.edu',
          password: 'Teach@123',
          subject: 'Social Studies',
          teachesGrades: [1, 2, 3, 4, 5],
          classTeacherGrade: 2,
        },
        {
          name: 'Pooja Jain',
          email: 'pooja.jain@gvps.edu',
          password: 'Teach@123',
          subject: 'Hindi',
          teachesGrades: [1, 2, 3, 4, 5],
          classTeacherGrade: 1,
        },
      ],
    },
    {
      name: 'Sunrise International School',
      principal: { name: 'Rahul Arora', email: 'principal@sunrise.edu', password: 'Admin@123' },
      grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      subjects: ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi'],
      teachers: [
        {
          name: 'Aditi Sharma',
          email: 'aditi.sharma@sunrise.edu',
          password: 'Teach@123',
          subject: 'Mathematics',
          teachesGrades: [6, 7, 8, 9, 10],
          classTeacherGrade: 8,
        },
        {
          name: 'Vikram Das',
          email: 'vikram.das@sunrise.edu',
          password: 'Teach@123',
          subject: 'Science',
          teachesGrades: [6, 7, 8, 9, 10],
          classTeacherGrade: 7,
        },
        {
          name: 'Neha Verma',
          email: 'neha.verma@sunrise.edu',
          password: 'Teach@123',
          subject: 'English',
          teachesGrades: [6, 7, 8, 9, 10],
          classTeacherGrade: 6,
        },
        {
          name: 'Karan Malhotra',
          email: 'karan.malhotra@sunrise.edu',
          password: 'Teach@123',
          subject: 'Social Studies',
          teachesGrades: [6, 7, 8, 9, 10],
          classTeacherGrade: 9,
        },
        {
          name: 'Ritu Chopra',
          email: 'ritu.chopra@sunrise.edu',
          password: 'Teach@123',
          subject: 'Hindi',
          teachesGrades: [6, 7, 8, 9, 10],
          classTeacherGrade: 10,
        },
        {
          name: 'Sandeep Rao',
          email: 'sandeep.rao@sunrise.edu',
          password: 'Teach@123',
          subject: 'Mathematics',
          teachesGrades: [1, 2, 3, 4, 5],
          classTeacherGrade: 5,
        },
        {
          name: 'Megha Patel',
          email: 'megha.patel@sunrise.edu',
          password: 'Teach@123',
          subject: 'Science',
          teachesGrades: [1, 2, 3, 4, 5],
          classTeacherGrade: 4,
        },
        {
          name: 'Isha Ghosh',
          email: 'isha.ghosh@sunrise.edu',
          password: 'Teach@123',
          subject: 'English',
          teachesGrades: [1, 2, 3, 4, 5],
          classTeacherGrade: 3,
        },
        {
          name: 'Naren Singh',
          email: 'naren.singh@sunrise.edu',
          password: 'Teach@123',
          subject: 'Social Studies',
          teachesGrades: [1, 2, 3, 4, 5],
          classTeacherGrade: 2,
        },
        {
          name: 'Uma Kulkarni',
          email: 'uma.kulkarni@sunrise.edu',
          password: 'Teach@123',
          subject: 'Hindi',
          teachesGrades: [1, 2, 3, 4, 5],
          classTeacherGrade: 1,
        },
      ],
    },
  ];
}

function buildSeedDocuments() {
  const schools = buildSchoolBlueprints();
  const nextName = createNameGenerator();
  const docs = [];

  for (const school of schools) {
    const schoolSlug = slug(school.name);
    const schoolDocId = `school_${schoolSlug}`;
    const principalId = `user_${schoolSlug}_principal`;

    docs.push({
      collection: 'schools',
      id: schoolDocId,
      data: {
        name: school.name,
        schoolSlug,
        principalUserId: principalId,
        gradeCount: school.grades.length,
        subjects: school.subjects,
        createdAt: serverTimestamp(),
      },
    });

    docs.push({
      collection: 'users',
      id: principalId,
      data: {
        name: school.principal.name,
        email: school.principal.email.toLowerCase(),
        password: school.principal.password,
        role: 'admin',
        school: school.name,
        schoolSlug,
        createdAt: serverTimestamp(),
      },
    });

    const teacherBySubjectByGrade = new Map();
    const teacherRefs = [];

    for (const teacher of school.teachers) {
      const teacherSlug = slug(teacher.name);
      const teacherId = `user_${schoolSlug}_${teacherSlug}`;
      const assignedClasses = teacher.teachesGrades.map(grade => `Grade ${grade}`);

      docs.push({
        collection: 'users',
        id: teacherId,
        data: {
          name: teacher.name,
          email: teacher.email.toLowerCase(),
          password: teacher.password,
          role: 'teacher',
          school: school.name,
          schoolSlug,
          subject: teacher.subject,
          assignedClasses,
          isClassTeacher: true,
          classTeacherOf: `Grade ${teacher.classTeacherGrade}`,
          teachesGrades: teacher.teachesGrades,
          createdAt: serverTimestamp(),
        },
      });

      teacherRefs.push({
        id: teacherId,
        name: teacher.name,
        subject: teacher.subject,
        classTeacherGrade: teacher.classTeacherGrade,
        teachesGrades: teacher.teachesGrades,
      });

      for (const grade of teacher.teachesGrades) {
        const key = `${grade}::${teacher.subject}`;
        if (!teacherBySubjectByGrade.has(key)) {
          teacherBySubjectByGrade.set(key, {
            teacherId,
            teacherName: teacher.name,
            subject: teacher.subject,
          });
        }
      }
    }

    for (const grade of school.grades) {
      const className = `Grade ${grade}`;
      const classSlug = slug(className);
      const classDocId = `class_${schoolSlug}_${classSlug}`;

      const classTeacher = teacherRefs.find(t => t.classTeacherGrade === grade);
      const subjectTeachers = {};
      for (const subject of school.subjects) {
        const key = `${grade}::${subject}`;
        const ref = teacherBySubjectByGrade.get(key);
        if (ref) {
          subjectTeachers[subject] = {
            teacherId: ref.teacherId,
            teacherName: ref.teacherName,
          };
        }
      }

      docs.push({
        collection: 'classes',
        id: classDocId,
        data: {
          name: className,
          grade,
          school: school.name,
          schoolSlug,
          classTeacher: classTeacher
            ? { teacherId: classTeacher.id, teacherName: classTeacher.name }
            : null,
          subjectTeachers,
          studentCountTarget: STUDENTS_PER_CLASS,
          createdAt: serverTimestamp(),
        },
      });

      for (const subject of school.subjects) {
        const subjectTeacher = subjectTeachers[subject];
        if (!subjectTeacher) continue;

        docs.push({
          collection: 'teacherAssignments',
          id: `assign_${schoolSlug}_${classSlug}_${slug(subject)}`,
          data: {
            school: school.name,
            schoolSlug,
            className,
            classId: classDocId,
            subject,
            teacherId: subjectTeacher.teacherId,
            teacherName: subjectTeacher.teacherName,
            createdAt: serverTimestamp(),
          },
        });
      }

      for (let i = 1; i <= STUDENTS_PER_CLASS; i += 1) {
        const fullName = nextName();
        const studentSlug = slug(fullName);
        const serial = String(i).padStart(2, '0');
        const email = `${studentSlug}.${grade}${serial}@${schoolSlug}.edu`;

        docs.push({
          collection: 'users',
          id: `user_${schoolSlug}_${classSlug}_student_${serial}`,
          data: {
            name: fullName,
            email,
            password: 'Stud@123',
            role: 'student',
            school: school.name,
            schoolSlug,
            class: className,
            grade,
            rollNumber: i,
            createdAt: serverTimestamp(),
          },
        });
      }
    }
  }

  return docs;
}

async function commitInChunks(db, operations) {
  let batch = writeBatch(db);
  let opCount = 0;
  let commitCount = 0;

  for (const operation of operations) {
    const ref = doc(db, operation.collection, operation.id);
    batch.set(ref, operation.data, { merge: true });
    opCount += 1;

    if (opCount >= BATCH_LIMIT) {
      await batch.commit();
      commitCount += 1;
      batch = writeBatch(db);
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
    commitCount += 1;
  }

  return commitCount;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  loadEnv();

  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  const operations = buildSeedDocuments();

  const summary = operations.reduce((acc, item) => {
    acc[item.collection] = (acc[item.collection] || 0) + 1;
    return acc;
  }, {});

  if (isDryRun) {
    console.log('Dry run: no data written.');
    console.log('Operations by collection:', summary);
    console.log('Total operations:', operations.length);
    return;
  }

  assertFirebaseConfig(firebaseConfig, isDryRun);

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const commitCount = await commitInChunks(db, operations);

  console.log('Seed completed successfully.');
  console.log('Operations by collection:', summary);
  console.log('Total operations:', operations.length);
  console.log('Batch commits:', commitCount);
  console.log('Default credentials:');
  console.log('- Admin password: Admin@123');
  console.log('- Teacher password: Teach@123');
  console.log('- Student password: Stud@123');
}

main().catch(error => {
  console.error('Seeding failed:', error);
  process.exit(1);
});