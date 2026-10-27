import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Turns the server's spoken answer (base64 MP3, one per sentence) into sources the
 * narrator's player can play. On a phone each clip is written to the cache, since
 * the iPhone player won't play a data: URI; the previous answer's files are removed.
 */

let lastFiles: File[] = [];

export function answerAudioSources(clips: string[]): { uri: string }[] | null {
  try {
    if (Platform.OS === 'web') return clips.map((b64) => ({ uri: `data:audio/mpeg;base64,${b64}` }));
    for (const old of lastFiles) {
      try {
        old.delete();
      } catch {
        // Already gone.
      }
    }
    const stamp = Date.now();
    lastFiles = clips.map((b64, i) => {
      const file = new File(Paths.cache, `ask-answer-${stamp}-${i}.mp3`);
      file.write(b64, { encoding: 'base64' });
      return file;
    });
    return lastFiles.map((file) => ({ uri: file.uri }));
  } catch {
    return null;
  }
}
