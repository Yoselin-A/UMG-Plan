/**
 * Recuperación de contraseñas SOLO PARA LA DEMOSTRACIÓN LOCAL.
 * Nunca debe emplearse este desafío visible en pantalla en producción.
 * Producción: token de un solo uso enviado por un backend verificado.
 */
export const RECOVERY_LIFETIME_MS = 10 * 60 * 1000;
export const RECOVERY_MAX_ATTEMPTS = 5;

export function generateDemoRecoveryCode(randomValues = null) {
  const data = randomValues || (() => {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    return random;
  })();
  return String(Number(data[0] % 900000) + 100000);
}

export function createRecoveryChallenge(userId, codeHash, issuedAt = Date.now()) {
  if (!userId || !codeHash) throw new Error('Datos de recuperación inválidos');
  return {userId, codeHash, expiresAt: issuedAt + RECOVERY_LIFETIME_MS, attempts: 0};
}

export function validateRecoveryChallenge(challenge, userId, suppliedHash, time = Date.now()) {
  if (!challenge || challenge.userId !== userId) return {ok: false, reason: 'not_found'};
  if (challenge.attempts >= RECOVERY_MAX_ATTEMPTS) return {ok: false, reason: 'locked'};
  if (time >= challenge.expiresAt) return {ok: false, reason: 'expired'};
  if (challenge.codeHash !== suppliedHash) return {ok: false, reason: 'invalid'};
  return {ok: true};
}

export function incrementRecoveryAttempts(challenge) {
  return {...challenge, attempts: challenge.attempts + 1};
}

export function validNewPassword(password) {
  return typeof password === 'string' && password.length >= 10;
}
