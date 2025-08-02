import { Pool } from 'pg';
import { PointModel, EncryptedPoint, PointRow } from '../models/Point';

export class PointService {
  private pointModel: PointModel;

  constructor(private pool: Pool) {
    this.pointModel = new PointModel();
  }

  /**
   * Creates a new encrypted point in the database
   * Server cannot decrypt this data - it's end-to-end encrypted
   */
  async createPoint(encryptedPoint: Omit<EncryptedPoint, 'id' | 'created_at' | 'updated_at'>): Promise<EncryptedPoint> {
    const client = await this.pool.connect();
    
    try {
      const rowData = this.pointModel.toRow(encryptedPoint);
      
      const query = `
        INSERT INTO points (encrypted_data, iv, salt, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id, encrypted_data, iv, salt, created_at, updated_at
      `;
      
      const result = await client.query(query, [
        rowData.encrypted_data,
        rowData.iv,
        rowData.salt
      ]);
      
      const row = result.rows[0] as PointRow;
      return this.pointModel.fromRow(row);
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves an encrypted point by ID
   * Server cannot decrypt this data - it's end-to-end encrypted
   */
  async getPointById(id: number): Promise<EncryptedPoint | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, encrypted_data, iv, salt, created_at, updated_at
        FROM points
        WHERE id = $1
      `;
      
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0] as PointRow;
      return this.pointModel.fromRow(row);
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves all encrypted points
   * Server cannot decrypt this data - it's end-to-end encrypted
   */
  async getAllPoints(): Promise<EncryptedPoint[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, encrypted_data, iv, salt, created_at, updated_at
        FROM points
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query);
      const rows = result.rows as PointRow[];
      
      return this.pointModel.fromRows(rows);
    } finally {
      client.release();
    }
  }

  /**
   * Updates an encrypted point by ID
   * Server cannot decrypt this data - it's end-to-end encrypted
   */
  async updatePoint(id: number, encryptedPoint: Omit<EncryptedPoint, 'id' | 'created_at' | 'updated_at'>): Promise<EncryptedPoint | null> {
    const client = await this.pool.connect();
    
    try {
      const rowData = this.pointModel.toRow(encryptedPoint);
      
      const query = `
        UPDATE points
        SET encrypted_data = $1, iv = $2, salt = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING id, encrypted_data, iv, salt, created_at, updated_at
      `;
      
      const result = await client.query(query, [
        rowData.encrypted_data,
        rowData.iv,
        rowData.salt,
        id
      ]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0] as PointRow;
      return this.pointModel.fromRow(row);
    } finally {
      client.release();
    }
  }

  /**
   * Deletes an encrypted point by ID
   */
  async deletePoint(id: number): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        DELETE FROM points
        WHERE id = $1
      `;
      
      const result = await client.query(query, [id]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }
}