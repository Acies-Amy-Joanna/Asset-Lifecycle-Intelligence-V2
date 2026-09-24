"""Derive ALI customer intelligence from raw workbook facts (ali_data.json).
Mirrors the client derivation so the API is the single source of truth."""
import json
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).parent
RAW = json.loads((ROOT / "ali_data.json").read_text())

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
YEAR = 2025
REFERENCE_DATE = date(2025, 12, 31)
PRODUCTS = ["Udemy Business"]
CROSS_SELL_PRODUCT = "Udemy Leadership Academy"
FEATURE_NAMES = [f["name"] for f in RAW[0]["features"]]
SEGMENTS = ["Enterprise", "Mid-Market", "SMB"]
HEALTH_STATUSES = ["Healthy", "Monitor", "At Risk"]
OPPORTUNITY_TYPES = ["Upsell", "Cross-sell", "License Expansion", "Whitespace"]
RENEWAL_BUCKETS = ["0–30 days", "31–90 days", "91–180 days", "180+ days"]

BENCH = {
    "Course Learning": 75, "Learning Paths": 60, "Course Assignments": 60,
    "Analytics & Insights": 45, "User Management": 55, "Custom Content": 40,
    "Integrations": 40, "Skill Insights": 45,
}


def clamp(n, lo, hi):
    return max(lo, min(hi, n))


def rnd(n, dp=0):
    return round(n, dp) if dp else int(round(n))


def avg(a):
    return sum(a) / len(a) if a else 0


def pct(cur, prev):
    return (cur - prev) / prev * 100 if prev else 0


def mscore(v, lo, hi):
    return clamp((v - lo) / (hi - lo) * 100, 0, 100)


def _sum(arr, f):
    return sum(f(x) for x in arr)


