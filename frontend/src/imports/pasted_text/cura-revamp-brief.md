REVISE THE EXISTING CURA — HEALTHTRUST JATIM PROTOTYPE.

IMPORTANT:
Do NOT redesign the entire prototype from scratch.

Keep the existing:
- CURA branding
- blue and white healthcare visual identity
- existing pages
- existing cards
- existing typography
- existing main navigation
- existing prototype interactions

Only improve the following areas:

1. East Java map design
2. Historical year navigation
3. Overview introduction
4. Fixed navigation behavior
5. Remove unnecessary province selector
6. Remove Help Center
7. Add meaningful About Cura content
8. Improve responsive navigation

==================================================
1. CURA IS EXCLUSIVELY FOR EAST JAVA
==================================================

CURA is specifically:

CURA — HealthTrust Jatim
Public Health Intelligence Platform for Jawa Timur.

This platform DOES NOT cover other Indonesian provinces.

Therefore:

REMOVE the Province selector from the top navigation.

Do NOT provide options such as:
- Jawa Barat
- Jawa Tengah
- DKI Jakarta
- Bali
- other provinces

Do not create a province dropdown.

The geographic context is permanently:

JAWA TIMUR

If geographic context needs to be displayed, show it only as a static context label:

Jawa Timur, Indonesia

Do not make it a dropdown.

All:
- maps
- facilities
- indicators
- disease data
- comparisons
- AI Insight
- Open Data

must refer only to Jawa Timur.

==================================================
2. REVISE EAST JAVA MAP ONLY
==================================================

The current East Java map design must be improved.

DO NOT use:
- hexagon maps
- hexagonal grid maps
- abstract tile maps
- distorted geographic shapes
- generic Indonesia map
- entire Java Island map

Use a REALISTIC GEOGRAPHIC-STYLE EAST JAVA MAP.

The visual style should resemble a professional Leaflet / GIS public health map.

The map must clearly show:

- mainland Jawa Timur
- Pulau Madura
- relevant surrounding small islands where appropriate
- kabupaten/kota administrative boundaries

Use actual geographic-style polygon shapes rather than hexagons.

The map should visually resemble a standard administrative map of Jawa Timur.

==================================================
3. MAP VISUAL REFERENCE
==================================================

Use this visual concept:

Dark or very light neutral geographic basemap
+
East Java administrative boundary
+
38 kabupaten/kota polygons
+
clear white administrative border lines
+
choropleth color
+
healthcare facility markers
+
zoom controls
+
layer control

The geographic shape must be immediately recognizable as Jawa Timur.

The map should fill approximately 80–90% of its available visualization area.

Do not leave a huge empty area around the map.

Do not vertically compress the province.

Maintain geographic aspect ratio.

==================================================
4. MAP LABELS
==================================================

Add readable geographic labels.

Do NOT label every small region simultaneously if this causes overlap.

Prioritize important labels such as:

Surabaya
Sidoarjo
Gresik
Malang
Jember
Banyuwangi
Bangkalan
Sampang
Pamekasan
Sumenep
Kediri
Madiun
Probolinggo
Pasuruan
Tuban
Bojonegoro

Use smaller labels for secondary regions.

For crowded regions:
show the full kabupaten/kota name through hover tooltip.

Example:

Hover polygon:

Kabupaten Sampang
Bed Ratio: 0.71 / 1,000
Status: Critical

Click:
open Region Detail.

==================================================
5. MAP FACILITY MARKERS
==================================================

Healthcare facility markers may be displayed above the polygons.

Use recognizable map pins.

Differentiate:

Hospital
= blue medical marker

Puskesmas
= green medical marker

Critical facility/capacity issue
= red marker only when necessary

Do NOT place too many markers simultaneously.

Use clustering or hide detailed markers at provincial zoom.

As the user zooms in:
show more individual facility markers.

==================================================
6. MAP CONTROLS
==================================================

Left side of map:

+
Zoom In

−
Zoom Out

Fullscreen

Reset View

Top-right:

Layers

When Layers is clicked:

Map Layers

