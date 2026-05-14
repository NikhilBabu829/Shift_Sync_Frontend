# Handover Audit: Shift Sync (Frontend)
**Date:** May 14, 2026  
**Project:** Shift Sync - Workforce Management Solution  
**To:** Jules  

---

## 1. Project Overview
Shift Sync is a high-fidelity workforce management application designed for small organizations. It streamlines staff attendance through GPS-verified clock-ins, facilitates a self-managed shift marketplace (swaps), and leverages AI (Gemini) for natural language shift management.

## 2. Technical Stack
- **Framework:** React 19 (Vite)
- **Styling:** Material UI (MUI) v7 with a custom blueprint theme.
- **Routing:** React Router v7 (Data Router API).
- **State Management:** React Context API (`ContextProvider.jsx`).
- **Auth:** JWT-based (Bearer tokens). Staff use Google OAuth; Managers use traditional email/pass.
- **API Integration:** RESTful communication with a backend (assumed Express/Node) hosted at `http://localhost:3000`.

---

## 3. Current State of Modules

### ✅ Implemented & Functional
- **Landing Page (`App.jsx`):** Fully designed marketing site with feature highlights and entry points for both roles.
- **GPS-Verified Clock-In (`ClockIn.jsx`):** 
    - Uses 3-poll verification for accuracy.
    - Matches user coordinates against Organization HQ (0.001 tolerance).
    - Prevents clock-in if outside premises.
- **Staff Dashboard:**
    - **AI Assistant:** Integrated with `/api/chat` for handling sick leave and coverage queries.
    - **Shift Swap Engine:** Full form to request swaps with specific staff members and time slots.
- **Manager Dashboard:**
    - **Operational Overview:** Real-time stats (On-shift count, pending swaps).
    - **Staff Ledger:** Tabular view of daily activity.
    - **Staff Onboarding:** Email-based invite system (`ManagerInvite.jsx`).
- **Auth Flow:** 
    - Token persistence in `localStorage` (`aes52`).
    - Route protection/guards via `useEffect` in individual pages.

### ⚠️ Partial / Mocked
- **Manager Roster Posting:** Buttons exist, but the "AI Powered Roster" engine is pending backend logic.
- **Attendance Export:** Linked to `/api/download-attendance` but requires verification of CSV formatting on the backend.
- **Notifications:** Dashboard shows mock alerts; needs real-time integration (WebSocket).

---

## 4. Immediate Audit Findings (Technical Debt)
1. **API Endpoints:** API base URLs are currently hardcoded as `http://localhost:3000`. This needs to be moved to a `.env` file immediately.
2. **Package Hygiene:** `package.json` contains backend-specific libraries (`mongoose`, `bcryptjs`, `jsonwebtoken`). These should be moved to the backend repository to reduce bundle size.
3. **State Management:** `ContextProvider` is currently underutilized; some data is fetched and managed locally in components (e.g., `ManagerDashboard.jsx`) that should probably be global.
4. **Error Handling:** While snackbars are present, a global Error Boundary is missing for unexpected crashes.

---

## 5. Roadmap to "Product Complete"

### Phase 1: Infrastructure (Est. 3-5 Days)
- [ ] Implement `.env` for production/staging API URLs.
- [ ] Set up a global HTTP interceptor (e.g., Axios or a wrapper for `fetch`) to handle token expiration (401s) globally.
- [ ] Cleanup `package.json` and prune unused dependencies.

### Phase 2: Core Feature Completion (Est. 7-10 Days)
- [ ] **Roster Management:** Build the interface for Managers to create/edit weekly rosters (not just view them).
- [ ] **Swap Approval Flow:** Managers currently see "Pending Swaps" but need a UI to Approve/Deny them directly from the dashboard.
- [ ] **Biometric/Enhanced Spoof Detection:** Improve GPS logic to handle VPN/Mock-location detection if required by the client.

### Phase 3: Polish & UX (Est. 5 Days)
- [ ] **Real-time Updates:** Integrate Socket.io so managers see clock-ins happen in real-time without refreshing.
- [ ] **Mobile Optimization:** Exhaustive audit of the dashboards on small screens (some tables may need cards-view on mobile).
- [ ] **Loading States:** Replace standard `CircularProgress` with MUI Skeletons for a more "premium" feel.

---

## 6. Handover Checklist for Jules
- [ ] **Access:** Ensure Jules has the repository for the Backend (the API at `:3000`).
- [ ] **Credentials:** Provide a sample Manager account and Staff account for testing.
- [ ] **Environment:** Jules needs to set up a `.env` with `VITE_API_BASE_URL`.
- [ ] **Maps API:** If moving to a Map-based view for HQ settings, an API key (Google/Mapbox) will be needed.

---
**Handover Status:** 🟢 READY FOR TRANSITION
