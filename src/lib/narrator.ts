import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { narrationClips, type NarrationClip } from '../content/narration';
import { textFingerprint } from './sentences';

/**
 * Plays the recorded class narration (made by scripts/make-narration.mjs).
 * A clip is found by a fingerprint of its text, so a slide whose wording changed
 * after recording has no clip, and the player falls back to the device voice.
 */

export function findClip(text: string): NarrationClip | undefined {
  return narrationClips[textFingerprint(text)];
}

type ClipCallbacks = {
  /** A new sentence started; `index` matches splitSentences(text). */
  onSentence?: (index: number) => void;
  onDone?: () => void;
  onError?: () => void;
};

let player: AudioPlayer | null = null;
let stopCurrent: (() => void) | null = null;

function sharedPlayer(): AudioPlayer {
  if (!player) {
    // Play narration even with the phone's silent switch on, like the lesson videos.
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    player = createAudioPlayer(null, { updateInterval: 100 });
  }
  return player;
}

/** Stops whatever clip is playing. Its callbacks won't fire afterwards. */
export function stopClip() {
  stopCurrent?.();
  stopCurrent = null;
}

/** Plays a clip from the start of sentence `from`. */
export function playClip(clip: NarrationClip, from: number, callbacks: ClipCallbacks = {}) {
  stopClip();
  let active = true;
  let sentence = from;
  try {
    const audio = sharedPlayer();
    const subscription = audio.addListener('playbackStatusUpdate', (status) => {
      if (!active) return;
      if (status.didJustFinish) {
        stopClip();
        callbacks.onDone?.();
        return;
      }
      const ms = status.currentTime * 1000 + 50;
      let index = sentence;
      while (index + 1 < clip.starts.length && clip.starts[index + 1] <= ms) index++;
      if (index !== sentence) {
        sentence = index;
        callbacks.onSentence?.(index);
      }
    });
    stopCurrent = () => {
      active = false;
      subscription.remove();
      audio.pause();
    };
    audio.replace(clip.source);
    const start = (clip.starts[from] ?? 0) / 1000;
    if (start > 0) {
      void audio
        .seekTo(start)
        .catch(() => undefined)
        .finally(() => active && audio.play());
    } else {
      audio.play();
    }
  } catch {
    active = false;
    callbacks.onError?.();
  }
}