def build(c):
    m = c["monthly"]
    sess = [x["sessions"] for x in m]
    usersM = [x["activeUsers"] for x in m]

    cur3s, prev3s = avg(sess[9:]), avg(sess[6:9])
    cur3u, prev3u = avg(usersM[9:]), avg(usersM[6:9])
    usageGrowth = rnd(pct(cur3s, prev3s), 1)
    activeUserGrowth = rnd(pct(cur3u, prev3u), 1)
    usageVolume = sess[11]
    activeUsers = usersM[11]
    totalUsers = c["totalUsers"]
    activeUserPct = rnd(activeUsers / totalUsers * 100, 1)

    sub = c["subscription"]
    purchasedLicenses = sub["purchasedSeats"]
    assignedLicenses = sub["assignedSeats"]
    activeLicenses = sub["activeSeats"]
    licenseUtilization = rnd(activeLicenses / purchasedLicenses * 100, 1)
    licenseUtilizationChange = rnd((usersM[11] - usersM[10]) / purchasedLicenses * 100, 1)
    pricePerLicense = rnd(c["arr"] / purchasedLicenses)

    features = []
    for f in c["features"]:
        eligible = totalUsers
        adopters = f["adoptersLast3"]
        adoptionPct = rnd(adopters / eligible * 100, 1)
        prevAdoptionPct = rnd(f["adoptersPrev3"] / eligible * 100, 1)
        adoptionChange = rnd(adoptionPct - prevAdoptionPct, 1)
        benchmark = BENCH.get(f["name"], 55)
        gap = rnd(max(0, benchmark - adoptionPct), 1)
        features.append({"name": f["name"], "category": f["category"], "eligibleUsers": eligible,
                         "adopters": adopters, "adoptionPct": adoptionPct, "prevAdoptionPct": prevAdoptionPct,
                         "adoptionChange": adoptionChange, "benchmark": benchmark, "gap": gap, "usageVolume": f["sessions"]})
    featureAdoption = rnd(avg([f["adoptionPct"] for f in features]), 1)
    featuresUsed = len([f for f in features if f["adoptionPct"] >= 30])
    adoptionGaps = sorted([f for f in features if f["gap"] > 0], key=lambda f: -f["gap"])

    freqCur = cur3s / cur3u if cur3u else 0
    freqPrev = prev3s / prev3u if prev3u else 0
    engagementChange = rnd(pct(freqCur, freqPrev), 1)
    usageFrequency = rnd(clamp(sess[11] / max(activeUsers, 1) / 4.3, 0.2, 7), 1)
    usageDays = rnd(clamp(sess[11] / max(activeUsers, 1), 1, 30))
    lastActivityDays = rnd(clamp(4 - usageGrowth / 10, 1, 26))

    mau = activeUsers
    wau = rnd(mau * 0.63)
    dau = rnd(wau * 0.42)

    sp = c["support"]
    currentTickets, prevTickets = sp["lastMonth"], sp["prevMonth"]
    totalTickets, openTickets, criticalTickets = sp["total"], sp["open"], sp["critical"]
    openTicketRate = rnd(openTickets / totalTickets * 100 if totalTickets else 0, 1)
    ticketGrowth = rnd(pct(currentTickets, prevTickets), 1)
    avgResolutionDays = rnd(clamp(2 + criticalTickets * 0.12 + openTickets * 0.2, 1.2, 9), 1)
    supportTrend = [{"month": MONTHS[6 + i], "tickets": sp["monthly"][6 + i]} for i in range(6)]

    usageScore = mscore(usageGrowth, -30, 30)
    auScore = mscore(activeUserGrowth, -30, 30)
    utilScore = clamp(licenseUtilization, 0, 100)
    adoptScore = featureAdoption
    engScore = mscore(engagementChange, -40, 40)
    supportScore = clamp(100 - openTicketRate - ticketGrowth * 0.4 - criticalTickets * 1.4, 0, 100)
    healthScore = rnd(usageScore * 0.22 + auScore * 0.14 + utilScore * 0.18 + adoptScore * 0.16 + engScore * 0.15 + supportScore * 0.15)
    healthStatus = "Healthy" if healthScore >= 72 else "Monitor" if healthScore >= 55 else "At Risk"

    minS, maxS = min(sess), max(sess)
    shape = [(50 + (s - minS) / (maxS - minS) * 40) if maxS > minS else 65 for s in sess]
    offset = healthScore - shape[11]
    healthTrend = [{"month": m[i]["month"], "health": healthScore if i == 11 else rnd(clamp(shape[i] + offset, 10, 99))} for i in range(12)]
    healthPrev = healthTrend[10]["health"]
    healthChange = rnd(healthScore - healthPrev)

    rdate = datetime.strptime(c["renewalDate"], "%Y-%m-%d").date()
    daysToRenewal = (rdate - REFERENCE_DATE).days
    arr = c["arr"]
    revenueAtRisk = c["revenueAtRisk"]
    churnRisk = "High" if healthScore < 55 else "Medium" if healthScore < 72 else "Low"
    renewalRisk = "High" if healthStatus == "At Risk" else "Medium" if (healthStatus == "Monitor" and daysToRenewal <= 90) else "Low"
    riskPriority = "High" if healthStatus == "At Risk" else "Medium" if (healthStatus == "Monitor" and daysToRenewal <= 120) else "Low"

    adoptionStage = ("Power User" if featureAdoption >= 70 and licenseUtilization >= 75
                     else "Established" if featureAdoption >= 55
                     else "Growing" if featureAdoption >= 40 else "Onboarding")

    def d(v):
        return "up" if v > 1 else "down" if v < -1 else "flat"

    def tn(good):
        return "positive" if good else "negative"

    sign = lambda v: ("+" if v > 0 else "")
    healthDrivers = [
        {"name": "Product Usage", "value": f"{sign(usageGrowth)}{usageGrowth}%", "change": usageGrowth, "direction": d(usageGrowth), "contribution": tn(usageGrowth >= 0)},
        {"name": "Feature Adoption", "value": f"{featureAdoption}%", "change": rnd(featureAdoption - 60), "direction": d(featureAdoption - 60), "contribution": tn(featureAdoption >= 55)},
        {"name": "License Utilization", "value": f"{licenseUtilization}%", "change": licenseUtilizationChange, "direction": d(licenseUtilizationChange), "contribution": tn(licenseUtilization >= 65)},
        {"name": "Engagement", "value": f"{sign(engagementChange)}{engagementChange}%", "change": engagementChange, "direction": d(engagementChange), "contribution": tn(engagementChange >= 0)},
        {"name": "Support Friction", "value": f"{sign(ticketGrowth)}{ticketGrowth}% tickets", "change": -ticketGrowth, "direction": d(-ticketGrowth), "contribution": tn(ticketGrowth <= 10 and openTicketRate < 40)},
        {"name": "Renewal Proximity", "value": f"{daysToRenewal} days", "change": 0, "direction": "flat", "contribution": "negative" if daysToRenewal <= 90 else "neutral"},
    ]
    riskEvidence = [
        {"label": "Usage Growth", "value": f"{sign(usageGrowth)}{usageGrowth}%", "tone": "positive" if usageGrowth >= 0 else "negative"},
        {"label": "Active User Growth", "value": f"{sign(activeUserGrowth)}{activeUserGrowth}%", "tone": "positive" if activeUserGrowth >= 0 else "negative"},
        {"label": "License Utilization", "value": f"{licenseUtilization}%", "tone": "positive" if licenseUtilization >= 65 else "negative"},
        {"label": "Feature Adoption", "value": f"{featureAdoption}%", "tone": "positive" if featureAdoption >= 55 else "negative"},
        {"label": "Support Tickets", "value": f"{sign(ticketGrowth)}{ticketGrowth}%", "tone": "positive" if ticketGrowth <= 10 else "negative"},
        {"label": "Days to Renewal", "value": f"{daysToRenewal}", "tone": "negative" if daysToRenewal <= 90 else "neutral"},
    ]
    hasRisk = healthStatus != "Healthy"
    riskSummary = ("Customer may be at renewal risk" if healthStatus == "At Risk"
                   else "Customer needs monitoring ahead of renewal" if healthStatus == "Monitor"
                   else "No active retention risk")
    riskWhy = (f"Product usage {'has declined' if usageGrowth < 0 else 'is stalling'} ({usageGrowth}%) and license utilization is {licenseUtilization}% while renewal is {'approaching' if daysToRenewal <= 120 else 'on the horizon'} ({daysToRenewal} days)."
               if hasRisk else "Usage, adoption and engagement are trending positively with no renewal pressure.")

    cid = c["id"]
    opportunities = []

    def push_opp(o):
        o["id"] = f"{cid}-OPP{len(opportunities) + 1}"
        opportunities.append(o)

    if licenseUtilization >= 80:
        additional = rnd(purchasedLicenses * (0.25 if licenseUtilization >= 92 else 0.15))
        push_opp({"type": "License Expansion", "opportunity": f"Add ~{additional} seats",
                  "currentState": f"{licenseUtilization}% utilized ({activeLicenses}/{purchasedLicenses})",
                  "readiness": "High" if (licenseUtilization >= 92 and healthScore >= 65) else "Medium",
                  "value": rnd(additional * pricePerLicense),
                  "reason": "Customer is approaching full license utilization.",
                  "why": f"Active seats are at {licenseUtilization}% of purchased capacity, indicating demand for additional seats.",
                  "evidence": [{"label": "Purchased Seats", "value": f"{purchasedLicenses}"}, {"label": "Active Seats", "value": f"{activeLicenses}"},
                               {"label": "Utilization", "value": f"{licenseUtilization}%"}, {"label": "Active User Growth", "value": f"{sign(activeUserGrowth)}{activeUserGrowth}%"}],
                  "priority": "High" if licenseUtilization >= 92 else "Medium",
                  "recommendedAction": "Discuss additional seat bundle before renewal."})
    if c["upsellPotential"] > 0 and healthScore >= 58:
        push_opp({"type": "Upsell", "opportunity": "Upgrade to premium tier / add-ons",
                  "currentState": f"On {sub['plan']} plan", "readiness": "High" if healthScore >= 78 else "Medium",
                  "value": c["upsellPotential"], "reason": "Healthy account with room to move to a higher tier.",
                  "why": f"Usage growth {usageGrowth}% and adoption {featureAdoption}% support a premium upgrade.",
                  "evidence": [{"label": "Health Score", "value": f"{healthScore}"}, {"label": "Usage Growth", "value": f"{sign(usageGrowth)}{usageGrowth}%"},
                               {"label": "Feature Adoption", "value": f"{featureAdoption}%"}, {"label": "Current Plan", "value": sub["plan"]}],
                  "priority": "High" if healthScore >= 78 else "Medium",
                  "recommendedAction": "Review plan upgrade aligned to expanded usage."})
    if c["crossSellPotential"] > 0 and healthScore >= 55:
        push_opp({"type": "Cross-sell", "opportunity": f"Introduce {CROSS_SELL_PRODUCT}",
                  "currentState": f"Uses {sub['product']}", "readiness": "High" if healthScore >= 75 else "Medium",
                  "value": c["crossSellPotential"], "reason": "Healthy account not yet using a complementary product.",
                  "why": f"Strong adoption of {sub['product']} signals fit for {CROSS_SELL_PRODUCT}.",
                  "evidence": [{"label": "Health Score", "value": f"{healthScore}"}, {"label": "Feature Adoption", "value": f"{featureAdoption}%"}, {"label": "Active Users", "value": f"{activeUsers}"}],
                  "priority": "Medium" if healthScore >= 75 else "Low",
                  "recommendedAction": f"Introduce {CROSS_SELL_PRODUCT} to the account team."})
    whitespaceVal = c["expansionPotential"] - c["upsellPotential"] - c["crossSellPotential"]
    if whitespaceVal > 0 and licenseUtilization < 80:
        push_opp({"type": "Whitespace", "opportunity": "Expand into untapped teams",
                  "currentState": f"{activeUsers} of {totalUsers} users active", "readiness": "Medium" if healthScore >= 60 else "Low",
                  "value": whitespaceVal, "reason": "Large user base with adoption concentrated in few teams.",
                  "why": f"Only {activeUsers} of {totalUsers} provisioned users are active — untapped whitespace across the organization.",
                  "evidence": [{"label": "Total Users", "value": f"{totalUsers}"}, {"label": "Active Users", "value": f"{activeUsers}"}, {"label": "Utilization", "value": f"{licenseUtilization}%"}],
                  "priority": "Medium", "recommendedAction": "Explore whitespace with a departmental rollout plan."})
    opportunityValue = rnd(_sum(opportunities, lambda o: o["value"]))
    expansionReadiness = ("High" if any(o["readiness"] == "High" for o in opportunities)
                          else "Medium" if any(o["readiness"] == "Medium" for o in opportunities)
                          else "Low") if opportunities else "Low"

    anomalies = []
    baseSess = rnd(avg(sess[6:9]))
    baseUsers = rnd(avg(usersM[6:9]))
    if usageGrowth <= -12:
        anomalies.append({"signal": "Usage drop", "metric": "Usage Volume", "currentValue": f"{usageVolume:,}", "baseline": f"{baseSess:,}", "change": f"{usageGrowth}%", "period": "Last 3 months", "impact": "High"})
    if activeUserGrowth <= -10:
        anomalies.append({"signal": "Active-user drop", "metric": "Active Users", "currentValue": f"{activeUsers}", "baseline": f"{baseUsers}", "change": f"{activeUserGrowth}%", "period": "Last 3 months", "impact": "High"})
    if usageGrowth >= 18:
        anomalies.append({"signal": "Usage spike", "metric": "Usage Volume", "currentValue": f"{usageVolume:,}", "baseline": f"{baseSess:,}", "change": f"+{usageGrowth}%", "period": "Last 3 months", "impact": "Medium"})
    worst = next((f for f in adoptionGaps if f["adoptionChange"] < -3), adoptionGaps[0] if adoptionGaps else None)
    if worst and worst["adoptionChange"] < -3:
        anomalies.append({"signal": "Feature-usage change", "metric": worst["name"], "currentValue": f"{worst['adoptionPct']}%", "baseline": f"{worst['prevAdoptionPct']}%", "change": f"{worst['adoptionChange']}%", "period": "QoQ", "impact": "Medium"})

    actions = []

    def push_action(a):
        a.update({"id": f"{cid}-A{len(actions) + 1}", "customerId": cid, "customerName": c["name"], "status": "Open"})
        actions.append(a)

    if healthStatus == "At Risk" or (healthStatus == "Monitor" and daysToRenewal <= 120):
        push_action({"priority": riskPriority, "action": "Review renewal risk", "type": "Renewal" if daysToRenewal <= 120 else "Risk",
                     "reason": "Usage declining while renewal is approaching.", "impact": revenueAtRisk, "impactType": "risk",
                     "why": riskWhy, "nextStep": "Schedule an executive check-in and share a tailored engagement plan before renewal.",
                     "relatedType": "risk", "relatedId": cid, "evidence": riskEvidence})
    if featureAdoption < 50:
        push_action({"priority": "High" if featureAdoption < 40 else "Medium", "action": "Drive feature adoption", "type": "Adoption",
                     "reason": "Key features are available but underused.", "impact": revenueAtRisk or rnd(arr * 0.1), "impactType": "risk",
                     "why": f"Feature adoption is {featureAdoption}% with the largest gap on {adoptionGaps[0]['name'] if adoptionGaps else 'core features'}.",
                     "nextStep": "Run an enablement session on the lowest-adoption features.", "relatedType": "adoption", "relatedId": cid,
                     "evidence": [{"label": f["name"], "value": f"{f['adoptionPct']}% (gap {f['gap']})", "tone": "negative"} for f in adoptionGaps[:3]]})
    for o in opportunities:
        push_action({"priority": o["priority"], "action": o["recommendedAction"], "type": o["type"], "reason": o["reason"],
                     "impact": o["value"], "impactType": "opportunity", "why": o["why"], "nextStep": o["recommendedAction"],
                     "relatedType": "opportunity", "relatedId": o["id"], "evidence": [{**e, "tone": "neutral"} for e in o["evidence"]]})

    initials = "".join(w[0] for w in c["name"].split(" "))[:2].upper()
    return {
        "id": cid, "name": c["name"], "initials": initials,
        "segment": c["segment"], "industry": c["industry"], "region": c["region"], "country": c["country"],
        "accountOwner": c["accountOwner"], "employeeCount": c["employeeCount"],
        "product": sub["product"], "products": [sub["product"]], "plan": sub["plan"],
        "contractStart": sub["startDate"], "renewalDate": c["renewalDate"], "daysToRenewal": daysToRenewal, "arr": arr,
        "totalUsers": totalUsers, "purchasedLicenses": purchasedLicenses, "assignedLicenses": assignedLicenses,
        "activeLicenses": activeLicenses, "activeUsers": activeUsers, "activeUserPct": activeUserPct,
        "monthly": [{"month": x["month"], "usageVolume": x["sessions"], "activeUsers": x["activeUsers"], "minutes": x["minutes"]} for x in m],
        "usageVolume": usageVolume, "usageGrowth": usageGrowth, "activeUserGrowth": activeUserGrowth,
        "licenseUtilization": licenseUtilization, "licenseUtilizationChange": licenseUtilizationChange,
        "featureAdoption": featureAdoption, "features": features, "featuresUsed": featuresUsed, "adoptionGaps": adoptionGaps,
        "engagement": {"usageFrequency": usageFrequency, "usageDays": usageDays, "featuresUsed": featuresUsed, "lastActivityDays": lastActivityDays, "engagementChange": engagementChange},
        "support": {"currentTickets": currentTickets, "prevTickets": prevTickets, "openTickets": openTickets, "totalTickets": totalTickets,
                    "criticalTickets": criticalTickets, "ticketGrowth": ticketGrowth, "openTicketRate": openTicketRate, "avgResolutionDays": avgResolutionDays, "trend": supportTrend},
        "dau": dau, "wau": wau, "mau": mau,
        "healthScore": healthScore, "healthPrev": healthPrev, "healthChange": healthChange, "healthStatus": healthStatus,
        "healthTrend": healthTrend, "healthDrivers": healthDrivers,
        "churnRisk": churnRisk, "renewalRisk": renewalRisk, "revenueAtRisk": revenueAtRisk, "riskPriority": riskPriority,
        "riskSummary": riskSummary, "riskWhy": riskWhy, "riskEvidence": riskEvidence, "hasRisk": hasRisk,
        "adoptionStage": adoptionStage, "opportunities": opportunities, "opportunityValue": opportunityValue, "expansionReadiness": expansionReadiness,
        "anomalies": anomalies, "recommendedActions": actions,
    }


