export interface Facility {
  id: string;
  name: string;
  kabupaten: string;
  type: "RS Umum" | "RS Khusus" | "Puskesmas" | "Klinik";
  kelas: "A" | "B" | "C" | "D" | "-";
  beds: number;
  ownership: "Pemerintah" | "Swasta" | "TNI/Polri";
  phone: string;
  address: string;
}

export const facilities: Facility[] = [
  { id: "1", name: "RSUD Dr. Soetomo", kabupaten: "Kota Surabaya", type: "RS Umum", kelas: "A", beds: 1500, ownership: "Pemerintah", phone: "031-5501078", address: "Jl. Mayjen Prof. Dr. Moestopo No.6-8" },
  { id: "2", name: "RS Dr. Saiful Anwar", kabupaten: "Kota Malang", type: "RS Umum", kelas: "A", beds: 870, ownership: "Pemerintah", phone: "0341-362101", address: "Jl. Jaksa Agung Suprapto No.2" },
  { id: "3", name: "RSUD Gambiran", kabupaten: "Kota Kediri", type: "RS Umum", kelas: "B", beds: 426, ownership: "Pemerintah", phone: "0354-683704", address: "Jl. Veteran No.1" },
  { id: "4", name: "RSUD Bangil", kabupaten: "Kab. Pasuruan", type: "RS Umum", kelas: "B", beds: 312, ownership: "Pemerintah", phone: "0343-744900", address: "Jl. Raya Bangil" },
  { id: "5", name: "RS Baladhika Husada", kabupaten: "Kab. Jember", type: "RS Umum", kelas: "B", beds: 283, ownership: "TNI/Polri", phone: "0331-485555", address: "Jl. Kalimantan No.62" },
  { id: "6", name: "RSUD Mardi Waluyo", kabupaten: "Kota Blitar", type: "RS Umum", kelas: "C", beds: 185, ownership: "Pemerintah", phone: "0342-801074", address: "Jl. Sudanco Supriyadi No.45" },
  { id: "7", name: "Puskesmas Tambaksari", kabupaten: "Kota Surabaya", type: "Puskesmas", kelas: "-", beds: 24, ownership: "Pemerintah", phone: "031-3714016", address: "Jl. Tambaksari No.18" },
  { id: "8", name: "Puskesmas Kepanjen", kabupaten: "Kab. Malang", type: "Puskesmas", kelas: "-", beds: 18, ownership: "Pemerintah", phone: "0341-395089", address: "Jl. Ahmad Yani No.12" },
  { id: "9", name: "RS Premier Surabaya", kabupaten: "Kota Surabaya", type: "RS Umum", kelas: "B", beds: 220, ownership: "Swasta", phone: "031-5682889", address: "Jl. Nginden Intan No.97" },
  { id: "10", name: "RSUD Ibnu Sina", kabupaten: "Kab. Gresik", type: "RS Umum", kelas: "B", beds: 248, ownership: "Pemerintah", phone: "031-3951239", address: "Jl. Dr. Wahidin No.243" },
  { id: "11", name: "Puskesmas Sampang", kabupaten: "Kab. Sampang", type: "Puskesmas", kelas: "-", beds: 12, ownership: "Pemerintah", phone: "0323-321002", address: "Jl. Wijaya Kusuma No.5" },
  { id: "12", name: "Puskesmas Bangkalan", kabupaten: "Kab. Bangkalan", type: "Puskesmas", kelas: "-", beds: 14, ownership: "Pemerintah", phone: "031-3096045", address: "Jl. Soekarno Hatta No.20" },
  { id: "13", name: "RS Ummi Bojonegoro", kabupaten: "Kab. Bojonegoro", type: "RS Umum", kelas: "C", beds: 142, ownership: "Swasta", phone: "0353-881035", address: "Jl. Diponegoro No.68" },
  { id: "14", name: "RSUD Blambangan", kabupaten: "Kab. Banyuwangi", type: "RS Umum", kelas: "B", beds: 310, ownership: "Pemerintah", phone: "0333-421218", address: "Jl. Letkol Istiqlah No.49" },
  { id: "15", name: "Puskesmas Pronojiwo", kabupaten: "Kab. Lumajang", type: "Puskesmas", kelas: "-", beds: 10, ownership: "Pemerintah", phone: "0334-881020", address: "Jl. Raya Pronojiwo No.12" },
  { id: "16", name: "Klinik Pratama Bunda", kabupaten: "Kab. Sidoarjo", type: "Klinik", kelas: "-", beds: 8, ownership: "Swasta", phone: "031-8921552", address: "Jl. Jenggolo No.25" },
  { id: "17", name: "RSUD Syarifah Ambami", kabupaten: "Kab. Bangkalan", type: "RS Umum", kelas: "C", beds: 152, ownership: "Pemerintah", phone: "031-3095054", address: "Jl. Halim Perdana Kusuma No.1" },
  { id: "18", name: "Puskesmas Madiun", kabupaten: "Kota Madiun", type: "Puskesmas", kelas: "-", beds: 16, ownership: "Pemerintah", phone: "0351-462551", address: "Jl. Sulawesi No.30" },
  { id: "19", name: "RS Baptis Batu", kabupaten: "Kota Batu", type: "RS Umum", kelas: "C", beds: 120, ownership: "Swasta", phone: "0341-592017", address: "Jl. Raya Tlekung No.1" },
  { id: "20", name: "RSUD Ngudi Waluyo", kabupaten: "Kab. Blitar", type: "RS Umum", kelas: "B", beds: 268, ownership: "Pemerintah", phone: "0342-802151", address: "Jl. Dr. Sutomo No.2" },
];

export const facilityTypes = ["Semua Tipe", "RS Umum", "RS Khusus", "Puskesmas", "Klinik"];
export const facilityKelas = ["Semua Kelas", "A", "B", "C", "D"];
export const ownershipOptions = ["Semua Kepemilikan", "Pemerintah", "Swasta", "TNI/Polri"];