○ Bed Ratio
○ Doctor Ratio
○ Stunting
○ DBD Cases

□ Hospitals
□ Puskesmas

Only one choropleth indicator should be selected at a time.

==================================================
7. BED RATIO MAP
==================================================

Default map title:

Peta Distribusi Bed Ratio Jawa Timur

Subtitle:

Rasio ketersediaan tempat tidur rumah sakit per 1.000 penduduk pada 38 kabupaten/kota di Jawa Timur.

Do not use only a confusing continuous blue gradient.

Use meaningful health categories:

ADEQUATE
≥ 1.20
Blue

STABLE
1.00–1.19
Light Blue

WATCH
0.75–0.99
Amber

CRITICAL
< 0.75
Red

Legend must be clearly visible but should not dominate the map.

==================================================
8. HISTORICAL DATA — IMPORTANT
==================================================

The current Overview should NOT imply that only 2024 data exists.

The platform must allow users to explore historical annual data.

Available sample years:

2024
2023
2022
2021

Set:

2024 = default/latest available data.

Add a YEAR SELECTOR instead of province selector.

Top navigation:

CURA context

Jawa Timur, Indonesia

[ 2024 ▼ ]

When clicked:

2024
2023
2022
2021

Selecting a year should update:

- KPI values
- map choropleth
- disease charts
- stunting indicators
- KIA indicators
- regional rankings
- comparison values

For the prototype, simulate different values for each year.

Do not imply real-time data if the available dataset is annual.

==================================================
9. HISTORICAL TREND CHART
==================================================

Where appropriate, do NOT require users to manually select every year just to understand historical trends.

Charts should display multiple years together.

Example:

Healthcare Capacity Trend

2021 ─ 2022 ─ 2023 ─ 2024

Disease Burden Trend

2021 ─ 2022 ─ 2023 ─ 2024

Stunting Trend

2021 ─ 2022 ─ 2023 ─ 2024

AKI Trend

2021 ─ 2022 ─ 2023 ─ 2024

AKB Trend

2021 ─ 2022 ─ 2023 ─ 2024

The global year selector determines the snapshot year.

Historical charts may still display the full 2021–2024 trend.

Highlight the selected year.

==================================================
10. OVERVIEW MUST NOT START ABRUPTLY
==================================================

The current Overview immediately displays dashboard statistics.

Improve the opening section.

Add a compact introductory hero/header BEFORE the KPI cards.

Do not make it excessively large.

Example:

CURA — HealthTrust Jatim

Memahami Kesehatan Jawa Timur
Melalui Data

CURA menyajikan informasi fasilitas kesehatan,
kapasitas layanan, penyakit, serta kesehatan ibu
dan anak di 38 kabupaten/kota Jawa Timur dalam
satu platform data yang mudah dieksplorasi.

[Explore Health Map]    [Ask CURA AI]

Small supporting text:

Data terbaru tersedia: 2024
Cakupan: 38 Kabupaten/Kota Jawa Timur

Then show the dashboard.

==================================================
11. OVERVIEW INFORMATION HIERARCHY
==================================================

The Overview should follow this narrative:

FIRST:
What is CURA?

SECOND:
What geographic area is covered?

THIRD:
What is the latest data period?

FOURTH:
What is the current healthcare situation?

FIFTH:
Where are the disparities?

SIXTH:
How has the situation changed historically?

Recommended order:

INTRODUCTION

↓

2024 HEALTH SNAPSHOT

↓

EAST JAVA HEALTH MAP

↓

PRIORITY REGIONS

↓

HISTORICAL TREND 2021–2024

↓

DISEASE & KIA SUMMARY

↓

DATA SOURCE / LAST UPDATE

==================================================
12. OVERVIEW KPI SECTION
==================================================

Section heading:

Ringkasan Kesehatan Jawa Timur

Supporting text:

Gambaran kapasitas layanan dan indikator kesehatan berdasarkan data tahun 2024.

Then KPI cards:

Healthcare Facilities

Bed Availability Ratio

Priority Regions

Provincial Stunting

Clearly display:

2024 DATA

or

