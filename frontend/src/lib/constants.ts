export const CATEGORIES = [
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "accessories", label: "Accessories" },
  { value: "documents", label: "Documents" },
  { value: "keys", label: "Keys" },
  { value: "bags", label: "Bags" },
  { value: "wallet", label: "Wallet" },
  { value: "jewellery", label: "Jewellery" },
  { value: "toys", label: "Toys" },
  { value: "sports", label: "Sports" },
  { value: "other", label: "Other" },
] as const;

export const CLAIM_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  pickup_scheduled: "Pickup Scheduled",
  out_for_delivery: "Out for Delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const CLAIM_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  pending: "warning",
  under_review: "secondary",
  approved: "success",
  rejected: "destructive",
  pickup_scheduled: "success",
  out_for_delivery: "default",
  completed: "success",
  cancelled: "secondary",
};
