const AUDIT_REPORT_SCHEME = 'babyready';
const AUDIT_REPORT_ROUTE = 'audit-report';
const DEFAULT_AUDIT_REPORT_BROWSER_VERIFICATION_URL =
  'https://babyready.app/verify';

function normalizeReportId(value: string): string {
  return value.trim().toUpperCase();
}

function normalizedPathname(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

function browserVerificationBaseUrl(): URL {
  const configuredUrl =
    process.env.EXPO_PUBLIC_AUDIT_REPORT_VERIFY_URL?.trim() ||
    DEFAULT_AUDIT_REPORT_BROWSER_VERIFICATION_URL;
  const baseUrl = new URL(configuredUrl);

  if (baseUrl.protocol !== 'https:' && baseUrl.protocol !== 'http:') {
    throw new Error(
      'EXPO_PUBLIC_AUDIT_REPORT_VERIFY_URL must use an http or https URL.',
    );
  }

  baseUrl.search = '';
  baseUrl.hash = '';
  return baseUrl;
}

export function createAuditReportAppVerificationUrl(reportId: string): string {
  const normalizedReportId = normalizeReportId(reportId);

  return `${AUDIT_REPORT_SCHEME}://${AUDIT_REPORT_ROUTE}?reportId=${encodeURIComponent(normalizedReportId)}`;
}

export function createAuditReportBrowserVerificationUrl(
  reportId: string,
): string {
  const browserUrl = browserVerificationBaseUrl();
  browserUrl.searchParams.set('reportId', normalizeReportId(reportId));
  return browserUrl.toString();
}

// Kept as a compatibility alias for existing app-deep-link call sites.
export const createAuditReportVerificationUrl =
  createAuditReportAppVerificationUrl;

function isAuditReportBrowserVerificationUrl(url: URL): boolean {
  const expectedUrl = browserVerificationBaseUrl();

  return (
    url.protocol === expectedUrl.protocol &&
    url.host === expectedUrl.host &&
    normalizedPathname(url.pathname) === normalizedPathname(expectedUrl.pathname)
  );
}

export function getAuditReportIdFromVerificationUrl(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const isAppDeepLink =
    url.protocol === `${AUDIT_REPORT_SCHEME}:` &&
    url.hostname.toLowerCase() === AUDIT_REPORT_ROUTE;
  if (!isAppDeepLink && !isAuditReportBrowserVerificationUrl(url)) {
    return null;
  }

  const reportId = normalizeReportId(url.searchParams.get('reportId') ?? '');
  return reportId || null;
}
