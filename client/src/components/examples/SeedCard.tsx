import { SeedCard } from "../SeedCard";

export default function SeedCardExample() {
  return (
    <div className="grid grid-cols-2 gap-4 p-6 max-w-2xl">
      <SeedCard
        id="1"
        type="text"
        content="Apple's design philosophy: brutal simplicity meets premium execution"
        tags={["design", "apple"]}
      />
      <SeedCard
        id="2"
        type="audio"
        content="Voice note: Ideas for the next campaign wave structure"
        tags={["campaign"]}
      />
    </div>
  );
}
