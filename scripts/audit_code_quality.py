#!/usr/bin/env python3
"""Check architecture invariants that commonly regress during maintenance."""

import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_APP = ROOT / "backend" / "app"
FRONTEND_SRC = ROOT / "frontend" / "src"


def main() -> None:
    errors: list[str] = []
    python_files = list(BACKEND_APP.rglob("*.py"))

    for file_path in python_files:
        tree = ast.parse(file_path.read_text(encoding="utf-8"), filename=str(file_path))
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.level > 0:
                errors.append(
                    f"Relative backend import in {file_path.relative_to(ROOT)}:{node.lineno}"
                )

    forbidden_frontend_dirs = [
        FRONTEND_SRC / "pages" / name
        for name in ("components", "services", "context", "utils")
    ]
    for directory in forbidden_frontend_dirs:
        if directory.exists():
            errors.append(f"Forbidden duplicate frontend directory: {directory.relative_to(ROOT)}")

    standalone_workflows = list((BACKEND_APP / "workflows").rglob("workflow_*.py"))
    if standalone_workflows:
        errors.extend(
            f"Standalone workflow file: {path.relative_to(ROOT)}"
            for path in standalone_workflows
        )

    expected_frontend_dirs = {
        "api",
        "components",
        "context",
        "hooks",
        "pages",
        "routes",
        "services",
        "utils",
    }
    actual_frontend_dirs = {
        path.name for path in FRONTEND_SRC.iterdir() if path.is_dir()
    }
    if actual_frontend_dirs != expected_frontend_dirs:
        errors.append(
            f"Frontend directories are {sorted(actual_frontend_dirs)}, "
            f"expected {sorted(expected_frontend_dirs)}"
        )

    print(f"Backend Python files checked: {len(python_files)}")
    print(f"Frontend source directories: {', '.join(sorted(actual_frontend_dirs))}")

    if errors:
        print("\nCODE QUALITY AUDIT: FAIL")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)

    print("\nCODE QUALITY AUDIT: PASS")


if __name__ == "__main__":
    main()
