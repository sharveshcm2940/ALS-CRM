import { properties } from "@/lib/data";
import { PropertyPage } from "@/components/PropertyPage";
import { notFound } from "next/navigation";
export function generateStaticParams() {
  return properties.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = properties.find((p) => p.slug === slug);
  return { title: p?.name, description: p?.description };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = properties.find((p) => p.slug === slug);
  if (!p) notFound();
  return <PropertyPage property={p} />;
}
