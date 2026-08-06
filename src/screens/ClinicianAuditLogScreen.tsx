import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { User } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';

import type {
  ComparisonAuditExportLog,
  ComparisonAuditExportRoute,
} from '../models/course';
import {
  subscribeToComparisonAuditExportDashboard,
  type ComparisonAuditExportDashboardState,
} from '../services/comparisonAuditLogService';
import {
  exportAuditLogCsv,
  type AuditExportCsvResult,
} from '../services/auditExportCsvService';
import {
  exportAuditDashboardPdf,
  type AuditDashboardPdfExportResult,
} from '../services/auditDashboardPdfService';
import {
  createAuditDashboardReportId,
  type AuditDashboardPdfFilter,
} from '../lib/auditDashboardPdfHtml';

type AccessState = 'checking' | 'authorized' | 'denied' | 'error';

type ClinicianAuditLogScreenProps = {
  user: User;
  onExit: () => void;
};

type AuditFilters = {
  scope: string;
  clinicianId: string;
  exportRoute: 'all' | ComparisonAuditExportRoute;
  startDate: string;
  endDate: string;
  versionNumber: string;
};

const initialFilters: AuditFilters = {
  scope: '',
  clinicianId: '',
  exportRoute: 'all',
  startDate: '',
  endDate: '',
  versionNumber: '',
};

const routes: Array<{
  value: AuditFilters['exportRoute'];
  label: string;
}> = [
  { value: 'all', label: 'All routes' },
  { value: 'web_print', label: 'Browser print' },
  { value: 'native_share', label: 'System share' },
  { value: 'file_created', label: 'File created' },
];

function formatExportRoute(route: ComparisonAuditExportRoute): string {
  switch (route) {
    case 'web_print':
      return 'Browser print';
    case 'native_share':
      return 'System share sheet';
    case 'file_created':
      return 'PDF file created';
    default:
      return route;
  }
}

function formatDate(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toLocaleString();
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  if (
    typeof value === 'object' &&
    value &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    const date = value.toDate();
    if (date instanceof Date) {
      return date.toLocaleString();
    }
  }

  return 'Timestamp pending';
}

function dateValue(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (
    typeof value === 'object' &&
    value &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    const date = value.toDate();
    return date instanceof Date ? date : null;
  }

  return null;
}