Based on 2024 Data

so users understand the time context.

==================================================
13. ADD SMALL DATA CONTEXT
==================================================

Below major visualizations include:

Data Tahun: 2024

Cakupan:
38 Kabupaten/Kota

Wilayah:
Jawa Timur

For historical chart:

Periode:
2021–2024

This prevents users from misunderstanding the period represented by the visualization.

==================================================
14. FIXED SIDEBAR — DESKTOP
==================================================

The desktop sidebar must be FIXED.

When the user scrolls through Overview:

the sidebar must remain visible.

Use:

position: fixed

or equivalent sticky/fixed prototype behavior.

Sidebar height:

100vh

The MAIN CONTENT should scroll independently.

The sidebar must not move down with dashboard content.

==================================================
15. FIXED TOP NAVBAR
==================================================

The top navigation should also remain visible while scrolling.

Use:

sticky/fixed top navigation.

Top navbar:

[Global Search]

                     Jawa Timur, Indonesia
                     [2024 ▼]
                     ID | EN
                     Info

Remove province dropdown.

Keep the navigation clean.

==================================================
16. SIDEBAR FINAL STRUCTURE
==================================================

CURA
HealthTrust Jatim

Public Health Intelligence

MAIN MENU

Overview

Health Map

Facilities

Disease & KIA

Compare Region

────────────

TOOLS

AI Insight

Open Data

────────────

About Cura

REMOVE:

Help Center

Settings

Login

Province selector

Do not leave empty space where removed menu items existed.

==================================================
17. REMOVE HELP CENTER
==================================================

Remove Help Center completely.

This prototype does not need a Help Center page.

Do not create placeholder support functionality.

Do not leave a Help Center icon.

Do not leave dead navigation.

==================================================
18. ABOUT CURA — KEEP AND IMPLEMENT
==================================================

Keep:

About Cura

Make it functional.

Clicking About Cura should open a dedicated About page.

==================================================
19. ABOUT CURA PAGE
==================================================

Title:

Tentang CURA

Hero:

Data Kesehatan Jawa Timur
Lebih Mudah Dipahami.

Body:

CURA — HealthTrust Jatim adalah platform
informasi kesehatan publik yang dirancang untuk
membantu masyarakat, peneliti, mahasiswa, dan
pemangku kebijakan memahami kondisi kesehatan
di Jawa Timur melalui data yang terintegrasi,
visualisasi interaktif, dan analisis berbasis wilayah.

CURA menggabungkan informasi fasilitas kesehatan,
kapasitas tempat tidur, distribusi tenaga kesehatan,
tren penyakit, stunting, serta indikator kesehatan
ibu dan anak dari 38 kabupaten/kota di Jawa Timur.

==================================================
20. ABOUT — PURPOSE
==================================================

Create section:

Tujuan CURA

Use 3 or 4 clean cards.

CARD 1

Transparansi Data

Menyajikan informasi kesehatan Jawa Timur dalam
bentuk yang lebih mudah diakses dan dipahami.

CARD 2

Analisis Wilayah

Membantu melihat perbedaan kondisi dan kapasitas
kesehatan antar kabupaten/kota.

CARD 3

Eksplorasi Data

Memungkinkan pengguna mengeksplorasi peta,
tren historis, fasilitas kesehatan, dan indikator
kesehatan secara interaktif.

CARD 4

Data untuk Keputusan

Mendukung pemanfaatan data sebagai dasar
penelitian, evaluasi, dan perencanaan kesehatan.

==================================================
21. ABOUT — DATA COVERAGE
==================================================

Create section:

Cakupan Data

Show visually:

38
Kabupaten/Kota

447
Rumah Sakit

977
Puskesmas

10
Kelompok Penyakit Utama

2021–2024
Periode Data Historis

Also mention:

- Bed Ratio
- Distribusi Dokter
- Stunting
- AKI
- AKB
- Morbiditas Rawat Inap
- Morbiditas Rawat Jalan

==================================================
22. ABOUT — HOW CURA WORKS
==================================================

Create a simple 4-step visual:

DATA

