import { Pool, PoolClient } from 'pg';
import { EncryptionService } from '../utils/encryption';
import { PointModel, Point, PointRow } from '../models/Point';

export class PointService {
  private pointModel: PointModel;

  constructor(
    private pool: Pool,
    encryptionService: EncryptionService
  ) {
    this.pointModel = new PointModel(encryptionService);
  }

  /**
   * Creates a new point in the database
   */
  async createPoint(point: Omit<Point, 'id' | 'created_at' | 'updated_at'>): Promise<Point> {
    const client = await this.pool.connect();
    
    try {
      const rowData = this.pointModel.toRow(point);
      
      const query = `
        INSERT INTO points (points_data, created_at, updated_at)
        VALUES ($1, NOW(), NOW())
        RETURNING id, points_data, created_at, updated_at
      `;
      
      const result = await client.query(query, [rowData.points_data]);
      const row = result.rows[0] as PointRow;
      
      return this.pointModel.fromRow(row);
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves a point by ID
   */
  async getPointById(id: number): Promise<Point | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, points_data, created_at, updated_at
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
   * Retrieves all points
   */
  async getAllPoints(): Promise<Point[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, points_data, created_at, updated_at
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
   * Updates a point by ID
   */
  async updatePoint(id: number, point: Partial<Omit<Point, 'id' | 'created_at' | 'updated_at'>>): Promise<Point | null> {
    const client = await this.pool.connect();
    
    try {
      // First get the existing point
      const existingPoint = await this.getPointById(id);
      if (!existingPoint) {
        return null;
      }
      
      // Merge with existing data
      const updatedPoint: Omit<Point, 'id' | 'created_at' | 'updated_at'> = {
        date: point.date ?? existingPoint.date,
        title: point.title ?? existingPoint.title,
        description: point.description ?? existingPoint.description
      };
      
      const rowData = this.pointModel.toRow(updatedPoint);
      
      const query = `
        UPDATE points
        SET points_data = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, points_data, created_at, updated_at
      `;
      
      const result = await client.query(query, [rowData.points_data, id]);
      
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
   * Deletes a point by ID
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