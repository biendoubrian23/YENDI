import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function PersonalInfoScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { clientProfile, user, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  // Récupérer le nom avec fallback sur user_metadata
  const getFullName = () => {
    const name = clientProfile?.full_name || user?.user_metadata?.full_name;
    if (name && name !== 'Client') return name;
    return '';
  };

  // Séparer le nom complet en prénom/nom
  const nameParts = getFullName().split(' ');
  const [firstName, setFirstName] = useState(nameParts[0] || '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '');
  const [email] = useState(clientProfile?.email || user?.email || '');
  const [phone, setPhone] = useState(clientProfile?.phone || '');
  const [birthDate, setBirthDate] = useState<Date | null>(
    clientProfile?.date_of_birth ? new Date(clientProfile.date_of_birth) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Formater la date pour l'affichage
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Gestionnaire de changement de date
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert('Erreur', 'Le prénom est requis.');
      return;
    }
    
    setSaving(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    
    // Formater la date pour la BD (YYYY-MM-DD)
    const dateForDB = birthDate ? birthDate.toISOString().split('T')[0] : null;
    
    const { error } = await supabase
      .from('clients')
      .update({
        full_name: fullName,
        phone: phone || null,
        date_of_birth: dateForDB,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user?.id);

    setSaving(false);
    if (error) {
      console.error('Erreur update:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour vos informations.');
    } else {
      await refreshProfile();
      Alert.alert('Succès', 'Vos informations ont été mises à jour.');
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Infos Personnelles</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color={Colors.primary} />
          </View>
          <TouchableOpacity style={styles.cameraBtn}>
            <Ionicons name="camera" size={14} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Mise à jour de votre photo</Text>
        </View>

        {/* Form */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>PRÉNOM</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={18} color={Colors.gray400} />
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>NOM</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <View style={[styles.inputContainer, styles.inputDisabled]}>
            <Ionicons name="mail-outline" size={18} color={Colors.gray400} />
            <TextInput
              style={styles.input}
              value={email}
              editable={false}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>TÉLÉPHONE</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={18} color={Colors.gray400} />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>DATE DE NAISSANCE</Text>
          <TouchableOpacity 
            style={styles.inputContainer}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={18} color={Colors.gray400} />
            <Text style={[styles.input, !birthDate && styles.placeholderText]}>
              {birthDate ? formatDate(birthDate) : 'Sélectionner une date'}
            </Text>
            <Ionicons name="calendar" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <View>
            {Platform.OS === 'ios' && (
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerDone}>Terminé</Text>
                </TouchableOpacity>
              </View>
            )}
            <DateTimePicker
              value={birthDate || new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1920, 0, 1)}
              locale="fr-FR"
            />
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity 
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Enregistrer les modifications</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${Colors.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 28,
    right: '35%',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatarHint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  halfField: {
    flex: 1,
  },
  field: {
    marginBottom: Spacing.xl,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    height: 52,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  inputDisabled: {
    backgroundColor: Colors.gray50,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  bottomBar: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  saveBtn: {
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  placeholderText: {
    color: Colors.gray400,
    fontWeight: '400',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  datePickerDone: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.primary,
  },
});
