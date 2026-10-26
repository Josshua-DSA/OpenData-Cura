REVISE AND IMPROVE THE EXISTING CURA PROTOTYPE.

Do NOT redesign the project from scratch.
Keep the existing CURA visual identity, content, navigation structure, and healthcare analytics concept.

Fix the following major UX/UI problems:

1. The East Java map is currently too small, too flat, and difficult to read.
2. The map does not use the available card space effectively.
3. The prototype is not responsive on mobile devices.
4. Some navigation/utility items have no meaningful function.
5. Remove Settings completely if it does not have a real public-facing function.
6. Improve responsive behavior across desktop, tablet, and mobile.
7. Keep the prototype fully interactive and demo-ready.

==================================================
A. CRITICAL FIX — EAST JAVA MAP
==================================================

The current "Peta Distribusi Bed Ratio" is unacceptable because the geographic visualization is too small and compressed vertically.

REDESIGN THIS MAP.

The East Java map must become the visual focus of the card.

Use a recognizable and readable geographic representation of:

JAWA TIMUR / EAST JAVA, INDONESIA

including:
- mainland East Java
- Madura
- visible kabupaten/kota boundaries

Do NOT use:
- an extremely thin horizontal map
- tiny geographic shapes floating in a huge empty card
- random abstract polygons
- generic Indonesia map
- entire Java Island map
- distorted East Java geometry
- excessive empty space around the province

FIT THE MAP TO THE AVAILABLE CONTAINER.

The map should occupy approximately:
75–85% of the usable map visualization area.

Automatically zoom and center the East Java provincial boundary so the province fills the card naturally.

Maintain the correct geographic aspect ratio.
NEVER stretch or flatten the map just to fill the container.

Use sufficient vertical height.

Desktop map visualization:
minimum approximately 480–560px high.

The East Java geometry should be immediately recognizable at first glance.

==================================================
B. EAST JAVA MAP COMPOSITION
==================================================

Desktop layout:

┌──────────────────────────────────────────────────────┐
│ Peta Distribusi Bed Ratio                            │
│ Rasio tempat tidur per 1.000 penduduk                │
│                                                      │
│ [Bed Ratio ▼] [Q3 2026 ▼] [All Regions ▼]           │
│                                                      │
│              LARGE EAST JAVA MAP                     │
│                                                      │
│     MAINLAND EAST JAVA                  MADURA        │
│                                                      │
│                                                      │
│  Bed Ratio                                           │
│  0.42 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 2.45         │
│                                                      │
│  ● Adequate   ● Stable   ● Watch   ● Critical       │
└──────────────────────────────────────────────────────┘

Reduce unnecessary blank space.

The map must be much larger than the legend.

==================================================
C. MAP BOUNDARIES
==================================================

Display visible boundaries between kabupaten/kota.

Boundary style:
- thin white or light neutral strokes
- approximately 1–1.5px
- enough contrast to distinguish neighboring regions

Do not make boundaries too thick.

Use choropleth fill based on Bed Ratio.

The choropleth should contain enough contrast that different regions can be distinguished.

==================================================
D. MAP COLOR SCALE
==================================================

The current blue gradient alone is difficult to interpret.

For public health interpretation, provide meaningful categories.

Use:

Adequate
>= 1.20 beds / 1,000
Medical Blue / Safe tone

Stable
1.00–1.19
Light Blue

Watch
0.75–0.99
Amber

Critical
< 0.75
Medical Red

Colors:

Medical Blue:
#1677C8

Light Blue:
#8EC5E8

Warning Amber:
#E5A33B

Critical Red:
#D94A4A

Do not use red as a decorative color.
Red means critical condition only.

If a continuous Bed Ratio gradient is retained, ALSO display category/status information so users can understand whether a value is adequate or critical.

==================================================
E. MAP LABELS
==================================================

Do not label all 38 regions simultaneously if it makes the map cluttered.

Show important labels by default, for example:

Surabaya
Sidoarjo
Malang
Jember
Banyuwangi
Sampang
Bangkalan
Sumenep

For smaller regions:
show names through hover/tooltips.

Labels must never overlap excessively.

==================================================
F. MAP HOVER INTERACTION
==================================================

Every region must be interactive.

On hover:
highlight the selected kabupaten/kota.

Show tooltip:

Kabupaten Sampang

Bed Ratio
0.71 beds / 1,000

WHO Benchmark
1.00 beds / 1,000

Status
CRITICAL

Hospitals
7

Puskesmas
22

Button:
View Region

Use red status badge only for Critical.

==================================================
G. MAP CLICK INTERACTION
==================================================

When a user clicks a kabupaten/kota:

Open a right-side Region Detail Drawer.

Example:

KABUPATEN SAMPANG

Health Capacity

Bed Ratio
0.71 / 1,000
CRITICAL

Hospitals
7

Puskesmas
22

Doctor Ratio
8.2 / 100K

Stunting
22.8%

