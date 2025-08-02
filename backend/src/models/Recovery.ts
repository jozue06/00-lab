export interface RecoveryShare {
  id: string;
  share: string;
  question: string;
  answer: string;
  threshold: number;
}

export interface RecoverySetup {
  shares: RecoveryShare[];
  threshold: number;
}

export interface RecoveryShareRow {
  id: string;
  user_id: string;
  share: string;
  question: string;
  answer_hash: string; // Hashed answer for security
  threshold: number;
  created_at: Date;
  updated_at: Date;
}

export class RecoveryModel {
  /**
   * Converts RecoveryShare to database row format
   */
  toRow(
    share: RecoveryShare, 
    userId: string
  ): Omit<RecoveryShareRow, 'id' | 'created_at' | 'updated_at'> {
    return {
      user_id: userId,
      share: share.share,
      question: share.question,
      answer_hash: this.hashAnswer(share.answer),
      threshold: share.threshold
    };
  }

  /**
   * Converts database row to RecoveryShare
   */
  fromRow(row: RecoveryShareRow): RecoveryShare {
    return {
      id: row.id,
      share: row.share,
      question: row.question,
      answer: row.answer_hash, // In practice, you'd decrypt this
      threshold: row.threshold
    };
  }

  /**
   * Converts multiple database rows to RecoveryShare objects
   */
  fromRows(rows: RecoveryShareRow[]): RecoveryShare[] {
    return rows.map(row => this.fromRow(row));
  }

  /**
   * Hashes an answer for secure storage
   */
  private hashAnswer(answer: string): string {
    // In practice, you'd use a proper hashing function
    // This is simplified for the demo
    return btoa(answer).replace(/[^a-zA-Z0-9]/g, '');
  }
}