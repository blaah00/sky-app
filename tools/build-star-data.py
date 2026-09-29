#!/usr/bin/env python3
"""
Builds the bundled star and constellation files in data/ from their original sources.

Why this exists: the app ships these files inside the repo (no live download), so this
script records exactly where they came from and lets anyone rebuild and check them.
It downloads each source at a pinned version, refuses to continue if the file's
fingerprint (SHA-256) has changed, then writes small JSON files the app can load.

Run from the project folder:   python3 tools/build-star-data.py
Needs only Python 3 (no extra packages). Downloads ~34 MB into tools/.cache/ (not committed).
"""
import csv, hashlib, json, os, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.join(HERE, ".cache")
OUT = os.path.join(ROOT, "data")

# Pinned sources: exact commit + expected SHA-256. If a source changes, this script stops.
STELLARIUM_COMMIT = "014fbb5e59233d133c22f9811af96b67d05a95c9"
HYG_COMMIT = "c7f7f883fe678cc7680169a50ccd7dcc49b060ce"
SOURCES = {
    "hygdata_v41.csv": (
        f"https://raw.githubusercontent.com/astronexus/HYG-Database/{HYG_COMMIT}/hyg/CURRENT/hygdata_v41.csv",
        "d9f69fd86bbf90a4e4d52b4c5c53eacfa6dfc0bfdef85bfd94f095e0bebe4ebd"),
    "western.index.json": (
        f"https://raw.githubusercontent.com/Stellarium/stellarium-skycultures/{STELLARIUM_COMMIT}/western/index.json",
        "a861accd345249a185a5ecfc2a516f34291c0aa52f4bb8d8337ffc53e9cef6b9"),
    "indian.index.json": (
        f"https://raw.githubusercontent.com/Stellarium/stellarium-skycultures/{STELLARIUM_COMMIT}/indian/index.json",
        "df564ac2c250ecdd84e1ddcd383463ba6072e770f013d58401ba90de19590574"),
}

MAG_LIMIT = 6.5   # faintest stars kept: roughly the naked-eye limit under a dark sky


def fetch(name):
    url, want = SOURCES[name]
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        print("downloading", url)
        urllib.request.urlretrieve(url, path)
    got = hashlib.sha256(open(path, "rb").read()).hexdigest()
    if got != want:
        raise SystemExit(f"FINGERPRINT MISMATCH for {name}\n expected {want}\n got      {got}")
    return path


def main():
    western = json.load(open(fetch("western.index.json"), encoding="utf-8"))
    indian = json.load(open(fetch("indian.index.json"), encoding="utf-8"))

    # Every star used by a constellation line must be in the star file, even if faint.
    line_stars = set()
    for c in western["constellations"] + indian["constellations"]:
        for seg in c.get("lines", []):
            line_stars.update(h for h in seg if isinstance(h, int))

    stars, found = [], set()
    with open(fetch("hygdata_v41.csv"), newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if not r["hip"] or r["proper"] == "Sol":
                continue
            hip, mag = int(r["hip"]), float(r["mag"])
            if mag > MAG_LIMIT and hip not in line_stars:
                continue
            found.add(hip)
            # [hip, RA degrees, Dec degrees, magnitude, proper name, Bayer/Flamsteed + constellation]
            desig = " ".join(x for x in (r["bayer"] or r["flam"], r["con"]) if x)
            stars.append([hip, round(float(r["ra"]) * 15, 4), round(float(r["dec"]), 4),
                          round(mag, 2), r["proper"], desig])
    stars.sort(key=lambda s: s[3])
    missing = sorted(line_stars - found)

    def lines(c):
        return [[h for h in seg if isinstance(h, int)] for seg in c.get("lines", [])]

    west = [{"id": c["iau"], "name": c["common_name"].get("native"),
             "english": c["common_name"].get("english"), "lines": lines(c)}
            for c in western["constellations"]]
    ind = [{"id": c["id"].split()[-1], "sanskrit": c["common_name"].get("pronounce"),
            "english": c["common_name"].get("english"), "lines": lines(c)}
           for c in indian["constellations"]]

    os.makedirs(OUT, exist_ok=True)
    def write(name, obj, source):
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
            json.dump({"source": source, "license": "CC BY-SA 4.0", "data": obj},
                      f, ensure_ascii=False, separators=(",", ":"))
    write("stars.json", stars,
          f"HYG Database v4.1 (astronexus, commit {HYG_COMMIT[:7]}), stars to mag {MAG_LIMIT} "
          "plus all stars used by constellation lines. Row = [hip, ra_deg, dec_deg, mag, name, designation]")
    write("constellations-western.json", west,
          f"Stellarium sky cultures, 'western' (commit {STELLARIUM_COMMIT[:7]}). Lines are lists of HIP star numbers.")
    write("constellations-indian.json", ind,
          f"Stellarium sky cultures, 'indian' Vedic nakshatras (commit {STELLARIUM_COMMIT[:7]}). Lines are lists of HIP star numbers.")

    print(f"stars: {len(stars)}  western constellations: {len(west)}  indian nakshatras: {len(ind)}")
    print(f"line stars missing from catalogue: {len(missing)} {missing[:20]}")


if __name__ == "__main__":
    main()
