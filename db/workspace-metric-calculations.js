export const parseMetricTime = value => {
  if (!value) return Number.NaN;
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  return Date.parse(normalized);
};

export const metricMedian = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};

export const responseMinutes = row => {
  const created = parseMetricTime(row.createdAt);
  const contacted = parseMetricTime(row.contactedAt);
  return Number.isFinite(created) && Number.isFinite(contacted) && contacted >= created
    ? Math.round((contacted - created) / 60000)
    : null;
};

export function calculateActivation(createdAt, steps) {
  const normalizedSteps = steps.map(step => ({ ...step, complete: Boolean(step.reachedAt) }));
  const completed = normalizedSteps.filter(step => step.complete).length;
  const reachedTimes = normalizedSteps.map(step => parseMetricTime(step.reachedAt)).filter(Number.isFinite);
  const activated = completed === normalizedSteps.length;
  const activatedAt = activated ? new Date(Math.max(...reachedTimes)).toISOString() : null;
  const activationDays = activated && Number.isFinite(parseMetricTime(createdAt))
    ? Math.max(0, Math.ceil((parseMetricTime(activatedAt) - parseMetricTime(createdAt)) / 86400000))
    : null;
  return {
    definitionVersion: 1,
    windowDays: 7,
    createdAt: createdAt || null,
    activated,
    activatedAt,
    activatedWithin7Days: activated && activationDays !== null && activationDays <= 7,
    activationDays,
    completed,
    total: normalizedSteps.length,
    progress: Math.round(completed / normalizedSteps.length * 100),
    steps: normalizedSteps,
  };
}

export function calculatePrincipalMetrics({ enquiries, members, overdueActions, counts }) {
  const answered = enquiries.filter(row => row.contactedAt);
  const responseTimes = answered.map(responseMinutes).filter(value => value !== null);
  const overdueByAgent = new Map(overdueActions.map(row => [String(row.assignedUserId), Number(row.count || 0)]));
  const agents = members.map(member => {
    const assigned = enquiries.filter(row => row.assignedUserId === member.userId);
    const answeredRows = assigned.filter(row => row.contactedAt);
    return {
      userId: member.userId,
      email: member.email,
      role: member.role,
      enquiries: assigned.length,
      answered: answeredRows.length,
      unanswered: assigned.length - answeredRows.length,
      medianResponseMinutes: metricMedian(answeredRows.map(responseMinutes).filter(value => value !== null)),
      overdueActions: overdueByAgent.get(String(member.userId)) || 0,
    };
  });
  return {
    periodDays: 30,
    enquiries: enquiries.length,
    answered: answered.length,
    unanswered: enquiries.length - answered.length,
    answerRate: enquiries.length ? Math.round(answered.length / enquiries.length * 100) : 0,
    medianResponseMinutes: metricMedian(responseTimes),
    overdueActions: overdueActions.reduce((sum, row) => sum + Number(row.count || 0), 0),
    viewings: Number(counts.viewings || 0),
    offers: Number(counts.offers || 0),
    wonDeals: Number(counts.wonDeals || 0),
    quietListings: Number(counts.quietListings || 0),
    expiringMandates: Number(counts.expiringMandates || 0),
    whatsappEnquiries: enquiries.filter(row => String(row.source).toLowerCase().includes("whatsapp")).length,
    agents,
  };
}

export function calculatePilotAdoption(eligibleUsers, activeUsers) {
  const eligible = Math.max(0, Number(eligibleUsers || 0));
  const active = Math.min(eligible, Math.max(0, Number(activeUsers || 0)));
  return {
    eligibleUsers: eligible,
    activeUsers: active,
    activeRate: eligible ? Math.round(active / eligible * 100) : 0,
  };
}

export function calculatePilotPeriod({ enquiries, followUps, viewings, viewingConversions = viewings, offers, offerConversions = offers, wonDeals, sellerReports, activeSalesMandates = 0, salesMandatesReported = 0 }) {
  const answered = enquiries.filter(row => row.contactedAt);
  const completedFollowUps = followUps.filter(row => row.completedAt).length;
  const reportApprovalMinutes = sellerReports.map(row => responseMinutes({ createdAt: row.createdAt, contactedAt: row.approvedAt })).filter(value => value !== null);
  const percentage = (numerator, denominator) => denominator ? Math.min(100, Math.round(numerator / denominator * 100)) : 0;
  return {
    enquiries: enquiries.length,
    answered: answered.length,
    unanswered: enquiries.length - answered.length,
    answerRate: percentage(answered.length, enquiries.length),
    medianResponseMinutes: metricMedian(answered.map(responseMinutes).filter(value => value !== null)),
    followUpsDue: followUps.length,
    followUpsCompleted: completedFollowUps,
    followUpCompletionRate: percentage(completedFollowUps, followUps.length),
    viewings,
    enquiriesWithViewing: viewingConversions,
    enquiryToViewingRate: percentage(viewingConversions, enquiries.length),
    offers,
    enquiriesWithOffer: offerConversions,
    enquiryToOfferRate: percentage(offerConversions, enquiries.length),
    wonDeals,
    whatsappEnquiries: enquiries.filter(row => String(row.source).toLowerCase().includes("whatsapp")).length,
    whatsappShare: percentage(enquiries.filter(row => String(row.source).toLowerCase().includes("whatsapp")).length, enquiries.length),
    sellerReportsApproved: sellerReports.filter(row => row.approvedAt).length,
    medianSellerReportApprovalMinutes: metricMedian(reportApprovalMinutes),
    activeSalesMandates,
    salesMandatesReported,
    sellerReportCoverageRate: percentage(salesMandatesReported, activeSalesMandates),
  };
}
