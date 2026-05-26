import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Pool play and brackets now live on the main tournament page as tabs. Keep
 * this route around so old links and bookmarks still land somewhere useful.
 */
export default async function BracketsPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/tournaments/${slug}`);
}
