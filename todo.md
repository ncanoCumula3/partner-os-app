# Downsell Mitigation Feature — Implementation Plan

## Phase 1: Data Model & Signal Framework
- [ ] Design downsell signal types (support, CSAT, outreach, usage, billing)
- [ ] Define risk scoring algorithm (weighted signal aggregation)
- [ ] Create mitigation action types and AI recommendation templates

## Phase 2: Data Model Extension
- [ ] Add DownsellSignal, MitigationAction, and RiskScore types to data.ts
- [ ] Create seed data for each account with realistic signal history
- [ ] Add helper functions for risk calculation and signal aggregation

## Phase 3: Main Downsell Mitigation View
- [ ] KPI cards (accounts at risk, ARR exposed, signals detected, mitigations active)
- [ ] Risk matrix showing accounts by signal severity
- [ ] Sortable/filterable account list with composite risk scores
- [ ] Signal category breakdown (support, CSAT, usage, billing, outreach)

## Phase 4: Account Drill-Down
- [ ] Signal timeline showing all detected risk indicators chronologically
- [ ] AI-powered mitigation recommendations panel
- [ ] Mitigation action tracker (assigned, in-progress, completed)
- [ ] Related items cross-links (tickets, CSAT entries, outreach sequences)

## Phase 5: Cross-Platform Integration
- [ ] Dashboard widget for downsell alerts
- [ ] Notification Center alerts for new high-risk signals
- [ ] Renewal Tracker integration showing mitigation status
- [ ] Sidebar nav item and routing

## Phase 6: Testing
- [ ] Test all views, drill-downs, and AI recommendations
- [ ] Verify cross-navigation between Downsell Mitigation and other views

## Phase 7: Delivery
- [ ] Checkpoint and deliver to user
