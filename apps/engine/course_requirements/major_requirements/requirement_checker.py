"""
Requirement checking algorithm ported from HoagiePlan (plan/backend/hoagieplan/api/dashboard/requirements.py).
All Django dependencies removed — operates on plain dicts produced by yaml_loader.py.

Usage:
    from .yaml_loader import load_major
    from .requirement_checker import check_requirements

    major_tree = load_major("data/majors/COS-AB.yaml")
    courses = [
        # semester 1
        [
            {"id": "COS 126", "dept_code": "COS", "cat_num": "126",
             "distribution_area_short": "QCR", "crosslistings": "COS 126"},
        ],
        # semester 2
        [...],
        # ... up to 8 semesters
    ]
    result = check_requirements(major_tree, courses)
"""

import collections
import copy


def check_requirements(req: dict, courses: list[list[dict]], manually_satisfied_reqs: list[int] | None = None) -> dict:
    """Main entry point: check whether a requirement tree is satisfied by the given courses.

    Args:
        req: A requirement tree dict (from yaml_loader).
        courses: A list of 8 lists (one per semester), where each inner list contains
                 course dicts with keys: id, dept_code, cat_num, distribution_area_short, crosslistings.
                 The "id" field should be a course code string like "COS 226" (matching
                 what's stored in req["course_list"]).
        manually_satisfied_reqs: list of requirement IDs the user has manually marked satisfied.

    Returns:
        Formatted dict tree with satisfaction status.
    """
    if manually_satisfied_reqs is None:
        manually_satisfied_reqs = []

    req = copy.deepcopy(req)
    courses = _init_courses(courses)
    mark_possible_reqs(req, courses)
    assign_settled_courses_to_reqs(req, courses, manually_satisfied_reqs)
    add_course_lists_to_req(req, courses)
    return format_req_output(req, courses, manually_satisfied_reqs)


# ---------------------------------------------------------------------------
# Phase 1: Initialize courses with tracking fields
# ---------------------------------------------------------------------------

def _init_courses(courses: list[list[dict]]) -> list[list[dict]]:
    if not courses:
        courses = [[] for _ in range(8)]
    else:
        courses = copy.deepcopy(courses)
    # Pad to 8 semesters if needed
    while len(courses) < 8:
        courses.append([])
    for sem in courses:
        for course in sem:
            course["possible_reqs"] = []
            course["reqs_double_counted"] = []
            course["num_settleable"] = 0
            course["settled"] = []
            if "manually_settled" not in course:
                course["manually_settled"] = []
    return courses


# ---------------------------------------------------------------------------
# Phase 2: Mark which requirements each course could satisfy
# ---------------------------------------------------------------------------

def mark_possible_reqs(req: dict, courses: list[list[dict]]):
    """Recursively find all requirements that each course can satisfy."""
    if "req_list" in req:
        for sub_req in req["req_list"]:
            mark_possible_reqs(sub_req, courses)
    else:
        if ("course_list" in req) or req.get("dept_list"):
            _mark_possible_course_list_reqs(req, courses)
        if req.get("dist_req"):
            _mark_possible_dist_reqs(req, courses)


def _mark_possible_dist_reqs(req: dict, courses: list[list[dict]]):
    """Mark courses whose distribution area matches the requirement."""
    for sem in courses:
        for course in sem:
            if req["id"] in course["possible_reqs"]:
                continue
            course_dist = course.get("distribution_area_short")
            if not course_dist:
                continue

            course_dist = course_dist.split(" or ")
            matched = False
            for area in course_dist:
                if area in req["dist_req"]:
                    matched = True
                    break

            if matched:
                course["possible_reqs"].append(req["id"])
                if not req.get("double_counting_allowed"):
                    course["num_settleable"] += 1