↓

INTEGRATION

↓

ANALYTICS & GIS

↓

PUBLIC INSIGHT

Labels:

Data Kesehatan

Integrasi Data

Analisis & Pemetaan

Informasi Publik

Do not make this a technical architecture diagram.

Keep it understandable for public users.

==================================================
23. ABOUT — CLOSING
==================================================

Create closing section:

Jelajahi Data Kesehatan Jawa Timur

Gunakan CURA untuk melihat kondisi kesehatan,
membandingkan wilayah, menemukan fasilitas,
dan memahami tren kesehatan Jawa Timur.

Buttons:

Explore Health Map

Explore Open Data

==================================================
24. RESPONSIVE FIXED NAVIGATION
==================================================

Desktop:

Fixed sidebar
+
Sticky top navbar

Tablet:

Collapse sidebar into navigation rail or hamburger.

Mobile:

Remove permanent sidebar.

Use fixed mobile header:

CURA                    ☰

The mobile header stays visible while scrolling.

Click hamburger:

open navigation drawer.

Menu:

Overview
Health Map
Facilities
Disease & KIA
Compare Region

TOOLS

AI Insight
Open Data

About Cura

No Help Center.
No Settings.

==================================================
25. MOBILE YEAR SELECTOR
==================================================

Mobile top context should remain simple.

Do NOT display a province selector.

Example:

Jawa Timur
[2024 ▼]

The year selector should remain accessible.

Do not overcrowd the mobile navbar.

==================================================
26. MOBILE OVERVIEW INTRODUCTION
==================================================

Do not start mobile Overview immediately with KPI cards.

First display:

CURA — HealthTrust Jatim

Memahami Kesehatan Jawa Timur
Melalui Data

Informasi kesehatan 38 kabupaten/kota
dalam satu platform.

[Explore Map]

Then:

Data terbaru
2024

Then KPI cards.

==================================================
27. PROTOTYPE INTERACTION FOR YEAR
==================================================

Make year selection demonstrable.

Demo flow:

Overview

→ Click 2024

→ dropdown appears:

2024
2023
2022
2021

→ select 2022

→ update year badge to 2022

→ update KPI values

→ update choropleth state

→ highlight 2022 in historical trend chart

→ show toast:

"Data tahun 2022 ditampilkan"

This does not need a real backend.

Use realistic prototype states.

==================================================
28. DO NOT INVENT UNSUPPORTED CURRENT DATA
==================================================

The prototype is being demonstrated using historical health data.

Therefore:

Do not display Q3 2026 as if it is real available data.

Do not display live data unless explicitly supported.

Use:

Latest Available Data:
2024

Historical:
2021–2024

For prototype interactions, historical values can be representative mock data.

Clearly label mock/demo values when appropriate.

==================================================
29. FINAL NAVIGATION
==================================================

Final desktop sidebar:

CURA
HealthTrust Jatim

Overview
Health Map
Facilities
Disease & KIA
Compare Region

TOOLS
AI Insight
Open Data

ABOUT
About Cura

Nothing else.

==================================================
30. FINAL QUALITY REQUIREMENTS
==================================================

Do NOT redesign unrelated sections.

Focus this revision on:

✓ Geographic East Java map instead of hexagons

✓ Readable kabupaten/kota boundaries

✓ Facility markers

✓ Proper geographic labels

✓ Historical data 2021–2024

✓ 2024 as latest/default year

✓ Historical trend visualization

✓ Remove province selector

✓ East Java is permanent platform scope

✓ Add Overview introduction before dashboard

✓ Fixed desktop sidebar

✓ Sticky top navigation

✓ Responsive mobile navigation

✓ Remove Help Center

✓ Remove Settings

✓ Keep and implement About Cura

✓ About Cura contains meaningful public information

✓ No dead navigation items

✓ No unsupported Q3 2026 data

✓ Keep existing CURA healthcare visual identity

The final result should feel like a complete public health data portal specifically built for:

PROVINSI JAWA TIMUR, INDONESIA.

It should NOT feel like a generic multi-province Indonesian health dashboard.