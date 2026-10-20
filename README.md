# 🎓 Exam Seating Plan Dynamic System (परीक्षा सीटिंग प्लान)

A dynamic, intelligent Exam Seating Arrangement & Gate Notice Generator built with **React**, **Vite**, and **Tailwind CSS**.

Designed specifically for schools, colleges, and examination centers to automate seating allocation, eliminate adjacent-seat cheating, and generate instant **Main Gate Notices** and **Room Desk Charts**.

---

## ✨ Features

- **🏫 Dynamic Classes & Sections:**
  - Support for any class with multiple sections (e.g., Class 9-A, 9-B, 9-C ... up to 12-C, or 6-A to 8-C).
  - Quick **"Add 3 Sections (A, B, C)"** 1-click generator.
  - Automatic Roll Number generation (`From - To`) and total student count.

- **🚪 Dynamic Rooms & Hall Capacity:**
  - Customize each room's name and bench capacity (e.g., Room 101: 18 benches = 36 seats, Hall 1: 50 benches = 100 seats).
  - Configurable physical column layout (2, 3, 4, 5 columns).
  - Real-time capacity vs student requirement counter (Shortage / Surplus alerts).

- **🛡️ Anti-Cheating & Multi-Class Mixing Engine:**
  - **No Adjacent Same Class:** Two students on the same bench (Left & Right) are **never** from the same class or subject.
  - **All-Class Mixing in Every Room:**
    - **1st Meeting (Shift 1):** Classes 9th, 10th, 11th, and 12th are interleaved and mixed together across all rooms.
    - **2nd Meeting (Shift 2):** Classes 6th, 7th, and 8th are interleaved and mixed together across all rooms.
  - **Last Room Grace Rule:** In the last room, if some classes are exhausted, remaining students are automatically accommodated so no student is left unseated.

- **📋 Main Gate Notice Board Sheet:**
  - Clear, printable table showing:
    - **Room / Hall No.**
    - **Class & Section**
    - **Subject**
    - **Roll Number Range (`From - To`)** (e.g. `901 - 909`)
    - **Total Students in that room** (e.g. `36 छात्र`)
    - Center Grand Total

- **🪑 Room-wise Desk Seating Chart:**
  - 2D grid representing physical room layout with Blackboard / Teacher's desk reference.
  - Left Seat and Right Seat student tags with roll numbers and color coding.
  - Automatic pairing verification tags (`Pair OK`).

- **🏷️ Room Door Slips:**
  - Printable cards ready to be pasted outside individual room doors.

- **🔍 Student Roll Number Finder:**
  - Search any student's roll number to instantly find their assigned Room, Bench Number, and Left/Right position.

- **📊 Print & Excel Export:**
  - 1-Click Print view styled specifically for standard A4 paper (`@media print`).
  - Export Main Gate Notice and Bench Layout to `.xlsx` Excel spreadsheets.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)

### Installation

```bash
git clone https://github.com/RahulJauhari2/Exam-seating-plan.git
cd Exam-seating-plan
npm install
```

### Run Locally

```bash
npm run dev
```

Open your browser at `http://127.0.0.1:5173`.

### Production Build

```bash
npm run build
```

---

## 🛠️ Tech Stack
- **Framework:** React 19
- **Bundler:** Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Spreadsheet Export:** SheetJS (`xlsx`)
