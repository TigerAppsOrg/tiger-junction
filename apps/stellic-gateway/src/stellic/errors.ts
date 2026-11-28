// Errors for the Stellic login + session flow.

/** Any failure while logging into or talking to Stellic/CAS/Duo. */
export class StellicLoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StellicLoginError";
  }
}

/**
 * Raised by finish() when the Duo push has not been approved yet within the
 * wait it was given. The login is still usable; finish() can be called again.
 */
export class PushPendingError extends StellicLoginError {
  constructor(message = "Duo Push not approved yet") {
    super(message);
    this.name = "PushPendingError";
  }
}

/**
 * Raised when the Duo push ended without approval: it expired unanswered, or
 * the student declined it. The login attempt is over; the student must start
 * again with their password. The message is written to be shown to them.
 */
export class PushNotApprovedError extends StellicLoginError {
  constructor(
    message = "Your Duo push expired or was declined. Please try again.",
  ) {
    super(message);
    this.name = "PushNotApprovedError";
  }
}

/**
 * Raised when a connection can no longer be renewed without the student
 * signing in again: CAS refused a renewal (12 h after the password sign-in),
 * the gateway's own 11 h limit passed, or the stored session is unreadable.
 * The connection is marked `needs_reconnect`; routes answer 409.
 */
export class NeedsReconnectError extends StellicLoginError {
  constructor(
    message = "CAS single sign-on has expired; the student must reconnect",
  ) {
    super(message);
    this.name = "NeedsReconnectError";
  }
}
