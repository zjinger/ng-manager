export type RdTaskSheetDefaultRouteStatus = 'active' | 'inactive';

export interface RdTaskSheetDefaultRouteEntity {
  id: string;
  issuerUserId: string | null;
  issuerName: string | null;
  issuerDepartment: string | null;
  receiverUserId: string | null;
  receiverName: string | null;
  receiverDepartment: string | null;
  receiverPhone: string | null;
  status: RdTaskSheetDefaultRouteStatus;
  remark: string | null;
  sort: number;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RdTaskSheetDefaultRouteQuery {
  keyword?: string;
  status?: RdTaskSheetDefaultRouteStatus | '';
}

export interface CreateRdTaskSheetDefaultRouteInput {
  issuerUserId?: string | null;
  issuerName?: string | null;
  issuerDepartment?: string | null;
  receiverUserId?: string | null;
  receiverName?: string | null;
  receiverDepartment?: string | null;
  receiverPhone?: string | null;
  status?: RdTaskSheetDefaultRouteStatus;
  remark?: string | null;
  sort?: number;
}

export type UpdateRdTaskSheetDefaultRouteInput = Partial<CreateRdTaskSheetDefaultRouteInput>;
