# 🏠 RentWise — House Rental Management System

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-API-000000?logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-Database-4479A1?logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-Recommendation-3776AB?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-Service-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Scikit--learn-ML-F7931E?logo=scikit-learn&logoColor=white" />
</p>

<p align="center">
  <b>A full-stack smart house rental management system with AI-powered property recommendations.</b>
</p>

---

## 📌 About The Project

**RentWise** is a full-stack House Rental Management System developed to simplify property searching, rental management, and property recommendations.

The system combines a modern **React frontend**, **Node.js + Express backend**, **MySQL database**, and a separate **Python FastAPI recommendation service**.

It provides users with an easy-to-use platform for exploring properties, managing rental-related activities, and receiving intelligent property recommendations.

---

## ✨ Features

- 🔐 User Registration & Login
- 🏠 Property Listing
- 🔎 Property Search
- 📋 Property Details
- 👤 User Dashboard
- 🛠️ Admin Management
- 🤖 AI-Powered Property Recommendations
- 🗄️ MySQL Database
- 🔑 JWT Authentication
- 📱 Responsive User Interface
- ⚡ REST API Based Architecture

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|--------------|
| 🎨 Frontend | React.js, Vite, HTML5, CSS3, JavaScript |
| ⚙️ Backend | Node.js, Express.js |
| 🗄️ Database | MySQL |
| 🤖 Recommendation Service | Python, FastAPI, Pandas, Scikit-learn |
| 🔐 Authentication | JWT |
| 🔧 Tools | VS Code, Git, GitHub |

---

# 🏗️ System Architecture

```text
                         ┌──────────────────┐
                         │      USER        │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  React Frontend  │
                         │    Vite :5173    │
                         └────────┬─────────┘
                                  │
                                  │ REST API
                                  ▼
                         ┌──────────────────┐
                         │ Node.js + Express│
                         │      :5000       │
                         └───────┬───┬──────┘
                                 │   │
                    ┌────────────┘   └─────────────┐
                    ▼                              ▼
             ┌──────────────┐              ┌─────────────────┐
             │    MySQL     │              │ Recommendation  │
             │   Database   │              │ Python FastAPI  │
             │    :3306     │              │      :8000      │
             └──────────────┘              └─────────────────┘

             📂 Project Structure
RentWise-House-Rental-Management/
│
├── frontend/
│   └── React + Vite Application
│
├── backend/
│   ├── Node.js + Express API
│   ├── Database Configuration
│   └── Authentication
│
├── recommendation_service/
│   ├── FastAPI Application
│   ├── Pandas
│   └── Scikit-learn
│
├── screenshots/
│   ├── home.png
│   ├── login.png
│   ├── dashboard.png
│   └── property.png
│
├── .gitignore
└── README.md
