import { sanitizeStoragePathSegment } from './utils';

export interface DecodedStoragePath {
  ownerSegment: string;
  objectKey: string;
  protectedUrl: string;
}

export function buildProtectedFileUrl(objectKey: string): string {
  return `/api/files/${objectKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;
}

export function decodeProtectedStoragePath(
  pathSegments: string[]
): DecodedStoragePath | null {
  if (pathSegments.length < 2) {
    return null;
  }

  const decodedSegments: string[] = [];

  for (const segment of pathSegments) {
    let decoded: string;

    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return null;
    }

    if (
      !decoded ||
      decoded === '.' ||
      decoded === '..' ||
      decoded.includes('/') ||
      decoded.includes('\\') ||
      /[\u0000-\u001f]/.test(decoded)
    ) {
      return null;
    }

    decodedSegments.push(decoded);
  }

  const [ownerSegment] = decodedSegments;
  if (ownerSegment !== sanitizeStoragePathSegment(ownerSegment)) {
    return null;
  }

  return {
    ownerSegment,
    objectKey: decodedSegments.join('/'),
    protectedUrl: buildProtectedFileUrl(decodedSegments.join('/')),
  };
}
