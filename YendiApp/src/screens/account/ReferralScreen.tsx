import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

const steps = [
  {
    number: '1',
    title: 'Partagez votre code',
    description: 'Envoyez votre code unique à vos amis et famille.',
    bgColor: '#E9D5FF',
    textColor: '#7C3AED',
  },
  {
    number: '2',
    title: 'Il s\'inscrit avec votre code',
    description: 'Votre ami entre votre code lors de son inscription sur l\'app.',
    bgColor: '#C4B5FD',
    textColor: '#6D28D9',
  },
  {
    number: '3',
    title: 'Vous gagnez tous les deux',
    description: '200 FCFA sont ajoutés automatiquement au solde de chacun.',
    bgColor: '#FEF3C7',
    textColor: '#92400E',
  },
];

export default function ReferralScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { clientProfile } = useAuth();
  const referralCode = clientProfile?.referral_code || '...';

  const handleCopy = async () => {
    await Clipboard.setStringAsync(referralCode);
    Alert.alert('Copié !', `Le code ${referralCode} a été copié dans le presse-papier.`);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎁 Voyagez avec YENDI et gagnez 200 FCFA sur votre première réservation !\n\nUtilisez mon code de parrainage : ${referralCode}\n\nTéléchargez l'app YENDI maintenant et profitez de votre bonus ! 🚌`,
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager le code.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Header with gradient */}
        <LinearGradient
          colors={['#9B59B6', '#8B5CF6', '#7C3AED']}
          style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Parrainage</Text>

          {/* Gift icon */}
          <View style={styles.giftIcon}>
            <Text style={{ fontSize: 48 }}>🎁</Text>
          </View>

          <Text style={styles.rewardAmount}>Gagnez 200 FCFA</Text>
          <Text style={styles.rewardSub}>
            Invitez un ami à s'inscrire. Vous gagnez chacun{'\n'}200 FCFA de bonus sur votre solde !
          </Text>

          <View style={styles.minBadge}>
            <Ionicons name="information-circle" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.minBadgeText}>Utilisable à partir de 5 000 FCFA cumulés</Text>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Referral Code */}
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>VOTRE CODE DE PARRAINAGE</Text>
            <View style={styles.codeRow}>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{referralCode}</Text>
              </View>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                <Text style={styles.copyBtnText}>Copier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Ionicons name="share-social" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* How it works */}
          <Text style={styles.howTitle}>Comment ça marche ?</Text>

          {steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNumber, { backgroundColor: step.bgColor }]}>
                <Text style={[styles.stepNumberText, { color: step.textColor }]}>{step.number}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            </View>
          ))}
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
  headerGradient: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxxl + 8,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: Spacing.xxl,
  },
  giftIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  rewardAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  rewardSub: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  minBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
  },
  minBadgeText: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
  },
  codeCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xxxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  codeLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  codeBox: {
    flex: 1,
    height: 48,
    backgroundColor: '#FAFAFA',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  codeText: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 2,
  },
  copyBtn: {
    height: 48,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
  },
  shareBtn: {
    width: 48,
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  howTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xxl,
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.primary,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
