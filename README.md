# Field Measure Pro (Web & Mobile Engine)

[![Deploy to GitHub Pages](https://github.com/actions/workflows/deploy.yml/badge.svg)](https://github.com/actions/workflows/deploy.yml)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Google Maps](https://img.shields.io/badge/Google%20Maps-Platform-4285f4.svg?logo=google-maps&logoColor=white)](https://developers.google.com/maps)
[![Flutter](https://img.shields.io/badge/Flutter-Cross--Platform-02569b.svg?logo=flutter&logoColor=white)](https://flutter.dev)

A modern, high-precision agricultural land measuring application designed for farmers, agronomists, surveyors, and property evaluators. Measures surface areas and perimeters of land plots using high-resolution Google Maps satellite imagery, GPS walking, and freehand drawing, with real-time geodesic calculations on the **WGS84 authalic sphere**.

---

## 🌟 Live Web Application
Host directly on **GitHub Pages** for free. Once deployed via GitHub Actions, access it at:
```
https://<your-username>.github.io/<your-repo-name>/
```

---

## 🚀 Key Features

- **Point-by-Point Corner Marking**: Place boundary vertices with high precision on satellite or hybrid maps.
- **Freehand Drawing Mode**: Drag your mouse or finger across the screen to trace curvy borders, canals, or fence lines. Automatically simplifies into clean polygon vertices using the Ramer-Douglas-Peucker (RDP) algorithm.
- **Live GPS Walk Boundary**: Walk the physical perimeter with a smartphone or tablet; records GPS coordinates with real-time accuracy and speed filtering.
- **Real-Time Touch Vertex Dragging**: Drag corners smoothly on touchscreens or desktops while the polygon and area recalculate continuously on every movement tick.
- **Multi-Unit Regional Land Conversion**:
  - **Global**: Acres, Hectares, Square Meters ($\text{m}^2$), Square Kilometers ($\text{km}^2$), Square Feet, Square Yards.
  - **Indian Regional**: Bigha (Standard, UP, Uttarakhand, Punjab, Haryana, Rajasthan, West Bengal, MP, Gujarat, Assam), Biswa, Guntha, Marla, Kanal, Cent.
- **Self-Intersection Validation**: Immediate visual alerts when boundary lines cross each other (bow-tie geometry).
- **Google Street View Integration**: Instant 360° ground-level panoramic preview of any boundary corner.
- **Export & Storage**: Save plots locally, download as GeoJSON, KML, and CSV.
- **Flutter Cross-Platform Engine**: Full companion Flutter codebase (`field_measure_pro/`) for native Android APK and Windows desktop builds.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Mapping**: `@vis.gl/react-google-maps` (Google Maps JavaScript API v3, AdvancedMarkerElement, Polygon, Geometry library)
- **Mobile Engine**: Flutter 3.x, SQLite, Geolocation, Geodesic WGS84 GIS calculators
- **CI/CD**: GitHub Actions automated deployment to GitHub Pages

---

## 💻 Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/<your-repo-name>.git
   cd <your-repo-name>
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🌐 Deploy to GitHub Pages

This repository includes a pre-configured GitHub Actions workflow in `.github/workflows/deploy.yml`.

1. Go to your repository on GitHub.
2. Navigate to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. Push any commit to the `main` branch:
   ```bash
   git push origin main
   ```
5. GitHub Actions will build and deploy the app automatically.

---

## 🔑 Google Maps API Key Setup

The web application works out-of-the-box using the built-in Google Maps Demo Key.

To use your own Google Cloud key:
1. Generate an API Key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials).
2. Enable:
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**
3. Restrict your key to HTTP referrers (e.g. `https://<your-username>.github.io/*`).
4. In the app, click the **API Key** button in the header and paste your key. It is saved locally and password-masked for security.

---

## 📄 License
MIT License. Open source for agricultural and educational use.
