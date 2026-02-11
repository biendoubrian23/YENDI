import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TICKET_WIDTH = SCREEN_WIDTH - 40;

interface TicketData {
  ticketId: string;
  seatNumber: number;
  passengerName: string;
  passengerPhone: string;
}

export default function ETicketScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const params = route.params || {};
  const flatListRef = useRef<FlatList>(null);
  
  // Déterminer si on vient de MyTicketsScreen (pour le comportement de fermeture)
  const fromMyTickets = params.fromMyTickets || false;
  
  // Données par défaut si on arrive depuis MyTicketsScreen
  const trip = params.trip || { company: 'Général Express', departureTime: '06:00', arrivalTime: '09:30' };
  const from = params.from || params.departureCity || 'Douala';
  const to = params.to || params.arrivalCity || 'Yaoundé';
  const date = params.date || params.departureDate || 'Ven 14 Juin, 2026';
  const departureLocation = params.departureLocation || 'Gare routière';
  const arrivalLocation = params.arrivalLocation || 'Gare routière';

  // Support pour plusieurs billets ou un seul
  const tickets: TicketData[] = params.tickets || [{
    ticketId: params.ticketId || '#TR88392',
    seatNumber: params.seatNumber || params.seat || 4,
    passengerName: params.passengerName || params.passenger || 'Passager',
    passengerPhone: params.passengerPhone || '',
  }];

  const [currentIndex, setCurrentIndex] = useState(0);

  const handleShare = async () => {
    const ticket = tickets[currentIndex];
    try {
      await Share.share({
        message: `🎫 Mon billet YENDI\n\n📍 ${from} → ${to}\n🚌 ${trip.company || params.agencyName}\n📅 ${date}\n🕐 ${trip.departureTime || params.departureTime}\n💺 Siège ${ticket.seatNumber}\n👤 ${ticket.passengerName}\n🎫 ${ticket.ticketId}`,
      });
    } catch (e) {}
  };

  const handlePDF = () => {
    Alert.alert('PDF', `${tickets.length} billet(s) PDF seront téléchargés (fonctionnalité à venir).`);
  };

  const handleClose = () => {
    // Si on vient de MyTicketsScreen, retour en arrière
    // Sinon, retour à l'accueil (après un paiement)
    if (fromMyTickets) {
      navigation.goBack();
    } else {
      navigation.popToTop();
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const renderTicket = ({ item: ticket, index }: { item: TicketData; index: number }) => (
    <View style={[styles.ticketContainer, { width: TICKET_WIDTH }]}>
      {/* ══════ TICKET CARD ══════ */}
      <View style={styles.ticketWrapper}>
        {/* ── Top part: gradient with trip info ── */}
        <View style={styles.ticketTopSection}>
          <View style={styles.ticketTop}>
            {/* Company & Date */}
            <View style={styles.ticketHeader}>
              <View style={styles.companyBadge}>
                <Text style={styles.companyBadgeText}>{trip.company || params.agencyName}</Text>
              </View>
              <Text style={styles.ticketDate}>{date}</Text>
            </View>

            {/* Departure */}
            <View style={styles.routePoint}>
              <View style={styles.dotOutline} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.cityText}>{from}, {departureLocation}</Text>
                <Text style={styles.timeText}>{trip.departureTime || params.departureTime}</Text>
              </View>
            </View>

            {/* Connector line */}
            <View style={styles.connectorLine} />

            {/* Arrival */}
            <View style={styles.routePoint}>
              <View style={styles.dotFilled}>
                <Ionicons name="location" size={11} color="#fff" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.cityText}>{to}, {arrivalLocation}</Text>
                <Text style={styles.timeText}>{trip.arrivalTime}</Text>
              </View>
            </View>

            {/* Passenger info boxes */}
            <View style={styles.infoRow}>
              <View style={[styles.infoBox, { flex: 1.3 }]}>
                <Text style={styles.infoLabel}>PASSAGER</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{ticket.passengerName}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>SIÈGE</Text>
                <Text style={styles.infoValue}>{ticket.seatNumber}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>TYPE</Text>
                <Text style={styles.infoValue}>{trip.type || 'Direct'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Dashed separator with cutouts ── */}
        <View style={styles.separatorRow}>
          <View style={[styles.cutout, styles.cutoutLeft]} />
          <View style={styles.dashedLine} />
          <View style={[styles.cutout, styles.cutoutRight]} />
        </View>

        {/* ── Bottom part: QR code ── */}
        <View style={styles.ticketBottom}>
          <View style={styles.qrPlaceholder}>
            <Ionicons name="qr-code" size={120} color={Colors.text} />
          </View>
          <Text style={styles.qrHint}>Scannez ce code à l'embarquement</Text>
          <Text style={styles.ticketIdText}>ID: {ticket.ticketId}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={['#4F46E5', '#6C63FF']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {tickets.length > 1 ? 'BILLETS E-TICKET' : 'BILLET E-TICKET'}
          </Text>
          {tickets.length > 1 && (
            <Text style={styles.headerSubtitle}>
              {currentIndex + 1} / {tickets.length}
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Tickets Carousel ── */}
      <FlatList
        ref={flatListRef}
        data={tickets}
        renderItem={renderTicket}
        keyExtractor={(item) => item.ticketId}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={TICKET_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={styles.carouselContent}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />

      {/* ── Pagination dots ── */}
      {tickets.length > 1 && (
        <View style={styles.pagination}>
          {tickets.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}

      {/* ── Bottom Actions ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={handlePDF}>
          <View style={styles.actionIconCircle}>
            <Ionicons name="download-outline" size={20} color="#4F46E5" />
          </View>
          <Text style={styles.actionBtnText}>
            {tickets.length > 1 ? `${tickets.length} PDFs` : 'PDF'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <View style={styles.actionIconCircle}>
            <Ionicons name="share-social-outline" size={20} color="#4F46E5" />
          </View>
          <Text style={styles.actionBtnText}>Partager</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  carouselContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  ticketContainer: {
    paddingBottom: 20,
  },

  /* Ticket wrapper — holds top + separator + bottom as one visual card */
  ticketWrapper: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderRadius: 24,
    overflow: 'hidden',
  },

  /* Top section */
  ticketTopSection: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  ticketTop: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 24,
    backgroundColor: '#fff',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  companyBadge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  companyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  ticketDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  /* Route */
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotOutline: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#4F46E5',
    backgroundColor: 'transparent',
  },
  connectorLine: {
    width: 2.5,
    height: 20,
    backgroundColor: '#D4D4DE',
    marginLeft: 6,
    marginVertical: 4,
  },
  dotFilled: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -3,
  },
  cityText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  timeText: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
  },

  /* Info boxes (Passager / Siège / Quai) */
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#F4F4FA',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDEDF5',
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },

  /* Dashed separator */
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    height: 28,
    position: 'relative',
  },
  dashedLine: {
    flex: 1,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E0E0EA',
    marginHorizontal: 18,
  },
  cutout: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    position: 'absolute',
    top: 2,
  },
  cutoutLeft: {
    left: -12,
  },
  cutoutRight: {
    right: -12,
  },

  /* Bottom section (QR) */
  ticketBottom: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 28,
  },
  qrPlaceholder: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E8E8F0',
    marginBottom: 14,
  },
  qrHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  ticketIdText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 8,
  },

  /* Pagination */
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 24,
  },

  /* Bottom actions */
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 48,
    paddingTop: 14,
    backgroundColor: 'transparent',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 6,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
});
