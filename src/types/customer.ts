export interface Customer {
  id: string;
  name: string;
  phone?: string;
  storeName?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
