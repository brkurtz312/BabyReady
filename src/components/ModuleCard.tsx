import { StyleSheet, Text, View } from 'react-native';

import type { CourseModule } from '../models/course';

type ModuleCardProps = {
  module: CourseModule;
  isRecommended: boolean;
};

export function ModuleCard({ module, isRecommended }: ModuleCardProps) {
  return (
    <View
      accessibilityLabel={`${module.title}, ${module.estimatedMinutes} minutes, recommended during ${module.recommendedWeeks}`}
      style={[styles.card, isRecommended && styles.recommendedCard]}
    >
      <View style={[styles.number, isRecommended && styles.recommendedNumber]}>
        <Text style={[styles.numberText, isRecommended && styles.recommendedNumberText]}>
          {module.order}
        </Text>
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{module.title}</Text>
          {isRecommended ? (
            <Text style={styles.recommendedLabel}>NEXT</Text>
          ) : null}
        </View>
        <Text style={styles.summary}>{module.summary}</Text>
        <Text style={styles.meta}>
          {module.estimatedMinutes} min · Weeks {module.recommendedWeeks}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'flex-start',
    backgroundColor: '#FBFBF9',
    borderColor: '#DCD9D2',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 15,
  },
  recommendedCard: {
    borderColor: '#63A7A1',
    borderWidth: 1.5,
  },
  number: {
    alignItems: 'center',
    backgroundColor: '#EFEEE9',
    borderRadius: 12,
    height: 31,
    justifyContent: 'center',
    marginRight: 12,
    width: 31,
  },
  recommendedNumber: {
    backgroundColor: '#D8ECE9',
  },
  numberText: {
    color: '#59564E',
    fontSize: 14,
    fontWeight: '800',
  },
  recommendedNumberText: {
    color: '#01696F',
  },
  content: {
    flex: 1,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#28251D',
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    paddingRight: 6,
  },
  recommendedLabel: {
    color: '#01696F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  summary: {
    color: '#605D56',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  meta: {
    color: '#79766E',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
});