def compute_bundle():
    customers = [build(c) for c in RAW]
    total = len(customers)
    at_risk = [c for c in customers if c["healthStatus"] == "At Risk"]
    monitor = [c for c in customers if c["healthStatus"] == "Monitor"]
    healthy = [c for c in customers if c["healthStatus"] == "Healthy"]
    all_opps = [o for c in customers for o in c["opportunities"]]
    all_actions_nested = [a for c in customers for a in c["recommendedActions"]]

    expansionByType = [{"type": t, "count": len([o for o in all_opps if o["type"] == t]),
                        "value": rnd(_sum([o for o in all_opps if o["type"] == t], lambda o: o["value"]))} for t in OPPORTUNITY_TYPES]

    buckets = [("0–30 days", 0, 30), ("31–90 days", 31, 90), ("91–180 days", 91, 180), ("180+ days", 181, 100000)]
    revenueAtRiskByBucket = []
    for label, lo, hi in buckets:
        items = [c for c in customers if lo <= c["daysToRenewal"] <= hi]
        revenueAtRiskByBucket.append({"bucket": label, "customers": len(items),
                                      "arr": rnd(_sum(items, lambda c: c["arr"])), "revenueAtRisk": rnd(_sum(items, lambda c: c["revenueAtRisk"]))})

    healthTrend = [{"month": MONTHS[i], "health": rnd(_sum(customers, lambda c: c["healthTrend"][i]["health"]) / total)} for i in range(12)]

    portfolio = {
        "totalCustomers": total, "customersAtRisk": len(at_risk), "customersMonitor": len(monitor), "customersHealthy": len(healthy),
        "revenueAtRisk": rnd(_sum(customers, lambda c: c["revenueAtRisk"])), "totalArr": rnd(_sum(customers, lambda c: c["arr"])),
        "totalOpportunities": len(all_opps), "totalExpansionPotential": rnd(_sum(all_opps, lambda o: o["value"])),
        "aiActionsPending": len(all_actions_nested),
        "avgHealthScore": rnd(_sum(customers, lambda c: c["healthScore"]) / total),
        "healthChange": rnd(_sum(customers, lambda c: c["healthChange"]) / total, 1),
        "healthDistribution": [{"name": "Healthy", "value": len(healthy)}, {"name": "Monitor", "value": len(monitor)}, {"name": "At Risk", "value": len(at_risk)}],
        "healthTrend": healthTrend, "expansionByType": expansionByType, "revenueAtRiskByBucket": revenueAtRiskByBucket,
        "upcomingRenewals": len([c for c in customers if c["daysToRenewal"] <= 90]),
        "criticalTickets": rnd(_sum(customers, lambda c: c["support"]["criticalTickets"])),
        "openTicketRate": rnd(_sum(customers, lambda c: c["support"]["openTicketRate"]) / total, 1),
        "ticketGrowth": rnd(_sum(customers, lambda c: c["support"]["ticketGrowth"]) / total, 1),
    }

    order = {"High": 0, "Medium": 1, "Low": 2}
    actions = sorted(all_actions_nested, key=lambda a: order[a["priority"]])
    opportunities = [{**o, "customerId": c["id"], "customerName": c["name"], "healthScore": c["healthScore"], "segment": c["segment"]}
                     for c in customers for o in c["opportunities"]]
    anomalies = [{"id": f"{c['id']}-AN{i}", "customerId": c["id"], "customerName": c["name"], **a}
                 for c in customers for i, a in enumerate(c["anomalies"])]

    insights = []
    for c in customers:
        if c["healthStatus"] != "Healthy":
            insights.append({"id": f"{c['id']}-INS-R", "type": "Risk", "customerId": c["id"], "customerName": c["name"],
                             "insight": f"{c['name']} {'has declining usage' if c['usageGrowth'] < 0 else 'shows stalling usage'} ahead of renewal",
                             "why": c["riskWhy"], "evidence": c["riskEvidence"], "priority": c["riskPriority"]})
        if c["opportunities"]:
            o = c["opportunities"][0]
            insights.append({"id": f"{c['id']}-INS-O", "type": "Opportunity", "customerId": c["id"], "customerName": c["name"],
                             "insight": f"{c['name']}: {o['opportunity']}", "why": o["why"],
                             "evidence": [{**e, "tone": "neutral"} for e in o["evidence"]], "priority": o["priority"]})
        if c["featureAdoption"] < 50:
            insights.append({"id": f"{c['id']}-INS-A", "type": "Adoption", "customerId": c["id"], "customerName": c["name"],
                             "insight": f"{c['name']} has low feature adoption ({c['featureAdoption']}%)",
                             "why": "Several available features are underused, limiting realized value.",
                             "evidence": [{"label": f["name"], "value": f"{f['adoptionPct']}%", "tone": "negative"} for f in c["adoptionGaps"][:3]],
                             "priority": "High" if c["featureAdoption"] < 40 else "Medium"})
    insights = sorted(insights, key=lambda x: order[x["priority"]])

    portfolioUsageTrend = []
    for i in range(12):
        usageVolume = rnd(_sum(customers, lambda c: c["monthly"][i]["usageVolume"]))
        activeUsers = rnd(_sum(customers, lambda c: c["monthly"][i]["activeUsers"]))
        prev = usageVolume if i == 0 else rnd(_sum(customers, lambda c: c["monthly"][i - 1]["usageVolume"]))
        usageGrowth = 0 if i == 0 else rnd((usageVolume - prev) / prev * 100, 1)
        mau = activeUsers
        portfolioUsageTrend.append({"month": MONTHS[i], "usageVolume": usageVolume, "activeUsers": activeUsers,
                                    "usageGrowth": usageGrowth, "dau": rnd(rnd(mau * 0.63) * 0.42), "wau": rnd(mau * 0.63), "mau": mau})

    portfolioFeatures = []
    for fn in FEATURE_NAMES:
        rows = [next(f for f in c["features"] if f["name"] == fn) for c in customers]
        eligible = rnd(_sum(rows, lambda f: f["eligibleUsers"]))
        adopters = rnd(_sum(rows, lambda f: f["adopters"]))
        adoptionPct = rnd(adopters / eligible * 100, 1)
        portfolioFeatures.append({"feature": fn, "eligibleUsers": eligible, "adopters": adopters, "adoptionPct": adoptionPct,
                                  "adoptionChange": rnd(avg([f["adoptionChange"] for f in rows]), 1), "benchmark": rows[0]["benchmark"],
                                  "gap": rnd(max(0, rows[0]["benchmark"] - adoptionPct), 1),
                                  "usageVolume": rnd(_sum(rows, lambda f: f["usageVolume"])), "customersAffected": len([f for f in rows if f["gap"] > 0])})

    adoptionStageDistribution = [{"stage": s, "count": len([c for c in customers if c["adoptionStage"] == s])} for s in ["Onboarding", "Growing", "Established", "Power User"]]
    expansionReadinessDistribution = [{"readiness": r, "count": len([c for c in customers if c["expansionReadiness"] == r])} for r in ["High", "Medium", "Low"]]

    meta = {"MONTHS": MONTHS, "YEAR": YEAR, "PRODUCTS": PRODUCTS, "FEATURE_NAMES": FEATURE_NAMES, "SEGMENTS": SEGMENTS,
            "HEALTH_STATUSES": HEALTH_STATUSES, "OPPORTUNITY_TYPES": OPPORTUNITY_TYPES, "RENEWAL_BUCKETS": RENEWAL_BUCKETS,
            "referenceDate": REFERENCE_DATE.isoformat()}

    return {
        "customers": customers, "portfolio": portfolio, "actions": actions, "opportunities": opportunities,
        "anomalies": anomalies, "insights": insights, "portfolioUsageTrend": portfolioUsageTrend,
        "portfolioFeatures": portfolioFeatures, "adoptionStageDistribution": adoptionStageDistribution,
        "expansionReadinessDistribution": expansionReadinessDistribution, "meta": meta,
    }


BUNDLE = compute_bundle()
