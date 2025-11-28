# Local Development Over LAN

This guide walks through everything needed to run the Pockets frontend and signaling server so that **multiple machines on the same network** can join the same development room with full audio/video support.

## 1. Hardware & Software Requirements
- **Host machine** that runs both the Next.js frontend (port `3000`) and the signaling server (port `8080` by default).
- **At least one additional client device** (laptop, tablet, or phone) with a modern Chromium- or Firefox-based browser.
- Working **camera, microphone, and speakers/headset** on each device.
- **Node.js 18+** and **pnpm** installed on the host (clients only need a browser).
- Stable **Wi‑Fi/LAN network**. Prefer 5 GHz Wi‑Fi or wired Ethernet for better media quality.

## 2. Network Checklist
1. **Same subnet:** All devices must be on the same Wi‑Fi or Ethernet network. Disable VPNs or corporate proxies that might reroute traffic.
2. **Discover host IP:** On the host machine run `hostname -I | awk '{print $1}'` (Linux) or `ipconfig getifaddr <interface>` (macOS) to get an address like `192.168.1.42`.
3. **Optional DHCP reservation:** Reserve the host IP on your router to prevent it from changing mid-session.
4. **Router isolation:** Ensure "AP/Client Isolation" is disabled so devices can talk to each other.

## 3. Firewall & Port Exposure
Open the frontend (`3000`) and signaling server (`8080`) ports on the host operating system. Examples for Ubuntu:

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 8080/tcp
sudo ufw reload
```

For `firewalld` (RHEL/Fedora):

```bash
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload
```

If another process already uses one of these ports, stop it or adjust the app/server configuration accordingly.

## 4. Environment Configuration
Create `frontend/.env.local` with the signaling endpoint that all clients (including remote machines) can reach:

```env
NEXT_PUBLIC_SERVER_PATH=192.168.1.42
NEXT_PUBLIC_SERVER_PORT=8080
```

Replace `192.168.1.42` with the host IP you collected earlier. Restart the Next.js dev server whenever `.env.local` changes.

## 5. Running the Signaling Server
```bash
cd server
pnpm install   # first run only
pnpm dev       # runs tsx watch index.ts (listens on 0.0.0.0:8080)
```

The server binds to `0.0.0.0`, so every LAN client can reach it at `ws://<host-ip>:8080`. Keep this terminal open.

## 6. Running the Next.js Frontend
```bash
cd frontend
pnpm install   # first run only
pnpm dev       # script already uses: next dev --turbopack --hostname 0.0.0.0
```

Key points:
- Binding to `0.0.0.0` lets the dev server accept traffic from other machines.
- If you change the port (`NEXT_PUBLIC_PORT` or `--port`), update both the firewall rules and the URLs you share with testers.
- Consider adding your host IP to `allowedDevOrigins` (if configured) in `next.config.ts` to allow React refresh over LAN.

## 7. Joining From Another Machine
1. Make sure the additional device uses the **same LAN** and has a modern browser.
2. Enter `http://<host-ip>:3000` in the browser (for example, `http://192.168.1.42:3000`).
3. Allow camera and microphone permissions when prompted.
4. Create or join a room. The browser will contact the signaling server at `ws://<host-ip>:8080`, so both ports must remain open.

## 8. Media Device Tips
- Plug in or pair every camera/mic you plan to test before launching the browsers.
- Close video-call apps (Zoom, Meet, FaceTime) so they do not lock the webcam.
- Use headsets to avoid audio feedback when multiple devices are in the same room.
- In Chrome/Edge, use `chrome://settings/content/camera` to verify the correct device is selected.

## 9. Troubleshooting Checklist
- **Cannot reach the site:** Verify you can `ping <host-ip>` and run `ss -tlnp | grep 3000` on the host to confirm the dev server is listening.
- **WebSocket fails:** Confirm `pnpm dev` is running inside `server/`, port `8080` is open, and `.env.local` points to the host IP.
- **Mixed content errors:** If you access via `https://` but the dev server is `http://`, disable forced HTTPS (some corporate browsers enforce it).
- **No media devices:** Clear browser permissions, reload the page, or test with `chrome://webrtc-internals` to inspect WebRTC negotiation.
- **Different networks:** Guest Wi‑Fi networks often block peer-to-peer traffic. Move all devices to the same primary network.

With these steps in place, every developer on the LAN can open the shared room URL, exchange media, and debug multi-device behaviour in real time.
