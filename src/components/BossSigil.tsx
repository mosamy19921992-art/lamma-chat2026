import { OwnerCrownMark } from "./OwnerPrestige";

interface BossSigilProps {
  size?: number;
  className?: string;
}

/** @deprecated use OwnerCrownMark — kept for existing imports */
export default function BossSigil(props: BossSigilProps) {
  return <OwnerCrownMark {...props} />;
}
