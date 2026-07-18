import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  Image, TouchableOpacity, Alert, FlatList, ActivityIndicator, Modal, Linking
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RIWAYAT_KEY = '@checkin_riwayat';

export default function App() {
  const [foto, setFoto] = useState(null);
  const [lokasi, setLokasi] = useState(null);
  const [alamat, setAlamat] = useState(null);
  const [sedangProses, setSedangProses] = useState(false);
  const [riwayat, setRiwayat] = useState([]);
  const [primingVisible, setPrimingVisible] = useState(false);
  const [primingJenis, setPrimingJenis] = useState(null); // 'kamera' | 'lokasi'
  const [primingOnConfirm, setPrimingOnConfirm] = useState(null);

  // Muat riwayat saat app dibuka
  useEffect(() => {
    muatRiwayat();
  }, []);

  async function muatRiwayat() {
    try {
      const json = await AsyncStorage.getItem(RIWAYAT_KEY);
      if (json != null) {
        setRiwayat(JSON.parse(json));
      }
    } catch (e) {
      console.log('Gagal memuat riwayat:', e);
    }
  }

  async function simpanRiwayat(dataBaru) {
    try {
      const updated = [dataBaru, ...riwayat];
      await AsyncStorage.setItem(RIWAYAT_KEY, JSON.stringify(updated));
      setRiwayat(updated);
    } catch (e) {
      console.log('Gagal simpan riwayat:', e);
    }
  }

  // Hapus satu entri riwayat
  async function hapusRiwayat(id) {
    try {
      const updated = riwayat.filter((item) => item.id !== id);
      await AsyncStorage.setItem(RIWAYAT_KEY, JSON.stringify(updated));
      setRiwayat(updated);
    } catch (e) {
      console.log('Gagal hapus riwayat:', e);
    }
  }

  function konfirmasiHapus(id) {
    Alert.alert(
      'Hapus Riwayat?',
      'Data check-in ini akan dihapus permanen.',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: () => hapusRiwayat(id) },
      ]
    );
  }

  // Priming screen: tampilkan penjelasan SEBELUM dialog izin sistem muncul
  function tampilkanPriming(jenis, aksiLanjutan) {
    setPrimingJenis(jenis);
    setPrimingOnConfirm(() => aksiLanjutan);
    setPrimingVisible(true);
  }

  function lanjutkanPriming() {
    setPrimingVisible(false);
    if (primingOnConfirm) primingOnConfirm();
  }

  function batalPriming() {
    setPrimingVisible(false);
    setPrimingOnConfirm(null);
  }

  // Fungsi Kamera (Selfie)
  async function ambilSelfie() {
    const cek = await ImagePicker.getCameraPermissionsAsync();
    if (cek.status === 'undetermined') {
      tampilkanPriming('kamera', prosesAmbilSelfie);
      return;
    }
    await prosesAmbilSelfie();
  }

  // Alert penolakan izin dengan tombol ke Pengaturan HP
  function alertIzinDitolak(pesan) {
    Alert.alert(
      'Izin Ditolak',
      pesan,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
      ]
    );
  }

  async function prosesAmbilSelfie() {
    const izin = await ImagePicker.requestCameraPermissionsAsync();
    if (izin.status !== 'granted') {
      alertIzinDitolak('Aplikasi butuh izin kamera untuk selfie check-in. Aktifkan lewat Pengaturan HP.');
      return;
    }
    const hasil = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      cameraType: ImagePicker.CameraType.front,
    });
    if (!hasil.canceled) {
      setFoto(hasil.assets[0].uri);
    }
  }

  // Fungsi Lokasi + Reverse Geocoding (fitur tambahan #1)
  async function ambilLokasi() {
    const izin = await Location.requestForegroundPermissionsAsync();
    if (izin.status !== 'granted') {
      alertIzinDitolak('Aplikasi butuh izin lokasi untuk check-in. Aktifkan lewat Pengaturan HP.');
      return null;
    }
    const posisi = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const koordinat = {
      latitude: posisi.coords.latitude,
      longitude: posisi.coords.longitude,
    };
    setLokasi(koordinat);

    let teksAlamat = null;
    try {
      const alamatHasil = await Location.reverseGeocodeAsync(koordinat);
      if (alamatHasil.length > 0) {
        const a = alamatHasil[0];
        teksAlamat = [a.street, a.subregion, a.city].filter(Boolean).join(', ') || null;
        setAlamat(teksAlamat);
      }
    } catch (e) {
      console.log('Gagal reverse geocode:', e);
    }
    return { koordinat, alamat: teksAlamat };
  }

  // Fungsi Check-In Utama (gabung foto + lokasi + simpan riwayat)
  async function checkIn() {
    if (!foto) {
      Alert.alert('Selfie Dulu', 'Ambil foto selfie sebelum check-in.');
      return;
    }
    const cekLokasi = await Location.getForegroundPermissionsAsync();
    if (cekLokasi.status === 'undetermined') {
      tampilkanPriming('lokasi', lanjutkanCheckIn);
      return;
    }
    await lanjutkanCheckIn();
  }

  async function lanjutkanCheckIn() {
    setSedangProses(true);
    const hasilLokasi = await ambilLokasi();
    setSedangProses(false);

    if (!hasilLokasi) return; // izin lokasi ditolak

    const entriBaru = {
      id: Date.now().toString(),
      foto,
      latitude: hasilLokasi.koordinat.latitude,
      longitude: hasilLokasi.koordinat.longitude,
      alamat: hasilLokasi.alamat,
      waktu: new Date().toLocaleString('id-ID'),
    };

    await simpanRiwayat(entriBaru);
    Alert.alert('Check-In Berhasil! ✅', `Tercatat pada ${entriBaru.waktu}`);

    // reset untuk check-in berikutnya
    setFoto(null);
    setLokasi(null);
    setAlamat(null);
  }

  // Riwayat check-in (fitur tambahan #2 — persistensi + FlatList)
  function renderItem({ item }) {
    return (
      <View style={styles.itemRiwayat}>
        <Image source={{ uri: item.foto }} style={styles.thumbnail} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.itemWaktu}>{item.waktu}</Text>
          <Text style={styles.itemAlamat} numberOfLines={2}>
            {item.alamat || `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => konfirmasiHapus(item.id)} style={styles.btnHapus}>
          <Text style={styles.btnHapusText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>📍 Check-In App</Text>

      <View style={styles.card}>
        {foto ? (
          <Image source={{ uri: foto }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarKosong]}>
            <Text style={{ fontSize: 40 }}>🤳</Text>
          </View>
        )}

        <TouchableOpacity style={styles.btn} onPress={ambilSelfie}>
          <Text style={styles.btnText}>📸 Ambil Selfie</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: '#00b894' }]}
          onPress={checkIn}
          disabled={sedangProses}
        >
          {sedangProses ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>✅ Check In Sekarang</Text>
          )}
        </TouchableOpacity>

        {lokasi && (
          <Text style={styles.koordinat}>
            📍 {alamat || `${lokasi.latitude.toFixed(5)}, ${lokasi.longitude.toFixed(5)}`}
          </Text>
        )}
      </View>

      <Text style={styles.subtitle}>🕓 Riwayat Check-In</Text>
      <FlatList
        data={riwayat}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <Text style={styles.kosong}>Belum ada riwayat check-in.</Text>
        }
      />

      <Modal visible={primingVisible} transparent animationType="fade">
        <View style={styles.primingOverlay}>
          <View style={styles.primingCard}>
            <Text style={styles.primingIcon}>
              {primingJenis === 'kamera' ? '📸' : '📍'}
            </Text>
            <Text style={styles.primingTitle}>
              {primingJenis === 'kamera' ? 'Izin Kamera Dibutuhkan' : 'Izin Lokasi Dibutuhkan'}
            </Text>
            <Text style={styles.primingDesc}>
              {primingJenis === 'kamera'
                ? 'Check-In App perlu akses kamera untuk mengambil foto selfie sebagai bukti kehadiranmu. Foto hanya dipakai di dalam aplikasi ini.'
                : 'Check-In App perlu akses lokasi untuk mencatat koordinat & nama tempat saat kamu check-in. Lokasi hanya diambil saat kamu menekan tombol check-in.'}
            </Text>
            <TouchableOpacity style={styles.primingBtnLanjut} onPress={lanjutkanPriming}>
              <Text style={styles.btnText}>Lanjutkan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primingBtnBatal} onPress={batalPriming}>
              <Text style={styles.primingBtnBatalText}>Nanti Saja</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center', paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  subtitle: { fontSize: 16, fontWeight: '600', marginTop: 20, marginBottom: 8, alignSelf: 'flex-start', marginLeft: '7.5%' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', width: '85%', elevation: 3 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 16 },
  avatarKosong: { backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#00b894', borderStyle: 'dashed' },
  btn: { backgroundColor: '#0984e3', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, marginTop: 12, width: '80%' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 15, textAlign: 'center' },
  koordinat: { marginTop: 12, fontSize: 13, color: '#0984e3', fontWeight: '600', textAlign: 'center' },
  list: { width: '85%', marginTop: 8 },
  itemRiwayat: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 2, alignItems: 'center' },
  thumbnail: { width: 50, height: 50, borderRadius: 25 },
  itemWaktu: { fontWeight: 'bold', fontSize: 13, color: '#0a2e0a' },
  itemAlamat: { fontSize: 12, color: '#555', marginTop: 2 },
  btnHapus: { padding: 8, marginLeft: 8 },
  btnHapusText: { fontSize: 18 },
  kosong: { color: '#999', marginTop: 20, fontStyle: 'italic' },
  primingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  primingCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%', alignItems: 'center' },
  primingIcon: { fontSize: 40, marginBottom: 8 },
  primingTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  primingDesc: { fontSize: 13, color: '#555', textAlign: 'center', lineHeight: 19, marginBottom: 18 },
  primingBtnLanjut: { backgroundColor: '#00b894', borderRadius: 8, paddingVertical: 12, width: '100%', marginBottom: 8 },
  primingBtnBatal: { paddingVertical: 8 },
  primingBtnBatalText: { color: '#888', fontSize: 13 },
});