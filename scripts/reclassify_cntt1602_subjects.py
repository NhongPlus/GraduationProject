"""Reclassify subjects in cntt1602_grades.json into 6 curriculum clusters."""
import json
from pathlib import Path

MAP = {
    "S01": ("skills_support", "pe", "PE001"),
    "S02": ("skills_support", "pe", "PE002"),
    "S03": ("skills_support", "pe", "PE003"),
    "S04": ("skills_support", "pe", "PE004"),
    "S05": ("skills_support", "pe", "PE005"),
    "S06": ("internship", "capstone", "INT001"),
    "S07": ("general_ed", "law", "LAW001"),
    "S08": ("skills_support", "soft_skills", "SKL001"),
    "S09": ("foundation", "math", "MATH001"),
    "S10": ("foundation", "intro", "CS001"),
    "S11": ("foundation", "programming", "CS111"),
    "S12": ("internship", "cntt1", "CS101"),
    "S13": ("general_ed", "philosophy", "PHI001"),
    "S14": ("general_ed", "politics", "PHI002"),
    "S15": ("foundation", "english", "ENG101"),
    "S16": ("foundation", "math", "MATH101"),
    "S17": ("foundation", "math", "STAT001"),
    "S18": ("skills_support", "geo", "GIS001"),
    "S19": ("internship", "cntt2", "CS102"),
    "S20": ("foundation", "english", "ENG102"),
    "S21": ("foundation", "math", "MATH201"),
    "S22": ("foundation", "programming", "CS201"),
    "S23": ("foundation", "network", "NET301"),
    "S24": ("foundation", "programming", "CS202"),
    "S25": ("internship", "cntt3", "CS103"),
    "S26": ("general_ed", "national_defense", "ND001"),
    "S27": ("general_ed", "national_defense", "ND002"),
    "S28": ("general_ed", "national_defense", "ND003"),
    "S29": ("general_ed", "national_defense", "ND004"),
    "S30": ("skills_support", "soft_skills", "SKL002"),
    "S31": ("foundation", "english", "ENG103"),
    "S32": ("foundation", "database", "DB001"),
    "S33": ("foundation", "iot", "CS331"),
    "S34": ("ai_ml", "ai", "AI401"),
    "S35": ("general_ed", "politics", "PHI003"),
    "S36": ("foundation", "english", "ENG104"),
    "S37": ("foundation", "systems", "SA001"),
    "S38": ("ai_ml", "ml", "ML501"),
    "S39": ("ai_ml", "data_eng", "DT501"),
    "S40": ("general_ed", "philosophy", "PHI004"),
    "S41": ("software_eng", "se", "SE601"),
    "S42": ("software_eng", "mobile", "CS621"),
    "S43": ("ai_ml", "big_data", "BD601"),
    "S44": ("internship", "cntt5", "CS105"),
    "S45": ("general_ed", "history", "HIS001"),
    "S46": ("foundation", "english", "ENG105"),
    "S47": ("internship", "cntt6", "CS106"),
    "S48": ("skills_support", "security", "SEC001"),
    "S49": ("skills_support", "digital", "DS801"),
    "S50": ("foundation", "network", "NET801"),
    "S51": ("skills_support", "it_business", "IT001"),
    "S52": ("software_eng", "testing", "SE802"),
}

LABELS = {
    "foundation": "Khối nền tảng",
    "ai_ml": "Khối AI/ML",
    "software_eng": "Khối Software Engineering",
    "internship": "Khối thực tập / đồ án",
    "general_ed": "Khối đại cương bắt buộc",
    "skills_support": "Khối kỹ năng / thể chất / hỗ trợ",
}


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    path = root / "cntt1602_grades.json"
    data = json.loads(path.read_text(encoding="utf-8"))

    for s in data["subjects"]:
        sid = s["id"]
        cat, sub, code = MAP[sid]
        s["category_legacy"] = s.get("category")
        s["category"] = cat
        s["sub_category"] = sub
        s["code"] = code
        s["category_label"] = LABELS[cat]

    clusters: dict = {}
    for s in data["subjects"]:
        c = s["category"]
        clusters.setdefault(c, {"label": LABELS[c], "subjects": []})
        clusters[c]["subjects"].append(
            {
                "id": s["id"],
                "name": s["name"],
                "sub_category": s["sub_category"],
                "code": s["code"],
                "credits": s["credits"],
            }
        )

    data["metadata"]["subject_taxonomy_version"] = "2026-05-15"
    data["metadata"]["subject_clusters"] = clusters
    data["metadata"]["total_credits"] = sum(s["credits"] for s in data["subjects"])
    data["metadata"]["graduation_credit_target"] = 120
    data["metadata"]["notes"] = (
        "category = 6 khối lớn; sub_category = nhóm con. "
        "Sơ đồ & luồng: docs/DOMAIN_MODEL.md"
    )

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Updated {len(data['subjects'])} subjects")
    for c in sorted(clusters):
        print(f"  {c}: {len(clusters[c]['subjects'])} mon")


if __name__ == "__main__":
    main()
