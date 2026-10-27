import fs from "fs";
import path from "path";

const manifestPath = path.resolve("android/app/src/main/AndroidManifest.xml");

if (fs.existsSync(manifestPath)) {
  let content = fs.readFileSync(manifestPath, "utf8");

  const permissions = [
    '<uses-permission android:name="android.permission.INTERNET" />',
    '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
    '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
    '<uses-permission android:name="android.permission.AUDIO_CAPTURE" />',
  ];

  for (const perm of permissions) {
    const permName = perm.match(/android:name="([^"]+)"/)?.[1];
    if (permName && !content.includes(permName)) {
      content = content.replace(
        "</manifest>",
        `    ${perm}\n</manifest>`
      );
    }
  }

  if (!content.includes('android:usesCleartextTraffic="true"')) {
    content = content.replace(
      "<application",
      '<application android:usesCleartextTraffic="true"'
    );
  }

  fs.writeFileSync(manifestPath, content, "utf8");
  console.log("Updated AndroidManifest.xml with RECORD_AUDIO & INTERNET permissions.");
}