Disease Burden
High

Actions:

View Full Region Profile

Compare Region

Ask CURA AI

All actions must be functional in the prototype.

==================================================
H. MAP CONTROLS
==================================================

Add useful controls without covering the map.

Top-right controls:

[ + ]
[ - ]
[ Reset ]

Optional:
[ Fullscreen ]

Add a Layers button.

Clicking Layers opens a small floating panel:

MAP LAYERS

○ Bed Ratio
○ Doctor Ratio
○ Stunting
○ DBD Cases

□ Hospitals
□ Puskesmas

Changing the selected metric should visually change the map state.

==================================================
I. REMOVE SETTINGS
==================================================

REMOVE "Settings" from the entire public Cura prototype.

This is a public health information portal and there is currently no meaningful user configuration requiring a Settings page.

Do not create an empty Settings page.

Do not include Settings just because typical dashboards have one.

The sidebar should contain ONLY useful public navigation.

PRIMARY NAVIGATION:

1. Overview
2. Health Map
3. Facilities
4. Disease & KIA
5. Compare Region

TOOLS:

AI Insight
Open Data

BOTTOM:

Help Center
About Cura

No Settings.

No Login.

==================================================
J. RESPONSIVE DESIGN — CRITICAL REQUIREMENT
==================================================

The existing prototype is too desktop-oriented.

REDESIGN THE ENTIRE CURA PROTOTYPE USING RESPONSIVE AUTO LAYOUT.

The interface must work correctly on:

Desktop:
1440px

Tablet:
768–1024px

Mobile:
375–430px

Do NOT simply shrink the desktop interface.

Create actual responsive behavior.

==================================================
K. DESKTOP BEHAVIOR
==================================================

At >= 1200px:

Sidebar:
230px fixed

Main content:
remaining width

Dashboard:
12-column grid

KPI cards:
4 cards per row

Map:
large full-width or approximately 8–9 columns

Side information:
3–4 columns

Tables:
full desktop table

==================================================
L. TABLET BEHAVIOR
==================================================

At 768–1199px:

Collapse the sidebar.

Use a compact navigation rail or hamburger menu.

KPI cards:
2 cards per row.

Map:
full content width.

Priority Regions:
move below map.

Charts:
maximum 2 columns where appropriate.

Tables:
allow horizontal scrolling only when absolutely necessary.

Filters:
wrap naturally.

==================================================
M. MOBILE NAVIGATION
==================================================

At <= 767px:

REMOVE the permanent left sidebar.

Use a mobile top header.

Mobile header:

┌──────────────────────────────┐
│ CURA                    ☰    │
│ HealthTrust Jatim            │
└──────────────────────────────┘

Click hamburger:
open navigation drawer.

Drawer:

CURA
HealthTrust Jatim

Overview
Health Map
Facilities
Disease & KIA
Compare Region

────────────

AI Insight
Open Data

────────────

Help Center
About Cura

No Settings.

Drawer can be closed by:
- X button
- tapping outside
- selecting a menu

==================================================
N. MOBILE OVERVIEW
==================================================

Mobile width:
375–430px.

Use single-column layout.

Correct order:

Health Resilience Overview

[Period Filter]

[Healthcare Facilities]

[Bed Availability]

[Priority Regions]

[Provincial Stunting]

[East Java Health Map]

[Disease Burden Trend]

[Priority Regions]

[Health System Snapshot]

Never display four tiny KPI cards horizontally.

Each card should have enough width for readable text.

==================================================
O. MOBILE EAST JAVA MAP
==================================================

The East Java map MUST remain usable on mobile.

Do NOT shrink it into a tiny horizontal strip.

Use a dedicated map card.

Mobile example:

┌──────────────────────────────┐
│ Peta Distribusi Bed Ratio    │
│ Jawa Timur · Q3 2026         │
│                              │
│ [ Bed Ratio ▼ ] [ Layers ]   │
│                              │
│                              │
│      EAST JAVA MAP           │
│                              │
│                              │
│        MADURA                │
│                              │
│ Critical <0.75               │
│ Watch 0.75–0.99              │
│ Stable 1.00–1.19             │
│ Adequate ≥1.20               │
└──────────────────────────────┘

Minimum map area height:
approximately 300–360px.

Fit East Java into the available mobile viewport while maintaining its geographic aspect ratio.

Allow:
- tap region
- pan
- zoom
- reset view

On mobile, tapping a region should open a BOTTOM SHEET instead of a desktop right drawer.

==================================================
P. MOBILE REGION BOTTOM SHEET
==================================================

Example:

Kabupaten Sampang

CRITICAL

Bed Ratio
0.71 / 1,000

WHO Benchmark
1.00

Hospitals
7

Puskesmas
22

[View Region]

[Compare]

Allow swipe or close interaction.

==================================================
Q. MOBILE FACILITIES
==================================================

Do NOT force the full desktop facility table into a 375px screen.

