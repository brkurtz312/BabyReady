import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { deleteMyData } from '../services/accountDeletionService';

/**
 * Confirms and runs "Delete my data" from the home screen. An in-app sheet,
 * not Alert.alert, because Alert buttons don't work in the web build.
 */

const colors = {
  surface: '#FFFFFF',
  ink: '#28251D',
  muted: '#55534D',
  line: '#D4D1CA',
  danger: '#A1262C',
  dangerSoft: '#FCEDEE',
  lagoon: '#01696F',
};

type Step = 'confirm' | 'deleting' | 'done' | 'error';

type DeleteDataSheetProps = {
  visible: boolean;
  userId: string | null;
  /** Called once everything is deleted, so the home screen can reset. */
  onDeleted: () => void;
  onClose: () => void;
};

export function DeleteDataSheet({ visible, userId, onDeleted, onClose }: DeleteDataSheetProps) {
  const [step, setStep] = useState<Step>('confirm');
  const [message, setMessage] = useState('');

  const close = () => {
    if (step === 'deleting') return;
    setStep('confirm');
    onClose();
  };

  const runDelete = async () => {
    setStep('deleting');
    const result = await deleteMyData(userId);
    if (result.ok) {
      setStep('done');
      onDeleted();
    } else {
      setMessage(result.message);
      setStep('error');
    }
  };

  return (
    <Modal animationType="fade" onRequestClose={close} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.sheet}>
          {step === 'confirm' || step === 'deleting' ? (
            <>
              <Text accessibilityRole="header" style={styles.title}>
                Delete all your BabyReady data?
              </Text>
              <Text style={styles.body}>
                This permanently deletes your lesson progress, your Birth Readiness Brief, and your answers
                from class, on this device and in your private BabyReady account. It can’t be undone.
              </Text>
              <Text style={styles.body}>You can keep using BabyReady afterward. It will start fresh.</Text>
              {step === 'deleting' ? (
                <View accessibilityLiveRegion="polite" style={styles.working}>
                  <ActivityIndicator color={colors.danger} />
                  <Text style={styles.workingText}>Deleting…</Text>
                </View>
              ) : (
                <View style={styles.buttons}>
                  <Pressable
                    accessibilityHint="Permanently deletes your progress, Brief, and class answers."
                    accessibilityRole="button"
                    onPress={() => void runDelete()}
                    style={styles.dangerButton}
                    testID="button-confirm-delete-data"
                  >
                    <Text style={styles.dangerButtonText}>Delete everything</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={close}
                    style={styles.secondaryButton}
                    testID="button-cancel-delete-data"
                  >
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>
                </View>
              )}
            </>
          ) : null}

          {step === 'done' ? (
            <>
              <Text accessibilityRole="header" style={styles.title}>
                Your data is deleted
              </Text>
              <Text accessibilityLiveRegion="polite" style={styles.body}>
                Your progress, Brief, and class answers are gone from this device and from your BabyReady account.
              </Text>
              <View style={styles.buttons}>
                <Pressable
                  accessibilityRole="button"
                  onPress={close}
                  style={styles.primaryButton}
                  testID="button-close-delete-data"
                >
                  <Text style={styles.primaryButtonText}>Done</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === 'error' ? (
            <>
              <Text accessibilityRole="header" style={styles.title}>
                That didn’t finish
              </Text>
              <Text accessibilityLiveRegion="polite" style={styles.body}>
                {message}
              </Text>
              <View style={styles.buttons}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void runDelete()}
                  style={styles.dangerButton}
                  testID="button-retry-delete-data"
                >
                  <Text style={styles.dangerButtonText}>Try again</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={close} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
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
  dangerButton: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  dangerButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
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
  workingText: { color: colors.danger, fontSize: 15, fontWeight: '800' },
});
