import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

def draw_flowchart():
    fig, ax = plt.subplots(figsize=(10, 14), dpi=300)
    ax.axis('off')

    # Define box styling
    box_style = "round,pad=0.5"
    process_props = dict(boxstyle=box_style, facecolor="#e1f5fe", edgecolor="#0288d1", linewidth=2)
    data_props = dict(boxstyle=box_style, facecolor="#fff3e0", edgecolor="#f57c00", linewidth=2)
    decision_props = dict(boxstyle="square,pad=0.5", facecolor="#e8f5e9", edgecolor="#388e3c", linewidth=2)
    output_props = dict(boxstyle=box_style, facecolor="#f3e5f5", edgecolor="#7b1fa2", linewidth=2)
    
    # Texts and Coordinates
    nodes = {
        'start': ('Studi Literatur & FGD Mitra\n(Kemenkes, BPS, Dinkes Jatim)', (0.5, 0.95), data_props),
        'data_collect': ('Pengumpulan Data:\n- 447 RS & 977 Puskesmas\n- 266 Profil Nakes\n- Tren Morbiditas (ICD-10)\n- Koordinat Wilayah (OSM)', (0.5, 0.85), data_props),
        'etl': ('Tahap Arsitektur & ETL:\n- Normalisasi & Konsolidasi Data\n- Sanitasi Koordinat PostGIS\n- Pembuatan Feature Store (Parquet/CSV)', (0.5, 0.73), process_props),
        'analytics': ('Tahap Analitika & Pemodelan:\n- Eksplorasi Korelasi Variabel\n- Prediksi Morbiditas (SARIMAX/LSTM)\n- Clustering Ketahanan Faskes (K-Means/DBSCAN)\n- Klasifikasi Kerentanan Wilayah (Bayesian)', (0.5, 0.58), process_props),
        'dashboard': ('Tahap Integrasi Dasbor (TKT 4):\n- Integrasi Database (PostgreSQL/PostGIS)\n- Pembangunan API (FastAPI)\n- Desain Web Interaktif', (0.5, 0.43), process_props),
        'eval': ('Evaluasi & Uji Fungsional Internal\n(Quality Gates CI/CD, Unit Testing)', (0.5, 0.31), decision_props),
        'tkt6': ('Validasi Lingkungan Operasional (TKT 6)\nBersama Pemangku Kepentingan\n(Dinkes Jatim & Bappeda)', (0.5, 0.19), process_props),
        'final': ('Implementasi Prototipe Akhir,\nDokumentasi, & Publikasi', (0.5, 0.08), output_props)
    }

    # Draw Nodes
    for key, (text, pos, props) in nodes.items():
        ax.text(pos[0], pos[1], text, ha='center', va='center', size=11, fontweight='bold', bbox=props, zorder=3)

    # Draw Arrows
    arrow_props = dict(arrowstyle="-|>", lw=2, color="#424242", zorder=2)
    
    connections = [
        ('start', 'data_collect', 0.92, 0.89),
        ('data_collect', 'etl', 0.78, 0.77),
        ('etl', 'analytics', 0.68, 0.64),
        ('analytics', 'dashboard', 0.51, 0.47),
        ('dashboard', 'eval', 0.39, 0.34),
        ('eval', 'tkt6', 0.28, 0.23),
        ('tkt6', 'final', 0.15, 0.11)
    ]

    for (src, dst, y_start, y_end) in connections:
        ax.annotate('', xy=(0.5, y_end), xytext=(0.5, y_start), arrowprops=arrow_props)
        
    # Feedback loop arrow (Eval -> Analytics)
    ax.annotate('', xy=(0.8, 0.58), xytext=(0.81, 0.31),
                arrowprops=dict(arrowstyle="-|>", lw=2, color="#d32f2f", connectionstyle="angle,angleA=0,angleB=90,rad=10"))
    ax.annotate('', xy=(0.81, 0.31), xytext=(0.69, 0.31),
                arrowprops=dict(arrowstyle="-", lw=2, color="#d32f2f"))
    ax.text(0.82, 0.45, "Perbaikan\nIteratif", ha='left', va='center', color="#d32f2f", fontweight='bold')

    plt.title("Gambar 1. Diagram Alir Tahapan Pelaksanaan Penelitian dan Pengembangan Prototipe Cura", 
              fontsize=12, fontweight='bold', pad=20)
    
    plt.tight_layout()
    plt.savefig('gambar_1_diagram_alir.png', bbox_inches='tight', dpi=300)
    plt.close()

if __name__ == "__main__":
    draw_flowchart()
