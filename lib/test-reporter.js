#!/usr/bin/env node

/**
 * Test Reporter Module
 * Generates formatted test reports for race quality validation
 */

// ANSI color codes
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Status colors
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m'
};

// Status symbols
export const symbols = {
  pass: '✓',
  fail: '✗',
  warn: '⚠',
  info: '○',
  skip: '–'
};

/**
 * Format a status icon with color
 */
export function formatStatus(status) {
  switch (status) {
    case 'pass':
      return `${colors.green}${symbols.pass}${colors.reset}`;
    case 'fail':
      return `${colors.red}${symbols.fail}${colors.reset}`;
    case 'warn':
      return `${colors.yellow}${symbols.warn}${colors.reset}`;
    case 'skip':
      return `${colors.dim}${symbols.skip}${colors.reset}`;
    default:
      return `${colors.cyan}${symbols.info}${colors.reset}`;
  }
}

/**
 * Format section header status
 */
function formatSectionStatus(status) {
  switch (status) {
    case 'pass':
      return `${colors.green}${colors.bold}✓ PASS${colors.reset}`;
    case 'fail':
      return `${colors.red}${colors.bold}✗ FAIL${colors.reset}`;
    case 'warn':
      return `${colors.yellow}${colors.bold}⚠ WARN${colors.reset}`;
    case 'skip':
      return `${colors.dim}– SKIP${colors.reset}`;
    default:
      return '';
  }
}

/**
 * Pad string to width
 */
