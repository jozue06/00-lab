export interface Point {
  id?: number;
  date: string;
  title: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class PointsApi {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
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

  async getAllPoints(): Promise<Point[]> {
    const response = await this.request<Point[]>('/points');
    return response.data || [];
  }

  async getPointById(id: number): Promise<Point> {
    const response = await this.request<Point>(`/points/${id}`);
    return response.data!;
  }

  async createPoint(point: Omit<Point, 'id' | 'created_at' | 'updated_at'>): Promise<Point> {
    const response = await this.request<Point>('/points', {
      method: 'POST',
      body: JSON.stringify(point),
    });
    return response.data!;
  }

  async updatePoint(
    id: number,
    point: Partial<Omit<Point, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Point> {
    const response = await this.request<Point>(`/points/${id}`, {
      method: 'PUT',
      body: JSON.stringify(point),
    });
    return response.data!;
  }

  async deletePoint(id: number): Promise<void> {
    await this.request(`/points/${id}`, {
      method: 'DELETE',
    });
  }
}

export const pointsApi = new PointsApi();