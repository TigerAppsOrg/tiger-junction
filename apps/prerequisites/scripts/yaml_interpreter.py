import yaml
import re
from typing import Dict, List, Set, Tuple
from dataclasses import dataclass
from datetime import datetime
import json
from dataclasses import dataclass, field
from typing import List, Union


KNOWN_MACROS_EXPANSIONS = {
    "ISCA": "ISC231 & ISC232 & ISC233 & ISC234",
    "MECH": "PHY103 | PHY105 | ISC231 | EGR151",
    "EAM": "PHY104 | PHY106 | ISC233 | EGR153",
    "PHYS": "MECH & EAM",
    "CALCULUS": "MAT104 | MAT210 | MAT215 | EGR152",
    "MULTI": "MAT175 | MAT201 | MAT203 | MAT216 | ECO201 | EGR156",
    "LINEAR": "MAT202 | MAT204 | MAT217 | MAT218 | EGR154",
    "BSEMATH": "MULTI & LINEAR",
    "INTROCOS": "COS126 | ECE115 | ISCA",
    "BOTHCOS": "COS217 & COS226",
    "CHEM1": "CHM201 | CHM207 | CHM215",
    "CHEM2": "CHM202 | CHM215",
    "STATS": "ECO202 | EEB355 | ORF245 | POL345 | PSY251 | SOC301 | SML101 | SML201",
    "INTROMOL": "MOL214 | ISCA"
}

with open('../coursedata/resolve/cross_table.json', 'r') as file:
    CROSSLISTING_DATA = json.load(file)


@dataclass
class PrerequisiteRule:
    rule_type: str  # 'exact', 'wildcard', 'greater_eq', 'coreq'
    department: str
    course_pattern: str
    min_course_number: int = None
    
@dataclass
class PrerequisiteGroup:
    rules: List[PrerequisiteRule]
    operator: str  # 'AND' or 'OR'

@dataclass
class Node:
    """Base class for all nodes."""
    value: str  # Represents the value of the node (e.g., operator or course code)

    def __post_init__(self):
        if not self.value:
            raise ValueError("Node value cannot be empty")


@dataclass
class OperatorNode(Node):
    """Represents an operator node ('&' or '|') in the prerequisite graph."""
    children: List[Union['OperatorNode', 'CourseNode']] = field(default_factory=list)

    def __post_init__(self):
        super().__post_init__()
        if self.value not in {'&', '|'}:
            raise ValueError(f"Invalid operator: {self.value}. Must be '&' or '|'.")


@dataclass
class CourseNode(Node):
    """Represents a course or macro node."""
    course_id: str  # Additional identifier for the course

    def __post_init__(self):
        super().__post_init__()
        if not self.course_id:
            self.course_id = self.value  # Default to the course code if not provided


def parse_course_code(course_code: str) -> Tuple[str, int]:
    """Extract department and course number from course code."""
    match = re.match(r'([A-Z]+)\s*(\d+)', course_code)
    if match:
        dept, num = match.groups()
        key = dept + " " + num
        if key not in CROSSLISTING_DATA:
            return dept, num, None
        course_id = CROSSLISTING_DATA[key]["id"]
        return dept, int(num), course_id
    return None, None, None

