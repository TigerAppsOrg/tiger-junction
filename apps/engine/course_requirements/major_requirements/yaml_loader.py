"""
Loads HoagiePlan requirement YAML files into plain dicts.
Adapted from plan/backend/data/insert_yamls.py — all Django dependencies removed.

The output dict shape matches what requirement_checker.py expects:
{
    "id": <auto-assigned int>,
    "name": str,
    "code": str | None,
    "max_counted": int | None,
    "min_needed": int,
    "double_counting_allowed": bool,
    "max_common_with_major": int | None,
    "completed_by_semester": int,
    "dept_list": list[str] | None,
    "dist_req": list[str] | None,
    "num_courses": int | None,
    "no_req": bool,
    "table": str,  # "Degree", "Major", "Minor", "Certificate", or "Requirement"
    "settled": [],
    "unsettled": [],
    "count": 0,
    "req_list": [...] | absent,
    "course_list": [...] | absent,
    "excluded_course_list": [...] | absent,
}
"""

import json
import logging
import re
from pathlib import Path
from typing import Any

import yaml

from .constants import BSE_MAJORS, LANG_DEPTS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"

_next_id = 1


def _alloc_id() -> int:
    global _next_id
    rid = _next_id
    _next_id += 1
    return rid


def reset_ids():
    global _next_id
    _next_id = 1


# ---------------------------------------------------------------------------
# Course list resolution (replaces insert_yamls.load_course_list)
# ---------------------------------------------------------------------------

def resolve_course_list(course_list: list[str], course_catalog: dict[str, set[str]] | None = None):
    """Resolve a YAML course_list into (course_codes, dept_list).

    Args:
        course_list: list of course codes from YAML, e.g. ["COS 226", "MAT 2**", "LANG 107"]
        course_catalog: optional dict mapping dept_code -> set of catalog_numbers
                        available in that department (e.g. {"COS": {"126","217","226",...}}).
                        If None, wildcards are stored as patterns for lazy matching.

    Returns:
        (course_codes, dept_list) where:
            course_codes: list of resolved course code strings, e.g. ["COS 226", "COS 316"]
            dept_list: list of dept codes where the entire dept counts, e.g. ["MAT"]
    """
    course_codes = []
    dept_list = []

    for raw_code in course_list:
        if isinstance(raw_code, dict):
            raw_code = list(raw_code.keys())[0]

        parts = raw_code.replace("/", " ").split()
        dept_code = parts[0]
        course_num = parts[1] if len(parts) > 1 else "*"

        if dept_code == "LANG":
            target_depts = list(LANG_DEPTS.keys())
        else:
            target_depts = [dept_code]

        for dept in target_depts:
            if course_num in ["*", "***"]:
                dept_list.append(dept)
            elif re.match(r"^\d\d\*$", course_num):
                # e.g. "32*" -> starts with "32"
                prefix = course_num[:2]
                if course_catalog and dept in course_catalog:
                    for cat_num in course_catalog[dept]:
                        if cat_num.startswith(prefix):
                            course_codes.append(f"{dept} {cat_num}")
                else:
                    course_codes.append(f"{dept} {course_num}")
            elif re.match(r"^\d\*{1,2}$", course_num):
                # e.g. "3**" or "3*" -> starts with "3"
                prefix = course_num[0]
                if course_catalog and dept in course_catalog:
                    for cat_num in course_catalog[dept]:
                        if cat_num.startswith(prefix):
                            course_codes.append(f"{dept} {cat_num}")
                else:
                    course_codes.append(f"{dept} {course_num}")
            else:
                course_codes.append(f"{dept} {course_num}")

    return course_codes, dept_list


# ---------------------------------------------------------------------------
# YAML -> requirement dict (replaces insert_yamls.push_requirement)
# ---------------------------------------------------------------------------

REQUIREMENT_FIELDS = [
    "name",
    "max_counted",
    "min_needed",
    "explanation",
    "double_counting_allowed",
    "max_common_with_major",
    "pdfs_allowed",
    "min_grade",
    "completed_by_semester",
    "dept_list",
    "dist_req",
    "num_courses",
]


