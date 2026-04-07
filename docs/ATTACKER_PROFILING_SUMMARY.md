# Attacker Profiling System - Implementation Summary

## Overview
Comprehensive attacker profiling system providing detailed behavioral analysis, threat intelligence, and forensic capabilities for security incidents.

## Features Implemented

### 1. Backend Profiling Engine (`api/_attacker-profile.ts`)
- **Incident Recording**: Automatically captures all security events with full metadata
- **Attack Type Tracking**: Frequency analysis of attack patterns (honeytoken, robots.txt, etc.)
- **User-Agent Analysis**: Tracks and classifies all UAs with usage statistics
- **Threat Score History**: Timeline of score changes (max 100 entries)
- **Incident Timeline**: Chronological log of last 50 incidents
- **Automatic Cleanup**: 30-day TTL with index maintenance
- **Privacy-First**: SHA-256 hashed IPs only (GDPR compliant)

### 2. Behavioral Pattern Detection (5 Algorithms)
| Pattern | Trigger | Severity | Description |
|---------|---------|----------|-------------|
| Rapid Escalation | Score +5pts in <1hr | HIGH | Quick threat escalation |
| Diverse Attacks | 3+ attack types | HIGH | Multi-vector assault |
| UA Rotation | 3+ User-Agents | MEDIUM | Bot evasion tactics |
| Persistent | 10+ incidents | HIGH | Ongoing campaign |
| Automated Scan | <5s avg interval | HIGH | Bot/scanner detected |

### 3. User-Agent Classification
```
bot         → Googlebot, Bingbot, crawlers, spiders
script      → curl, wget, python-requests
attack_tool → nikto, sqlmap, wfuzz (HIGH RISK)
api_client  → Postman, Insomnia
browser     → Chrome, Firefox, Safari, Edge
unknown     → Unclassified
```

### 4. REST API (`api/attacker-profile.ts`)
```
GET  /api/attacker-profile?hashedIp=xxx          # Single attacker detail
GET  /api/attacker-profile?limit=50&offset=0    # List all (paginated)
DELETE /api/attacker-profile?hashedIp=xxx       # Delete profile
```

All endpoints require admin authentication and use Zod schema validation.

### 5. Interactive UI (`AttackerProfileDialog.tsx`)

#### Summary Stats
- Total incidents count
- First/last seen timestamps
- Current threat score (color-coded)
- User-Agent diversity metric

#### Behavioral Patterns Section
- Color-coded severity badges (RED/ORANGE/YELLOW)
- Pattern descriptions with details
- Automatic detection results

#### Charts & Visualizations
1. **Threat Score Timeline** (Line Chart)
   - X-axis: Time
   - Y-axis: Threat score
   - Shows score progression over time

2. **Attack Type Distribution** (Pie Chart)
   - Color-coded attack categories
   - Percentage breakdown
   - Hover tooltips with counts

3. **User-Agent Analysis** (Bar Chart + Table)
   - Category breakdown chart
   - Top 10 UAs table
   - Category badges (colored)
   - Usage counts

4. **Incident Timeline** (Scrollable Table)
   - Last 50 incidents
   - Time, type, method, score, level
   - Color-coded threat levels

### 6. Integration Points
- **SecurityIncidentsDashboard**: "View Profile" button per IP
- **App.tsx**: State management and dialog control
- **honeytokens.js**: Auto-records on honeytoken access
- **denied.js**: Auto-records on robots.txt violations

## Testing

### Unit Tests (19 tests, all passing)
- Profile creation and updates
- History limiting (100 scores, 50 incidents)
- Pagination and cleanup
- Error handling (graceful degradation)
- All 5 behavioral pattern algorithms
- User-Agent analysis and classification
- Null-safety and edge cases

### Security Scans
- ✅ CodeQL: 0 vulnerabilities
- ✅ No plaintext IPs anywhere
- ✅ Input validation with Zod
- ✅ Admin auth required

## Data Structures

### Profile Object
```javascript
{
  hashedIp: string,                    // SHA-256 hash
  firstSeen: string,                   // ISO timestamp
  lastSeen: string,                    // ISO timestamp
  totalIncidents: number,              // Total count
  attackTypes: {                       // Frequency map
    honeytoken_access: 5,
    robots_violation: 3,
    ...
  },
  userAgents: {                        // Usage map
    'Mozilla/5.0...': 10,
    'curl/7.0': 5,
    ...
  },
  threatScoreHistory: [                // Last 100
    { score: 5, level: 'WARN', timestamp, reason },
    ...
  ],
  incidents: [                         // Last 50
    { type, key, method, timestamp, threatScore, threatLevel },
    ...
  ],
  behavioralPatterns: [                // Detected patterns
    { type, severity, description, details },
    ...
  ],
  userAgentAnalysis: {
    total: 100,
    unique: 5,
    diversity: '0.050',
    userAgents: [...],
    topUserAgent: {...}
  }
}
```

## Performance Considerations

- **Lazy Loading**: Profiles loaded on-demand
- **Pagination**: 50 results per page default
- **Index Maintenance**: Automatic cleanup of stale entries
- **TTL-Based Expiry**: Redis handles automatic deletion
- **Client-Side Caching**: React state management

## Privacy & Compliance

### GDPR Compliance
- ✅ No plaintext IPs stored
- ✅ SHA-256 hashing with salt
- ✅ 30-day automatic deletion
- ✅ Admin-only access
- ✅ Legitimate security interest

### Data Minimization
- Only security-relevant metadata
- No personally identifiable information
- Automatic cleanup after 30 days
- User-Agent strings (public HTTP headers)

## Future Enhancements (Not Implemented)

- Export profiles to CSV/JSON
- GeoIP lookup integration
- Real-time WebSocket updates
- Machine learning threat scoring
- Reputation database integration
- Automated remediation actions

## Files Modified/Created

### Backend
- `api/_attacker-profile.ts` (NEW)
- `api/attacker-profile.ts` (NEW)
- `api/_honeytokens.js` (MODIFIED)
- `api/denied.js` (MODIFIED)

### Frontend
- `src/components/AttackerProfileDialog.tsx` (NEW)
- `src/components/SecurityIncidentsDashboard.tsx` (MODIFIED)
- `src/App.tsx` (MODIFIED)

### Tests
- `src/test/attacker-profile.test.ts` (NEW)

### Documentation
- `SECURITY.md` (MODIFIED)
- `ATTACKER_PROFILING_SUMMARY.md` (NEW)

## Build & Test Status

```
✅ TypeScript Compilation: Success
✅ Unit Tests: 19/19 passing
✅ CodeQL Security Scan: 0 vulnerabilities
✅ Code Review: All issues addressed
✅ Production Build: Success (8.15s)
```

## Dependencies

No new dependencies added. Uses existing:
- `recharts` (charts)
- `@phosphor-icons/react` (icons)
- `framer-motion` (animations)
- `@vercel/kv` (storage)
- `zod` (validation)

## Conclusion

The attacker profiling system provides comprehensive forensic analysis capabilities while maintaining strict privacy compliance. All data is properly hashed, automatically cleaned up, and only accessible to admins. The 5 behavioral pattern detection algorithms provide early warning of sophisticated attacks, and the interactive UI makes threat intelligence actionable.
