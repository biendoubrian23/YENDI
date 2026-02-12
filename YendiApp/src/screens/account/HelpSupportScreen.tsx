import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants/colors';

const faqItems = [
  {
    question: 'Comment réserver un trajet ?',
    answer:
      'Depuis l\'écran d\'accueil, sélectionnez votre ville de départ et d\'arrivée, choisissez une date, puis sélectionnez un trajet disponible. Vous pourrez ensuite choisir vos places et procéder au paiement.',
  },
  {
    question: 'Comment annuler une réservation ?',
    answer:
      'Rendez-vous dans "Mes Billets", sélectionnez la réservation concernée, puis appuyez sur "Annuler". Le remboursement dépend du délai avant le départ : 100% à 7+ jours, 90% entre 3 et 7 jours, 70% à moins de 3 jours. Le montant est crédité instantanément sur votre solde remboursement.',
  },
  {
    question: 'Comment utiliser mon solde bonus ?',
    answer:
      'Votre solde bonus de parrainage est utilisable uniquement lorsqu\'il atteint 5 000 FCFA cumulés. Le solde remboursement est utilisable immédiatement et sans minimum. Les deux soldes sont automatiquement proposés lors du paiement.',
  },
  {
    question: 'Comment fonctionne le parrainage ?',
    answer:
      'Partagez votre code de parrainage (disponible dans Compte > Parrainage). Quand un ami s\'inscrit avec votre code, vous recevez chacun 200 FCFA de bonus sur votre solde. Le bonus est utilisable à partir de 5 000 FCFA cumulés.',
  },
  {
    question: 'Puis-je modifier mes informations personnelles ?',
    answer:
      'Oui, allez dans Compte > Infos personnelles pour modifier votre nom, téléphone et date de naissance.',
  },
  {
    question: 'Que faire si mon paiement échoue ?',
    answer:
      'Vérifiez votre connexion internet et le solde de votre compte mobile money. Si le problème persiste, contactez notre support via le formulaire ci-dessous.',
  },
  {
    question: 'Quelle est la politique de remboursement ?',
    answer:
      '7 jours ou plus avant le départ : 100% remboursé. Entre 3 et 7 jours : 90%. Moins de 3 jours : 70%. Le remboursement est crédité instantanément sur votre solde portefeuille.',
  },
];

export default function HelpSupportScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendMessage = () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le sujet et le message.');
      return;
    }
    setSending(true);
    // Simuler l'envoi
    setTimeout(() => {
      setSending(false);
      setSubject('');
      setMessage('');
      Alert.alert(
        'Message envoyé ✓',
        'Notre équipe vous répondra dans les 24h par email. Merci pour votre patience !'
      );
    }, 1500);
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@yendi.cm?subject=Demande%20de%20support');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Aide & Support</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Contact rapide */}
        <Text style={styles.sectionTitle}>Nous contacter</Text>
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactCard} onPress={handleEmailSupport}>
            <View style={[styles.contactIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="mail" size={22} color="#2563EB" />
            </View>
            <Text style={styles.contactLabel}>Email</Text>
          </TouchableOpacity>
        </View>

        {/* FAQ */}
        <Text style={styles.sectionTitle}>Questions fréquentes</Text>
        <View style={styles.faqSection}>
          {faqItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.faqItem}
              onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Ionicons
                  name={expandedFaq === index ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.gray400}
                />
              </View>
              {expandedFaq === index && (
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Formulaire de contact */}
        <Text style={styles.sectionTitle}>Envoyer un message</Text>
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Sujet</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Ex: Problème de paiement"
            placeholderTextColor={Colors.gray400}
            value={subject}
            onChangeText={setSubject}
          />

          <Text style={styles.formLabel}>Message</Text>
          <TextInput
            style={[styles.formInput, styles.formTextarea]}
            placeholder="Décrivez votre problème en détail..."
            placeholderTextColor={Colors.gray400}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.sendBtn, (!subject.trim() || !message.trim()) && styles.sendBtnDisabled]}
            onPress={handleSendMessage}
            disabled={sending || !subject.trim() || !message.trim()}
          >
            {sending ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="send" size={18} color={Colors.white} />
                <Text style={styles.sendBtnText}>Envoyer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Horaires */}
        <View style={styles.hoursCard}>
          <Ionicons name="time-outline" size={20} color={Colors.primary} />
          <View style={styles.hoursInfo}>
            <Text style={styles.hoursTitle}>Horaires du support</Text>
            <Text style={styles.hoursText}>Lundi - Vendredi : 8h - 18h</Text>
            <Text style={styles.hoursText}>Samedi : 9h - 14h</Text>
            <Text style={styles.hoursText}>Dimanche : Fermé</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxxl + 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
    marginTop: Spacing.xl,
  },
  // Contact
  contactRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  contactCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  contactLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  // FAQ
  faqSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  faqItem: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginRight: Spacing.md,
  },
  faqAnswer: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: Spacing.md,
  },
  // Form
  formSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  formLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  formInput: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.gray100,
    height: 48,
  },
  formTextarea: {
    height: 120,
    paddingTop: Spacing.md,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xl,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.gray300,
  },
  sendBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
  // Hours
  hoursCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: '#F5F3FF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginTop: Spacing.xxl,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  hoursInfo: {
    flex: 1,
  },
  hoursTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  hoursText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
