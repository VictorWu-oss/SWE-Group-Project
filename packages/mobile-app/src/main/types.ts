export type Busyness = 'Low' | 'Medium' | 'High';

export type Bathroom = {
  id: string;
  name: string;
  building: string;
  latitude: number;
  longitude: number;
  demo: boolean;
  averageCleanliness: number | null;
  reviewCount: number;
  busyness: Busyness | null;
  busynessReportedAt: string | null;
  reviewedToday: boolean;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};