import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  FlatList,
  Dimensions,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants/colors';
import { mockOffers, cameroonCities } from '../../constants/mockData';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const CARD_OVERLAP = 60;

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { clientProfile, user } = useAuth();
  
  // Récupérer le prénom de l'utilisateur
  const getFirstName = () => {
    const fullName = clientProfile?.full_name || user?.user_metadata?.full_name || '';
    if (!fullName || fullName === 'Client') return 'Voyageur';
    return fullName.split(' ')[0];
  };
  
  const [departure, setDeparture] = useState('Douala');
  const [arrival, setArrival] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [passengerCount, setPassengerCount] = useState(1);

  const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const formatDate = (d: Date) => {
    const day = d.getDate();
    const month = MONTHS[d.getMonth()];
    return `${day} ${month}`;
  };

  const formatDateLong = (d: Date) => {
    const dayName = DAYS[d.getDay()];
    const day = d.getDate();
    const month = MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${dayName} ${day} ${month} ${year}`;
  };

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  // City picker modal
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [cityModalType, setCityModalType] = useState<'departure' | 'arrival'>('departure');
  const [citySearch, setCitySearch] = useState('');

  const filteredCities = cameroonCities.filter((city) =>
    city.toLowerCase().includes(citySearch.toLowerCase())
  );

  const openCityPicker = (type: 'departure' | 'arrival') => {
    setCityModalType(type);
    setCitySearch('');
    setCityModalVisible(true);
  };

  const selectCity = (city: string) => {
    if (cityModalType === 'departure') {
      setDeparture(city);
    } else {
      setArrival(city);
    }
    setCityModalVisible(false);
  };

  const incrementPassengers = () => {
    if (passengerCount < 10) setPassengerCount((p) => p + 1);
  };

  const decrementPassengers = () => {
    if (passengerCount > 1) setPassengerCount((p) => p - 1);
  };

  const handleSearch = () => {
    if (!arrival) return;
    navigation.navigate('TripResults', {
      from: departure,
      to: arrival,
      date: formatDateLong(selectedDate),
      dateISO: selectedDate.toISOString(),
      passengers: passengerCount,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Header gradient with rounded bottom */}
        <View style={styles.headerWrapper}>
          <LinearGradient
            colors={['#4338CA', '#5B4FE8', '#7C6FFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, { paddingTop: insets.top + 36 }]}
          >
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.greeting}>Bonjour, {getFirstName()}</Text>
                <Text style={styles.headerTitle}>Où allez-vous ?</Text>
              </View>
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color={Colors.white} />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Search Card - overlapping the header */}
        <View style={styles.searchCardContainer}>
          <View style={styles.searchCard}>
            {/* Departure */}
            <TouchableOpacity
              style={styles.searchRow}
              activeOpacity={0.7}
              onPress={() => openCityPicker('departure')}
            >
              <View style={[styles.searchIconWrapper, { backgroundColor: '#EEE8FF' }]}>
                <Ionicons name="location" size={18} color={Colors.primary} />
              </View>
              <View style={styles.searchInputWrapper}>
                <Text style={styles.searchLabel}>Départ</Text>
                <Text style={[styles.searchValue, !departure && styles.searchPlaceholder]}>
                  {departure || 'Ville de départ'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={Colors.gray400} />
            </TouchableOpacity>

            <View style={styles.searchDivider} />

            {/* Arrival */}
            <TouchableOpacity
              style={styles.searchRow}
              activeOpacity={0.7}
              onPress={() => openCityPicker('arrival')}
            >
              <View style={[styles.searchIconWrapper, { backgroundColor: '#E8F4FD' }]}>
                <Ionicons name="location-outline" size={18} color="#3B82F6" />
              </View>
              <View style={styles.searchInputWrapper}>
                <Text style={styles.searchLabel}>Arrivée</Text>
                <Text style={[styles.searchValue, !arrival && styles.searchPlaceholder]}>
                  {arrival || 'Ville de destination'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={Colors.gray400} />
            </TouchableOpacity>

            <View style={styles.searchDivider} />

            {/* Date & Passengers */}
            <View style={styles.datePassengerRow}>
              <TouchableOpacity
                style={styles.dateBox}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dateLabel}>Date</Text>
                <View style={styles.dateValueRow}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.dateValue}>{formatDate(selectedDate)}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.datePassengerDivider} />
              <View style={styles.passengerBox}>
                <Text style={styles.dateLabel}>Passagers</Text>
                <View style={styles.passengerControls}>
                  <TouchableOpacity
                    onPress={decrementPassengers}
                    style={[
                      styles.passengerBtn,
                      passengerCount <= 1 && styles.passengerBtnDisabled,
                    ]}
                    activeOpacity={0.7}
                    disabled={passengerCount <= 1}
                  >
                    <Ionicons
                      name="remove"
                      size={16}
                      color={passengerCount <= 1 ? Colors.gray300 : Colors.primary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.passengerCount}>{passengerCount}</Text>
                  <TouchableOpacity
                    onPress={incrementPassengers}
                    style={[
                      styles.passengerBtn,
                      passengerCount >= 10 && styles.passengerBtnDisabled,
                    ]}
                    activeOpacity={0.7}
                    disabled={passengerCount >= 10}
                  >
                    <Ionicons
                      name="add"
                      size={16}
                      color={passengerCount >= 10 ? Colors.gray300 : Colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Search Button */}
            <TouchableOpacity onPress={handleSearch} activeOpacity={0.85}>
              <LinearGradient
                colors={['#6C63FF', '#9B59B6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.searchButton}
              >
                <Ionicons name="search" size={18} color={Colors.white} />
                <Text style={styles.searchButtonText}>Rechercher</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Offres Spéciales */}
        <View style={styles.offersSection}>
          <Text style={styles.offersTitle}>Offres Spéciales</Text>
          <FlatList
            horizontal
            data={mockOffers}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.offersList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.offerCard}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('TripResults', {
                    from: item.from,
                    to: item.to,
                    date: formatDateLong(selectedDate),
                    passengers: passengerCount,
                  })
                }
              >
                <View style={styles.offerImageWrapper}>
                  <Image
                    source={{ uri: item.image }}
                    style={styles.offerImage}
                    resizeMode="cover"
                  />
                  {item.discount && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{item.discount}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.offerRoute}>
                  {item.from} → {item.to}
                </Text>
                <Text style={styles.offerPrice}>
                  À partir de <Text style={styles.offerPriceBold}>{item.price}</Text>
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={onDateChange}
        />
      )}

      {/* iOS Date Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModalContent}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.modalTitle}>Choisir une date</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={styles.modalClose}
                >
                  <Text style={styles.datePickerDone}>OK</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={onDateChange}
                locale="fr-FR"
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* City Picker Modal */}
      <Modal
        visible={cityModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: insets.top + 10 }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {cityModalType === 'departure' ? 'Ville de départ' : "Ville d'arrivée"}
              </Text>
              <TouchableOpacity
                onPress={() => setCityModalVisible(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchWrapper}>
              <Ionicons name="search" size={18} color={Colors.gray400} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Rechercher une ville..."
                placeholderTextColor={Colors.gray400}
                value={citySearch}
                onChangeText={setCitySearch}
                autoFocus
              />
            </View>

            {/* City List */}
            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.cityListContent}
              renderItem={({ item }) => {
                const isSelected =
                  (cityModalType === 'departure' && item === departure) ||
                  (cityModalType === 'arrival' && item === arrival);
                const isDisabled =
                  (cityModalType === 'departure' && item === arrival) ||
                  (cityModalType === 'arrival' && item === departure);

                return (
                  <TouchableOpacity
                    style={[
                      styles.cityItem,
                      isSelected && styles.cityItemSelected,
                      isDisabled && styles.cityItemDisabled,
                    ]}
                    onPress={() => !isDisabled && selectCity(item)}
                    activeOpacity={isDisabled ? 1 : 0.7}
                  >
                    <View style={styles.cityItemLeft}>
                      <Ionicons
                        name="location-outline"
                        size={20}
                        color={
                          isSelected
                            ? Colors.primary
                            : isDisabled
                            ? Colors.gray300
                            : Colors.gray500
                        }
                      />
                      <Text
                        style={[
                          styles.cityItemText,
                          isSelected && styles.cityItemTextSelected,
                          isDisabled && styles.cityItemTextDisabled,
                        ]}
                      >
                        {item}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                    )}
                    {isDisabled && (
                      <Text style={styles.cityItemDisabledLabel}>
                        {cityModalType === 'departure' ? 'Arrivée' : 'Départ'}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Ionicons name="search-outline" size={40} color={Colors.gray300} />
                  <Text style={styles.emptyListText}>Aucune ville trouvée</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerWrapper: {
    overflow: 'hidden',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: CARD_OVERLAP + 180,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.white,
    marginTop: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchCardContainer: {
    marginTop: -(CARD_OVERLAP + 170),
    paddingHorizontal: 20,
    zIndex: 10,
  },
  searchCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  searchIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500',
    marginBottom: 2,
  },
  searchValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
  },
  searchPlaceholder: {
    color: Colors.gray400,
    fontWeight: '400',
  },
  searchDivider: {
    height: 1,
    backgroundColor: '#F0F0F5',
    marginLeft: 52,
  },
  datePassengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F5',
    marginTop: 6,
  },
  dateBox: {
    flex: 1,
    paddingVertical: 4,
  },
  dateLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500',
    marginBottom: 3,
  },
  dateValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '700',
  },
  dateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  datePassengerDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E8E8EE',
    marginHorizontal: 16,
  },
  passengerBox: {
    flex: 1,
    paddingVertical: 4,
  },
  passengerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  passengerBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0EEFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerBtnDisabled: {
    backgroundColor: '#F5F5F5',
  },
  passengerCount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginHorizontal: 14,
    minWidth: 20,
    textAlign: 'center',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 25,
    marginTop: 16,
    gap: 8,
  },
  searchButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  offersSection: {
    paddingTop: 28,
    paddingBottom: 32,
  },
  offersTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  offersList: {
    paddingHorizontal: 20,
    gap: 14,
  },
  offerCard: {
    width: (width - 54) / 2,
  },
  offerImageWrapper: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
    backgroundColor: Colors.gray100,
  },
  offerImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  offerRoute: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  offerPrice: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  offerPriceBold: {
    fontWeight: '700',
    color: Colors.text,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
    paddingTop: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5FA',
    borderRadius: 14,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    marginLeft: 10,
    padding: 0,
  },
  cityListContent: {
    paddingHorizontal: 10,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginVertical: 2,
    borderRadius: 12,
  },
  cityItemSelected: {
    backgroundColor: '#F0EEFF',
  },
  cityItemDisabled: {
    opacity: 0.5,
  },
  cityItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cityItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  cityItemTextSelected: {
    fontWeight: '700',
    color: Colors.primary,
  },
  cityItemTextDisabled: {
    color: Colors.gray400,
  },
  cityItemDisabledLabel: {
    fontSize: 11,
    color: Colors.gray400,
    fontStyle: 'italic',
  },
  emptyList: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 12,
  },
  emptyListText: {
    fontSize: 15,
    color: Colors.gray400,
  },
});
