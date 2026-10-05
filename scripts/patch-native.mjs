// Corre depois de «cap sync»: garante as permissões do Android para notificações na barra.
import fs from "fs";
const f = "android/app/src/main/AndroidManifest.xml";
if (fs.existsSync(f)) {
  let x = fs.readFileSync(f, "utf8");
  const perms = ["android.permission.POST_NOTIFICATIONS", "android.permission.VIBRATE", "android.permission.SCHEDULE_EXACT_ALARM", "android.permission.RECEIVE_BOOT_COMPLETED", "android.permission.WAKE_LOCK"];
  let add = "";
  for (const p of perms) if (!x.includes(p)) add += `    <uses-permission android:name="${p}" />\n`;
  if (add) { x = x.replace("</manifest>", `\n${add}</manifest>`); fs.writeFileSync(f, x); console.log("Android: permissões de notificação adicionadas."); }
  else console.log("Android: permissões já estavam presentes.");
} else console.log("Pasta android/ não existe ainda (corra npm run cap:add:android).");
