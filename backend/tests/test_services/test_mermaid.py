from app.services.mermaid_service import validate_and_fix_mermaid


def test_validate_removes_markdown_fences():
    code = "```mermaid\ngraph TD\nA-->B\n```"
    fixed, fixes = validate_and_fix_mermaid(code)
    assert "```" not in fixed
    assert "Removed markdown fences" in fixes


def test_validate_replaces_smart_quotes():
    code = 'graph TD\nA[\u201cLabel\u201d]-->B'
    fixed, fixes = validate_and_fix_mermaid(code)
    assert "\u201c" not in fixed
    assert "\u201d" not in fixed
    assert '"Label"' in fixed


def test_validate_replaces_em_dashes():
    code = "graph TD\nA\u2014\u2013B"
    fixed, fixes = validate_and_fix_mermaid(code)
    assert "\u2014" not in fixed
    assert "\u2013" not in fixed


def test_validate_clean_code_unchanged():
    code = "graph TD\nA-->B\nB-->C"
    fixed, fixes = validate_and_fix_mermaid(code)
    assert fixed == code
    assert len(fixes) == 0


def test_validate_complex_diagram():
    code = """```mermaid
graph TD
    A[\u201cFrontend\u201d]-->B[\u201cBackend\u201d]
    B-->C[\u201cDatabase\u201d]
```"""
    fixed, fixes = validate_and_fix_mermaid(code)
    assert fixed.startswith("graph TD")
    assert "```" not in fixed
    assert '"Frontend"' in fixed