def parse_prerequisite_expression(expr: str) -> Node:
    """Parses a prerequisite expression and returns the head node of the graph."""
    def parse(tokens):
        """Recursively parse tokens into a graph."""
        current_node = None

        while tokens:
            token = tokens.pop(0)
            is_coreq = False
            if token[0] == "$":
                # is a corequisite
                is_coreq = True
                token = token[1:]

            if token == '(':
                # Start a new subexpression
                node = parse(tokens)
                if isinstance(current_node, OperatorNode):
                    current_node.children.append((node, is_coreq))
                else:
                    current_node = node
            elif token == ')':
                # End the current subexpression
                break
            elif token in {'&', '|'}:
                # Handle operators
                if isinstance(current_node, OperatorNode) and current_node.value == token:
                    # Continue building the same operator node
                    pass
                else:
                    # Create a new operator node
                    new_node = OperatorNode(value=token)
                    if current_node:
                        new_node.children.append((current_node, is_coreq))
                    current_node = new_node
            elif token in KNOWN_MACROS_EXPANSIONS:
                # Expand macros and parse the expanded expression
                expanded_expr = KNOWN_MACROS_EXPANSIONS[token]
                expanded_tokens = tokenize_expression(expanded_expr)
                node = parse(expanded_tokens)
                if isinstance(current_node, OperatorNode):
                    current_node.children.append((node, is_coreq))
                else:
                    current_node = node
            elif token[-1] == "*":
                # is a wildcard
                dept, num, _ = parse_course_code(token)
                # TODO: maybe something going wrong with ART2** | CWR2** | DAN2** | MUS2** | THR2** | VIS2**
                if dept is None or num is None:
                    breakpoint()
                if num is None:
                    regex_pattern = "^" + dept + '.*' + "$"
                else:
                    regex_pattern = "^" + dept + " " + num + '.*' + "$"
                breakpoint()
                
                # TODO: this is a very inefficient way to do it, do we have ready-made data?
                matching_courses = []
                
                # Iterate through the course data and check for matches
                for course, details in CROSSLISTING_DATA.items():
                    if re.match(regex_pattern, course):
                        matching_courses.append(course)

                # or union of all that match department and level
                expanded_expr = " | ".join(matching_courses)
                expanded_tokens = tokenize_expression(expanded_expr)
                node = parse(expanded_tokens)
                if isinstance(current_node, OperatorNode):
                    current_node.children.append((node, is_coreq))
                else:
                    current_node = node

            elif token:
                # Handle a regular course
                dept, num, course_id = parse_course_code(token)
                if course_id is None:
                    #raise Exception(f"Course {token} is not listed.")
                    # uncomment later, continuing for testing
                    print(f"Course {token} is not listed.")
                else:
                    node = CourseNode(value=token, course_id=course_id)
                    if isinstance(current_node, OperatorNode):
                        current_node.children.append((node, is_coreq))
                    else:
                        current_node = node

        return current_node

    # Tokenize the expression (split into operators, parentheses, and courses/macros)
    tokens = tokenize_expression(expr)

    # Parse the tokens into a graph
    return parse(tokens)


def tokenize_expression(expr: str) -> List[str]:
    """Tokenizes the prerequisite expression into a list of tokens."""
    tokens = []
    buffer = ''
    for char in expr:
        if char in {'(', ')', '&', '|'}:
            if buffer.strip():
                tokens.append(buffer.strip())
                buffer = ''
            tokens.append(char)
        else:
            buffer += char
    if buffer.strip():
        tokens.append(buffer.strip())
    return tokens


def process_yaml_file(file_path: str):
    """Process YAML file and prepare data for database insertion."""
    with open(file_path, 'r') as f:
        # Load all documents from the YAML file
        documents = list(yaml.safe_load_all(f))
        
    if len(documents) < 2:
        raise ValueError("Expected at least 2 YAML documents (header and courses)")
        
    # First document contains header information
    header = documents[0]
    department_info = {
        'code': header.get('code'),
        'name': header.get('name'),
        'category': header.get('category'),
        'updated': datetime.strptime(header.get('updated'), '%m/%d/%Y')
    }
    
    # Second document contains course list
    courses = documents[1]
    courses_data = []
    
    for course in courses:  # Process each course in the list
        if not isinstance(course, dict):
            continue
            
        dept, course_num, course_id = parse_course_code(course['course'])

        # Prepare course data
        course_data = {
            'listing_id': course['id'],
            'code': course['course'],
            'department': dept,
            'course_number': course_num,
            'last_term': course['last'],
            'has_iw': course.get('iw') is not None,
            'requires_travel': course.get('travel') is not None,
            'equivalent_courses': course.get('equiv', []),
            'prerequisite_notes': course.get('notes', ''),
            'prerequisite_expression': course.get('reqs', ''),
            'prerequisite_head': None
        }

        # Parse prerequisites if they exist
        if 'reqs' in course:
            course_data["prerequisite_head"] = parse_prerequisite_expression(course['reqs'])
            print("----------")
            print(course_data["code"])
            print(course_data["prerequisite_expression"])
            print(course_data["prerequisite_head"])
            
        courses_data.append(course_data)
    
    return department_info, courses_data

# Example usage
if __name__ == "__main__":
    file_path = "../lib/vpa/VIS.yaml"
    try:
        dept_info, courses = process_yaml_file(file_path)
        
        # Print sample of processed data
        print("Department Info:", dept_info)
        print("\nCourses:")
        # for course in courses:
        #     print("-----------------")
        #     print(course["code"], ":", course["prerequisite_expression"])
        #     print(course["prerequisite_head"])
            
    except Exception as e:
        print(f"Error processing YAML file: {e}")