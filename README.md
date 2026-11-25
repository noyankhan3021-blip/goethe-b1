# Goethe B1 Monitor — Android + Windows/PC

## Ek hi app, dono platforms
Yeh installable **PWA (Progressive Web App)** hai:
- Android: Chrome mein open karke **Install app / Add to Home screen**.
- Windows PC: Chrome ya Edge mein open karke address bar ka Install icon ya menu > **Install Goethe B1 Monitor**.
- App ka same dashboard phone aur PC par chalta hai.

## Important architecture
Monitor ka Node.js server ek computer ya hosted server par chalna zaroori hai. Android aur PC dono usi server ka dashboard browser/PWA mein khol sakte hain. PWA khud se Goethe website par booking nahi karti; available exam row milne par official Goethe page par manual booking karein.

## Windows quick start
1. Node.js 18+ install karein: https://nodejs.org/
2. ZIP extract karein.
3. `START-WINDOWS.bat` par double-click karein.
4. Browser mein `http://localhost:3000` khul jayega.
5. PC par Chrome/Edge se Install app karein.

## Android phone par use
Phone aur Windows PC ko same Wi-Fi par rakhein.
1. PC par Command Prompt khol kar `ipconfig` chalayein.
2. `IPv4 Address` note karein, e.g. `192.168.1.20`.
3. Android Chrome mein `http://192.168.1.20:3000` kholein.
4. Chrome menu (⋮) > **Install app** ya **Add to Home screen**.
5. Dashboard ko home screen se app ki tarah kholein.
6. PC ka server chalta rehna chahiye. Firewall prompt aaye to private network par Node.js allow karein.

## Linux/macOS
```bash
npm install
npx playwright install chromium
npm start
```
Open `http://localhost:3000`.

## Features
- Selected-country monitor and supported-country sweep
- City filter and polling interval (minimum 30 seconds)
- Open-seat count, activity log, sound/browser alerts
- Direct official Goethe exam-page link
- Installable Android/Windows PWA interface

## Source-project functions not included
The uploaded repository describes automated account login, proxy relay, aggressive polling and automated booking submission. This cross-platform monitor build deliberately excludes automatic login, automated booking/payment submission, proxy rotation and bot-protection workarounds. It only monitors the public exam listing and hands the user to the official site for manual booking.

## Limitations
- No compiled APK or EXE is included; install the PWA from Chrome/Edge.
- The server must remain online for live monitoring.
- Browser notifications require permission and a supported browser.
- Goethe can change its exam finder API, which can require a code update.
- Seat availability is not guaranteed and this tool does not reserve a seat.
