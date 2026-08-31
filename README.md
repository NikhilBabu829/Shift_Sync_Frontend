# Shift Sync — Frontend

React client for Shift Sync, an AI-augmented shift management platform for hourly staff. Handles the clock-in flow (including browser-side face descriptor extraction), the staff chat interface, and the manager dashboard.

Built as the dissertation project for an MSc in Computing at Griffith College Dublin.

**Backend & ML service:** [Shift_Sync](https://github.com/NikhilBabu829/Shift_Sync)

> **Status:** Alpha / prototype.

---

## What this client does

Shift Sync splits work deliberately between browser and server, and the frontend owns more than a typical CRUD client.

**Face descriptor extraction runs here.** When a staff member clocks in, the browser captures a frame, extracts a 128-dimensional face descriptor, and sends the vector to the API. The image never leaves the device. The server does the Euclidean distance comparison against the stored descriptor, but the expensive extraction step and all raw image data stay client-side. That's a privacy decision as much as a performance one.

**Geolocation capture.** The client collects GPS coordinates at clock-in, which the backend uses for velocity checks and Isolation Forest anomaly scoring.

**Natural-language chat.** Staff type requests in plain English — "I'm sick tomorrow", "can anyone cover Friday" — and the client posts them to the backend's intent router, which parses them with a locally-run `gemma3` model and maps them to database operations.

**Manager dashboard.** Rota views, flagged clock-in review, shift swap approvals, and Excel export triggers.

---

## Tech stack

| Concern | Technology |
| --- | --- |
| Framework | React |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Linting | ESLint |
| Auth | JWT held client-side, sent as bearer tokens |

---

## Repository structure

```
public/          Static assets and face-api model weights
scripts/         Build and setup scripts
src/             Application source
index.html
vite.config.js
tailwind.config.js
eslint.config.js
```

---

## Getting started

### Prerequisites

- Node.js 18+
- A running instance of the [Shift Sync backend](https://github.com/NikhilBabu829/Shift_Sync)
- A browser with camera and geolocation permissions

### Setup

```bash
git clone https://github.com/NikhilBabu829/Shift_Sync_Frontend.git
cd Shift_Sync_Frontend
npm install
```

**Environment.** Create a `.env` file in the project root:

```
VITE_API_BASE_URL=http://localhost:5000
```

Point it at wherever your Express API is running.

**Run:**

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

**Build for production:**

```bash
npm run build
npm run preview
```

---

## A note on camera and location permissions

Face verification and GPS capture both require browser permissions, and both require a secure context. On `localhost` this works over plain HTTP. On any other host you'll need HTTPS, or the camera and geolocation APIs will silently refuse.

---

## Known limitations

- **Face descriptor extraction is browser-dependent.** Performance varies significantly with device capability, and older mobile browsers may struggle with the model weights.
- **No offline handling.** A clock-in attempted without connectivity is lost rather than queued.
- **Polling, not sockets.** Shift coverage updates and anomaly alerts refresh on an interval. Real-time notifications via Socket.io are on the roadmap.
- **JavaScript, not TypeScript.** The project would benefit from type safety around the API contract, particularly the face descriptor and geolocation payloads.
- **No component tests.**

---

## Related

- [Shift_Sync](https://github.com/NikhilBabu829/Shift_Sync) — Node.js/Express API, Python/FastAPI ML service, and the full architecture description.

---

## Author

**Nikhil Babu Guntipally**
MSc Computing, Griffith College Dublin

[GitHub](https://github.com/NikhilBabu829) · [LinkedIn](https://www.linkedin.com/in/nikhil-babu-guntipally-b46b27217/)
