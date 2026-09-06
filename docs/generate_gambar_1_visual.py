import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_visual_flowchart():
    fig, ax = plt.subplots(figsize=(11, 14), dpi=300)
    ax.axis('off')
    
    # Background soft gradient color feel (using a light grey rectangle spanning the figure)
    fig.patch.set_facecolor('#f4f6f9')

    # Color Palette & Styling
    colors = {
        'phase1': '#e3f2fd', 'border1': '#1e88e5',
        'phase2': '#f3e5f5', 'border2': '#8e24aa',
        'phase3': '#e8f5e9', 'border3': '#43a047',
        'phase4': '#fff3e0', 'border4': '#fb8c00',
        'phase5': '#ffebee', 'border5': '#e53935',
        'phase6': '#e0f7fa', 'border6': '#00acc1',
        'phase7': '#eceff1', 'border7': '#546e7a',
    }

    box_props = dict(boxstyle="round4,pad=0.8", linewidth=2.5, zorder=3)
    
    nodes = [
        # (ID, Text, Y-pos, Style Key)
        ('start', '[FASE 1]\nStudi Literatur & FGD Mitra\n(BPS, Kemenkes, Dinkes Jatim)', 0.92, 'phase1'),
        ('etl', '[FASE 2]\nIntegrasi Data & Arsitektur (ETL)\n(447 RS, 977 Puskesmas, PostGIS, Feature Store)', 0.79, 'phase2'),
        ('analytics', '[FASE 3]\nAnalitika & Pemodelan Cerdas\n(Clustering K-Means, Prediksi SARIMAX, Klasifikasi Bayesian)', 0.64, 'phase3'),
        ('dashboard', '[FASE 4]\nIntegrasi Dasbor Interaktif (TKT 4)\n(Database PostgreSQL/PostGIS, API FastAPI, UI/UX)', 0.49, 'phase4'),
        ('eval', '[FASE 5]\nUji Fungsional & Quality Gates\n(CI/CD Pipeline, Unit Testing, Evaluasi Internal)', 0.35, 'phase5'),
        ('tkt6', '[FASE 6]\nValidasi Lingkungan Operasional (TKT 6)\n(Uji Coba Bersama Dinkes Jatim & Bappeda)', 0.20, 'phase6'),
        ('final', '[FASE 7]\nImplementasi Akhir\n(Laporan, Publikasi Ilmiah, Hak Cipta)', 0.07, 'phase7')
    ]

    # Draw Nodes
    for (node_id, text, y_pos, style) in nodes:
        props = box_props.copy()
        props['facecolor'] = colors[style]
        props['edgecolor'] = colors[style.replace('phase', 'border')]
        
        ax.text(0.5, y_pos, text, ha='center', va='center', 
                size=12, fontweight='bold', family='sans-serif', bbox=props, color='#212121')

    # Draw Arrows with Shadows/Thickness
    arrow_props = dict(arrowstyle="-|>,head_width=0.6,head_length=0.8", lw=3.5, color="#455a64", zorder=2)
    
    y_coords = [n[2] for n in nodes]
    for i in range(len(y_coords)-1):
        y_start = y_coords[i] - 0.04
        y_end = y_coords[i+1] + 0.05
        # Draw arrow line
        ax.annotate('', xy=(0.5, y_end), xytext=(0.5, y_start), arrowprops=arrow_props)
        
    # Feedback loop arrow (Eval -> Analytics)
    loop_start_y = 0.35
    loop_end_y = 0.64
    
    # Custom drawn path for feedback loop
    ax.annotate('', xy=(0.80, loop_end_y), xytext=(0.81, loop_start_y),
                arrowprops=dict(arrowstyle="-|>,head_width=0.6,head_length=0.8", lw=3, color="#d32f2f", 
                                connectionstyle="angle,angleA=0,angleB=90,rad=15"))
    ax.annotate('', xy=(0.81, loop_start_y), xytext=(0.75, loop_start_y),
                arrowprops=dict(arrowstyle="-", lw=3, color="#d32f2f"))
    
    # Add a glowing badge text for the loop
    ax.text(0.82, 0.49, "Perbaikan Iteratif\n(Siklus Evaluasi)", ha='left', va='center', 
            color="#b71c1c", fontweight='bold', size=11, 
            bbox=dict(boxstyle="round,pad=0.5", facecolor="#ffcdd2", edgecolor="#b71c1c", alpha=0.9))

    # Add Title
    plt.text(0.5, 1.0, "Gambar 1. Diagram Alir Tahapan Penelitian Prototipe Cura", 
             ha='center', va='top', fontsize=15, fontweight='bold', color='#263238', family='sans-serif')
             
    plt.tight_layout()
    plt.savefig('gambar_1_diagram_alir_visual.png', bbox_inches='tight', dpi=300)
    plt.close()

if __name__ == "__main__":
    draw_visual_flowchart()
