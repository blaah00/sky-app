# Bundled data: sources and licences

All three files are built by `tools/build-star-data.py` from pinned source versions whose
fingerprints are checked before building. Re-run the script to reproduce them exactly.

| File | Source | Licence |
|---|---|---|
| `stars.json` | HYG Database v4.1, David Nash / astronexus, https://github.com/astronexus/HYG-Database (commit c7f7f88). Stars to magnitude 6.5 plus any star used in a constellation line. | CC BY-SA 4.0 |
| `constellations-western.json` | Stellarium sky cultures, "western", https://github.com/Stellarium/stellarium-skycultures (commit 014fbb5) | CC BY-SA (text and data) |
| `constellations-indian.json` | Stellarium sky cultures, "indian" (Indian Vedic), by Tanmoy Saha, Vishvas Vasuki and the sanskrit-coders community, re-worked by Susanne M Hoffmann (same commit) | CC BY-SA |

**What CC BY-SA means for us, in plain words:** we may use and change these files freely, including in an
app, as long as (1) the app credits the sources (a line on an About/credits screen), and (2) these data
files, and any changed versions of them, stay under the same licence. It does not affect the licence of
our own code.

SHA-256 of the built files (29 Sep 2026):
- stars.json `3e59b344b686db7458aa303a316bf7a01a64a092f521e50df84c246b339ea3f7`
- constellations-western.json `3b97569315f142d2e370df96db401bbaa2ddc85ac7afbeabf61f25d5ed03a2c7`
- constellations-indian.json `2e670044ee45fb5d1c52c9da50f7e4e2271a9b5fa3e3b018b541a973b9c62a5b`

Notes:
- The Indian set has 28 nakshatra figures (it includes Abhijit). The panchang uses 27.
- Stellarium has no separate figures for the 12 rashis. Rashis are equal 30° slices of the sky, not star patterns.
