// Satu sumber format angka gaya Indonesia (Intl.NumberFormat "id-ID").
// Desimal memakai koma, ribuan memakai titik. Dipakai panel detail wilayah
// dan tooltip peta agar tampilan konsisten.

const integerFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

function fixedFormatter(digits: number): Intl.NumberFormat {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Bilangan bulat dengan pemisah ribuan titik, mis. 965000 menjadi "965.000". */
export function formatNumber(value: number): string {
  return integerFormatter.format(value);
}

/** Desimal dengan jumlah digit tetap dan koma, mis. 0.48 menjadi "0,48". */
export function formatDecimal(value: number, digits = 2): string {
  return fixedFormatter(digits).format(value);
}

/** Persen satu desimal dengan koma, mis. 28.5 menjadi "28,5%". */
export function formatPercent(value: number, digits = 1): string {
  return `${formatDecimal(value, digits)}%`;
}
