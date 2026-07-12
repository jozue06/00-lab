import { EncryptionService } from '../utils/encryption';

export interface Point {
  id?: number;
  date: string;
  title: string;
  description: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface EncryptedPoint {
  id?: number;
  encrypted_data: string;
  iv: string;
  salt: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface PointRow {
  id: number;
  encrypted_data: string;
  iv: string;
  salt: string;
  created_at: Date;
  updated_at: Date;
}

export class PointModel {
  /**
   * Converts an EncryptedPoint to database row format
   * Server cannot decrypt this data - it's end-to-end encrypted
   */
  toRow(encryptedPoint: EncryptedPoint): Omit<PointRow, 'id' | 'created_at' | 'updated_at'> {
    return {
      encrypted_data: encryptedPoint.encrypted_data,
      iv: encryptedPoint.iv,
      salt: encryptedPoint.salt
    };
  }

  /**
   * Converts a database row to EncryptedPoint
   * Server cannot decrypt this data - it's end-to-end encrypted
   */
  fromRow(row: PointRow): EncryptedPoint {
    return {
      id: row.id,
      encrypted_data: row.encrypted_data,
      iv: row.iv,
      salt: row.salt,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Converts multiple database rows to EncryptedPoint objects
   */
  fromRows(rows: PointRow[]): EncryptedPoint[] {
    return rows.map(row => this.fromRow(row));
  }
}