import { redirect } from "next/navigation";

export default async function NotebookRootPage({
  params,
}: {
  params: Promise<{ notebookId: string }>;
}) {
  const { notebookId } = await params;
  redirect(`/workspace/notebooks/${notebookId}/chats`);
}
