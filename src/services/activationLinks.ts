import rawActivationLinks from '../assets/LINK_AKTIVASI.txt?raw';
import { TeamDivision } from '../types';

const FALLBACK_ACTIVATION_LINKS: Record<TeamDivision, string> = {
  'Team A':
    'https://script.google.com/macros/s/AKfycbzWE3jH3ikXML5V8pjpyIessUJJKBMK_9KQA1LjXxOH5okjaIQyXBG-zrqaor8UyG8RMQ/exec',
  'Team B':
    'https://script.google.com/macros/s/AKfycbyqhGjUTo2E_KmCOcF8QiH8sxD4IeW0r28QlrZ1vdouSR7mwJavRIM_20rpzqugoCIzhg/exec',
  'Team C':
    'https://script.google.com/macros/s/AKfycbxy8u9fClYIBTq3DddwBHFvYEcnf9ICt1C5yNlw0RjA5RG5-TOx6Byxo5Pa8vUldeePWg/exec',
};

function parseActivationLinks(rawText: string): Record<TeamDivision, string> {
  const parsed: Record<TeamDivision, string> = { ...FALLBACK_ACTIVATION_LINKS };
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let currentTeam: TeamDivision | null = null;

  for (const line of lines) {
    const upper = line.toUpperCase().replace(/\s+/g, ' ');
    if (upper === 'TEAM A') {
      currentTeam = 'Team A';
      continue;
    }
    if (upper === 'TEAM B') {
      currentTeam = 'Team B';
      continue;
    }
    if (upper === 'TEAM C') {
      currentTeam = 'Team C';
      continue;
    }

    if (currentTeam && /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/i.test(line)) {
      parsed[currentTeam] = line;
      currentTeam = null;
    }
  }

  return parsed;
}

export const TEAM_ACTIVATION_LINKS: Record<TeamDivision, string> = parseActivationLinks(
  rawActivationLinks || ''
);

export function getDefaultActivationLink(team: TeamDivision): string {
  return TEAM_ACTIVATION_LINKS[team] || TEAM_ACTIVATION_LINKS['Team A'];
}
