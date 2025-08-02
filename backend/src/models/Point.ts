import { EncryptionService } from '../utils/encryption';

export interface Point {
  id?: number;
  date: string;
  title: string;
  description: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface PointRow {
  id: number;
  points_data: string; // Encrypted JSONB data
  created_at: Date;
  updated_at: Date;
}

export class PointModel {
  private encryptionService: EncryptionService;

  constructor(encryptionService: EncryptionService) {
    this.encryptionService = encryptionService;
  }

  /**
   * Converts a Point object to database row format (encrypts the data)
   */
  toRow(point: Point): Omit<PointRow, 'id' | 'created_at' | 'updated_at'> {
    return {
      points_data: this.encryptionService.encryptPoint(point)
    };
  }

  /**
   * Converts a database row to Point object (decrypts the data)
   */
  fromRow(row: PointRow): Point {
    const decryptedPoint = this.encryptionService.decryptPoint(row.points_data);
    return {
      id: row.id,
      date: decryptedPoint.date,
      title: decryptedPoint.title,
      description: decryptedPoint.description,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Converts multiple database rows to Point objects
   */
  fromRows(rows: PointRow[]): Point[] {
    return rows.map(row => this.fromRow(row));
  }
}