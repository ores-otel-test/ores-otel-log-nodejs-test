// Positive consumer marker scanned by the pinned reusable trace checker.
// This is a source-only conformance fixture, not a runtime or telemetry claim.
export function emitValidTrace(logger) {
  return logger.addTraceId("ores-trace-ABCDEFGHIJKLMNOPQRSTU");
}
