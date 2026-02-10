/**
 * Skill Parser Service
 * Wrapper for Python skill.md parser
 */

const { spawn } = require('child_process');
const path = require('path');

const PYTHON_SCRIPT = path.join(__dirname, '../../backend/skill_md_parser.py');

/**
 * Parse skill.md using Python script
 * 
 * @param {string} skillUrl - URL to skill.md file
 * @returns {Promise<Object>} Parsed metadata
 */
async function parseSkillMd(skillUrl) {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [PYTHON_SCRIPT, skillUrl]);
    
    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        // Extract error message from output
        const errorMatch = stderr.match(/❌ Error: (.+)/);
        const errorMsg = errorMatch ? errorMatch[1] : stderr.trim() || 'Unknown error';
        reject(new Error(`Failed to parse skill.md: ${errorMsg}`));
        return;
      }

      try {
        // Parse the output - the script prints key-value pairs
        const lines = stdout.trim().split('\n');
        const result = {};

        lines.forEach(line => {
          const match = line.match(/^(Name|Description|Contact|Homepage|OpenClaw|Version):\s*(.+)$/);
          if (match) {
            const key = match[1].toLowerCase();
            let value = match[2].trim();
            
            // Convert boolean strings
            if (value === 'True' || value === 'true') value = true;
            if (value === 'False' || value === 'false') value = false;
            if (value === 'None' || value === 'null') value = null;
            
            result[key] = value;
          }
        });

        // Validate required fields
        if (!result.name || !result.description || !result.contact) {
          reject(new Error('Missing required fields in skill.md (name, description, contact)'));
          return;
        }

        // Add default values and normalize field names
        const normalized = {
          name: result.name,
          description: result.description,
          contact: result.contact,
          version: result.version || '1.0.0',
          homepage: result.homepage || null,
          openclaw: result.openclaw || false,
          capabilities: []
        };

        resolve(normalized);
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${error.message}\nOutput: ${stdout}`));
      }
    });

    python.on('error', (error) => {
      reject(new Error(`Failed to spawn Python process: ${error.message}`));
    });
  });
}

/**
 * Fetch and validate skill.md
 * 
 * @param {string} skillUrl - URL to skill.md file
 * @returns {Promise<Object>} Validated metadata
 */
async function fetchAndValidateSkill(skillUrl) {
  // Validate URL format
  if (!skillUrl || typeof skillUrl !== 'string') {
    throw new Error('skill_url must be a string');
  }

  if (!skillUrl.startsWith('http://') && !skillUrl.startsWith('https://')) {
    throw new Error('skill_url must start with http:// or https://');
  }

  // Parse the skill.md
  const metadata = await parseSkillMd(skillUrl);

  // Additional validation
  if (!metadata.name || metadata.name.length === 0) {
    throw new Error('Agent name is required');
  }

  if (!metadata.name.match(/^[a-zA-Z0-9_-]+$/)) {
    throw new Error('Agent name must contain only letters, numbers, underscores, and hyphens');
  }

  if (!metadata.contact || !metadata.contact.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    throw new Error('Invalid contact email format');
  }

  if (!metadata.description || metadata.description.length === 0) {
    throw new Error('Agent description is required');
  }

  return metadata;
}

/**
 * Test parser functionality
 * 
 * @returns {Promise<boolean>} Success status
 */
async function testParser() {
  try {
    // Test with a simple URL if available
    // For now, just verify Python is available
    const test = spawn('python3', ['--version']);
    
    return new Promise((resolve) => {
      test.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Python parser available');
          resolve(true);
        } else {
          console.error('❌ Python not available');
          resolve(false);
        }
      });

      test.on('error', () => {
        console.error('❌ Python not available');
        resolve(false);
      });
    });
  } catch (error) {
    console.error('Parser test failed:', error.message);
    return false;
  }
}

module.exports = {
  parseSkillMd,
  fetchAndValidateSkill,
  testParser
};
