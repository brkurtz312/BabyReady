import { useMemo, useState } from 'react';
import { Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { courses } from '../content/lessons';
import { RECOMMENDED_VIDEOS, VIDEO_LIBRARY, videoLinkHint, videoLinkWhere } from '../content/videoLibrary';
import { useLearnerLayout } from '../lib/learnerLayout';
import { buildVideoVault, filterVideoVault, vaultSources, type VaultGroup, type VaultVideo } from '../lib/videoVault';

type VideoVaultScreenProps = { onExit: () => void };

const VAULT = buildVideoVault(courses, VIDEO_LIBRARY, RECOMMENDED_VIDEOS);
const SOURCES = vaultSources(VAULT);
const TOTAL = VAULT.reduce((sum, group) => sum + group.videos.length, 0);

function VideoRow({ video }: { video: VaultVideo }) {
  return (
    <Pressable
      accessibilityHint={videoLinkHint(video)}
      accessibilityRole="link"
      onPress={() => void Linking.openURL(video.url).catch(() => undefined)}
      style={({ pressed }) => [styles.videoRow, pressed && styles.pressed]}
      testID={`link-vault-${video.key}`}
    >
      <View style={styles.playIcon}>
        <Text style={styles.playIconText}>▶</Text>
      </View>
      <View style={styles.videoText}>
        <Text style={styles.videoTitle}>{video.title}</Text>
        <Text style={styles.videoMeta}>
          {video.source} · {videoLinkWhere(video)}
          {video.language ? ` · ${video.language}` : ''}
        </Text>
        <Text style={styles.videoLessons}>With: {video.lessons.join('; ')}</Text>
      </View>
    </Pressable>
  );
}

function GroupCard({ group, open, onToggle }: { group: VaultGroup; open: boolean; onToggle: () => void }) {
  return (
    <View style={styles.groupCard}>
      <Pressable
        accessibilityLabel={`${group.topic}, ${group.videos.length} videos`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={styles.groupHeader}
        testID={`button-vault-group-${group.topic}`}
      >
        <Text style={styles.groupTitle}>{group.topic}</Text>
        <Text style={styles.groupCount}>{group.videos.length}</Text>
        <Text style={styles.chevron}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.groupBody}>
          {group.videos.map((video) => (
            <VideoRow key={video.key} video={video} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Every video recommended in the class, by topic, with search and a source filter. */
export function VideoVaultScreen({ onExit }: VideoVaultScreenProps) {
  const { isTabletLayout } = useLearnerLayout();
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<string[]>([]);

  const groups = useMemo(() => filterVideoVault(VAULT, search, source), [search, source]);
  const filtering = search.trim().length > 0 || source !== null;
  const shown = groups.reduce((sum, group) => sum + group.videos.length, 0);

  const toggle = (topic: string) =>
    setOpenIds((ids) => (ids.includes(topic) ? ids.filter((id) => id !== topic) : [...ids, topic]));

  return (
    <SafeAreaView style={styles.safeArea} testID="video-vault-screen">
      <ScrollView
        contentContainerStyle={[styles.content, isTabletLayout && styles.tabletContent]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onExit} style={styles.backButton} testID="button-exit-video-vault">
          <Text style={styles.backButtonText}>‹ Back</Text>
        </Pressable>

        <Text style={styles.brand}>BABYREADY VIRTUAL EDUCATOR</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Video Vault
        </Text>
        <Text style={styles.subtitle}>
          Every video recommended in the class, from ACOG, AAP, CDC, NICHD, March of Dimes and other trusted
          organizations, in one place.
        </Text>
        <Text style={styles.stats}>
          {filtering ? `${shown} of ${TOTAL} videos` : `${TOTAL} videos · ${VAULT.length} topics`}
        </Text>

        <TextInput
          accessibilityLabel="Search videos"
          autoCorrect={false}
          clearButtonMode="while-editing"
          onChangeText={setSearch}
          placeholder="Search videos, topics, or lessons"
          placeholderTextColor="#7A7974"
          returnKeyType="search"
          style={styles.search}
          testID="input-vault-search"
          value={search}
        />

        <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>
          {[null, ...SOURCES].map((name) => {
            const active = source === name;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={name ?? 'all'}
                onPress={() => setSource(name)}
                style={[styles.chip, active && styles.chipActive]}
                testID={`button-vault-source-${name ?? 'all'}`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{name ?? 'All sources'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {groups.length === 0 ? (
          <Text style={styles.empty}>No videos match. Try another word or source.</Text>
        ) : (
          groups.map((group) => (
            <GroupCard
              group={group}
              key={group.topic}
              // A search or filter opens every topic with a match.
              onToggle={() => toggle(group.topic)}
              open={filtering || openIds.includes(group.topic)}
            />
          ))
        )}

        <Text style={styles.note}>
          Videos open on YouTube or the organization’s website, outside BabyReady. They’re made by the organizations
          named, not BabyReady. Links marked “YouTube search” open a list of results for the named video.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#F7F6F2', flex: 1 },
  content: { alignSelf: 'center', maxWidth: 860, paddingBottom: 40, paddingHorizontal: 20, paddingTop: 10, width: '100%' },
  tabletContent: { paddingHorizontal: 32 },
  backButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
  backButtonText: { color: '#0C4E54', fontSize: 15, fontWeight: '800' },
  brand: { color: '#01696F', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 8 },
  title: { color: '#28251D', fontSize: 30, fontWeight: '800', letterSpacing: -0.7, marginTop: 5 },
  subtitle: { color: '#55534D', fontSize: 15, lineHeight: 22, marginTop: 7, maxWidth: 640 },
  stats: { color: '#01696F', fontSize: 13, fontWeight: '700', marginTop: 10 },
  search: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D4D1CA',
    borderRadius: 12,
    borderWidth: 1,
    color: '#28251D',
    fontSize: 16,
    marginTop: 16,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  chips: { gap: 8, paddingVertical: 12 },
  chip: { borderColor: '#D4D1CA', borderRadius: 999, borderWidth: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', minHeight: 36, paddingHorizontal: 14 },
  chipActive: { backgroundColor: '#01696F', borderColor: '#01696F' },
  chipText: { color: '#28251D', fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  groupCard: { backgroundColor: '#FBFBF9', borderColor: '#D4D1CA', borderRadius: 14, borderWidth: 1, marginTop: 10, overflow: 'hidden' },
  groupHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 60, paddingHorizontal: 16, paddingVertical: 12 },
  groupTitle: { color: '#28251D', flex: 1, fontSize: 17, fontWeight: '700' },
  groupCount: { color: '#605D56', fontSize: 14, fontWeight: '700' },
  chevron: { color: '#605D56', fontSize: 16, width: 16, textAlign: 'center' },
  groupBody: { borderTopColor: '#E4E1DA', borderTopWidth: 1, paddingHorizontal: 12, paddingVertical: 4 },
  videoRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, minHeight: 44, paddingHorizontal: 4, paddingVertical: 10 },
  pressed: { opacity: 0.6 },
  playIcon: { alignItems: 'center', backgroundColor: '#DCEDEA', borderRadius: 16, height: 32, justifyContent: 'center', marginTop: 2, width: 32 },
  playIconText: { color: '#01696F', fontSize: 13 },
  videoText: { flex: 1 },
  videoTitle: { color: '#28251D', fontSize: 15, fontWeight: '700', lineHeight: 20 },
  videoMeta: { color: '#605D56', fontSize: 13, marginTop: 2 },
  videoLessons: { color: '#7A7974', fontSize: 12, lineHeight: 17, marginTop: 2 },
  empty: { color: '#605D56', fontSize: 15, marginTop: 20, textAlign: 'center' },
  note: { color: '#7A7974', fontSize: 12, lineHeight: 17, marginTop: 20 },
});
