import { FileTransferSession } from "./fileTransferSession";

/**
 * Registry to track active upload sessions.
 * Provides aggregate state and session management.
 */
export class UploadSessionRegistry {
  private sessions: Map<string, FileTransferSession> = new Map();
  private onChangeListeners: Set<() => void> = new Set();

  /**
   * Adds a session to the registry.
   */
  add(session: FileTransferSession): void {
    this.sessions.set(session.sessionId, session);
    this.notifyChange();
  }

  /**
   * Removes a session from the registry.
   */
  remove(sessionId: string): void {
    if (this.sessions.delete(sessionId)) {
      this.notifyChange();
    }
  }

  /**
   * Gets a session by ID.
   */
  get(sessionId: string): FileTransferSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Returns the number of active sessions.
   */
  get activeCount(): number {
    return this.sessions.size;
  }

  /**
   * Returns whether any upload is in progress.
   */
  get hasActiveUploads(): boolean {
    return this.sessions.size > 0;
  }

  /**
   * Returns all active sessions for a specific peer.
   */
  getSessionsForPeer(remoteUserId: string): FileTransferSession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.remoteUserId === remoteUserId
    );
  }

  /**
   * Cancels all sessions for a specific peer (e.g., when they disconnect).
   */
  cancelSessionsForPeer(remoteUserId: string): void {
    const peerSessions = this.getSessionsForPeer(remoteUserId);
    peerSessions.forEach((session) => {
      session.cancel();
      this.remove(session.sessionId);
    });
  }

  /**
   * Cancels all active sessions.
   */
  cancelAll(): void {
    this.sessions.forEach((session) => session.cancel());
    this.sessions.clear();
    this.notifyChange();
  }

  /**
   * Subscribe to registry changes.
   */
  subscribe(listener: () => void): () => void {
    this.onChangeListeners.add(listener);
    return () => this.onChangeListeners.delete(listener);
  }

  private notifyChange(): void {
    this.onChangeListeners.forEach((listener) => listener());
  }
}

// Singleton registry instance
export const uploadSessionRegistry = new UploadSessionRegistry();
