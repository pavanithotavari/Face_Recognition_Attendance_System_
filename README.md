# Face Recognition Attendance System

A full-stack web application that uses a **live webcam feed** to recognize
faces in real time and automatically marks attendance, with a live admin
dashboard.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (CDN, no build step), face-api.js (TensorFlow.js) |
| Backend | Node.js, Express |
| Face Recognition | face-api.js — SSD Mobilenet face detector + 128-d face descriptor |
| Storage | JSON files (`backend/data/`) — no external database needed |

## How it works

1. **Register**: Admin starts the webcam, captures a clear front-facing
   photo (or uploads one as a fallback), and enters the student's roll
   number and name. face-api.js runs *in the browser* and converts the face
   into a 128-number "descriptor" (a unique numerical fingerprint of the
   face). Only this descriptor — not the raw photo — is sent to the backend
   and stored.
2. **Mark Attendance (Live)**: Admin starts the webcam and clicks **Start
   Live Recognition**. Every ~1.2 seconds, the app grabs the current video
   frame, detects a face, and compares its descriptor against every
   registered student's descriptor using **Euclidean distance**. A green box
   with the matched name appears the moment someone is recognized, and
   attendance is auto-logged via the API — no manual capture needed. A red
   box means "unrecognized." Each student is only marked once per day
   (enforced by the backend) and only once per live session (enforced in the
   browser, to avoid re-submitting while they stand in frame). A **Capture
   Single Frame** button is also available for a one-shot check instead of
   continuous scanning.
3. **Dashboard**: Shows total students, present/absent today, and the full
   attendance log, refreshable in real time.

The browser will ask for camera permission the first time you click **Start
Camera** — allow access when prompted. If no camera is available (or for a
quick demo without granting permissions), both Register and Mark Attendance
also support uploading a photo file instead.

## Project Structure

```
face-attendance-system/
├── backend/
│   ├── server.js          # Express API (students + attendance endpoints)
│   ├── package.json
│   └── data/               # auto-created JSON "database"
│       ├── students.json
│       └── attendance.json
├── frontend/
│   └── index.html          # Single-file React app (no npm/build step)
└── README.md
```

## Running the project

### 1. Start the backend

```bash
cd backend
npm install
npm start
```

The API runs at `http://localhost:5000`.

### 2. Open the frontend

Just open `frontend/index.html` directly in a browser (double-click it, or
use a simple static server like `npx serve frontend`). It calls the backend
at `http://localhost:5000/api` — update `API_BASE` in `index.html` if you
deploy the backend elsewhere.

> **Internet connection needed for the demo**: face-api.js and its model
> weights load from a CDN the first time the page opens. After that, your
> browser caches them for the session.

## Sample Demo Flow (for viva)

1. Go to **Register**, start the camera, and capture 3–5 people with
   different roll numbers/names (classmates, or your own face from a few
   angles works too).
2. Go to **Mark Attendance**, start the camera, click **Start Live
   Recognition**, and look at the camera — a green box with your name and
   confidence score should appear within ~1–2 seconds, and it auto-logs
   attendance.
3. Have someone *not* registered look at the camera — the system should
   draw a red "Unrecognized" box instead of marking attendance.
4. Go to **Dashboard** to show the live attendance log and stats updating
   in real time.

## Possible Extensions (mentioned in the report's Future Scope)

- Move descriptor storage from JSON files to MongoDB/PostgreSQL
- Add JWT-based admin login
- Add SMS/email alerts for unrecognized faces
- Export attendance logs to Excel/PDF
- Multi-camera support for multiple entry points