def _mark_possible_course_list_reqs(req: dict, courses: list[list[dict]]):
    """Mark courses that appear in the requirement's course_list or dept_list."""
    for sem_num, sem in enumerate(courses):
        if sem_num + 1 > (req.get("completed_by_semester") or 8):
            continue
        for course in sem:
            if req["id"] in course["possible_reqs"]:
                continue
            if "excluded_course_list" in req:
                if course["id"] in req["excluded_course_list"]:
                    continue
            # Check dept_list
            if req.get("dept_list"):
                for code in req["dept_list"]:
                    if code == course.get("dept_code"):
                        course["possible_reqs"].append(req["id"])
                        if not req.get("double_counting_allowed"):
                            course["num_settleable"] += 1
                        break
            # Check course_list
            if "course_list" in req:
                if _course_matches_list(course["id"], req["course_list"]):
                    if req["id"] not in course["possible_reqs"]:
                        course["possible_reqs"].append(req["id"])
                        if not req.get("double_counting_allowed"):
                            course["num_settleable"] += 1


def _course_matches_list(course_id: str, course_list: list[str]) -> bool:
    """Check if a course_id matches any entry in course_list, supporting wildcards."""
    for entry in course_list:
        if "*" not in entry:
            if course_id == entry:
                return True
        else:
            # Wildcard matching: "COS 3**" matches "COS 326"
            parts = entry.split()
            c_parts = course_id.split()
            if len(parts) == 2 and len(c_parts) == 2:
                if parts[0] != c_parts[0]:
                    continue
                pattern = parts[1]
                cat_num = c_parts[1]
                if len(cat_num) < len(pattern):
                    continue
                match = True
                for i, ch in enumerate(pattern):
                    if ch == "*":
                        continue
                    if i >= len(cat_num) or ch != cat_num[i]:
                        match = False
                        break
                if match:
                    return True
    return False


# ---------------------------------------------------------------------------
# Phase 3: Settle courses into requirements
# ---------------------------------------------------------------------------

def assign_settled_courses_to_reqs(req: dict, courses: list[list[dict]], manually_satisfied_reqs: list[int]) -> int:
    """Assign settled courses and auto-settle unambiguous ones. Returns count of newly satisfied."""
    old_deficit = req["min_needed"] - req["count"]
    old_available = (req["max_counted"] - req["count"]) if req["max_counted"] else 0
    was_satisfied = old_deficit <= 0
    newly_satisfied = 0

    if "req_list" in req:
        for sub_req in req["req_list"]:
            added = assign_settled_courses_to_reqs(sub_req, courses, manually_satisfied_reqs)
            if sub_req["id"] in manually_satisfied_reqs:
                added = sub_req["max_counted"] if sub_req["max_counted"] else 1
            newly_satisfied += added
    elif req.get("double_counting_allowed"):
        newly_satisfied = _settle_double_counting_reqs(req, courses)
    elif ("course_list" in req) or req.get("dept_list") or req.get("dist_req"):
        newly_satisfied = _settle_reqs(req, courses)
    elif req.get("num_courses"):
        newly_satisfied = _check_degree_progress(req, courses)
    else:
        newly_satisfied = 1

    req["count"] += newly_satisfied
    new_deficit = req["min_needed"] - req["count"]

    if (not was_satisfied) and (new_deficit <= 0):
        if req["max_counted"] is None:
            return req["count"]
        else:
            return min(req["max_counted"], req["count"])
    elif was_satisfied and (new_deficit <= 0):
        if req["max_counted"] is None:
            return newly_satisfied
        else:
            return min(old_available, newly_satisfied)
    else:
        return 0


def _settle_double_counting_reqs(req: dict, courses: list[list[dict]]) -> int:
    """Settle courses where double counting is allowed."""
    num_marked = 0
    for sem in courses:
        for course in sem:
            if req["id"] in course["possible_reqs"]:
                num_marked += 1
                course["reqs_double_counted"].append(req["id"])
    return num_marked


