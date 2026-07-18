export function shouldDeleteQueueMessage(httpStatus: number) {
  return (httpStatus >= 200 && httpStatus < 300) || httpStatus === 422;
}

export function isTerminalAttempt(attemptCount: number, maxAttempts = 3) {
  return attemptCount >= maxAttempts;
}
