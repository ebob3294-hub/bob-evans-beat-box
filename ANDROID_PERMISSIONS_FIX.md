# 🔧 إصلاح نهائي لمشكلة عدم ظهور الموسيقى على Android

## المشكلة
في إعدادات التطبيق يظهر فقط إذن **Storage** ولا يظهر إذن **Music and audio**.
السبب: ملف `AndroidManifest.xml` لا يحتوي على إذن `READ_MEDIA_AUDIO` المطلوب في Android 13+.

## الحل (يجب تطبيقه مرة واحدة فقط)

### الخطوة 1: افتح الملف
```
android/app/src/main/AndroidManifest.xml
```

### الخطوة 2: أضف هذه الأذونات داخل وسم `<manifest>` (قبل `<application>`)

```xml
<!-- Android 13+ (API 33+) -->
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />

<!-- Android 12 وأقل -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="29" />

<!-- إذن اختياري لتشغيل الموسيقى في الخلفية -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

### مثال كامل لشكل الملف بعد التعديل:
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
        android:maxSdkVersion="29" />
    <uses-permission android:name="android.permission.INTERNET" />

    <application ...>
        ...
    </application>
</manifest>
```

### الخطوة 3: إعادة بناء APK
```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```
أو افتح Android Studio واضغط Build > Build APK.

### الخطوة 4: على الهاتف
1. احذف التطبيق القديم تماماً
2. ثبّت APK الجديد
3. عند فتح التطبيق سيطلب إذن **Music and audio** — اقبله
4. ستظهر جميع الأغاني تلقائياً ✅

## ملاحظة هامة
- إذا قمت بحذف مجلد `android/` وإعادة إنشائه (`npx cap add android`)، يجب إعادة تطبيق هذه التعديلات.
- بعد أول تثبيت ناجح، اضغط زر **Rescan** داخل التطبيق إذا أضفت موسيقى جديدة.
