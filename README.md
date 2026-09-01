# 📚 StudyHub

A modern, responsive study and task-management dashboard for students. Manage subjects, assignments, and study tasks — all from one clean interface with real-time progress tracking.

Built with **Python (Flask)** on the backend and **vanilla HTML/CSS/JavaScript** on the frontend, using **SQLite** for persistent storage. No frontend frameworks, no external paid services. Includes **light and dark themes** with system preference detection and a manual toggle.

---

## ✨ Features

- **Dashboard** — at-a-glance stat cards: total subjects, total tasks, pending, completed, and overall completion percentage, plus recent tasks and subject progress.
- **Subject Management** — full CRUD for subjects with name, description, and color identifier.
- **Task Management** — full CRUD for tasks with title, description, subject, due date, priority (Low/Medium/High), and completion status. One-click toggle to mark complete/pending.
- **Search & Filter** — live search by task title, filter by subject, priority, and completion status — all client-side, no page reloads.
- **Sorting** — sort tasks by due date, priority, completion status, or title.
- **Progress Tracking** — animated SVG ring chart for overall completion, bar charts for status and priority breakdowns, and per-subject progress bars.
- **Dark Mode** — toggle between light and dark themes. Remembers your choice via `localStorage` and auto-detects your system preference on first visit.
- **Responsive UI** — works on desktop, tablet, and mobile with a collapsible sidebar.
- **Form Validation** — client-side validation with instant feedback, mirrored by server-side validation that never trusts the frontend.
- **Persistent Storage** — all data survives application restarts via SQLite.

---

## 📁 Project Structure

```
studyhub/
├── run.py                  # Application entry point
├── requirements.txt        # Python dependencies
├── README.md               # This file
├── studyhub.db             # SQLite database (auto-created on first run)
├── backend/
│   ├── __init__.py
│   ├── app.py              # Flask app factory, error handlers, static serving
│   ├── db.py               # SQLite connection management & schema
│   ├── routes.py           # API endpoints (subjects, tasks, stats)
│   ├── validation.py       # Shared input validators
│   └── errors.py           # Custom ApiError exception
└── frontend/
    ├── index.html          # Single-page app shell
    ├── css/styles.css      # Complete design system (light + dark themes)
    └── js/
        ├── api.js          # Fetch-based API client
        ├── ui.js           # DOM helpers, toasts, modal, theme toggle
        ├── forms.js        # Form builders & frontend validation
        └── app.js          # Main controller: views, state, CRUD, charts
```

---

## 🔧 Requirements

- **Python 3.10+** (tested on 3.12)
- No frontend build step required — vanilla JS runs directly in the browser.

---

## 🚀 Installation & Setup

1. **Clone or download** the project directory and navigate into it:
   ```bash
   cd studyhub
   ```

2. **(Recommended) Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate        # macOS/Linux
   # venv\Scripts\activate         # Windows
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the application:**
   ```bash
   python run.py
   ```
   The SQLite database (`studyhub.db`) is created automatically on first launch.

5. **Open your browser** to: `http://127.0.0.1:5000`

---

## 📖 How to Use

### Subjects
1. Click **Subjects** in the sidebar.
2. Click **Add Subject** — enter a name, optional description, and pick a color.
3. Click **Edit** on any subject card to modify it.
4. Click **Delete** to remove a subject (its tasks are kept but unlinked).

### Tasks
1. Click **Tasks** in the sidebar (or **New Task** in the top bar).
2. Click **New Task** — fill in title, description, subject, due date, and priority.
3. Click the **circle** on any task to toggle completion.
4. Click **Edit** to modify, or **Delete** to remove.

### Search, Filter & Sort
- Use the **search box** to find tasks by title.
- Use **Subject**, **Priority**, and **Status** dropdowns to filter.
- Use **Sort by** to reorder tasks. Click **Clear** to reset.

### Dark Mode
- Click the **🌙/☀️ toggle** in the sidebar footer or the top bar to switch themes.
- Your choice is saved and persists across sessions.
- On first visit, the app matches your system's light/dark preference.

### Progress
- Visual charts for overall completion, status breakdown, priority distribution, and per-subject progress.

---

## 🛡️ Validation & Error Handling

Both frontend and backend validate all user input:

| Field          | Rule                                           |
| -------------- | ---------------------------------------------- |
| Task title     | Required, non-empty, max 200 chars              |
| Subject name   | Required, non-empty, max 120 chars             |
| Description    | Optional, max 1000 chars                       |
| Due date       | Optional, must be valid YYYY-MM-DD             |
| Priority       | Must be Low, Medium, or High                   |
| Color          | Must be from the predefined palette             |
| Subject ID    | Must reference an existing subject (if provided) |

---

## 🔌 API Reference

| Method   | Endpoint                | Description                          |
| -------- | ----------------------- | ------------------------------------ |
| `GET`    | `/api/subjects`          | List all subjects                    |
| `POST`   | `/api/subjects`          | Create a subject                     |
| `GET`    | `/api/subjects/<id>`     | Get a single subject                 |
| `PUT`    | `/api/subjects/<id>`     | Update a subject                     |
| `DELETE` | `/api/subjects/<id>`    | Delete a subject                     |
| `GET`    | `/api/tasks`             | List all tasks (with subject details)|
| `POST`   | `/api/tasks`             | Create a task                        |
| `GET`    | `/api/tasks/<id>`        | Get a single task                     |
| `PUT`    | `/api/tasks/<id>`        | Update a task (full replacement)     |
| `PATCH`  | `/api/tasks/<id>`        | Partial update (e.g. toggle complete)|
| `DELETE` | `/api/tasks/<id>`        | Delete a task                         |
| `GET`    | `/api/stats`             | Dashboard statistics & progress      |

---

## 🏗️ Architecture Notes

- **Single-page application** — Flask serves `index.html` for all non-API routes; the frontend handles view switching via JavaScript.
- **Separation of concerns** — `api.js` (network), `ui.js` (DOM primitives + theme), `forms.js` (validation), and `app.js` (controller) are intentionally decoupled.
- **Theme system** — CSS custom properties on `[data-theme]` attribute, applied before first paint to avoid flash. Toggle persists via `localStorage`.
- **Per-request DB connections** — each request opens and closes its own SQLite connection.
- **Foreign key cascade** — deleting a subject sets its tasks' `subject_id` to NULL (`ON DELETE SET NULL`).
- **SQL-based aggregation** — dashboard statistics computed in SQL for efficiency.

---

## 📜 License

This project is provided as-is for the AI App Development Challenge. Free to use and modify.
