/**
 * Face Recognition Attendance System — Backend
 * ----------------------------------------------
 * A small Express API that stores registered students (with their face
 * descriptor computed in the browser by face-api.js) and attendance logs.
 *
 * Data is persisted to simple JSON files under ./data so the project runs
 * with zero external database setup — perfect for a college demo/viva.
 */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "10mb" })); // face descriptors + base64 thumbnails can be sizeable

const DATA_DIR = path.join(__dirname, "data");
const STUDENTS_FILE = path.join(DATA_DIR, "students.json");
const ATTENDANCE_FILE = path.join(DATA_DIR, "attendance.json");

// --- tiny JSON "database" helpers -----------------------------------------

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STUDENTS_FILE)) fs.writeFileSync(STUDENTS_FILE, "[]");
  if (!fs.existsSync(ATTENDANCE_FILE)) fs.writeFileSync(ATTENDANCE_FILE, "[]");
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

ensureDataFiles();

// --- Students ---------------------------------------------------------------

// GET /api/students -> list all registered students (without heavy descriptor data)
app.get("/api/students", (req, res) => {
  const students = readJSON(STUDENTS_FILE);
  const light = students.map(({ descriptor, ...rest }) => rest);
  res.json(light);
});

// POST /api/students -> register a new student
// body: { rollNo, name, descriptor: number[128], photo: base64 (optional) }
app.post("/api/students", (req, res) => {
  const { rollNo, name, descriptor, photo } = req.body;

  if (!rollNo || !name || !Array.isArray(descriptor) || descriptor.length !== 128) {
    return res.status(400).json({
      error: "rollNo, name, and a 128-length face descriptor are required.",
    });
  }

  const students = readJSON(STUDENTS_FILE);

  if (students.some((s) => s.rollNo === rollNo)) {
    return res.status(409).json({ error: `Student with roll number ${rollNo} already exists.` });
  }

  const student = {
    id: Date.now().toString(),
    rollNo,
    name,
    descriptor,
    photo: photo || null,
    registeredAt: new Date().toISOString(),
  };

  students.push(student);
  writeJSON(STUDENTS_FILE, students);

  const { descriptor: _omit, ...safeStudent } = student;
  res.status(201).json(safeStudent);
});

// DELETE /api/students/:id -> remove a student
app.delete("/api/students/:id", (req, res) => {
  const students = readJSON(STUDENTS_FILE);
  const next = students.filter((s) => s.id !== req.params.id);
  if (next.length === students.length) {
    return res.status(404).json({ error: "Student not found." });
  }
  writeJSON(STUDENTS_FILE, next);
  res.json({ success: true });
});

// GET /api/students/descriptors -> full list WITH descriptors, used by the
// browser to run face matching locally (face-api.js runs client-side).
app.get("/api/students/descriptors", (req, res) => {
  res.json(readJSON(STUDENTS_FILE));
});

// --- Attendance ---------------------------------------------------------------

// GET /api/attendance?date=YYYY-MM-DD -> attendance log, optionally filtered by date
app.get("/api/attendance", (req, res) => {
  let logs = readJSON(ATTENDANCE_FILE);
  if (req.query.date) {
    logs = logs.filter((l) => l.timestamp.startsWith(req.query.date));
  }
  res.json(logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
});

// POST /api/attendance/mark -> log attendance for a recognized student
// body: { studentId, rollNo, name, distance }
app.post("/api/attendance/mark", (req, res) => {
  const { studentId, rollNo, name, distance } = req.body;

  if (!studentId || !rollNo || !name) {
    return res.status(400).json({ error: "studentId, rollNo and name are required." });
  }

  const logs = readJSON(ATTENDANCE_FILE);
  const today = new Date().toISOString().slice(0, 10);

  // Prevent duplicate attendance entries for the same student on the same day
  const alreadyMarked = logs.some(
    (l) => l.studentId === studentId && l.timestamp.startsWith(today)
  );
  if (alreadyMarked) {
    return res.status(409).json({ error: `${name} is already marked present today.` });
  }

  const entry = {
    id: Date.now().toString(),
    studentId,
    rollNo,
    name,
    matchDistance: distance ?? null, // lower = more confident match
    timestamp: new Date().toISOString(),
  };

  logs.push(entry);
  writeJSON(ATTENDANCE_FILE, logs);
  res.status(201).json(entry);
});

// GET /api/attendance/stats -> quick summary for the dashboard
app.get("/api/attendance/stats", (req, res) => {
  const students = readJSON(STUDENTS_FILE);
  const logs = readJSON(ATTENDANCE_FILE);
  const today = new Date().toISOString().slice(0, 10);
  const presentToday = logs.filter((l) => l.timestamp.startsWith(today)).length;

  res.json({
    totalStudents: students.length,
    presentToday,
    absentToday: Math.max(students.length - presentToday, 0),
    totalAttendanceRecords: logs.length,
  });
});

app.get("/", (req, res) => {
  res.send("Face Recognition Attendance System API is running.");
});

app.listen(PORT, () => {
  console.log(`Attendance API listening on http://localhost:${PORT}`);
});
