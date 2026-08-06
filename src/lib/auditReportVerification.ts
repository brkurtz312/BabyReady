const AUDIT_REPORT_SCHEME = 'babyready';
const AUDIT_REPORT_ROUTE = 'audit-report';

function normalizeReportId(value: string): string {
  return value.trim().toUpperCase();
}

export function createAuditReportVerificationUrl(reportId: string): string {
  const normalizedReportId = normalizeReportId(reportId);

  return `${AUDIT_REPORT_SCHEME}://${AUDIT_REPORT_ROUTE}?reportId=${encodeURIComponent(normalizedReportId)}`;
}

export function getAuditReportIdFromVerificationUrl(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const [route, query = ''] = value.split('?', 2);
  if (
    route.toLowerCase().replace(/\/+$/, '') !==
    `${AUDIT_REPORT_SCHEME}://${AUDIT_REPORT_ROUTE}`
  ) {
    return null;
  }

  const reportIdParameter = query
    .split('&')
    .find((parameter) => parameter.startsWith('reportId='));
  if (!reportIdParameter) {
    return null;
  }

  try {
    const reportId = normalizeReportId(
      decodeURIComponent(
        reportIdParameter.slice('reportId='.length).replaceAll('+', ' '),
      ),
    );

    return reportId || null;
  } catch {
    return null;
  }
}
