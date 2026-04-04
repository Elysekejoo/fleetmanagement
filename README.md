# Fleet Management System with GPS Tracking

A production-ready **role-based Fleet Management System** designed for organizations (government / NGO style) to manage vehicles, track movements in real time, and control travel requests efficiently.

---

## Overview

This system enables an organization to:

- Manage vehicles and drivers
- Handle employee travel requests
- Approve or reject requests
- Assign vehicles and drivers
- Track vehicles in real-time using GPS
- Monitor fuel usage and maintenance
- Generate operational reports

---

## System Architecture
GPS Device (Vehicle)
↓
Microcontroller (ESP32 / NodeMCU + SIM)
↓
HTTP API (Backend - Node.js)
↓
Database (MongoDB / PostgreSQL)
↓
Frontend (React / Web Dashboard)


---

## Authentication

- Single login system
- Role-based access control using JWT


User Login → Role Check → Redirect Dashboard


---

## User Roles

### 1. Admin
Full system control.

Capabilities:
- Manage users (add, edit, delete)
- Manage vehicles
- Assign drivers to vehicles
- Approve / reject requests
- Monitor live vehicle tracking
- Manage fuel & maintenance
- View reports

---

### 2. Employee
Request vehicles for official travel.

Capabilities:
- Create travel request
- View request status

---

### 3. Driver
Execute assigned trips.

Capabilities:
- View assigned trips
- Start trip
- End trip

---

## System Workflow


Employee → Create Request
↓
Status: Pending
↓
Admin → Review Request
↓
Approve / Reject
↓
If Approved:
Assign Driver + Vehicle
↓
Driver → Starts Trip
↓
GPS Data Sent to Server
↓
Admin → Monitor Live Map
↓
Driver → Ends Trip
↓
System → Stores Trip Data
↓
Reports Generated


---

## Pages & Features

### Authentication
- Login Page (email, password)

---

### Admin Dashboard
- Total vehicles
- Total drivers
- Total employees
- Pending requests
- Active trips
- Live map tracking

---

### User Management
- Add user
- Edit user
- Delete user
- Assign roles

---

### Vehicle Management
- Add vehicle
- Update vehicle
- Delete vehicle
- Assign driver

---

### Request Management
- View all requests
- Filter by status
- Approve / reject
- Assign vehicle and driver

---

### Employee Features
- Create request (destination, purpose, date)
- View personal requests
- Track status (pending / approved / rejected)

---

### Driver Features
- View assigned trips
- Start trip
- End trip

---

### Live Tracking
- Google Maps integration
- Real-time vehicle markers

---

### Fuel & Maintenance
- Add fuel records
- Add maintenance records
- View history

---

### Reports
- Travel reports
- Vehicle usage reports
- Fuel consumption reports
- Distance tracking

---

## GPS API

### Endpoint

POST /api/gps


### Payload
```json
{
  "vehicleId": "CAR001",
  "latitude": -1.9441,
  "longitude": 30.0619,
  "time": "2026-04-04T10:00:00Z"
}
Database Models
Users
id
name
email
password
role (admin | employee | driver)
Vehicles
id
plateNumber
assignedDriver
status
Requests
id
employeeId
destination
purpose
status
assignedVehicle
assignedDriver
Trips
id
vehicleId
driverId
startTime
endTime
distance
GPS Logs
id
vehicleId
latitude
longitude
time
Fuel & Maintenance
id
vehicleId
type
amount
date
UI / UX Design Guidelines
Style
Government / NGO style interface
Clean and minimal
No gradients
No flashy animations
No emojis
Color Scheme
Element	Color
Background	White
Header	Dark Blue / Gray
Sidebar	Light Gray
Text	Black
Borders	Soft Gray
Layout Structure
+--------------------------------------+
| Header (User Info, Logout)           |
+-------------+------------------------+
| Sidebar     | Main Content           |
| Navigation  | Dashboard / Pages      |
+-------------+------------------------+
Icons (Use Real Icons Only)

Use libraries:

Material Icons
Font Awesome

Examples:

Dashboard → dashboard
Users → group
Vehicles → directions_car
Requests → assignment
Reports → bar_chart
Tracking → location_on
Fuel → local_gas_station
Settings → settings
Important Rules
Only admin can approve requests
Only admin can assign vehicles
Driver cannot create requests
Employee cannot access admin features
Tracking only active when trip starts
Deployment
Backend
npm install
npm run dev
Frontend
npm install
npm start
Future Improvements
WebSocket real-time updates
Mobile application
Offline GPS buffering
Advanced analytics