Desktop:
table view.

Mobile:
convert facility rows into cards.

Example:

RSUD Dr. Soetomo

Hospital · Class A

Kota Surabaya

Beds
1,200

Government

[View Detail]

--------------------------------

RSUD Dr. Saiful Anwar

Hospital · Class A

Kota Malang

[View Detail]

Filters should open through:

[Filter]

Click:
bottom sheet.

==================================================
R. MOBILE DISEASE & KIA
==================================================

Tabs should be horizontally scrollable if necessary.

Disease Burden
KIA
Communicable Disease

Charts must resize to container width.

Do not crop axis labels.

Do not allow charts to overflow screen width.

Top 10 Diseases:
use horizontal bars optimized for narrow screens.

==================================================
S. MOBILE COMPARE REGION
==================================================

Do NOT display a desktop side-by-side table squeezed into mobile.

Use:

Compare Regions

[Surabaya ▼]

VS

[Sampang ▼]

Then stack comparison metrics vertically:

BED RATIO

Surabaya
1.48
ADEQUATE

Sampang
0.71
CRITICAL

----------------

STUNTING

Surabaya
14.3%

Sampang
22.8%

----------------

HOSPITALS

Surabaya
59

Sampang
7

This must remain easy to read on a 375px screen.

==================================================
T. RESPONSIVE TYPOGRAPHY
==================================================

Desktop:
Page Title 28px
Section Title 18px
KPI 30–32px
Body 14px

Mobile:
Page Title 22–24px
Section Title 17px
KPI 26–28px
Body 14px
Caption 12px

Never make body text smaller than 12px.

==================================================
U. RESPONSIVE SPACING
==================================================

Desktop:
24px outer padding
16–20px gaps

Tablet:
20px padding
16px gaps

Mobile:
16px padding
12–16px gaps

Cards should use approximately:
16px mobile internal padding.

==================================================
V. RESPONSIVE CHARTS
==================================================

All charts must use responsive containers.

Charts must:
- resize with parent container
- preserve readable labels
- never overflow horizontally
- never become extremely compressed vertically

On mobile:
reduce unnecessary gridlines and labels rather than shrinking all text.

==================================================
W. AI INSIGHT MOBILE
==================================================

Desktop:
right-side AI panel.

Mobile:
full-screen AI panel.

Header:

← CURA AI Insight

Suggested questions become horizontally scrollable chips.

Chat input remains fixed near bottom.

==================================================
X. OPEN DATA MOBILE
==================================================

Dataset cards become single-column.

Each dataset card:

Dataset Name

Description

Records

Last Updated

[CSV] [Parquet]

[Download]

No wide desktop tables.

==================================================
Y. TOUCH TARGETS
==================================================

All mobile interactive elements must have touch-friendly dimensions.

Minimum target:
44px approximately.

This includes:
- buttons
- hamburger
- dropdowns
- map controls
- filter controls
- close buttons
- navigation items

==================================================
Z. DEMO-READY RESPONSIVE PROTOTYPE
==================================================

The final Figma Make prototype must demonstrate BOTH:

DESKTOP FLOW
1440px

and

MOBILE FLOW
390px

Create representative mobile screens for:

1. Mobile Overview
2. Mobile Health Map
3. Mobile Facilities
4. Mobile Disease & KIA
5. Mobile Compare Region
6. Mobile navigation drawer
7. Mobile Region Bottom Sheet
8. Mobile AI Insight

Connect the mobile prototype interactions.

==================================================
FINAL QUALITY CHECK
==================================================

Before completing the redesign, verify:

✓ East Java map is large and readable.

✓ East Java map is not vertically compressed.

✓ East Java and Madura are recognizable.

✓ Map uses available card space efficiently.

✓ Kabupaten/kota boundaries are visible.

✓ Map regions have hover/tap interactions.

✓ Bed Ratio status is understandable.

✓ Desktop layout works at 1440px.

✓ Tablet layout adapts correctly.

✓ Mobile layout works at 390px.

✓ Sidebar disappears appropriately on mobile.

✓ Hamburger navigation works.

✓ Tables transform appropriately on mobile.

✓ Charts do not overflow.

✓ Filters are usable on touch screens.

✓ Region drawer becomes bottom sheet on mobile.

✓ AI Insight becomes full-screen on mobile.

✓ Settings has been completely removed.

✓ No empty or decorative navigation items remain.

✓ No lorem ipsum.

✓ Existing CURA blue-white-red healthcare identity is maintained.

✓ The final result is polished and ready for a live demo.

DO NOT prioritize decorative visual effects over readability.

The highest priorities are:

1. READABLE EAST JAVA MAP
2. ACCURATE EAST JAVA GEOGRAPHIC CONTEXT
3. RESPONSIVE MOBILE UX
4. FUNCTIONAL PROTOTYPE INTERACTIONS
5. CLEAN PUBLIC HEALTH DATA VISUALIZATION