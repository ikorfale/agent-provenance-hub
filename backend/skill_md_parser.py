#!/usr/bin/env python3
"""
skill.md Parser - Extract metadata from agent skill.md files
"""
import re
import requests
import yaml
from typing import Dict, Optional

def fetch_skill_md(url: str) -> str:
    """Fetch skill.md content from URL."""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        raise ValueError(f"Failed to fetch skill.md: {str(e)}")

def parse_yaml_frontmatter(content: str) -> Optional[Dict]:
    """Extract YAML frontmatter from markdown content."""
    # Match YAML frontmatter (between --- markers)
    pattern = r'^---\s*\n(.*?)\n---\s*\n'
    match = re.match(pattern, content, re.DOTALL)
    
    if not match:
        return None
    
    try:
        return yaml.safe_load(match.group(1))
    except yaml.YAMLError as e:
        raise ValueError(f"Invalid YAML frontmatter: {str(e)}")

def extract_agent_metadata(skill_url: str) -> Dict:
    """
    Parse skill.md and extract agent metadata.
    
    Returns dict with:
    - name: agent name (required)
    - description: what the agent does (required)
    - version: skill version
    - homepage: agent website
    - contact: email for verification (required)
    - openclaw: whether this is an OpenClaw agent
    - capabilities: list of tools/skills
    """
    content = fetch_skill_md(skill_url)
    frontmatter = parse_yaml_frontmatter(content)
    
    if not frontmatter:
        raise ValueError("skill.md must have YAML frontmatter (between --- markers)")
    
    # Required fields
    name = frontmatter.get('name')
    if not name:
        raise ValueError("skill.md must have 'name' field")
    
    description = frontmatter.get('description')
    if not description:
        raise ValueError("skill.md must have 'description' field")
    
    # Extract contact from metadata
    metadata = frontmatter.get('metadata', {})
    contact = None
    
    if isinstance(metadata, dict):
        contact = metadata.get('contact')
    
    # If no contact in metadata, look for email in content
    if not contact:
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = re.findall(email_pattern, content)
        if emails:
            contact = emails[0]
    
    if not contact:
        raise ValueError("skill.md must have contact email (in metadata.contact or in content)")
    
    # Build result
    result = {
        'name': name,
        'description': description,
        'version': frontmatter.get('version', '1.0.0'),
        'homepage': frontmatter.get('homepage'),
        'contact': contact,
        'skill_url': skill_url,
        'openclaw': metadata.get('openclaw', False) if isinstance(metadata, dict) else False,
        'capabilities': metadata.get('capabilities', []) if isinstance(metadata, dict) else [],
        'raw_frontmatter': frontmatter
    }
    
    return result

def validate_agent_metadata(metadata: Dict) -> bool:
    """Validate required fields are present."""
    required = ['name', 'description', 'contact', 'skill_url']
    for field in required:
        if not metadata.get(field):
            raise ValueError(f"Missing required field: {field}")
    
    # Validate email format
    email = metadata['contact']
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        raise ValueError(f"Invalid email format: {email}")
    
    # Validate name (alphanumeric + underscore only)
    name = metadata['name']
    if not re.match(r'^[a-zA-Z0-9_-]+$', name):
        raise ValueError(f"Invalid agent name (use only letters, numbers, _, -): {name}")
    
    return True

# Example usage
if __name__ == '__main__':
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python skill_md_parser.py <skill_url>")
        sys.exit(1)
    
    try:
        metadata = extract_agent_metadata(sys.argv[1])
        validate_agent_metadata(metadata)
        
        print("✅ Valid skill.md!")
        print(f"Name: {metadata['name']}")
        print(f"Description: {metadata['description']}")
        print(f"Contact: {metadata['contact']}")
        print(f"Homepage: {metadata['homepage']}")
        print(f"OpenClaw: {metadata['openclaw']}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)
