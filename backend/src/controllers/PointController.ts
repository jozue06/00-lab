import { Request, Response } from 'express';
import { PointService } from '../services/PointService';
import { Point } from '../models/Point';

export class PointController {
  constructor(private pointService: PointService) {}

  /**
   * Create a new point
   */
  async createPoint(req: Request, res: Response): Promise<void> {
    try {
      const { date, title, description } = req.body;

      // Validate required fields
      if (!date || !title || !description) {
        res.status(400).json({
          error: 'Missing required fields: date, title, description'
        });
        return;
      }

      const point = await this.pointService.createPoint({
        date,
        title,
        description
      });

      res.status(201).json({
        success: true,
        data: point
      });
    } catch (error) {
      console.error('Error creating point:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get all points
   */
  async getAllPoints(req: Request, res: Response): Promise<void> {
    try {
      const points = await this.pointService.getAllPoints();

      res.status(200).json({
        success: true,
        data: points
      });
    } catch (error) {
      console.error('Error fetching points:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get a point by ID
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

      const point = await this.pointService.getPointById(id);

      if (!point) {
        res.status(404).json({
          error: 'Point not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: point
      });
    } catch (error) {
      console.error('Error fetching point:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  /**
   * Update a point
   */
  async updatePoint(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { date, title, description } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          error: 'Invalid point ID'
        });
        return;
      }

      const updateData: Partial<Omit<Point, 'id' | 'created_at' | 'updated_at'>> = {};
      if (date) updateData.date = date;
      if (title) updateData.title = title;
      if (description) updateData.description = description;

      const point = await this.pointService.updatePoint(id, updateData);

      if (!point) {
        res.status(404).json({
          error: 'Point not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: point
      });
    } catch (error) {
      console.error('Error updating point:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  /**
   * Delete a point
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
      console.error('Error deleting point:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
}