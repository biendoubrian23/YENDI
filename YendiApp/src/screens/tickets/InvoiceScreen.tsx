import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function InvoiceScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const reservation = route.params?.reservation;
  const { refreshProfile } = useAuth();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelPreview, setCancelPreview] = useState<any>(null);
  const isCancelled = reservation?.status === 'annule';

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

  // Formater l'heure uniquement
  const formatTime = (dateString: string) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Douala',
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

  const handleCancelPress = async () => {
    // Prévisualiser le remboursement
    try {
      const { data, error } = await supabase.rpc('get_cancellation_preview', {
        p_reservation_id: reservation?.reservation_id,
      });
      if (error) {
        Alert.alert('Erreur', error.message);
        return;
      }
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result.success) {
        Alert.alert('Erreur', result.error || 'Impossible de calculer le remboursement.');
        return;
      }
      setCancelPreview(result);
      setShowCancelModal(true);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Une erreur est survenue.');
    }
  };

  const handleConfirmCancel = async () => {
    setCancelling(true);
    try {
      const { data, error } = await supabase.rpc('cancel_reservation', {
        p_reservation_id: reservation?.reservation_id,
      });
      if (error) {
        Alert.alert('Erreur', error.message);
        setCancelling(false);
        return;
      }
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result.success) {
        Alert.alert('Erreur', result.error || 'Annulation impossible.');
        setCancelling(false);
        return;
      }
      setShowCancelModal(false);
      setCancelling(false);
      // Rafraîchir le profil pour mettre à jour le solde
      await refreshProfile();
      Alert.alert(
        'Réservation annulée',
        `Votre réservation a été annulée.\n\nRemboursement de ${result.refund_amount.toLocaleString()} FCFA (${result.refund_percent}%) crédité sur votre solde.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Une erreur est survenue.');
      setCancelling(false);
    }
  };

  const handleDownload = () => {
    Alert.alert('Télécharger', 'La facture PDF sera téléchargée.');
  };

  const getRefundPolicyLabel = (percent: number) => {
    if (percent === 100) return '7+ jours avant le départ';
    if (percent === 90) return '3 à 7 jours avant le départ';
    return 'Moins de 3 jours avant le départ';
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
            <Text style={styles.invoiceLabel}>Départ</Text>
            <Text style={styles.invoiceValue}>{formatTime(reservation?.departure_datetime)}</Text>
          </View>
          <View style={styles.invoiceDivider} />
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Arrivée</Text>
            <Text style={styles.invoiceValue}>{formatTime(reservation?.arrival_datetime)}</Text>
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
          {!isCancelled ? (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelPress}>
              <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.cancelledBadge}>
              <Ionicons name="close-circle" size={18} color="#DC2626" />
              <Text style={styles.cancelledBadgeText}>Annulée</Text>
            </View>
          )}
          <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
            <Text style={styles.downloadBtnText}>Télécharger</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Confirmation Annulation */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <View style={styles.modalIconBg}>
                <Ionicons name="warning" size={36} color="#F59E0B" />
              </View>
            </View>

            <Text style={styles.modalTitle}>Annuler la réservation ?</Text>
            <Text style={styles.modalSubtitle}>Cette action est irréversible</Text>

            {cancelPreview && (
              <View style={styles.refundCard}>
                <Text style={styles.refundPolicyLabel}>
                  {getRefundPolicyLabel(cancelPreview.refund_percent)}
                </Text>
                
                <View style={styles.refundRow}>
                  <Text style={styles.refundLabel}>Prix payé</Text>
                  <Text style={styles.refundValue}>{cancelPreview.original_price.toLocaleString()} FCFA</Text>
                </View>
                <View style={styles.refundDivider} />
                <View style={styles.refundRow}>
                  <Text style={styles.refundLabel}>Taux de remboursement</Text>
                  <Text style={[styles.refundValue, { color: Colors.primary }]}>{cancelPreview.refund_percent}%</Text>
                </View>
                <View style={styles.refundDivider} />
                <View style={styles.refundRow}>
                  <Text style={[styles.refundLabel, { fontWeight: '700' }]}>Montant remboursé</Text>
                  <Text style={[styles.refundValue, { color: '#16A34A', fontWeight: '800', fontSize: FontSize.lg }]}>
                    {cancelPreview.refund_amount.toLocaleString()} FCFA
                  </Text>
                </View>

                <View style={styles.refundNote}>
                  <Ionicons name="information-circle" size={16} color={Colors.primary} />
                  <Text style={styles.refundNoteText}>
                    Le remboursement sera crédité sur votre solde portefeuille.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setShowCancelModal(false)}
                disabled={cancelling}
              >
                <Text style={styles.modalCancelBtnText}>Non, garder</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmBtn} 
                onPress={handleConfirmCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Oui, annuler</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  cancelBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#DC2626',
  },
  cancelledBadge: {
    flex: 1,
    height: 50,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#FEE2E2',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  cancelledBadgeText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#DC2626',
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
  // Modal Annulation
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  modalIconContainer: {
    marginBottom: Spacing.lg,
  },
  modalIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  refundCard: {
    width: '100%',
    backgroundColor: '#FAFAFA',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  refundPolicyLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  refundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  refundLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  refundValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  refundDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  refundNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  refundNoteText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  modalConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
});
