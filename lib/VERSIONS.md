# Third-party libraries (vendored)

These files are copied into the repo on purpose: nothing is loaded from the internet at run time,
so no future update by anyone can change what the app runs. To update a library, repeat the steps
below for the new version, check its changelog, and get the owner's approval first.

## astronomy-engine 2.1.19
- **What:** Sun, Moon, planet positions, rise/set times, moon phases, eclipses.
- **Maintainer:** Don Cross (npm user `cosinekitty`), https://github.com/cosinekitty/astronomy
- **Licence:** MIT (text is at the top of the file itself).
- **Source:** https://registry.npmjs.org/astronomy-engine/-/astronomy-engine-2.1.19.tgz
- **npm fingerprint (sha512), verified 29 Sep 2026:**
  `8yWKNf7UeNbH458h3sAJ6ZgAjE5jTXp/mNNRFoC20j2SHwZIjAQeEsBB2Q3uCFRaTCCJRv33K2XhkhZQMXoX6w==`
- **File used:** `package/esm/astronomy.js` → `astronomy-engine-2.1.19/astronomy.js` (unminified, readable; no dependencies)
- **SHA-256 of our copy:** `068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7`

## satellite.js 7.1.0
- **What:** SGP4 orbit maths: turns CelesTrak orbit data into satellite positions.
- **Maintainers:** shashwatak, ezze, 1valdis on npm; https://github.com/shashwatak/satellite-js
- **Licence:** MIT (`satellite.js-7.1.0/LICENSE.md`).
- **Source:** https://registry.npmjs.org/satellite.js/-/satellite.js-7.1.0.tgz
- **npm fingerprint (sha512), verified 29 Sep 2026:**
  `U6nRml9Nb7dV9LJPiMNPyna7U7ry+1nXYkOeCEG7K/YbojQQLHHmcjPisp03VNY+HLcbQHqbt7t4t1vQMaKCLQ==`
- **Files used:** every `.js` file under `package/dist/` (48 files), same folder layout, no changes.
  Version 7 ships only as separate ES modules (no single-file build any more), hence many files.
  The optional WebAssembly speed-up is *not* included and not used; its loader is only reached if called.
- **SHA-256 of all our .js files concatenated in sorted path order:**
  `9126699d516a707fdf84406263b6adf314247a9059711499084d302600d92ab2`

## How to re-verify (on the Mac, in the project folder)
```
curl -sO https://registry.npmjs.org/satellite.js/-/satellite.js-7.1.0.tgz
openssl dgst -sha512 -binary satellite.js-7.1.0.tgz | openssl base64 -A
```
The output must equal the npm fingerprint above. Then unpack and compare the files with `diff -r`.
