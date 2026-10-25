import { Badge } from "flowbite-react";

const STATUS_BADGES = {
  checked_out: { color: "pink", label: "Check Out" },
  checked_in: { color: "indigo", label: "Check In" },
  confirmed: { color: "success", label: "Confirmed" },
  cancelled: { color: "failure", label: "Cancelled" },
  Canceled: { color: "red", label: "Canceled" },
};

const DEFAULT_STATUS_BADGE = { color: "warning", label: "Pending" };

export default function StatusBadge({ status, checkedOutColor }) {
  const base = STATUS_BADGES[status] || DEFAULT_STATUS_BADGE;
  const color =
    status === "checked_out" && checkedOutColor ? checkedOutColor : base.color;

  return (
    <Badge color={color} size="lg">
      {base.label}
    </Badge>
  );
}
