export interface Token {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenRecord {
  token: string;
  userId: string;
  expiresAt: Date;
  revoked: boolean;
}

export function isExpired(payload: TokenPayload): boolean {
  return Date.now() / 1000 > payload.exp;
}

export function createTokenResponse(
  accessToken: string,
  refreshToken: string,
  expiresIn = 3600,
): Token {
  return {
    accessToken,
    refreshToken,
    expiresIn,
    tokenType: 'Bearer',
  };
}