def _settle_reqs(req: dict, courses: list[list[dict]]) -> int:
    """Settle courses where double counting is NOT allowed."""
    num_marked = 0
    for sem in courses:
        for course in sem:
            # Check manually settled first
            if len(course.get("manually_settled", [])) > 0:
                for p in course["manually_settled"]:
                    if (p == req["id"]) and (p in course["possible_reqs"]):
                        course["settled"].append(req["id"])
                        num_marked += 1
                        break
            # Auto-settle if only one possible requirement
            if (
                (course["num_settleable"] == 1)
                and (req["id"] in course["possible_reqs"])
                and (req["id"] not in course["settled"])
            ):
                num_marked += 1
                course["settled"].append(req["id"])
    return num_marked


def _check_degree_progress(req: dict, courses: list[list[dict]]) -> int:
    """Check whether enough courses completed by a given semester."""
    by_semester = req.get("completed_by_semester") or len(courses)
    if by_semester > len(courses):
        by_semester = len(courses)
    num_courses = 0
    for i in range(by_semester):
        num_courses += len(courses[i])
    return num_courses


# ---------------------------------------------------------------------------
# Phase 4: Build output
# ---------------------------------------------------------------------------

def add_course_lists_to_req(req: dict, courses: list[list[dict]]):
    """Populate settled/unsettled course lists on each requirement node."""
    if "req_list" in req:
        for sub_req in req["req_list"]:
            add_course_lists_to_req(sub_req, courses)

    req["settled"] = []
    req["unsettled"] = []
    for sem in courses:
        for course in sem:
            if (req["table"] == "Requirement") and req.get("double_counting_allowed"):
                if len(course["reqs_double_counted"]) > 0:
                    for req_id in course["reqs_double_counted"]:
                        if req_id == req["id"]:
                            req["settled"].append(course["id"])
            elif len(course["settled"]) > 0:
                for req_id in course["settled"]:
                    if req_id == req["id"]:
                        req["settled"].append(course["id"])
            else:
                for req_id in course["possible_reqs"]:
                    if req_id == req["id"]:
                        req["unsettled"].append(course["id"])
                        break


def format_req_output(req: dict, courses: list[list[dict]], manually_satisfied_reqs: list[int]) -> dict:
    """Format the requirement tree into the output shape."""
    output = collections.OrderedDict()

    if req["table"] != "Requirement" and req.get("code"):
        output["code"] = req["code"]
    if req["table"] == "Requirement" and req.get("name"):
        output["name"] = req["name"]

    output["req_id"] = req["id"]
    output["manually_satisfied"] = req["id"] in manually_satisfied_reqs
    output["satisfied"] = str((req["min_needed"] - req["count"] <= 0) or output["manually_satisfied"])
    output["count"] = str(req["count"])
    output["min_needed"] = str(req["min_needed"])
    output["max_counted"] = req["max_counted"]

    if "req_list" in req:
        req_list = {}
        for i, subreq in enumerate(req["req_list"]):
            child = format_req_output(subreq, courses, manually_satisfied_reqs)
            if child is not None:
                if "code" in child:
                    code = child.pop("code")
                    req_list[code] = child
                elif "name" in child:
                    name = child.pop("name")
                    req_list[name] = child
                else:
                    req_list[f"Subrequirement {i + 1}"] = child
        if req_list:
            output["subrequirements"] = req_list

    if ("settled" in req) and ("req_list" not in req):
        settled = []
        for semester in courses:
            for course in semester:
                if course["id"] in req["settled"]:
                    settled.append({
                        "code": course.get("dept_code", "") + " " + course.get("cat_num", ""),
                        "id": course["id"],
                        "crosslistings": course.get("crosslistings", ""),
                        "manually_settled": course.get("manually_settled", []),
                    })
        output["settled"] = [settled, req["id"]]

    if ("unsettled" in req) and ("req_list" not in req):
        unsettled = []
        for semester in courses:
            for course in semester:
                if course["id"] in req["unsettled"]:
                    unsettled.append({
                        "code": course.get("dept_code", "") + " " + course.get("cat_num", ""),
                        "id": course["id"],
                        "crosslistings": course.get("crosslistings", ""),
                        "manually_settled": course.get("manually_settled", []),
                    })
        output["unsettled"] = [unsettled, req["id"]]

    return output
