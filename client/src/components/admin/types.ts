export interface Campaign {
  _id: string;
  name: string;
  type: string;
  status: string;
  targeting: any;
  budget: any;
  createdAt: string;
}

export interface AudioAd {
  _id: string;
  title: string;
  campaignId?: string;
  audioUrl: string;
  durationSec: number;
  // Eligibility fields
  status?: string;
  approved?: boolean;
  isDeleted?: boolean;
  placements?: string[];
  startAt?: Date;
  endAt?: Date;
  remainingBudget?: number;
  impressions: number;
  clicks: number;
  revenue: number;
  callToAction: { text: string; url: string };
  type?: "audio";
}

export interface BannerAd {
  _id: string;
  title: string;
  campaignId?: string;
  imageUrl: string;
  size: string | { width: number; height: number };
  // Eligibility fields
  status?: string;
  approved?: boolean;
  isDeleted?: boolean;
  placements?: string[];
  startAt?: Date;
  endAt?: Date;
  remainingBudget?: number;
  impressions: number;
  clicks: number;
  revenue: number;
  callToAction: { text: string; url: string };
  type?: "banner";
}
