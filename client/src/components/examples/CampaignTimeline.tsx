import { CampaignTimeline } from "../CampaignTimeline";

export default function CampaignTimelineExample() {
  const campaign = {
    id: "1",
    name: "Brand Sprint Q1",
    phase: "sprint" as const,
    startDate: "Jan 15",
    endDate: "Mar 31",
    slotsTotal: 10,
    slotsFilled: 8,
  };

  return (
    <div className="p-6 max-w-md">
      <CampaignTimeline campaign={campaign} onEdit={() => console.log("Edit campaign")} />
    </div>
  );
}