def _build_requirement(yaml_req: dict, course_catalog=None, parent_fields=None) -> dict:
    """Convert a single YAML requirement node into the dict the checker expects."""
    req = {
        "id": _alloc_id(),
        "name": yaml_req.get("name"),
        "code": yaml_req.get("code"),
        "max_counted": None,
        "min_needed": 1,
        "double_counting_allowed": False,
        "max_common_with_major": None,
        "completed_by_semester": 8,
        "dept_list": None,
        "dist_req": None,
        "num_courses": None,
        "no_req": False,
        "table": "Requirement",
        "settled": [],
        "unsettled": [],
        "count": 0,
    }

    # Inherit parent fields
    if parent_fields:
        if "completed_by_semester" in parent_fields:
            req["completed_by_semester"] = parent_fields["completed_by_semester"]
        if "double_counting_allowed" in parent_fields:
            req["double_counting_allowed"] = parent_fields["double_counting_allowed"]

    # Handle no_req
    if "no_req" in yaml_req:
        yaml_req["min_needed"] = 0
        req["no_req"] = True

    # Copy fields from YAML
    for field in REQUIREMENT_FIELDS:
        if field in yaml_req and yaml_req[field] is not None:
            if field == "min_needed":
                val = yaml_req[field]
                if val == "ALL":
                    if "req_list" in yaml_req:
                        req[field] = len(yaml_req["req_list"])
                    elif "course_list" in yaml_req:
                        req[field] = len(yaml_req["course_list"])
                else:
                    req[field] = val
            elif field == "max_counted":
                req[field] = yaml_req[field]
            elif field == "dist_req":
                val = yaml_req[field]
                if isinstance(val, str):
                    req[field] = [val]
                elif isinstance(val, list):
                    req[field] = val
            elif field == "num_courses":
                req[field] = yaml_req[field]
                req["min_needed"] = yaml_req[field]
            else:
                req[field] = yaml_req[field]

    # Build propagatable fields for children
    child_parent_fields = {}
    if req["completed_by_semester"] is not None:
        child_parent_fields["completed_by_semester"] = req["completed_by_semester"]
    if req["double_counting_allowed"]:
        child_parent_fields["double_counting_allowed"] = req["double_counting_allowed"]

    # Recurse into sub-requirements
    if "req_list" in yaml_req and yaml_req["req_list"]:
        req["req_list"] = [
            _build_requirement(sub, course_catalog, child_parent_fields)
            for sub in yaml_req["req_list"]
        ]
    elif "course_list" in yaml_req and yaml_req["course_list"]:
        course_codes, dept_codes = resolve_course_list(yaml_req["course_list"], course_catalog)
        if course_codes:
            req["course_list"] = course_codes
        if dept_codes:
            req["dept_list"] = dept_codes

        if "excluded_course_list" in yaml_req and yaml_req["excluded_course_list"]:
            excluded_codes, _ = resolve_course_list(yaml_req["excluded_course_list"], course_catalog)
            if excluded_codes:
                req["excluded_course_list"] = excluded_codes
    elif (
        req["dist_req"] is None
        and req["num_courses"] is None
        and req["dept_list"] is None
        and not req["no_req"]
    ):
        # Leaf with no courses, no dist, no num — treat as automatically satisfied
        req["max_counted"] = 1
        req["min_needed"] = 0

    return req


# ---------------------------------------------------------------------------
# Top-level loaders
# ---------------------------------------------------------------------------

def load_degree(yaml_path: str | Path, course_catalog=None) -> dict:
    """Load a degree YAML file and return the requirement tree as a dict."""
    data = _load_yaml(yaml_path)
    req = {
        "id": _alloc_id(),
        "name": data.get("name"),
        "code": data.get("code"),
        "max_counted": None,
        "min_needed": len(data.get("req_list", [])),
        "double_counting_allowed": False,
        "max_common_with_major": None,
        "completed_by_semester": 8,
        "dept_list": None,
        "dist_req": None,
        "num_courses": None,
        "no_req": False,
        "table": "Degree",
        "settled": [],
        "unsettled": [],
        "count": 0,
    }
    if "req_list" in data:
        req["req_list"] = [
            _build_requirement(sub, course_catalog) for sub in data["req_list"]
        ]
    return req


