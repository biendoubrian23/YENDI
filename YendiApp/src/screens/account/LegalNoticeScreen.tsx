import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants/colors';

const sections = [
  {
    title: 'Éditeur de l\'application',
    icon: 'business-outline' as const,
    items: [
      { label: 'Société', value: 'YENDI SAS' },
      { label: 'Siège social', value: 'Douala, Cameroun' },
      { label: 'RCCM', value: 'RC/DLA/2024/B/XXXX' },
      { label: 'Email', value: 'contact@yendi.cm', link: 'mailto:contact@yendi.cm' },
      { label: 'Téléphone', value: '+237 699 000 000', link: 'tel:+237699000000' },
    ],
  },
  {
    title: 'Conditions générales d\'utilisation',
    icon: 'document-text-outline' as const,
    content: `En utilisant l'application YENDI, vous acceptez les présentes conditions générales d'utilisation.

YENDI est une plateforme de réservation de billets de bus inter-urbains. L'application permet aux voyageurs de rechercher, comparer et réserver des trajets proposés par des agences de transport partenaires.

L'utilisateur s'engage à :
• Fournir des informations exactes lors de l'inscription
• Ne pas utiliser l'application à des fins frauduleuses  
• Respecter les conditions de voyage des agences partenaires
• Ne pas revendre ou transférer ses billets sans autorisation

YENDI se réserve le droit de suspendre tout compte en cas de violation de ces conditions.`,
  },
  {
    title: 'Politique de confidentialité',
    icon: 'shield-checkmark-outline' as const,
    content: `YENDI s'engage à protéger vos données personnelles conformément à la réglementation en vigueur au Cameroun.

Données collectées :
• Informations d'identification (nom, prénom, téléphone, email)
• Données de réservation (trajets, dates, paiements)
• Données de localisation (avec votre consentement)
• Code de parrainage et historique de bonus

Utilisation des données :
• Gestion de vos réservations et billets
• Amélioration de nos services
• Communication sur vos voyages
• Système de parrainage et rewards

Vos données ne sont jamais vendues à des tiers. Elles sont conservées de manière sécurisée et vous pouvez demander leur suppression à tout moment en contactant support@yendi.cm.`,
  },
  {
    title: 'Politique d\'annulation et remboursement',
    icon: 'refresh-outline' as const,
    content: `Vous pouvez annuler votre réservation directement depuis l'application. Le montant du remboursement dépend du délai avant le départ :

Barème de remboursement :
• 7 jours ou plus avant le départ : remboursement à 100%
• Entre 3 et 7 jours avant le départ : remboursement à 90%
• Moins de 3 jours avant le départ : remboursement à 70%

Modalités :
• Le remboursement est crédité instantanément sur votre solde portefeuille (solde remboursement)
• Le solde remboursement est utilisable pour toute future réservation
• En cas d'annulation par l'agence : remboursement intégral (100%)
• Un trajet déjà passé ne peut pas être annulé

Bonus de parrainage :
• Le bonus de parrainage (200 FCFA par parrainage) est comptabilisé séparément
• Le bonus n'est utilisable qu'à partir de 5 000 FCFA cumulés
• Le bonus de parrainage n'est pas remboursable en cas d'annulation`,
  },
  {
    title: 'Propriété intellectuelle',
    icon: 'ribbon-outline' as const,
    content: `L'ensemble du contenu de l'application YENDI (logos, textes, graphiques, interfaces, code source) est protégé par le droit de la propriété intellectuelle.

Toute reproduction, représentation, modification ou distribution, même partielle, du contenu de l'application sans autorisation préalable écrite de YENDI SAS est strictement interdite.

Les marques et logos des agences partenaires restent la propriété de leurs détenteurs respectifs.`,
  },
];

export default function LegalNoticeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const handleLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mentions légales</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Dernière mise à jour */}
        <View style={styles.updateBadge}>
          <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
          <Text style={styles.updateText}>Dernière mise à jour : Janvier 2025</Text>
        </View>

        {/* Sections */}
        {sections.map((section, index) => (
          <View key={index} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Ionicons name={section.icon} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            {section.items ? (
              <View style={styles.itemsList}>
                {section.items.map((item, i) => (
                  <View key={i} style={styles.itemRow}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    {item.link ? (
                      <TouchableOpacity onPress={() => handleLink(item.link!)}>
                        <Text style={[styles.itemValue, styles.itemLink]}>{item.value}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.itemValue}>{item.value}</Text>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.sectionContent}>{section.content}</Text>
            )}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pour toute question relative à ces mentions légales, contactez-nous à{' '}
          </Text>
          <TouchableOpacity onPress={() => handleLink('mailto:legal@yendi.cm')}>
            <Text style={styles.footerLink}>legal@yendi.cm</Text>
          </TouchableOpacity>
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
    marginBottom: Spacing.md,
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
  updateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
  },
  updateText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  // Section Cards
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionContent: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  // Items list (pour la section Éditeur)
  itemsList: {
    gap: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  itemValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
  itemLink: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  // Footer
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  footerText: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    textAlign: 'center',
  },
  footerLink: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
