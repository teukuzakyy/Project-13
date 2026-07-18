# 📍 Check-In App

Aplikasi check-in berbasis React Native (Expo) yang menggabungkan foto selfie dan koordinat GPS dalam satu bukti kehadiran, lengkap dengan riwayat check-in yang tersimpan secara lokal.

Dibangun untuk Misi 13 — Native Power App (Mata Kuliah Mobile Programming).

## 🔐 Fitur Native yang Dipakai

- **Kamera** (`expo-image-picker`) — ambil selfie langsung dari kamera depan
- **GPS / Lokasi** (`expo-location`) — ambil koordinat + reverse geocoding jadi nama tempat
- **Penyimpanan Lokal** (`@react-native-async-storage/async-storage`) — riwayat check-in persisten

## ✅ Daftar Fitur

**Level 1 — Core**
- Permission flow lengkap untuk kamera & lokasi (request → cek `granted` → akses fitur)
- Penanganan penolakan izin dengan `Alert`, tanpa crash
- Cek `hasil.canceled` sebelum ambil `assets[0].uri`
- Tampilkan foto (`Image`) & koordinat hasil check-in
- UI kartu rapi untuk hasil check-in

**Level 2 — Pengembangan** *(2 fitur dipilih)*
- 📍 **Kamera + Lokasi** — foto selfie dan koordinat digabung dalam satu data check-in (`entriBaru`), bukan disimpan terpisah
- 💾 **Persistensi** — setiap check-in disimpan ke `AsyncStorage` dan otomatis dimuat ulang saat app dibuka, ditampilkan via `FlatList` dengan opsi hapus per-entri

**Level 3 — Bonus**
- 🔁 **Priming Screen** — layar penjelasan custom muncul sebelum dialog izin sistem, menjelaskan kenapa app butuh akses kamera/lokasi
- 🗺️ **Reverse Geocoding** — koordinat otomatis diubah jadi nama jalan/kota via `Location.reverseGeocodeAsync`

## 📸 Screenshot

| Hasil Check-In (Foto + Lokasi) | Dialog Izin | Penanganan Penolakan Izin |
|---|---|---|
| ![profile-card/assets/hasil-checkin.jpg]| ![profile-card/assets/dialog-izin.jpg] | ![profile-card/assets/penolakan-izin.jpg]|

## 🛠️ Tech Stack

- React Native + Expo SDK 54
- `expo-image-picker` — akses kamera
- `expo-location` — akses GPS & reverse geocoding
- `@react-native-async-storage/async-storage` — penyimpanan lokal

## 🔗 Expo Snack

Coba langsung tanpa install: **[https://snack.expo.dev/@teuku.zaky/43b186?platform=web]**
