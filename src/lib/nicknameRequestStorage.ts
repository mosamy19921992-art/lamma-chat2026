export function nicknameRequestAppliedStorageKey(
  userId: string,
  requestId: string,
): string {
  return `lamma_nickname_request_applied_${userId}_${requestId}`;
}
