import { Request, Response } from 'express';
import { PointService } from '../services/PointService';
import { EncryptedPoint } from '../models/Point';

export class PointController {
  constructor(private pointService: PointService) {}

  /**
   * Create a new encrypted point
   * Server cannot decrypt this data - it's end-to-end encrypted
   */
  async createPoint(req: Request, res: Response): Promise<void> {
    try {
      const { encrypted_data, iv, salt } = req.body;

      // Validate required fields
      if (!encrypted_data || !iv || !salt) {
        res.status(400).json({
          error: 'Missing required fields: encrypted_data, iv, salt'
        });
        return;
      }

      const encryptedPoint = await this.pointService.createPoint({
        encrypted_data,
        iv,
        salt
      });

      res.status(201).json({
        success: true,
        data: encryptedPoint
      });
    } catch (error) {
      console.error('Error creating encrypted point:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get all encrypted points
   * Server cannot decrypt this data - it's end-to-end encrypted
   */
  async getAllPoints(req: Request, res: Response): Promise<void> {
    try {
      const encryptedPoints = await this.pointService.getAllPoints();

      res.status(200).json({
        success: true,
        data: encryptedPoints
      });
    } catch (error) {
      console.error('Error fetching encrypted points:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get an encrypted point by ID
   * Server cannot decrypt this data - it's end-to-end encrypted
   */
  async getPointById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          error: 'Invalid point ID'
        });
        return;
      }

      const encryptedPoint = await this.pointService.getPointById(id);

      if (!encryptedPoint) {
        res.status(404).json({
          error: 'Point not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: encryptedPoint
      });
    } catch (error) {
      console.error('Error fetching encrypted point:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  /**
   * Update an encrypted point
   * Server cannot decrypt this data - it's end-to-end encrypted
   */
  async updatePoint(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { encrypted_data, iv, salt } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          error: 'Invalid point ID'
        });
        return;
      }

      if (!encrypted_data || !iv || !salt) {
        res.status(400).json({
          error: 'Missing required fields: encrypted_data, iv, salt'
        });
        return;
      }

      const encryptedPoint = await this.pointService.updatePoint(id, {
        encrypted_data,
        iv,
        salt
      });

      if (!encryptedPoint) {
        res.status(404).json({
          error: 'Point not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: encryptedPoint
      });
    } catch (error) {
      console.error('Error updating encrypted point:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  /**
   * Delete an encrypted point
   */
  async deletePoint(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          error: 'Invalid point ID'
        });
        return;
      }

      const deleted = await this.pointService.deletePoint(id);

      if (!deleted) {
        res.status(404).json({
          error: 'Point not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Point deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting encrypted point:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
}