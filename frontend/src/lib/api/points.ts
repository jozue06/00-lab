import { ClientEncryptionService, Point, EncryptedPoint } from '../crypto/encryption';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class PointsApi {
  private baseUrl: string;
  private encryptionService: ClientEncryptionService;
  private userPassword: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
    this.encryptionService = new ClientEncryptionService();
  }

  /**
   * Set the user's password for encryption/decryption
   * This should be called before any operations
   */
  setPassword(password: string): void {
    this.userPassword = password;
  }

  /**
   * Check if password is set
   */
  private checkPassword(): void {
    if (!this.userPassword) {
      throw new Error('Password not set. Call setPassword() first.');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Get all encrypted points from server and decrypt them
   */
  async getAllPoints(): Promise<Point[]> {
    this.checkPassword();
    
    const response = await this.request<EncryptedPoint[]>('/points');
    const encryptedPoints = response.data || [];
    
    // Decrypt all points using user's password
    return this.encryptionService.decryptPoints(encryptedPoints, this.userPassword!);
  }

  /**
   * Get a specific encrypted point and decrypt it
   */
  async getPointById(id: number): Promise<Point> {
    this.checkPassword();
    
    const response = await this.request<EncryptedPoint>(`/points/${id}`);
    const encryptedPoint = response.data!;
    
    // Decrypt the point using user's password
    return this.encryptionService.decryptPoint(encryptedPoint, this.userPassword!);
  }

  /**
   * Encrypt a point and send it to server
   */
  async createPoint(point: Omit<Point, 'id' | 'created_at' | 'updated_at'>): Promise<Point> {
    this.checkPassword();
    
    // Encrypt the point using user's password
    const encryptedPoint = await this.encryptionService.encryptPoint(point, this.userPassword!);
    
    const response = await this.request<EncryptedPoint>('/points', {
      method: 'POST',
      body: JSON.stringify(encryptedPoint),
    });
    
    const createdEncryptedPoint = response.data!;
    
    // Decrypt the created point to return plain text
    return this.encryptionService.decryptPoint(createdEncryptedPoint, this.userPassword!);
  }

  /**
   * Update an encrypted point
   */
  async updatePoint(
    id: number,
    updates: Partial<Omit<Point, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Point> {
    this.checkPassword();
    
    // First get the existing encrypted point
    const existingResponse = await this.request<EncryptedPoint>(`/points/${id}`);
    const existingEncryptedPoint = existingResponse.data!;
    
    // Update the encrypted point with new data
    const updatedEncryptedPoint = await this.encryptionService.updateEncryptedPoint(
      existingEncryptedPoint,
      updates,
      this.userPassword!
    );
    
    // Send updated encrypted point to server
    const response = await this.request<EncryptedPoint>(`/points/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedEncryptedPoint),
    });
    
    const finalEncryptedPoint = response.data!;
    
    // Decrypt the updated point to return plain text
    return this.encryptionService.decryptPoint(finalEncryptedPoint, this.userPassword!);
  }

  /**
   * Delete a point
   */
  async deletePoint(id: number): Promise<void> {
    await this.request(`/points/${id}`, {
      method: 'DELETE',
    });
  }
}

export const pointsApi = new PointsApi();