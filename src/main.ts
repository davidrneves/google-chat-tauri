import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";

try {
  let permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
  }
} catch (e) {
  console.error("Notification permission request failed", e);
}

window.location.replace("https://mail.google.com/chat/u/0");
