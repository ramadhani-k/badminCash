import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  SafeAreaView,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  getMasterPlayers,
  saveMasterPlayers,
  DEFAULT_MASTER_PLAYERS,
  createBackupJSON,
  restoreFromBackupJSON,
} from '@/services/storage';
import { OliveTheme, Spacing } from '@/constants/theme';

export default function MasterBackupScreen() {
  const [masterPlayers, setMasterPlayers] = useState<string[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadMasterData = useCallback(async () => {
    const list = await getMasterPlayers();
    setMasterPlayers(list);
  }, []);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleAddPlayer = async () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    if (masterPlayers.includes(trimmed)) {
      showToast('Nama sudah ada di daftar');
      return;
    }
    const updated = [...masterPlayers, trimmed];
    setMasterPlayers(updated);
    await saveMasterPlayers(updated);
    setNewPlayerName('');
    showToast(`"${trimmed}" ditambahkan ke master`);
  };

  const handleStartEdit = (index: number, currentName: string) => {
    setEditingIndex(index);
    setEditName(currentName);
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    const updated = [...masterPlayers];
    updated[editingIndex] = trimmed;
    setMasterPlayers(updated);
    await saveMasterPlayers(updated);
    setEditingIndex(null);
    setEditName('');
    showToast('Nama berhasil diubah');
  };

  const handleDeletePlayer = async (index: number) => {
    const name = masterPlayers[index];
    const doDelete = async () => {
      const updated = masterPlayers.filter((_, i) => i !== index);
      setMasterPlayers(updated);
      await saveMasterPlayers(updated);
      showToast(`"${name}" dihapus dari master`);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Hapus "${name}" dari daftar master?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Hapus Pemain', `Hapus "${name}" dari daftar master?`, [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleResetDefault = async () => {
    const doReset = async () => {
      setMasterPlayers(DEFAULT_MASTER_PLAYERS);
      await saveMasterPlayers(DEFAULT_MASTER_PLAYERS);
      showToast('Master player direset ke bawaan');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Reset daftar master ke daftar awal bawaan?')) {
        doReset();
      }
    } else {
      Alert.alert('Reset Master', 'Reset daftar master ke daftar awal bawaan?', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: doReset },
      ]);
    }
  };

  const handleExportBackup = async () => {
    try {
      const jsonStr = await createBackupJSON();
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(jsonStr);
        showToast('✅ Backup JSON disalin ke clipboard!');
      } else {
        const cacheDir = (FileSystem as Record<string, any>).cacheDirectory || (FileSystem as Record<string, any>).documentDirectory;
        if (cacheDir) {
          const fileUri = cacheDir + 'badmin_backup.json';
          await FileSystem.writeAsStringAsync(fileUri, jsonStr);
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri);
            return;
          }
        }
        await Clipboard.setStringAsync(jsonStr);
        showToast('✅ Backup JSON disalin ke clipboard!');
      }
    } catch (e) {
      console.error(e);
      await Clipboard.setStringAsync(await createBackupJSON());
      showToast('✅ Backup JSON disalin ke clipboard!');
    }
  };

  const handleImportText = async () => {
    if (!importJsonText.trim()) return;
    const success = await restoreFromBackupJSON(importJsonText.trim());
    if (success) {
      setIsImportModalOpen(false);
      setImportJsonText('');
      await loadMasterData();
      showToast('✅ Data berhasil dipulihkan!');
    } else {
      showToast('❌ Format JSON backup tidak valid');
    }
  };

  const handleImportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
        const success = await restoreFromBackupJSON(fileContent);
        if (success) {
          setIsImportModalOpen(false);
          await loadMasterData();
          showToast('✅ Data dari file berhasil dipulihkan!');
        } else {
          showToast('❌ Format file JSON tidak valid');
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal membaca file backup');
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Title */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>👥 Master Pemain & Backup</Text>
          <Text style={styles.headerSubtitle}>
            Kelola daftar nama pemain langganan & ekspor/impor cadangan data
          </Text>
        </View>

        {/* Master Player List Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Daftar Nama Master ({masterPlayers.length})
            </Text>
            <TouchableOpacity style={styles.resetBtn} onPress={handleResetDefault}>
              <Text style={styles.resetBtnText}>Reset Bawaan</Text>
            </TouchableOpacity>
          </View>

          {/* Add Form */}
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newPlayerName}
              onChangeText={setNewPlayerName}
              placeholder="Tambah nama pemain..."
              placeholderTextColor={OliveTheme.textMuted}
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddPlayer}>
              <Text style={styles.addBtnText}>+ Tambah</Text>
            </TouchableOpacity>
          </View>

          {/* Master Player Items */}
          {masterPlayers.map((name, index) => (
            <View key={index} style={styles.playerRow}>
              {editingIndex === index ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={styles.editInput}
                    value={editName}
                    onChangeText={setEditName}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                    <Text style={styles.saveBtnText}>Simpan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setEditingIndex(null)}>
                    <Text style={styles.cancelBtnText}>Batal</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.playerName}>{name}</Text>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleStartEdit(index, name)}>
                      <Text style={styles.editIconText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleDeletePlayer(index)}>
                      <Text style={styles.deleteIconText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))}
        </View>

        {/* Backup & Restore Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>💾 Backup & Restore Data</Text>
          <Text style={styles.sectionDescription}>
            Amankan data Anda jika berpindah HP atau tidak sengaja menghapus aplikasi.
          </Text>

          <View style={styles.backupBtnGroup}>
            <TouchableOpacity style={styles.exportBtn} onPress={handleExportBackup}>
              <Text style={styles.exportBtnText}>📤 Backup Data (Ekspor)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.importBtn}
              onPress={() => setIsImportModalOpen(true)}>
              <Text style={styles.importBtnText}>📥 Restore Data (Impor)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Toast */}
      {toastMessage && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Restore Modal */}
      <Modal
        visible={isImportModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsImportModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Restore / Impor Data</Text>
              <TouchableOpacity onPress={() => setIsImportModalOpen(false)}>
                <Text style={styles.modalCloseText}>Tutup ✕</Text>
              </TouchableOpacity>
            </View>

            {Platform.OS !== 'web' && (
              <TouchableOpacity style={styles.filePickBtn} onPress={handleImportFile}>
                <Text style={styles.filePickBtnText}>📁 Pilih File JSON Backup</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.modalSubTitle}>Atau Tempel Teks Backup JSON:</Text>
            <TextInput
              style={styles.jsonInput}
              multiline
              numberOfLines={6}
              value={importJsonText}
              onChangeText={setImportJsonText}
              placeholder="Paste teks JSON backup di sini..."
              placeholderTextColor={OliveTheme.textMuted}
            />

            <TouchableOpacity style={styles.applyRestoreBtn} onPress={handleImportText}>
              <Text style={styles.applyRestoreBtnText}>Pulihkan Data Sekarang</Text>
            </TouchableOpacity>
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
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: OliveTheme.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: OliveTheme.textMuted,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: OliveTheme.card,
    borderRadius: 20,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: OliveTheme.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: OliveTheme.text,
  },
  resetBtn: {
    backgroundColor: OliveTheme.background,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: OliveTheme.border,
  },
  resetBtnText: {
    fontSize: 12,
    color: OliveTheme.textMuted,
    fontWeight: '600',
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.three,
  },
  addInput: {
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
  addBtn: {
    backgroundColor: OliveTheme.primary,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3E6',
  },
  playerName: {
    fontSize: 16,
    color: OliveTheme.text,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    padding: 4,
  },
  editIconText: {
    fontSize: 16,
  },
  deleteIconText: {
    fontSize: 16,
  },
  editRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
    alignItems: 'center',
  },
  editInput: {
    flex: 1,
    backgroundColor: OliveTheme.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    borderWidth: 1,
    borderColor: OliveTheme.primary,
    color: OliveTheme.text,
  },
  saveBtn: {
    backgroundColor: OliveTheme.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  cancelBtn: {
    backgroundColor: OliveTheme.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: OliveTheme.border,
  },
  cancelBtnText: {
    color: OliveTheme.textMuted,
    fontSize: 13,
  },
  sectionDescription: {
    fontSize: 13,
    color: OliveTheme.textMuted,
    marginTop: 4,
    marginBottom: Spacing.three,
  },
  backupBtnGroup: {
    gap: Spacing.two,
  },
  exportBtn: {
    backgroundColor: OliveTheme.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  importBtn: {
    backgroundColor: OliveTheme.cardSecondary,
    borderWidth: 1,
    borderColor: OliveTheme.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  importBtnText: {
    color: OliveTheme.primaryDark,
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
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  filePickBtn: {
    backgroundColor: OliveTheme.cardSecondary,
    borderWidth: 1,
    borderColor: OliveTheme.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  filePickBtnText: {
    color: OliveTheme.primaryDark,
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalSubTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: OliveTheme.textMuted,
    marginBottom: 8,
  },
  jsonInput: {
    backgroundColor: OliveTheme.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: OliveTheme.border,
    color: OliveTheme.text,
    textAlignVertical: 'top',
    height: 120,
    marginBottom: Spacing.three,
  },
  applyRestoreBtn: {
    backgroundColor: OliveTheme.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyRestoreBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
