import { useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { appStoreUrl } from '../config/env';

import type { FullClassAccess } from '../hooks/useFullClassAccess';

/**
 * The full-class purchase, shown when a learner opens a locked lesson.
 *
 * The price shown is the store's own `priceString`, never a number written
 * here. If the store hasn't sent one, the button shows no price at all.
 * On the web, where nothing can be bought, it points to the app instead.
 */

const colors = {
  surface: '#FFFFFF',
  ink: '#28251D',
  muted: '#55534D',
  line: '#D4D1CA',
  lagoon: '#01696F',
};

type Step = 'offer' | 'working' | 'unlocked' | 'error' | 'nothing-to-restore';

type PaywallSheetProps = {
  visible: boolean;
  access: Pick<FullClassAccess, 'canBuy' | 'priceString' | 'buy' | 'restore'>;
  onClose: () => void;
};

export function PaywallSheet({ visible, access, onClose }: PaywallSheetProps) {
  const [step, setStep] = useState<Step>('offer');

  const close = () => {
    if (step === 'working') return;
    setStep('offer');
    onClose();
  };

  const runBuy = async () => {
    setStep('working');
    const result = await access.buy();
    if (result === 'purchased') setStep('unlocked');
    else if (result === 'cancelled') setStep('offer');
    else setStep('error');
  };

  const runRestore = async () => {
    setStep('working');
    setStep((await access.restore()) ? 'unlocked' : 'nothing-to-restore');
  };

  const buyLabel = access.priceString ? `Unlock for ${access.priceString}` : 'Unlock the full class';

  return (
    <Modal animationType="fade" onRequestClose={close} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.sheet}>
          {!access.canBuy ? (
            <>
              <Text accessibilityRole="header" style={styles.title}>
                Unlock the full class in the BabyReady app
              </Text>
              <Text style={styles.body}>
                This lesson is part of the full class, a one-time purchase in the BabyReady iPhone app
                {appStoreUrl ? '.' : ', coming soon to the App Store.'} The free lessons, including every lesson on
                when to get urgent help, stay open here.
              </Text>
              <View style={styles.buttons}>
                {appStoreUrl ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => void Linking.openURL(appStoreUrl).catch(() => undefined)}
                    style={styles.primaryButton}
                    testID="button-get-app"
                  >
                    <Text style={styles.primaryButtonText}>Get the iPhone app</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={close}
                  style={appStoreUrl ? styles.secondaryButton : styles.primaryButton}
                  testID="button-close-paywall"
                >
                  <Text style={appStoreUrl ? styles.secondaryButtonText : styles.primaryButtonText}>
                    {appStoreUrl ? 'Not now' : 'OK'}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {access.canBuy && (step === 'offer' || step === 'working') ? (
            <>
              <Text accessibilityRole="header" style={styles.title}>
                Unlock the full class
              </Text>
              <Text style={styles.body}>
                Every lesson in every BabyReady module, from pregnancy through the first weeks with your baby.
              </Text>
              <Text style={styles.body}>
                One purchase, no subscription. It stays with your Apple or Google account, so Restore Purchase
                brings it back on a new phone.
              </Text>
              <Text style={styles.body}>Lessons on when to get urgent help are always free.</Text>
              {step === 'working' ? (
                <View accessibilityLiveRegion="polite" style={styles.working}>
                  <ActivityIndicator color={colors.lagoon} />
                  <Text style={styles.workingText}>Contacting the store…</Text>
                </View>
              ) : (
                <View style={styles.buttons}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void runBuy()}
                    style={styles.primaryButton}
                    testID="button-buy-full-class"
                  >
                    <Text style={styles.primaryButtonText}>{buyLabel}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void runRestore()}
                    style={styles.secondaryButton}
                    testID="button-restore-full-class"
                  >
                    <Text style={styles.secondaryButtonText}>Restore Purchase</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={close} style={styles.secondaryButton} testID="button-close-paywall">
                    <Text style={styles.secondaryButtonText}>Not now</Text>
                  </Pressable>
                </View>
              )}
            </>
          ) : null}

          {access.canBuy && step === 'unlocked' ? (
            <>
              <Text accessibilityRole="header" style={styles.title}>
                The full class is unlocked
              </Text>
              <Text accessibilityLiveRegion="polite" style={styles.body}>
                Every lesson is open. Thank you for supporting BabyReady.
              </Text>
              <View style={styles.buttons}>
                <Pressable accessibilityRole="button" onPress={close} style={styles.primaryButton} testID="button-close-paywall">
                  <Text style={styles.primaryButtonText}>Start learning</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {access.canBuy && (step === 'error' || step === 'nothing-to-restore') ? (
            <>
              <Text accessibilityRole="header" style={styles.title}>
                {step === 'error' ? 'That didn’t finish' : 'No purchase found'}
              </Text>
              <Text accessibilityLiveRegion="polite" style={styles.body}>
                {step === 'error'
                  ? 'The purchase didn’t go through. Check your connection and try again.'
                  : 'This Apple or Google account hasn’t bought the full class yet. If you bought it with a different account, sign in to that account on this phone and try again.'}
              </Text>
              <View style={styles.buttons}>
                <Pressable accessibilityRole="button" onPress={() => setStep('offer')} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Back</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={close} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Close</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(40, 37, 29, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    maxWidth: 480,
    padding: 22,
    width: '100%',
  },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.lagoon,
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  working: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 20, minHeight: 44 },
  workingText: { color: colors.lagoon, fontSize: 15, fontWeight: '800' },
});
