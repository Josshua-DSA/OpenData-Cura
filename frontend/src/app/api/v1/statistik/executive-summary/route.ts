import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      total_faskes: 1424,
      total_rs: 447,
      total_puskesmas: 977,
      rasio_tt_rata_rata_resmi: 0.94,
      wilayah_prioritas_count: 8,
      stunting_rata_rata: 18.7,
      distribusi_kategori_who_resmi: {
        merah: 8,
        kuning: 16,
        hijau: 14,
      },
    },
  });
}