function pad(str, width, char = ' ') {
  const visible = str.replace(/\x1b\[[0-9;]*m/g, ''); // Strip ANSI for length calc
  const padding = width - visible.length;
  return str + char.repeat(Math.max(0, padding));
}

/**
 * Create a horizontal line
 */
function line(width = 65, char = '─') {
  return char.repeat(width);
}

/**
 * Format a boxed section header
 */
function sectionHeader(title, status, width = 65) {
  const statusText = formatSectionStatus(status);
  const titlePart = `│ ${title}`;
  const padding = width - title.length - 4 - (status ? 7 : 0); // Account for borders and status
  return `${titlePart}${' '.repeat(Math.max(1, padding))}${status ? statusText : ''} │`;
}

/**
 * Format a detail line within a section
 */
function detailLine(label, value, indent = 1, width = 65) {
  const prefix = '│' + '   '.repeat(indent);
  const line = `${prefix}├── ${label}: ${value}`;
  const visible = line.replace(/\x1b\[[0-9;]*m/g, '');
  const padding = width - visible.length - 1;
  return line + ' '.repeat(Math.max(0, padding)) + '│';
}

/**
 * Format a leaf detail (last item in a section)
 */
function leafLine(label, value, indent = 1, width = 65) {
  const prefix = '│' + '   '.repeat(indent);
  const line = `${prefix}└── ${label}: ${value}`;
  const visible = line.replace(/\x1b\[[0-9;]*m/g, '');
  const padding = width - visible.length - 1;
  return line + ' '.repeat(Math.max(0, padding)) + '│';
}

/**
 * Format a simple line with content
 */
function contentLine(content, width = 65) {
  const line = `│ ${content}`;
  const visible = line.replace(/\x1b\[[0-9;]*m/g, '');
  const padding = width - visible.length - 1;
  return line + ' '.repeat(Math.max(0, padding)) + '│';
}

/**
 * Generate the full test report
 * @param {object} results - Test results from test-race-quality.js
 * @returns {string} - Formatted report
 */
export function generateReport(results) {
  const { race, sections, summary } = results;
  const width = 65;
  const lines = [];

  // Header
  lines.push(`┌${line(width - 2)}┐`);
  lines.push(contentLine(`${colors.bold}Race Quality Report: ${race.name}${colors.reset}`, width));
  if (race.id) {
    lines.push(contentLine(`${colors.dim}ID: ${race.id}${colors.reset}`, width));
  }
  lines.push(`├${line(width - 2)}┤`);

  // Sections
  for (const section of sections) {
    lines.push(sectionHeader(section.name, section.status, width));

    for (let i = 0; i < section.checks.length; i++) {
      const check = section.checks[i];
      const isLast = i === section.checks.length - 1;
      const status = formatStatus(check.status);
      const value = check.value ? ` ${colors.dim}(${check.value})${colors.reset}` : '';

      if (isLast) {
        lines.push(leafLine(check.label, `${status}${value}`, 1, width));
      } else {
        lines.push(detailLine(check.label, `${status}${value}`, 1, width));
      }

      // Sub-checks
      if (check.subChecks) {
        for (let j = 0; j < check.subChecks.length; j++) {
          const sub = check.subChecks[j];
          const subStatus = formatStatus(sub.status);
          const subIsLast = j === check.subChecks.length - 1;
          const subValue = sub.value ? ` ${colors.dim}(${sub.value})${colors.reset}` : '';

          if (subIsLast) {
            lines.push(leafLine(sub.label, `${subStatus}${subValue}`, 2, width));
          } else {
            lines.push(detailLine(sub.label, `${subStatus}${subValue}`, 2, width));
          }
        }
      }
    }

    lines.push(`├${line(width - 2)}┤`);
  }

  // Summary
  const overallColor = summary.status === 'pass' ? colors.green :
                       summary.status === 'warn' ? colors.yellow : colors.red;
  const overallSymbol = summary.status === 'pass' ? '✓' :
                        summary.status === 'warn' ? '⚠' : '✗';

  lines.pop(); // Remove last separator
  lines.push(`└${line(width - 2)}┘`);
  lines.push('');
  lines.push(`${overallColor}${colors.bold}OVERALL: ${overallSymbol} ${summary.status.toUpperCase()}${colors.reset}${summary.details ? ` ${colors.dim}(${summary.details})${colors.reset}` : ''}`);

  // Warnings/Errors summary
  if (summary.warnings?.length > 0) {
    lines.push('');
    lines.push(`${colors.yellow}Warnings:${colors.reset}`);
    summary.warnings.forEach(w => {
      lines.push(`  ${colors.yellow}${symbols.warn}${colors.reset} ${w}`);
    });
  }

  if (summary.errors?.length > 0) {
    lines.push('');
    lines.push(`${colors.red}Errors:${colors.reset}`);
    summary.errors.forEach(e => {
      lines.push(`  ${colors.red}${symbols.fail}${colors.reset} ${e}`);
    });
  }

  return lines.join('\n');
}

/**
 * Generate a compact summary for batch testing
 * @param {object} results - Test results
 * @returns {string} - One-line summary
 */
export function generateCompactSummary(results) {
  const { race, summary } = results;
  const status = formatStatus(summary.status);
  const counts = [];

  if (summary.passCount) counts.push(`${colors.green}${summary.passCount} pass${colors.reset}`);
  if (summary.warnCount) counts.push(`${colors.yellow}${summary.warnCount} warn${colors.reset}`);
  if (summary.failCount) counts.push(`${colors.red}${summary.failCount} fail${colors.reset}`);

  return `${status} ${race.id || race.name} ${colors.dim}[${counts.join(', ')}]${colors.reset}`;
}

/**
 * Generate JSON report for programmatic consumption
 * @param {object} results - Test results
 * @returns {object} - Structured JSON report
 */
export function generateJsonReport(results) {
  const { race, sections, summary } = results;

  return {
    race: {
      id: race.id,
      name: race.name,
      raceDate: race.raceDate
    },
    timestamp: new Date().toISOString(),
    summary: {
      status: summary.status,
      passCount: summary.passCount || 0,
      warnCount: summary.warnCount || 0,
      failCount: summary.failCount || 0,
      warnings: summary.warnings || [],
      errors: summary.errors || []
    },
    sections: sections.map(s => ({
      name: s.name,
      status: s.status,
      checks: s.checks.map(c => ({
        label: c.label,
        status: c.status,
        value: c.value,
        subChecks: c.subChecks
      }))
    }))
  };
}

/**
 * Print report to console
 * @param {object} results - Test results
 */
export function printReport(results) {
  console.log(generateReport(results));
}

/**
 * Print compact summary to console
 * @param {object} results - Test results
 */
export function printCompactSummary(results) {
  console.log(generateCompactSummary(results));
}

// Export default
export default {
  generateReport,
  generateCompactSummary,
  generateJsonReport,
  printReport,
  printCompactSummary,
  colors,
  symbols,
  formatStatus
};
