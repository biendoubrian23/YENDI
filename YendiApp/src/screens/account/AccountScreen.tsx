import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

const menuItems = [
  {
    id: 'personal',
    icon: 'person-outline',
    label: 'Infos personnelles',
    screen: 'PersonalInfo',
  },
  {
    id: 'referral',
    icon: 'gift-outline',
    label: 'Parrainage',
    screen: 'Referral',
  },
];

export default function AccountScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { clientProfile, user, signOut, refreshProfile } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  }, [refreshProfile]);

  // Récupérer le nom avec fallback sur user_metadata
  const getDisplayName = () => {
    const name = clientProfile?.full_name || user?.user_metadata?.full_name;
    if (name && name !== 'Client') return name;
    return user?.email?.split('@')[0] || 'Utilisateur';
  };
  
  const displayName = getDisplayName();
  const displayEmail = clientProfile?.email || user?.email || '';

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E67E22" colors={['#E67E22']} />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Mon Compte</Text>
          <TouchableOpacity>
            <Ionicons name="settings-outline" size={22} color={Colors.gray500} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerDivider} />

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={28} color={Colors.primary} />
            </View>
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {displayName}
            </Text>
            <Text style={styles.profileEmail}>{displayEmail}</Text>
          </View>
        </View>

        {/* Solde / Portefeuille - Séparé en 2 */}
        <View style={styles.walletCard}>
          <View style={styles.walletRow}>
            {/* Bonus Parrainage */}
            <View style={styles.walletColumn}>
              <View style={styles.walletIconContainer}>
                <Ionicons name="gift-outline" size={20} color="#7C3AED" />
              </View>
              <Text style={styles.walletLabel}>Bonus Parrainage</Text>
              <Text style={styles.walletAmount}>
                {(clientProfile?.balance || 0).toLocaleString()} FCFA
              </Text>
              {(clientProfile?.balance || 0) < 5000 && (
                <Text style={styles.walletMinNote}>Min. 5 000 pour utiliser</Text>
              )}
            </View>

            <View style={styles.walletSeparator} />

            {/* Solde Remboursement */}
            <View style={styles.walletColumn}>
              <View style={[styles.walletIconContainer, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="wallet-outline" size={20} color="#16A34A" />
              </View>
              <Text style={styles.walletLabel}>Solde Remboursement</Text>
              <Text style={[styles.walletAmount, { color: '#16A34A' }]}>
                {(clientProfile?.refund_balance || 0).toLocaleString()} FCFA
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => item.screen && navigation.navigate(item.screen)}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
                <Text style={styles.menuItemLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.gray400} />
            </TouchableOpacity>
          ))}

          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications-outline" size={22} color={Colors.danger} />
              <Text style={styles.menuItemLabel}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: Colors.gray300, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('HelpSupport')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle-outline" size={22} color={Colors.primary} />
              <Text style={styles.menuItemLabel}>Aide & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.gray400} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('LegalNotice')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
              <Text style={styles.menuItemLabel}>Mentions légales</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.gray400} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.versionText}>Version 2.4.0</Text>
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
    paddingBottom: Spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.text,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: Spacing.xl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    gap: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  walletCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  walletColumn: {
    flex: 1,
    alignItems: 'center',
  },
  walletSeparator: {
    width: 1,
    backgroundColor: '#E9D5FF',
    alignSelf: 'stretch',
    marginHorizontal: Spacing.md,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  walletIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  walletLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 2,
  },
  walletAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7C3AED',
  },
  walletMinNote: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
    textAlign: 'center',
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  walletBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#7C3AED',
  },
  menuSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xxl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuItemLabel: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.text,
  },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  logoutText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.danger,
  },
  versionText: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
});
