import { RunProgress } from "@/components/run-progress";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RunProgress runId={id} />;
}
