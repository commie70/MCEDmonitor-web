import { NextResponse } from "next/server";
import { MRD_PRODUCTS } from "@/data";
import { apiMrdProduct } from "@/lib/api";
import { API_CACHE_HEADERS } from "@/lib/url";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = MRD_PRODUCTS.find((entry) => entry.id === id);
  return product ? NextResponse.json(apiMrdProduct(product), { headers: API_CACHE_HEADERS }) : NextResponse.json({ error: "not_found" }, { status: 404 });
}