def load_major(yaml_path: str | Path, course_catalog=None) -> dict:
    """Load a major YAML file and return the requirement tree as a dict."""
    data = _load_yaml(yaml_path)
    degree_code = "BSE" if data.get("code") in BSE_MAJORS else "AB"
    req = {
        "id": _alloc_id(),
        "name": data.get("name"),
        "code": data.get("code"),
        "degree_code": degree_code,
        "max_counted": None,
        "min_needed": len(data.get("req_list", [])),
        "double_counting_allowed": False,
        "max_common_with_major": None,
        "completed_by_semester": 8,
        "dept_list": None,
        "dist_req": None,
        "num_courses": None,
        "no_req": False,
        "table": "Major",
        "settled": [],
        "unsettled": [],
        "count": 0,
    }
    if "req_list" in data:
        req["req_list"] = [
            _build_requirement(sub, course_catalog) for sub in data["req_list"]
        ]
    return req


def load_minor(yaml_path: str | Path, course_catalog=None) -> dict:
    """Load a minor YAML file and return the requirement tree as a dict."""
    data = _load_yaml(yaml_path)
    req = {
        "id": _alloc_id(),
        "name": data.get("name"),
        "code": data.get("code"),
        "max_counted": None,
        "min_needed": len(data.get("req_list", [])),
        "double_counting_allowed": False,
        "max_common_with_major": None,
        "completed_by_semester": 8,
        "dept_list": None,
        "dist_req": None,
        "num_courses": None,
        "no_req": False,
        "table": "Minor",
        "settled": [],
        "unsettled": [],
        "count": 0,
    }
    if "req_list" in data:
        req["req_list"] = [
            _build_requirement(sub, course_catalog) for sub in data["req_list"]
        ]
    return req


def load_certificate(yaml_path: str | Path, course_catalog=None) -> dict:
    """Load a certificate YAML file and return the requirement tree as a dict."""
    data = _load_yaml(yaml_path)
    req = {
        "id": _alloc_id(),
        "name": data.get("name"),
        "code": data.get("code"),
        "max_counted": None,
        "min_needed": len(data.get("req_list", [])),
        "double_counting_allowed": False,
        "max_common_with_major": None,
        "completed_by_semester": 8,
        "dept_list": None,
        "dist_req": None,
        "num_courses": None,
        "no_req": False,
        "table": "Certificate",
        "settled": [],
        "unsettled": [],
        "count": 0,
    }
    if "req_list" in data:
        req["req_list"] = [
            _build_requirement(sub, course_catalog) for sub in data["req_list"]
        ]
    return req


# ---------------------------------------------------------------------------
# Bulk loaders
# ---------------------------------------------------------------------------

def load_all_degrees(course_catalog=None) -> dict[str, dict]:
    """Load all degree YAMLs. Returns {code: requirement_tree}."""
    results = {}
    for path in sorted((DATA_DIR / "degrees").glob("*.yaml")):
        tree = load_degree(path, course_catalog)
        results[tree["code"]] = tree
    return results


def load_all_majors(course_catalog=None) -> dict[str, dict]:
    """Load all major YAMLs. Returns {code: requirement_tree}."""
    results = {}
    for path in sorted((DATA_DIR / "majors").glob("*.yaml")):
        tree = load_major(path, course_catalog)
        results[tree["code"]] = tree
    return results


def load_all_minors(course_catalog=None) -> dict[str, dict]:
    """Load all minor YAMLs. Returns {code: requirement_tree}."""
    results = {}
    for path in sorted((DATA_DIR / "minors").glob("*.yaml")):
        tree = load_minor(path, course_catalog)
        results[tree["code"]] = tree
    return results


def load_all_certificates(course_catalog=None) -> dict[str, dict]:
    """Load all certificate YAMLs. Returns {code: requirement_tree}."""
    results = {}
    for path in sorted((DATA_DIR / "certificates").glob("*.yaml")):
        tree = load_certificate(path, course_catalog)
        results[tree["code"]] = tree
    return results


def load_all(course_catalog=None) -> dict[str, dict[str, dict]]:
    """Load everything. Returns {"degrees": {...}, "majors": {...}, "minors": {...}, "certificates": {...}}."""
    reset_ids()
    return {
        "degrees": load_all_degrees(course_catalog),
        "majors": load_all_majors(course_catalog),
        "minors": load_all_minors(course_catalog),
        "certificates": load_all_certificates(course_catalog),
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_yaml(yaml_path: str | Path) -> dict:
    with open(yaml_path, "r") as f:
        return yaml.safe_load(f)