function parseFilterDate(value: string, endOfDay = false): Date | null {
  if (!value.trim()) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function matchingAuditEntries(
  entries: ComparisonAuditExportLog[],
  filters: AuditFilters,
): ComparisonAuditExportLog[] {
  const scopeQuery = filters.scope.trim().toLowerCase();
  const clinicianQuery = filters.clinicianId.trim().toLowerCase();
  const versionQuery = Number.parseInt(filters.versionNumber, 10);
  const startDate = parseFilterDate(filters.startDate);
  const endDate = parseFilterDate(filters.endDate, true);

  return entries.filter((entry) => {
    const scope = [
      entry.courseId,
      entry.moduleId,
      entry.lessonId,
      entry.contentBlockId,
    ]
      .join(' ')
      .toLowerCase();
    const exportedAt = dateValue(entry.exportedAt);

    if (scopeQuery && !scope.includes(scopeQuery)) {
      return false;
    }
    if (
      clinicianQuery &&
      !entry.exportedBy.toLowerCase().includes(clinicianQuery)
    ) {
      return false;
    }
    if (
      filters.exportRoute !== 'all' &&
      entry.exportRoute !== filters.exportRoute
    ) {
      return false;
    }
    if (
      Number.isFinite(versionQuery) &&
      entry.baselineVersionNumber !== versionQuery &&
      entry.comparisonVersionNumber !== versionQuery
    ) {
      return false;
    }
    if (startDate && (!exportedAt || exportedAt < startDate)) {
      return false;
    }
    if (endDate && (!exportedAt || exportedAt > endDate)) {
      return false;
    }

    return true;
  });
}

function csvExportMessage(result: AuditExportCsvResult): string {
  switch (result) {
    case 'browser-download-started':
      return 'The filtered audit CSV download has started.';
    case 'share-dialog-opened':
      return 'The filtered audit CSV is ready in the system share sheet.';
    case 'file-created':
      return 'The filtered audit CSV was created on this device.';
    default:
      return 'The filtered audit CSV is ready.';
  }
}

function pdfExportMessage(result: AuditDashboardPdfExportResult): string {
  switch (result) {
    case 'print-dialog-opened':
      return 'The print dialog is open. Choose Save as PDF to retain the filtered audit report.';
    case 'share-dialog-opened':
      return 'The filtered audit PDF is ready in the system share sheet.';
    case 'file-created':
      return 'The filtered audit PDF was created on this device.';
    default:
      return 'The filtered audit PDF is ready.';
  }
}

function appliedPdfFilters(filters: AuditFilters): AuditDashboardPdfFilter[] {
  const activeFilters: AuditDashboardPdfFilter[] = [];

  if (filters.scope.trim()) {
    activeFilters.push({
      label: 'Content scope',
      value: filters.scope.trim(),
    });
  }
  if (filters.clinicianId.trim()) {
    activeFilters.push({
      label: 'Exporting clinician ID',
      value: filters.clinicianId.trim(),
    });
  }
  if (filters.exportRoute !== 'all') {
    activeFilters.push({
      label: 'Original PDF route',
      value: formatExportRoute(filters.exportRoute),
    });
  }
  if (filters.startDate.trim()) {
    activeFilters.push({
      label: 'From date',
      value: filters.startDate.trim(),
    });
  }
  if (filters.endDate.trim()) {
    activeFilters.push({
      label: 'Through date',
      value: filters.endDate.trim(),
    });
  }
  if (filters.versionNumber.trim()) {
    activeFilters.push({
      label: 'Compared version number',
      value: filters.versionNumber.trim(),
    });
  }

  return activeFilters.length > 0
    ? activeFilters
    : [{ label: 'Dashboard scope', value: 'All loaded audit records' }];
}

export function ClinicianAuditLogScreen({
  user,
  onExit,
}: ClinicianAuditLogScreenProps) {
  const [access, setAccess] = useState<AccessState>('checking');
  const [dashboardState, setDashboardState] =
    useState<ComparisonAuditExportDashboardState>({
      status: 'loading',
      entries: [],
      error: null,
    });
  const [filters, setFilters] = useState<AuditFilters>(initialFilters);
  const [csvExportInFlight, setCsvExportInFlight] = useState(false);
  const [csvExportFeedback, setCsvExportFeedback] = useState<string | null>(
    null,
  );
  const [pdfExportInFlight, setPdfExportInFlight] = useState(false);
  const [pdfExportFeedback, setPdfExportFeedback] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    user
      .getIdTokenResult()
      .then((token) => {
        if (active) {
          setAccess(token.claims.admin === true ? 'authorized' : 'denied');
        }
      })
      .catch(() => {
        if (active) {
          setAccess('error');
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (access !== 'authorized') {
      return undefined;
    }

    return (
      subscribeToComparisonAuditExportDashboard(setDashboardState) ?? undefined
    );
  }, [access]);

  const filteredEntries = useMemo(
    () => matchingAuditEntries(dashboardState.entries, filters),
    [dashboardState.entries, filters],
  );
  const hasActiveFilters =
    filters.scope !== '' ||
    filters.clinicianId !== '' ||
    filters.exportRoute !== 'all' ||
    filters.startDate !== '' ||
    filters.endDate !== '' ||
    filters.versionNumber !== '';

  const updateFilter = <Key extends keyof AuditFilters>(
    key: Key,
    value: AuditFilters[Key],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const exportFilteredAuditLog = async () => {
    if (filteredEntries.length === 0) {
      setCsvExportFeedback(
        'Adjust the dashboard filters so at least one audit record is included.',
      );
      return;
    }

    setCsvExportInFlight(true);
    setCsvExportFeedback(null);
    try {
      const result = await exportAuditLogCsv(filteredEntries);
      setCsvExportFeedback(csvExportMessage(result));
    } catch (error) {
      setCsvExportFeedback(
        error instanceof Error
          ? error.message
          : 'BabyReady could not prepare the filtered audit CSV.',
      );
    } finally {
      setCsvExportInFlight(false);
    }
  };

  const exportFilteredAuditPdf = async () => {
    if (filteredEntries.length === 0) {
      setPdfExportFeedback(
        'Adjust the dashboard filters so at least one audit record is included.',
      );
      return;
    }

    setPdfExportInFlight(true);
    setPdfExportFeedback(null);
    try {
      const generatedAt = new Date();
      const result = await exportAuditDashboardPdf({
        entries: filteredEntries,
        filters: appliedPdfFilters(filters),
        generatedAt: generatedAt.toLocaleString(),
        generatedBy: user.uid,
        reportId: createAuditDashboardReportId(generatedAt),
      });
      setPdfExportFeedback(pdfExportMessage(result));
    } catch (error) {
      setPdfExportFeedback(
        error instanceof Error
          ? error.message
          : 'BabyReady could not prepare the filtered audit PDF.',
      );
    } finally {
      setPdfExportInFlight(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Return to clinical review"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onExit}
            style={styles.backButton}
            testID="button-back-to-clinical-review"
          >
            <Text style={styles.backButtonText}>Back to clinical review</Text>
          </Pressable>
          <Text style={styles.brand}>BABYREADY / CLINICAL</Text>
        </View>

        <Text style={styles.title}>Audit export log</Text>
        <Text style={styles.subtitle}>
          Cross-content record of clinician revision-comparison PDF exports.
        </Text>

        {access === 'checking' ? (
          <View style={styles.centeredState}>
            <ActivityIndicator color="#01696F" />
            <Text style={styles.stateText}>Checking audit-log access…</Text>
          </View>
        ) : null}

        {access === 'denied' ? (
          <View style={styles.accessCard}>
            <Text style={styles.accessTitle}>Clinical reviewer access is required</Text>
            <Text style={styles.accessText}>
              This account does not have the Firebase `admin` custom claim
              required to view cross-content audit records.
            </Text>
          </View>
        ) : null}

        {access === 'error' ? (
          <View style={styles.accessCard}>
            <Text style={styles.accessTitle}>We could not verify your review role</Text>
            <Text style={styles.accessText}>
              Refresh the session after confirming the account has an administrator claim.
            </Text>
          </View>
        ) : null}

        {access === 'authorized' ? (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>RECENT EXPORTS</Text>
              <Text style={styles.summaryValue}>{dashboardState.entries.length}</Text>
              <Text style={styles.summaryText}>
                {dashboardState.entries.length === 200
                  ? 'Showing the 200 most recent records. Narrow the filters to review a specific audit trail.'
                  : 'Live records across all clinician-reviewed content.'}
              </Text>
            </View>

            <View style={styles.filtersCard}>
              <View style={styles.filterHeader}>
                <View>
                  <Text style={styles.sectionLabel}>FILTER AUDIT RECORDS</Text>
                  <Text style={styles.filterDescription}>
                    Filters apply to the loaded audit record set immediately.
                  </Text>
                </View>
                {hasActiveFilters ? (
                  <Pressable
                    accessibilityLabel="Clear audit log filters"
                    accessibilityRole="button"
                    onPress={() => setFilters(initialFilters)}
                    style={styles.clearFiltersButton}
                    testID="button-clear-audit-log-filters"
                  >
                    <Text style={styles.clearFiltersButtonText}>Clear filters</Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={styles.fieldLabel}>Course, module, lesson, or content block</Text>
              <TextInput
                accessibilityLabel="Filter audit log by course module lesson or content block"
                autoCapitalize="none"
                onChangeText={(value) => updateFilter('scope', value)}
                placeholder="For example: labor, module-1, or welcome"
                placeholderTextColor="#8B8881"
                style={styles.textInput}
                testID="input-audit-log-scope-filter"
                value={filters.scope}
              />

              <Text style={styles.fieldLabel}>Exporting clinician ID</Text>
              <TextInput
                accessibilityLabel="Filter audit log by exporting clinician ID"
                autoCapitalize="none"
                onChangeText={(value) => updateFilter('clinicianId', value)}
                placeholder="Clinician user ID"
                placeholderTextColor="#8B8881"
                style={styles.textInput}
                testID="input-audit-log-clinician-filter"
                value={filters.clinicianId}
              />

              <Text style={styles.fieldLabel}>PDF route</Text>
              <View style={styles.routeFilters}>
                {routes.map((route) => {
                  const selected = filters.exportRoute === route.value;
                  return (
                    <Pressable
                      key={route.value}
                      accessibilityLabel={`Filter audit log by ${route.label}`}
                      accessibilityRole="button"
                      onPress={() => updateFilter('exportRoute', route.value)}
                      style={[
                        styles.routeButton,
                        selected && styles.routeButtonSelected,
                      ]}
                      testID={`button-audit-route-${route.value}`}
                    >
                      <Text
                        style={[
                          styles.routeButtonText,
                          selected && styles.routeButtonTextSelected,
                        ]}
                      >
                        {route.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.dateFilterRow}>
                <View style={styles.dateFilterCell}>
                  <Text style={styles.fieldLabel}>From date</Text>
                  <TextInput
                    accessibilityLabel="Filter audit log from date"
                    autoCapitalize="none"
                    keyboardType="numbers-and-punctuation"
                    onChangeText={(value) => updateFilter('startDate', value)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#8B8881"
                    style={styles.textInput}
                    testID="input-audit-log-start-date"
                    value={filters.startDate}
                  />
                </View>
                <View style={styles.dateFilterCell}>
                  <Text style={styles.fieldLabel}>Through date</Text>
                  <TextInput
                    accessibilityLabel="Filter audit log through date"
                    autoCapitalize="none"
                    keyboardType="numbers-and-punctuation"
                    onChangeText={(value) => updateFilter('endDate', value)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#8B8881"
                    style={styles.textInput}
                    testID="input-audit-log-end-date"
                    value={filters.endDate}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Compared version number</Text>
              <TextInput
                accessibilityLabel="Filter audit log by compared version number"
                keyboardType="number-pad"
                onChangeText={(value) => updateFilter('versionNumber', value)}
                placeholder="Matches baseline or comparison version"
                placeholderTextColor="#8B8881"
                style={styles.textInput}
                testID="input-audit-log-version-filter"
                value={filters.versionNumber}
              />
            </View>

            {dashboardState.status === 'loading' ? (
              <View style={styles.centeredState}>
                <ActivityIndicator color="#01696F" />
                <Text style={styles.stateText}>Loading cross-content audit records…</Text>
              </View>
            ) : null}

            {dashboardState.status === 'unconfigured' ? (
              <View style={styles.accessCard}>
                <Text style={styles.accessTitle}>Connect Firebase to load audit records</Text>
                <Text style={styles.accessText}>
                  Add the BabyReady Firebase configuration to enable the persistent audit log.
                </Text>
              </View>
            ) : null}

            {dashboardState.status === 'error' ? (
              <View style={styles.accessCard}>
                <Text style={styles.accessTitle}>The audit export log could not load</Text>
                <Text style={styles.accessText}>{dashboardState.error}</Text>
              </View>
            ) : null}

            {dashboardState.status === 'ready' ? (
              <>
                <View style={styles.exportCard}>
                  <View style={styles.exportCopy}>
                    <Text style={styles.sectionLabel}>EXPORT FILTERED RESULTS</Text>
                    <Text style={styles.exportDescription}>
                      Download the {filteredEntries.length} matching audit record
                      {filteredEntries.length === 1 ? '' : 's'} as CSV or a
                      clinician-ready PDF.
                    </Text>
                  </View>
                  <View style={styles.exportActions}>
                    <Pressable
                      accessibilityLabel="Export filtered audit records as CSV"
                      accessibilityRole="button"
                      disabled={csvExportInFlight || filteredEntries.length === 0}
                      onPress={() => {
                        void exportFilteredAuditLog();
                      }}
                      style={[
                        styles.csvExportButton,
                        (csvExportInFlight || filteredEntries.length === 0) &&
                          styles.csvExportButtonDisabled,
                      ]}
                      testID="button-export-filtered-audit-csv"
                    >
                      <Text style={styles.csvExportButtonText}>
                        {csvExportInFlight ? 'Preparing…' : 'Export CSV'}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Export filtered audit records as PDF"
                      accessibilityRole="button"
                      disabled={pdfExportInFlight || filteredEntries.length === 0}
                      onPress={() => {
                        void exportFilteredAuditPdf();
                      }}
                      style={[
                        styles.pdfExportButton,
                        (pdfExportInFlight || filteredEntries.length === 0) &&
                          styles.pdfExportButtonDisabled,
                      ]}
                      testID="button-export-filtered-audit-pdf"
                    >
                      <Text style={styles.pdfExportButtonText}>
                        {pdfExportInFlight ? 'Preparing…' : 'Export PDF'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                {csvExportFeedback ? (
                  <Text
                    style={styles.csvExportFeedback}
                    testID="text-audit-csv-export-feedback"
                  >
                    {csvExportFeedback}
                  </Text>
                ) : null}
                {pdfExportFeedback ? (
                  <Text
                    style={styles.pdfExportFeedback}
                    testID="text-audit-pdf-export-feedback"
                  >
                    {pdfExportFeedback}
                  </Text>
                ) : null}
                <Text style={styles.resultsLabel}>
                  {filteredEntries.length} matching record
                  {filteredEntries.length === 1 ? '' : 's'}
                </Text>
                {filteredEntries.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No matching audit exports</Text>
                    <Text style={styles.emptyText}>
                      Adjust the filters or export a revision comparison to create a new audit record.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.auditList}>
                    {filteredEntries.map((entry) => (
                      <View
                        key={entry.id}
                        style={styles.auditCard}
                        testID={`audit-dashboard-entry-${entry.id}`}
                      >
                        <View style={styles.auditCardHeader}>
                          <Text style={styles.auditCardTitle}>
                            v{entry.baselineVersionNumber} compared with v
                            {entry.comparisonVersionNumber}
                          </Text>
                          <View style={styles.routePill}>
                            <Text style={styles.routePillText}>
                              {formatExportRoute(entry.exportRoute)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.scopeText}>
                          {entry.courseId} / {entry.moduleId} / {entry.lessonId}
                        </Text>
                        <Text style={styles.blockText}>{entry.contentBlockId}</Text>
                        <Text style={styles.auditMetadata}>
                          Exported by {entry.exportedBy}
                        </Text>
                        <Text style={styles.auditMetadata}>
                          {formatDate(entry.exportedAt)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F7F6F2',
    flex: 1,
  },
  content: {
    paddingBottom: 36,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 6,
  },
  backButtonText: {
    color: '#01696F',
    fontSize: 13,
    fontWeight: '800',
  },
  brand: {
    color: '#01696F',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#28251D',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: '#55534D',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    marginTop: 7,
  },
  centeredState: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  stateText: {
    color: '#55534D',
    fontSize: 14,
    marginTop: 10,
  },
  accessCard: {
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderLeftColor: '#964219',
    borderLeftWidth: 4,
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
  },
  accessTitle: {
    color: '#28251D',
    fontSize: 16,
    fontWeight: '800',
  },
  accessText: {
    color: '#55534D',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  summaryCard: {
    backgroundColor: '#01696F',
    borderRadius: 18,
    marginBottom: 20,
    padding: 20,
  },
  summaryLabel: {
    color: '#BCE2E7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: 4,
  },
  summaryText: {
    color: '#E8F5F3',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  filtersCard: {
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    padding: 16,
  },
  filterHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: '#01696F',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  filterDescription: {
    color: '#6F6C65',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 230,
  },
  clearFiltersButton: {
    borderColor: '#01696F',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  clearFiltersButtonText: {
    color: '#01696F',
    fontSize: 12,
    fontWeight: '800',
  },
  fieldLabel: {
    color: '#3E3B34',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C8C5BD',
    borderRadius: 10,
    borderWidth: 1,
    color: '#28251D',
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  routeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  routeButton: {
    backgroundColor: '#F3F1EC',
    borderColor: '#D4D1CA',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  routeButtonSelected: {
    backgroundColor: '#DCEEEA',
    borderColor: '#01696F',
  },
  routeButtonText: {
    color: '#55534D',
    fontSize: 12,
    fontWeight: '700',
  },
  routeButtonTextSelected: {
    color: '#0C4E54',
  },
  dateFilterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateFilterCell: {
    flex: 1,
  },
  resultsLabel: {
    color: '#3E3B34',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  exportCard: {
    alignItems: 'center',
    backgroundColor: '#EAF4F1',
    borderColor: '#92BFB8',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 15,
  },
  exportCopy: {
    flex: 1,
  },
  exportActions: {
    gap: 8,
  },
  exportDescription: {
    color: '#3E5D58',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  csvExportButton: {
    backgroundColor: '#01696F',
    borderRadius: 9,
    minHeight: 42,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  csvExportButtonDisabled: {
    backgroundColor: '#94AAA7',
  },
  csvExportButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  csvExportFeedback: {
    color: '#0C4E54',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  pdfExportButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#01696F',
    borderRadius: 9,
    borderWidth: 1,
    minHeight: 42,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  pdfExportButtonDisabled: {
    backgroundColor: '#F1F3F1',
    borderColor: '#B0BFBC',
  },
  pdfExportButtonText: {
    color: '#01696F',
    fontSize: 13,
    fontWeight: '800',
  },
  pdfExportFeedback: {
    color: '#0C4E54',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 20,
  },
  emptyTitle: {
    color: '#28251D',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: '#55534D',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  auditList: {
    gap: 12,
  },
  auditCard: {
    backgroundColor: '#FBFBF9',
    borderColor: '#D4D1CA',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  auditCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  auditCardTitle: {
    color: '#28251D',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  routePill: {
    backgroundColor: '#E3F0ED',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  routePillText: {
    color: '#0C4E54',
    fontSize: 11,
    fontWeight: '800',
  },
  scopeText: {
    color: '#55534D',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  blockText: {
    color: '#01696F',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  auditMetadata: {
    color: '#6F6C65',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
});
