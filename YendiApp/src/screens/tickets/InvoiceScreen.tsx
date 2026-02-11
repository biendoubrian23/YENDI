import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants/colors';

export default function InvoiceScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const reservation = route.params?.reservation;

  // Formater la date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Générer un numéro de facture basé sur l'ID de réservation
  const invoiceNumber = reservation?.reservation_id 
    ? `INV-${reservation.reservation_id.substring(0, 6).toUpperCase()}`
    : 'INV-000000';

  // Données de la facture
  const invoiceData = {
    date: formatDate(reservation?.reserved_at),
    invoiceNumber,
    route: `${reservation?.departure_city || 'Départ'} → ${reservation?.arrival_city || 'Arrivée'}`,
    passenger: reservation?.passenger_name || 'Passager',
    paymentMethod: 'Mobile Money ●●●● 7890', // À récupérer si stocké
    price: reservation?.price || 0,
  };

  const handleEmail = () => {
    Alert.alert('Email', 'La facture sera envoyée par email.');
  };

  const handleDownload = () => {
    Alert.alert('Télécharger', 'La facture PDF sera téléchargée.');
  };

  // Formater le prix
  const formatPrice = (price: number) => {
    return price.toLocaleString('fr-FR') + ' FCFA';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Détails de la facture</Text>
          <TouchableOpacity style={styles.shareBtn}>
            <Ionicons name="share-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerDivider} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Unified Invoice Card */}
        <View style={styles.unifiedCard}>
          {/* Success icon inside card */}
          <View style={styles.successSection}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
            </View>
            <Text style={styles.successTitle}>Paiement réussi</Text>
            <Text style={styles.successDate}>Le {invoiceData.date}</Text>
          </View>

          <View style={styles.sectionDivider} />

          {/* Invoice Details */}
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>N° Facture</Text>
            <Text style={styles.invoiceValue}>{invoiceData.invoiceNumber}</Text>
          </View>
          <View style={styles.invoiceDivider} />
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Trajet</Text>
            <Text style={styles.invoiceValue}>{invoiceData.route}</Text>
          </View>
          <View style={styles.invoiceDivider} />
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Passager</Text>
            <Text style={styles.invoiceValue}>{invoiceData.passenger}</Text>
          </View>
          <View style={styles.invoiceDivider} />
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Siège</Text>
            <Text style={styles.invoiceValue}>N° {reservation?.seat_number || '-'}</Text>
          </View>
          <View style={styles.invoiceDivider} />
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Agence</Text>
            <Text style={styles.invoiceValue}>{reservation?.agency_name || '-'}</Text>
          </View>
          <View style={styles.invoiceDivider} />
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Moyen de paiement</Text>
            <Text style={styles.invoiceValue}>{invoiceData.paymentMethod}</Text>
          </View>

          <View style={styles.sectionDivider} />

          {/* Line Items */}
          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>Billet Standard (x1)</Text>
            <Text style={styles.itemPrice}>{formatPrice(invoiceData.price)}</Text>
          </View>

          <View style={styles.totalDivider} />
          <View style={styles.itemRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(invoiceData.price)}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.emailBtn} onPress={handleEmail}>
            <Text style={styles.emailBtnText}>Envoyer par Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
            <Text style={styles.downloadBtnText}>Télécharger</Text>
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
  headerWrapper: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
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
  shareBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  successSection: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  successIcon: {
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.success,
  },
  successDate: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  unifiedCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: Spacing.lg,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  invoiceLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  invoiceValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: Colors.gray100,
  },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  itemLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  itemPrice: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  totalDivider: {
    height: 2,
    backgroundColor: Colors.gray200,
    marginVertical: Spacing.sm,
  },
  totalLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  totalValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  emailBtn: {
    flex: 1,
    height: 50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  downloadBtn: {
    flex: 1,
    height: 50,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
});
