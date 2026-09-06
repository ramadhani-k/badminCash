import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  getCurrentSession,
  saveCurrentSession,
  getMasterPlayers,
  formatRecapText,
  SessionData,
  Participant,
} from '@/services/storage';
import { OliveTheme, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const [session, setSession] = useState<SessionData>({ date: '', participants: [] });
  const [masterPlayers, setMasterPlayers] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const loadedSession = await getCurrentSession();
    const loadedMasters = await getMasterPlayers();
    setSession(loadedSession);
    setMasterPlayers(loadedMasters);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateAndSaveSession = async (updated: SessionData) => {
    setSession(updated);
    await saveCurrentSession(updated);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const togglePayment = async (id: string) => {
    const updatedParticipants = session.participants.map((p) =>
      p.id === id ? { ...p, paid: !p.paid } : p
    );
    await updateAndSaveSession({ ...session, participants: updatedParticipants });
  };

  const removeParticipant = async (id: string) => {
    const updatedParticipants = session.participants.filter((p) => p.id !== id);
    await updateAndSaveSession({ ...session, participants: updatedParticipants });
  };

  const addParticipantByName = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newParticipant: Participant = {
      id: Date.now().toString() + Math.random().toString().slice(2, 6),
      name: trimmed,
      paid: false,
    };
    const updatedParticipants = [...session.participants, newParticipant];
    await updateAndSaveSession({ ...session, participants: updatedParticipants });
  };

  const handleAddCustomPlayer = async () => {
    if (!customName.trim()) return;
    await addParticipantByName(customName.trim());
    setCustomName('');
    showToast(`Pemain "${customName.trim()}" ditambahkan`);
  };

  const handleAddMasterPlayer = async (name: string) => {
    await addParticipantByName(name);
    showToast(`Pemain "${name}" ditambahkan`);
  };

  const handleCopyRecap = async () => {
    const recapText = formatRecapText(session);
    await Clipboard.setStringAsync(recapText);
    showToast('✅ Teks rekap berhasil disalin!');
  };

  const handleNewSession = () => {
    const doReset = async () => {
      const emptySession: SessionData = {
        date: session.date,
        participants: [],
      };
      await updateAndSaveSession(emptySession);
      showToast('Sesi baru telah dibuat');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Buat sesi baru? Daftar pemain yang ada akan dikosongkan.')) {
        doReset();
      }
    } else {
      Alert.alert(
        'Buat Sesi Baru',
        'Daftar pemain sesi ini akan dikosongkan. Lanjutkan?',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Ya, Buat Baru', style: 'destructive', onPress: doReset },
        ]
      );
    }
  };

  const recapPreview = formatRecapText(session);
  const totalCount = session.participants.length;
  const paidCount = session.participants.filter((p) => p.paid).length;
  const isAllPaid = totalCount > 0 && paidCount === totalCount;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Title Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>🏸 Rekap Badminton</Text>
              <Text style={styles.headerSubtitle}>
                {paidCount} dari {totalCount} pemain sudah bayar
              </Text>
            </View>
            <TouchableOpacity style={styles.newSessionBtn} onPress={handleNewSession}>
              <Text style={styles.newSessionBtnText}>Sesi Baru</Text>
            </TouchableOpacity>
          </View>

          {/* Date Input */}
          <View style={styles.dateContainer}>
            <Text style={styles.label}>Tanggal Sesi:</Text>
            <TextInput
              style={styles.dateInput}
              value={session.date}
              onChangeText={(val) => updateAndSaveSession({ ...session, date: val })}
              placeholder="e.g. 30 Agustus 2026"
              placeholderTextColor={OliveTheme.textMuted}
            />
          </View>

          {/* Status Badge */}
          <View style={styles.statusBadgeRow}>
            <View
              style={[
                styles.statusBadge,
                isAllPaid ? styles.statusBadgeDone : styles.statusBadgePending,
              ]}>
              <Text
                style={[
                  styles.statusBadgeText,
                  isAllPaid ? styles.statusBadgeTextDone : styles.statusBadgeTextPending,
                ]}>
                {isAllPaid
                  ? `${session.date}: ${totalCount} orang ✅⏺️ selesai`
                  : `${session.date}: ${totalCount} orang ⏳`}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button to Open Add Player Modal */}
        <TouchableOpacity
          style={styles.addPlayerMainBtn}
          onPress={() => setIsAddModalOpen(true)}>
          <Text style={styles.addPlayerMainBtnText}>+ Tambah Pemain Sesi Ini</Text>
        </TouchableOpacity>

        {/* Participant List */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Daftar Pemain ({totalCount})
          </Text>

          {session.participants.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                Belum ada pemain di sesi ini.
              </Text>
              <Text style={styles.emptySubText}>
                Tekan tombol "+ Tambah Pemain" di atas untuk menambahkan dari daftar master atau tamu.
              </Text>
            </View>
          ) : (
            session.participants.map((p) => (
              <View key={p.id} style={styles.participantRow}>
                <TouchableOpacity
                  style={styles.participantTouchable}
                  onPress={() => togglePayment(p.id)}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      styles.checkbox,
                      p.paid ? styles.checkboxPaid : styles.checkboxUnpaid,
                    ]}>
                    <Text style={styles.checkboxIcon}>{p.paid ? '✓' : ''}</Text>
                  </View>
                  <Text
                    style={[
                      styles.participantName,
                      p.paid && styles.participantNamePaid,
                    ]}>
                    {p.name} {p.paid ? '✅' : ''}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => removeParticipant(p.id)}>
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Live Recap Preview Card */}
        <View style={styles.recapCard}>
          <Text style={styles.sectionTitle}>📋 Preview Teks Rekap Grup</Text>
          <View style={styles.recapBox}>
            <Text style={styles.recapText}>{recapPreview}</Text>
          </View>

          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyRecap}>
            <Text style={styles.copyBtnText}>Salin Teks Rekap 📋</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Toast Popup */}
      {toastMessage && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Modal Add Player */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Pemain Sesi</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.modalCloseText}>Tutup ✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              <Text style={styles.modalSubTitle}>Pilih dari Daftar Master:</Text>
              <View style={styles.chipsContainer}>
                {masterPlayers.map((name, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.chipBtn}
                    onPress={() => handleAddMasterPlayer(name)}>
                    <Text style={styles.chipBtnText}>+ {name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />

              <Text style={styles.modalSubTitle}>Atau Tambah Nama Custom / Tamu:</Text>
              <View style={styles.customInputRow}>
                <TextInput
                  style={styles.customInput}
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder="e.g. aldi 2, Budi"
                  placeholderTextColor={OliveTheme.textMuted}
                />
                <TouchableOpacity
                  style={styles.customAddBtn}
                  onPress={handleAddCustomPlayer}>
                  <Text style={styles.customAddBtnText}>Tambah</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: OliveTheme.background,
  },
  container: {
    padding: Spacing.three,
    paddingBottom: 100,
    gap: Spacing.three,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  headerCard: {
    backgroundColor: OliveTheme.card,
    borderRadius: 20,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: OliveTheme.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: OliveTheme.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: OliveTheme.textMuted,
    marginTop: 2,
  },
  newSessionBtn: {
    backgroundColor: OliveTheme.cardSecondary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: OliveTheme.border,
  },
  newSessionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: OliveTheme.primaryDark,
  },
  dateContainer: {
    marginBottom: Spacing.two,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: OliveTheme.textMuted,
    marginBottom: 4,
  },
  dateInput: {
    backgroundColor: OliveTheme.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: OliveTheme.text,
    borderWidth: 1,
    borderColor: OliveTheme.border,
    fontWeight: '600',
  },
  statusBadgeRow: {
    marginTop: Spacing.one,
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadgePending: {
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  statusBadgeDone: {
    backgroundColor: OliveTheme.badgeBg,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBadgeTextPending: {
    color: '#D84315',
  },
  statusBadgeTextDone: {
    color: OliveTheme.success,
  },
  addPlayerMainBtn: {
    backgroundColor: OliveTheme.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  addPlayerMainBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionCard: {
    backgroundColor: OliveTheme.card,
    borderRadius: 20,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: OliveTheme.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: OliveTheme.text,
    marginBottom: Spacing.three,
  },
  emptyBox: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: OliveTheme.textMuted,
  },
  emptySubText: {
    fontSize: 12,
    color: OliveTheme.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3E6',
  },
  participantTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxUnpaid: {
    borderColor: OliveTheme.border,
    backgroundColor: OliveTheme.background,
  },
  checkboxPaid: {
    borderColor: OliveTheme.success,
    backgroundColor: OliveTheme.success,
  },
  checkboxIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  participantName: {
    fontSize: 16,
    color: OliveTheme.text,
    fontWeight: '500',
  },
  participantNamePaid: {
    fontWeight: 'bold',
    color: OliveTheme.primaryDark,
  },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteBtnText: {
    color: '#D32F2F',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recapCard: {
    backgroundColor: OliveTheme.card,
    borderRadius: 20,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: OliveTheme.border,
  },
  recapBox: {
    backgroundColor: '#FAFCEF',
    borderRadius: 14,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: OliveTheme.border,
    marginBottom: Spacing.three,
  },
  recapText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    color: OliveTheme.text,
    lineHeight: 22,
  },
  copyBtn: {
    backgroundColor: OliveTheme.primaryDark,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  toast: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: '#273111',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.four,
    paddingBottom: Spacing.five,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: OliveTheme.text,
  },
  modalCloseText: {
    color: OliveTheme.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  modalSubTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: OliveTheme.textMuted,
    marginBottom: 8,
    marginTop: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.three,
  },
  chipBtn: {
    backgroundColor: OliveTheme.cardSecondary,
    borderWidth: 1,
    borderColor: OliveTheme.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  chipBtnText: {
    color: OliveTheme.text,
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: OliveTheme.border,
    marginVertical: Spacing.two,
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: Spacing.three,
  },
  customInput: {
    flex: 1,
    backgroundColor: OliveTheme.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: OliveTheme.border,
    color: OliveTheme.text,
  },
  customAddBtn: {
    backgroundColor: OliveTheme.primary,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customAddBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
