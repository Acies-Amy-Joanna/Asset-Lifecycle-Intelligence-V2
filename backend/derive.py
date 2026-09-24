"""
Derive ALI customer intelligence from PostgreSQL source data.

Architecture:
PostgreSQL -> db.py -> derive.py -> BUNDLE -> FastAPI -> React

The output structure is kept compatible with the existing frontend.
"""

from collections import defaultdict
from datetime import date
from calendar import monthrange

from db import fetch_all_data


# ============================================================
# CONFIGURATION
# ============================================================

MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]

YEAR = 2025

# The MVP represents an end-of-2025 customer intelligence snapshot.
REFERENCE_DATE = date(2025, 12, 31)

PRODUCTS = ["Udemy Business"]

# Business-rule configuration for the MVP.
CROSS_SELL_PRODUCT = "Udemy Leadership Academy"

SEGMENTS = ["Enterprise", "Mid-Market", "SMB"]

HEALTH_STATUSES = ["Healthy", "Monitor", "At Risk"]

OPPORTUNITY_TYPES = [
    "Upsell",
    "Cross-sell",
    "License Expansion",
    "Whitespace",
]

RENEWAL_BUCKETS = [
    "0–30 days",
    "31–90 days",
    "91–180 days",
    "180+ days",
]

BENCH = {
    "Course Learning": 75,
    "Learning Paths": 60,
    "Course Assignments": 60,
    "Analytics & Insights": 45,
    "User Management": 55,
    "Custom Content": 40,
    "Integrations": 40,
    "Skill Insights": 45,
}


# ============================================================
# HELPERS
# ============================================================

def clamp(n, lo, hi):
    return max(lo, min(hi, n))


def rnd(n, dp=0):
    if n is None:
        return 0
    return round(n, dp) if dp else int(round(n))


def avg(values):
    return sum(values) / len(values) if values else 0


def pct(cur, prev):
    return (cur - prev) / prev * 100 if prev else 0


def mscore(value, lo, hi):
    if hi == lo:
        return 0
    return clamp((value - lo) / (hi - lo) * 100, 0, 100)


def sum_by(rows, fn):
    return sum(fn(row) for row in rows)


def month_index(dt):
    return dt.month - 1


def date_or_none(value):
    if value is None:
        return None

    if isinstance(value, date):
        return value

    return value.date()


def sign(value):
    return "+" if value > 0 else ""


def direction(value):
    if value > 1:
        return "up"
    if value < -1:
        return "down"
    return "flat"


def contribution(good):
    return "positive" if good else "negative"


# ============================================================
# LOAD RAW DATA FROM POSTGRESQL
# ============================================================

DATA = fetch_all_data()

CUSTOMERS_RAW = DATA["customers"]
FEATURES_RAW = DATA["features"]
USERS_RAW = DATA["users"]
USAGE_RAW = DATA["usage"]
SUBSCRIPTIONS_RAW = DATA["subscriptions"]
RENEWALS_RAW = DATA["renewals"]
COMMERCIAL_RAW = DATA["commercial"]
SUPPORT_RAW = DATA["support"]


# ============================================================
# INDEX RAW DATA FOR FASTER CUSTOMER-LEVEL CALCULATIONS
# ============================================================

USERS_BY_CUSTOMER = defaultdict(list)

for row in USERS_RAW:
    USERS_BY_CUSTOMER[row["customer_id"]].append(row)


USAGE_BY_CUSTOMER = defaultdict(list)

for row in USAGE_RAW:
    USAGE_BY_CUSTOMER[row["customer_id"]].append(row)


SUBSCRIPTION_BY_CUSTOMER = {}

for row in SUBSCRIPTIONS_RAW:
    SUBSCRIPTION_BY_CUSTOMER[row["customer_id"]] = row


RENEWAL_BY_CUSTOMER = {}

for row in RENEWALS_RAW:
    RENEWAL_BY_CUSTOMER[row["customer_id"]] = row


COMMERCIAL_BY_CUSTOMER = {}

for row in COMMERCIAL_RAW:
    COMMERCIAL_BY_CUSTOMER[row["customer_id"]] = row


SUPPORT_BY_CUSTOMER = defaultdict(list)

for row in SUPPORT_RAW:
    SUPPORT_BY_CUSTOMER[row["customer_id"]].append(row)


FEATURE_BY_ID = {}

for row in FEATURES_RAW:
    FEATURE_BY_ID[row["feature_id"]] = row


FEATURE_NAMES = [
    row["feature_name"]
    for row in FEATURES_RAW
]


# ============================================================
# MONTHLY USAGE
# ============================================================

def build_monthly_usage(customer_id):
    rows = USAGE_BY_CUSTOMER.get(customer_id, [])

    monthly = []

    for month_number in range(1, 13):

        month_rows = [
            row
            for row in rows
            if row["usage_date"].year == YEAR
            and row["usage_date"].month == month_number
        ]

        sessions = sum_by(
            month_rows,
            lambda row: row["sessions"] or 0
        )

        minutes = sum_by(
            month_rows,
            lambda row: float(row["minutes"] or 0)
        )

        actions = sum_by(
            month_rows,
            lambda row: row["actions"] or 0
        )

        active_users = len({
            row["user_id"]
            for row in month_rows
        })

        monthly.append({
            "month": MONTHS[month_number - 1],
            "usageVolume": rnd(sessions),
            "activeUsers": active_users,
            "minutes": rnd(minutes, 2),
            "sessions": rnd(sessions),
            "actions": rnd(actions),
        })

    return monthly


# ============================================================
# FEATURE METRICS
# ============================================================

def build_features(customer_id, total_users):
    rows = USAGE_BY_CUSTOMER.get(customer_id, [])

    result = []

    for feature in FEATURES_RAW:

        feature_id = feature["feature_id"]
        feature_name = feature["feature_name"]
        category = feature["feature_category"]

        feature_rows = [
            row
            for row in rows
            if row["feature_id"] == feature_id
        ]

        current_rows = [
            row
            for row in feature_rows
            if row["usage_date"].year == YEAR
            and row["usage_date"].month in (10, 11, 12)
        ]

        previous_rows = [
            row
            for row in feature_rows
            if row["usage_date"].year == YEAR
            and row["usage_date"].month in (7, 8, 9)
        ]

        current_adopters = len({
            row["user_id"]
            for row in current_rows
        })

        previous_adopters = len({
            row["user_id"]
            for row in previous_rows
        })

        eligible_users = total_users

        adoption_pct = (
            current_adopters / eligible_users * 100
            if eligible_users
            else 0
        )

        previous_adoption_pct = (
            previous_adopters / eligible_users * 100
            if eligible_users
            else 0
        )

        adoption_change = adoption_pct - previous_adoption_pct

        benchmark = BENCH.get(feature_name, 55)

        gap = max(
            0,
            benchmark - adoption_pct
        )

        usage_volume = sum_by(
            current_rows,
            lambda row: row["sessions"] or 0
        )

        result.append({
            "name": feature_name,
            "category": category,
            "eligibleUsers": eligible_users,
            "adopters": current_adopters,
            "adoptionPct": rnd(adoption_pct, 1),
            "prevAdoptionPct": rnd(previous_adoption_pct, 1),
            "adoptionChange": rnd(adoption_change, 1),
            "benchmark": benchmark,
            "gap": rnd(gap, 1),
            "usageVolume": rnd(usage_volume),
        })

    return result


# ============================================================
# SUPPORT METRICS
# ============================================================

def build_support(customer_id):
    rows = SUPPORT_BY_CUSTOMER.get(customer_id, [])

    total_tickets = len(rows)

    open_tickets = len([
        row
        for row in rows
        if str(row["status"]).lower() == "open"
    ])

    critical_tickets = len([
        row
        for row in rows
        if str(row["severity"]).lower() == "critical"
    ])

    monthly_counts = []

    for month_number in range(1, 13):

        count = len([
            row
            for row in rows
            if row["ticket_date"]
            and row["ticket_date"].year == YEAR
            and row["ticket_date"].month == month_number
        ])

        monthly_counts.append(count)

    current_tickets = monthly_counts[11]
    previous_tickets = monthly_counts[10]

    open_ticket_rate = (
        open_tickets / total_tickets * 100
        if total_tickets
        else 0
    )

    ticket_growth = pct(
        current_tickets,
        previous_tickets
    )

    resolution_days = []

    for row in rows:

        resolved_date = row["resolved_date"]

        if resolved_date and row["ticket_date"]:
            days = (
                resolved_date - row["ticket_date"]
            ).days

            if days >= 0:
                resolution_days.append(days)

    avg_resolution_days = (
        avg(resolution_days)
        if resolution_days
        else 0
    )

    support_trend = [
        {
            "month": MONTHS[6 + i],
            "tickets": monthly_counts[6 + i],
        }
        for i in range(6)
    ]

    return {
        "currentTickets": current_tickets,
        "prevTickets": previous_tickets,
        "openTickets": open_tickets,
        "totalTickets": total_tickets,
        "criticalTickets": critical_tickets,
        "ticketGrowth": rnd(ticket_growth, 1),
        "openTicketRate": rnd(open_ticket_rate, 1),
        "avgResolutionDays": rnd(avg_resolution_days, 1),
        "trend": support_trend,
    }


# ============================================================
# CUSTOMER DERIVATION
# ============================================================

def build(customer):

    cid = customer["customer_id"]

    users = USERS_BY_CUSTOMER.get(cid, [])

    total_users = len(users)

    monthly = build_monthly_usage(cid)

    features = build_features(
        cid,
        total_users
    )

    support = build_support(cid)

    subscription = SUBSCRIPTION_BY_CUSTOMER.get(cid)

    renewal = RENEWAL_BY_CUSTOMER.get(cid)

    commercial = COMMERCIAL_BY_CUSTOMER.get(cid)

    if not subscription:
        raise ValueError(
            f"No subscription found for customer {cid}"
        )

    if not renewal:
        raise ValueError(
            f"No renewal found for customer {cid}"
        )

    if not commercial:
        raise ValueError(
            f"No commercial record found for customer {cid}"
        )

    # --------------------------------------------------------
    # Usage
    # --------------------------------------------------------

    sessions = [
        month["sessions"]
        for month in monthly
    ]

    active_users_monthly = [
        month["activeUsers"]
        for month in monthly
    ]

    cur3_sessions = avg(
        sessions[9:12]
    )

    prev3_sessions = avg(
        sessions[6:9]
    )

    cur3_users = avg(
        active_users_monthly[9:12]
    )

    prev3_users = avg(
        active_users_monthly[6:9]
    )

    usage_growth = rnd(
        pct(cur3_sessions, prev3_sessions),
        1
    )

    active_user_growth = rnd(
        pct(cur3_users, prev3_users),
        1
    )

    usage_volume = sessions[11]

    active_users = active_users_monthly[11]

    active_user_pct = (
        active_users / total_users * 100
        if total_users
        else 0
    )

    # --------------------------------------------------------
    # License
    # --------------------------------------------------------

    purchased_licenses = subscription["purchased_seats"] or 0
    assigned_licenses = subscription["assigned_seats"] or 0
    active_licenses = subscription["active_seats"] or 0

    license_utilization = (
        active_licenses / purchased_licenses * 100
        if purchased_licenses
        else 0
    )

    license_utilization_change = (
        (active_users_monthly[11] - active_users_monthly[10])
        / purchased_licenses
        * 100
        if purchased_licenses
        else 0
    )

    arr = float(commercial["arr"] or 0)

    price_per_license = (
        arr / purchased_licenses
        if purchased_licenses
        else 0
    )

    # --------------------------------------------------------
    # Feature adoption
    # --------------------------------------------------------

    feature_adoption = rnd(
        avg([
            feature["adoptionPct"]
            for feature in features
        ]),
        1
    )

    features_used = len([
        feature
        for feature in features
        if feature["adoptionPct"] >= 30
    ])

    adoption_gaps = sorted(
        [
            feature
            for feature in features
            if feature["gap"] > 0
        ],
        key=lambda feature: -feature["gap"]
    )

    # --------------------------------------------------------
    # Engagement
    # --------------------------------------------------------

    freq_current = (
        cur3_sessions / cur3_users
        if cur3_users
        else 0
    )

    freq_previous = (
        prev3_sessions / prev3_users
        if prev3_users
        else 0
    )

    engagement_change = rnd(
        pct(freq_current, freq_previous),
        1
    )

    usage_frequency = rnd(
        clamp(
            sessions[11] / max(active_users, 1) / 4.3,
            0.2,
            7
        ),
        1
    )

    usage_days = rnd(
        clamp(
            sessions[11] / max(active_users, 1),
            1,
            30
        )
    )

    last_activity_days = rnd(
        clamp(
            4 - usage_growth / 10,
            1,
            26
        )
    )

    mau = active_users
    wau = rnd(mau * 0.63)
    dau = rnd(wau * 0.42)

    # --------------------------------------------------------
    # Health
    # --------------------------------------------------------

    usage_score = mscore(
        usage_growth,
        -30,
        30
    )

    active_user_score = mscore(
        active_user_growth,
        -30,
        30
    )

    utilization_score = clamp(
        license_utilization,
        0,
        100
    )

    adoption_score = feature_adoption

    engagement_score = mscore(
        engagement_change,
        -40,
        40
    )

    support_score = clamp(
        100
        - support["openTicketRate"]
        - support["ticketGrowth"] * 0.4
        - support["criticalTickets"] * 1.4,
        0,
        100
    )

    health_score = rnd(
        usage_score * 0.22
        + active_user_score * 0.14
        + utilization_score * 0.18
        + adoption_score * 0.16
        + engagement_score * 0.15
        + support_score * 0.15
    )

    health_status = (
        "Healthy"
        if health_score >= 72
        else "Monitor"
        if health_score >= 55
        else "At Risk"
    )

    # --------------------------------------------------------
    # Health trend
    # --------------------------------------------------------

    min_sessions = min(sessions)
    max_sessions = max(sessions)

    shape = [
        (
            50
            + (value - min_sessions)
            / (max_sessions - min_sessions)
            * 40
        )
        if max_sessions > min_sessions
        else 65
        for value in sessions
    ]

    offset = health_score - shape[11]

    health_trend = [
        {
            "month": MONTHS[i],
            "health": (
                health_score
                if i == 11
                else rnd(
                    clamp(
                        shape[i] + offset,
                        10,
                        99
                    )
                )
            ),
        }
        for i in range(12)
    ]

    health_prev = health_trend[10]["health"]

    health_change = rnd(
        health_score - health_prev
    )

    # --------------------------------------------------------
    # Renewal
    # --------------------------------------------------------

    renewal_date = date_or_none(
        renewal["renewal_date"]
    )

    days_to_renewal = (
        renewal_date - REFERENCE_DATE
    ).days

    # --------------------------------------------------------
    # Risk
    # --------------------------------------------------------

    churn_risk = (
        "High"
        if health_score < 55
        else "Medium"
        if health_score < 72
        else "Low"
    )

    renewal_risk = (
        "High"
        if health_status == "At Risk"
        else "Medium"
        if (
            health_status == "Monitor"
            and days_to_renewal <= 90
        )
        else "Low"
    )

    risk_priority = (
        "High"
        if health_status == "At Risk"
        else "Medium"
        if (
            health_status == "Monitor"
            and days_to_renewal <= 120
        )
        else "Low"
    )

    # --------------------------------------------------------
    # Revenue at risk
    #
    # MVP rule:
    # At Risk    -> 100% of ARR
    # Monitor    -> 50% of ARR when renewal <= 180 days
    # Otherwise  -> 0
    # --------------------------------------------------------

    if health_status == "At Risk":
        revenue_at_risk = arr

    elif (
        health_status == "Monitor"
        and days_to_renewal <= 180
    ):
        revenue_at_risk = arr * 0.50

    else:
        revenue_at_risk = 0

    revenue_at_risk = rnd(
        revenue_at_risk
    )

    # --------------------------------------------------------
    # Adoption stage
    # --------------------------------------------------------

    adoption_stage = (
        "Power User"
        if (
            feature_adoption >= 70
            and license_utilization >= 75
        )
        else "Established"
        if feature_adoption >= 55
        else "Growing"
        if feature_adoption >= 40
        else "Onboarding"
    )

    # --------------------------------------------------------
    # Health drivers
    # --------------------------------------------------------

    health_drivers = [
        {
            "name": "Product Usage",
            "value": f"{sign(usage_growth)}{usage_growth}%",
            "change": usage_growth,
            "direction": direction(usage_growth),
            "contribution": contribution(
                usage_growth >= 0
            ),
        },
        {
            "name": "Feature Adoption",
            "value": f"{feature_adoption}%",
            "change": rnd(feature_adoption - 60),
            "direction": direction(
                feature_adoption - 60
            ),
            "contribution": contribution(
                feature_adoption >= 55
            ),
        },
        {
            "name": "License Utilization",
            "value": f"{rnd(license_utilization, 1)}%",
            "change": rnd(
                license_utilization_change,
                1
            ),
            "direction": direction(
                license_utilization_change
            ),
            "contribution": contribution(
                license_utilization >= 65
            ),
        },
        {
            "name": "Engagement",
            "value": f"{sign(engagement_change)}{engagement_change}%",
            "change": engagement_change,
            "direction": direction(
                engagement_change
            ),
            "contribution": contribution(
                engagement_change >= 0
            ),
        },
        {
            "name": "Support Friction",
            "value": f"{sign(support['ticketGrowth'])}{support['ticketGrowth']}% tickets",
            "change": -support["ticketGrowth"],
            "direction": direction(
                -support["ticketGrowth"]
            ),
            "contribution": contribution(
                support["ticketGrowth"] <= 10
                and support["openTicketRate"] < 40
            ),
        },
        {
            "name": "Renewal Proximity",
            "value": f"{days_to_renewal} days",
            "change": 0,
            "direction": "flat",
            "contribution": (
                "negative"
                if days_to_renewal <= 90
                else "neutral"
            ),
        },
    ]

    risk_evidence = [
        {
            "label": "Usage Growth",
            "value": f"{sign(usage_growth)}{usage_growth}%",
            "tone": (
                "positive"
                if usage_growth >= 0
                else "negative"
            ),
        },
        {
            "label": "Active User Growth",
            "value": f"{sign(active_user_growth)}{active_user_growth}%",
            "tone": (
                "positive"
                if active_user_growth >= 0
                else "negative"
            ),
        },
        {
            "label": "License Utilization",
            "value": f"{rnd(license_utilization, 1)}%",
            "tone": (
                "positive"
                if license_utilization >= 65
                else "negative"
            ),
        },
        {
            "label": "Feature Adoption",
            "value": f"{feature_adoption}%",
            "tone": (
                "positive"
                if feature_adoption >= 55
                else "negative"
            ),
        },
        {
            "label": "Support Tickets",
            "value": f"{sign(support['ticketGrowth'])}{support['ticketGrowth']}%",
            "tone": (
                "positive"
                if support["ticketGrowth"] <= 10
                else "negative"
            ),
        },
        {
            "label": "Days to Renewal",
            "value": f"{days_to_renewal}",
            "tone": (
                "negative"
                if days_to_renewal <= 90
                else "neutral"
            ),
        },
    ]

    has_risk = health_status != "Healthy"

    risk_summary = (
        "Customer may be at renewal risk"
        if health_status == "At Risk"
        else "Customer needs monitoring ahead of renewal"
        if health_status == "Monitor"
        else "No active retention risk"
    )

    risk_why = (
        f"Product usage "
        f"{'has declined' if usage_growth < 0 else 'is stalling'} "
        f"({usage_growth}%) and license utilization is "
        f"{rnd(license_utilization, 1)}% while renewal is "
        f"{'approaching' if days_to_renewal <= 120 else 'on the horizon'} "
        f"({days_to_renewal} days)."
        if has_risk
        else
        "Usage, adoption and engagement are trending positively "
        "with no renewal pressure."
    )

    # ========================================================
    # OPPORTUNITIES
    # ========================================================

    opportunities = []

    def push_opportunity(opportunity):
        opportunity["id"] = (
            f"{cid}-OPP{len(opportunities) + 1}"
        )
        opportunities.append(opportunity)

    # --------------------------------------------------------
    # License expansion
    # --------------------------------------------------------

    if license_utilization >= 80:

        additional_seats = rnd(
            purchased_licenses
            * (
                0.25
                if license_utilization >= 92
                else 0.15
            )
        )

        value = rnd(
            additional_seats * price_per_license
        )

        push_opportunity({
            "type": "License Expansion",
            "opportunity": f"Add ~{additional_seats} seats",
            "currentState": (
                f"{rnd(license_utilization, 1)}% utilized "
                f"({active_licenses}/{purchased_licenses})"
            ),
            "readiness": (
                "High"
                if (
                    license_utilization >= 92
                    and health_score >= 65
                )
                else "Medium"
            ),
            "value": value,
            "reason": "Customer is approaching full license utilization.",
            "why": (
                f"Active seats are at "
                f"{rnd(license_utilization, 1)}% of purchased capacity, "
                "indicating demand for additional seats."
            ),
            "evidence": [
                {
                    "label": "Purchased Seats",
                    "value": f"{purchased_licenses}",
                },
                {
                    "label": "Active Seats",
                    "value": f"{active_licenses}",
                },
                {
                    "label": "Utilization",
                    "value": f"{rnd(license_utilization, 1)}%",
                },
                {
                    "label": "Active User Growth",
                    "value": f"{sign(active_user_growth)}{active_user_growth}%",
                },
            ],
            "priority": (
                "High"
                if license_utilization >= 92
                else "Medium"
            ),
            "recommendedAction": (
                "Discuss additional seat bundle before renewal."
            ),
        })

    # --------------------------------------------------------
    # Upsell
    #
    # MVP rule:
    # healthy usage + strong adoption + lower utilization
    # can indicate potential for a higher tier.
    # --------------------------------------------------------

    upsell_value = 0

    if (
        health_score >= 58
        and feature_adoption >= 55
        and usage_growth >= 0
    ):

        upsell_value = rnd(
            arr * 0.15
        )

        push_opportunity({
            "type": "Upsell",
            "opportunity": "Upgrade to premium tier / add-ons",
            "currentState": (
                f"On {subscription['plan']} plan"
            ),
            "readiness": (
                "High"
                if health_score >= 78
                else "Medium"
            ),
            "value": upsell_value,
            "reason": (
                "Healthy account with sustained product engagement."
            ),
            "why": (
                f"Usage growth is {usage_growth}% and "
                f"feature adoption is {feature_adoption}%, "
                "supporting a potential premium upgrade."
            ),
            "evidence": [
                {
                    "label": "Health Score",
                    "value": f"{health_score}",
                },
                {
                    "label": "Usage Growth",
                    "value": f"{sign(usage_growth)}{usage_growth}%",
                },
                {
                    "label": "Feature Adoption",
                    "value": f"{feature_adoption}%",
                },
                {
                    "label": "Current Plan",
                    "value": subscription["plan"],
                },
            ],
            "priority": (
                "High"
                if health_score >= 78
                else "Medium"
            ),
            "recommendedAction": (
                "Review plan upgrade aligned to expanded usage."
            ),
        })

    # --------------------------------------------------------
    # Cross-sell
    #
    # This is a business-rule opportunity. The source data
    # contains only Udemy Business, so this does not claim
    # that the customer already uses the second product.
    # --------------------------------------------------------

    cross_sell_value = 0

    if (
        health_score >= 65
        and feature_adoption >= 60
        and active_users >= max(
            1,
            int(total_users * 0.5)
        )
    ):

        cross_sell_value = rnd(
            arr * 0.10
        )

        push_opportunity({
            "type": "Cross-sell",
            "opportunity": (
                f"Introduce {CROSS_SELL_PRODUCT}"
            ),
            "currentState": (
                f"Uses {subscription['product']}"
            ),
            "readiness": (
                "High"
                if health_score >= 75
                else "Medium"
            ),
            "value": cross_sell_value,
            "reason": (
                "Strong engagement with the existing product "
                "indicates potential fit for a complementary offering."
            ),
            "why": (
                f"Feature adoption is {feature_adoption}% "
                f"and {active_users} users are active."
            ),
            "evidence": [
                {
                    "label": "Health Score",
                    "value": f"{health_score}",
                },
                {
                    "label": "Feature Adoption",
                    "value": f"{feature_adoption}%",
                },
                {
                    "label": "Active Users",
                    "value": f"{active_users}",
                },
            ],
            "priority": (
                "Medium"
                if health_score >= 75
                else "Low"
            ),
            "recommendedAction": (
                f"Introduce {CROSS_SELL_PRODUCT} to the account team."
            ),
        })

    # --------------------------------------------------------
    # Whitespace
    # --------------------------------------------------------

    whitespace_value = 0

    if (
        license_utilization < 80
        and total_users > active_users
    ):

        inactive_users = max(
            0,
            total_users - active_users
        )

        whitespace_value = rnd(
            inactive_users
            * price_per_license
            * 0.25
        )

        if whitespace_value > 0:

            push_opportunity({
                "type": "Whitespace",
                "opportunity": "Expand into untapped teams",
                "currentState": (
                    f"{active_users} of {total_users} users active"
                ),
                "readiness": (
                    "Medium"
                    if health_score >= 60
                    else "Low"
                ),
                "value": whitespace_value,
                "reason": (
                    "A portion of the available user base "
                    "is not actively using the product."
                ),
                "why": (
                    f"{active_users} of {total_users} users "
                    "were active in the latest month."
                ),
                "evidence": [
                    {
                        "label": "Total Users",
                        "value": f"{total_users}",
                    },
                    {
                        "label": "Active Users",
                        "value": f"{active_users}",
                    },
                    {
                        "label": "Utilization",
                        "value": f"{rnd(license_utilization, 1)}%",
                    },
                ],
                "priority": "Medium",
                "recommendedAction": (
                    "Explore whitespace with a departmental rollout plan."
                ),
            })

    opportunity_value = rnd(
        sum_by(
            opportunities,
            lambda opportunity: opportunity["value"]
        )
    )

    expansion_readiness = (
        "High"
        if any(
            opportunity["readiness"] == "High"
            for opportunity in opportunities
        )
        else "Medium"
        if any(
            opportunity["readiness"] == "Medium"
            for opportunity in opportunities
        )
        else "Low"
    ) if opportunities else "Low"

    # ========================================================
    # ANOMALIES
    # ========================================================

    anomalies = []

    base_sessions = rnd(
        avg(sessions[6:9])
    )

    base_users = rnd(
        avg(active_users_monthly[6:9])
    )

    if usage_growth <= -12:

        anomalies.append({
            "signal": "Usage drop",
            "metric": "Usage Volume",
            "currentValue": f"{usage_volume:,}",
            "baseline": f"{base_sessions:,}",
            "change": f"{usage_growth}%",
            "period": "Last 3 months",
            "impact": "High",
        })

    if active_user_growth <= -10:

        anomalies.append({
            "signal": "Active-user drop",
            "metric": "Active Users",
            "currentValue": f"{active_users}",
            "baseline": f"{base_users}",
            "change": f"{active_user_growth}%",
            "period": "Last 3 months",
            "impact": "High",
        })

    if usage_growth >= 18:

        anomalies.append({
            "signal": "Usage spike",
            "metric": "Usage Volume",
            "currentValue": f"{usage_volume:,}",
            "baseline": f"{base_sessions:,}",
            "change": f"+{usage_growth}%",
            "period": "Last 3 months",
            "impact": "Medium",
        })

    worst_feature = next(
        (
            feature
            for feature in adoption_gaps
            if feature["adoptionChange"] < -3
        ),
        adoption_gaps[0]
        if adoption_gaps
        else None
    )

    if (
        worst_feature
        and worst_feature["adoptionChange"] < -3
    ):

        anomalies.append({
            "signal": "Feature-usage change",
            "metric": worst_feature["name"],
            "currentValue": f"{worst_feature['adoptionPct']}%",
            "baseline": f"{worst_feature['prevAdoptionPct']}%",
            "change": f"{worst_feature['adoptionChange']}%",
            "period": "QoQ",
            "impact": "Medium",
        })

    # ========================================================
    # ACTIONS
    # ========================================================

    actions = []

    def push_action(action):

        action.update({
            "id": f"{cid}-A{len(actions) + 1}",
            "customerId": cid,
            "customerName": customer["customer_name"],
            "status": "Open",
        })

        actions.append(action)

    if (
        health_status == "At Risk"
        or (
            health_status == "Monitor"
            and days_to_renewal <= 120
        )
    ):

        push_action({
            "priority": risk_priority,
            "action": "Review renewal risk",
            "type": (
                "Renewal"
                if days_to_renewal <= 120
                else "Risk"
            ),
            "reason": (
                "Usage and engagement indicators require review "
                "while renewal is approaching."
            ),
            "impact": revenue_at_risk,
            "impactType": "risk",
            "why": risk_why,
            "nextStep": (
                "Schedule an executive check-in and share "
                "a tailored engagement plan before renewal."
            ),
            "relatedType": "risk",
            "relatedId": cid,
            "evidence": risk_evidence,
        })

    if feature_adoption < 50:

        push_action({
            "priority": (
                "High"
                if feature_adoption < 40
                else "Medium"
            ),
            "action": "Drive feature adoption",
            "type": "Adoption",
            "reason": (
                "Key features are available but underused."
            ),
            "impact": (
                revenue_at_risk
                or rnd(arr * 0.10)
            ),
            "impactType": "risk",
            "why": (
                f"Feature adoption is {feature_adoption}% "
                f"with the largest gap on "
                f"{adoption_gaps[0]['name'] if adoption_gaps else 'core features'}."
            ),
            "nextStep": (
                "Run an enablement session on "
                "the lowest-adoption features."
            ),
            "relatedType": "adoption",
            "relatedId": cid,
            "evidence": [
                {
                    "label": feature["name"],
                    "value": (
                        f"{feature['adoptionPct']}% "
                        f"(gap {feature['gap']})"
                    ),
                    "tone": "negative",
                }
                for feature in adoption_gaps[:3]
            ],
        })

    for opportunity in opportunities:

        push_action({
            "priority": opportunity["priority"],
            "action": opportunity["recommendedAction"],
            "type": opportunity["type"],
            "reason": opportunity["reason"],
            "impact": opportunity["value"],
            "impactType": "opportunity",
            "why": opportunity["why"],
            "nextStep": opportunity["recommendedAction"],
            "relatedType": "opportunity",
            "relatedId": opportunity["id"],
            "evidence": [
                {
                    **evidence,
                    "tone": "neutral",
                }
                for evidence in opportunity["evidence"]
            ],
        })

    initials = "".join(
        word[0]
        for word in customer["customer_name"].split()
    )[:2].upper()

    # ========================================================
    # FINAL CUSTOMER OBJECT
    # ========================================================

    return {
        "id": cid,
        "name": customer["customer_name"],
        "initials": initials,

        "segment": customer["segment"],
        "industry": customer["industry"],
        "region": customer["region"],
        "country": customer["country"],

        "accountOwner": customer["account_owner"],
        "employeeCount": customer["employee_count"],

        "product": subscription["product"],
        "products": [subscription["product"]],
        "plan": subscription["plan"],

        "contractStart": subscription["start_date"].isoformat()
        if subscription["start_date"]
        else None,

        "renewalDate": renewal_date.isoformat()
        if renewal_date
        else None,

        "daysToRenewal": days_to_renewal,

        "arr": rnd(arr),

        "totalUsers": total_users,

        "purchasedLicenses": purchased_licenses,
        "assignedLicenses": assigned_licenses,
        "activeLicenses": active_licenses,

        "activeUsers": active_users,
        "activeUserPct": rnd(
            active_user_pct,
            1
        ),

        "monthly": [
            {
                "month": month["month"],
                "usageVolume": month["usageVolume"],
                "activeUsers": month["activeUsers"],
                "minutes": month["minutes"],
            }
            for month in monthly
        ],

        "usageVolume": usage_volume,
        "usageGrowth": usage_growth,
        "activeUserGrowth": active_user_growth,

        "licenseUtilization": rnd(
            license_utilization,
            1
        ),

        "licenseUtilizationChange": rnd(
            license_utilization_change,
            1
        ),

        "featureAdoption": feature_adoption,
        "features": features,
        "featuresUsed": features_used,
        "adoptionGaps": adoption_gaps,

        "engagement": {
            "usageFrequency": usage_frequency,
            "usageDays": usage_days,
            "featuresUsed": features_used,
            "lastActivityDays": last_activity_days,
            "engagementChange": engagement_change,
        },

        "support": support,

        "dau": dau,
        "wau": wau,
        "mau": mau,

        "healthScore": health_score,
        "healthPrev": health_prev,
        "healthChange": health_change,
        "healthStatus": health_status,

        "healthTrend": health_trend,
        "healthDrivers": health_drivers,

        "churnRisk": churn_risk,
        "renewalRisk": renewal_risk,

        "revenueAtRisk": revenue_at_risk,

        "riskPriority": risk_priority,
        "riskSummary": risk_summary,
        "riskWhy": risk_why,
        "riskEvidence": risk_evidence,
        "hasRisk": has_risk,

        "adoptionStage": adoption_stage,

        "opportunities": opportunities,
        "opportunityValue": opportunity_value,
        "expansionReadiness": expansion_readiness,

        "anomalies": anomalies,
        "recommendedActions": actions,
    }


# ============================================================
# PORTFOLIO
# ============================================================

def compute_bundle():

    customers = [
        build(customer)
        for customer in CUSTOMERS_RAW
    ]

    total = len(customers)

    if total == 0:
        raise ValueError(
            "No customers found in PostgreSQL."
        )

    at_risk = [
        customer
        for customer in customers
        if customer["healthStatus"] == "At Risk"
    ]

    monitor = [
        customer
        for customer in customers
        if customer["healthStatus"] == "Monitor"
    ]

    healthy = [
        customer
        for customer in customers
        if customer["healthStatus"] == "Healthy"
    ]

    all_opportunities = [
        opportunity
        for customer in customers
        for opportunity in customer["opportunities"]
    ]

    all_actions = [
        action
        for customer in customers
        for action in customer["recommendedActions"]
    ]

    # --------------------------------------------------------
    # Expansion by type
    # --------------------------------------------------------

    expansion_by_type = []

    for opportunity_type in OPPORTUNITY_TYPES:

        matching = [
            opportunity
            for opportunity in all_opportunities
            if opportunity["type"] == opportunity_type
        ]

        expansion_by_type.append({
            "type": opportunity_type,
            "count": len(matching),
            "value": rnd(
                sum_by(
                    matching,
                    lambda opportunity: opportunity["value"]
                )
            ),
        })

    # --------------------------------------------------------
    # Revenue at risk by renewal bucket
    # --------------------------------------------------------

    buckets = [
        ("0–30 days", 0, 30),
        ("31–90 days", 31, 90),
        ("91–180 days", 91, 180),
        ("180+ days", 181, 100000),
    ]

    revenue_at_risk_by_bucket = []

    for label, low, high in buckets:

        items = [
            customer
            for customer in customers
            if low
            <= customer["daysToRenewal"]
            <= high
        ]

        revenue_at_risk_by_bucket.append({
            "bucket": label,
            "customers": len(items),
            "arr": rnd(
                sum_by(
                    items,
                    lambda customer: customer["arr"]
                )
            ),
            "revenueAtRisk": rnd(
                sum_by(
                    items,
                    lambda customer: customer["revenueAtRisk"]
                )
            ),
        })

    # --------------------------------------------------------
    # Portfolio health trend
    # --------------------------------------------------------

    health_trend = []

    for month_index_value in range(12):

        health = (
            sum_by(
                customers,
                lambda customer:
                customer["healthTrend"][month_index_value]["health"]
            )
            / total
        )

        health_trend.append({
            "month": MONTHS[month_index_value],
            "health": rnd(health),
        })

    # --------------------------------------------------------
    # Portfolio object
    # --------------------------------------------------------

    portfolio = {
        "totalCustomers": total,

        "customersAtRisk": len(at_risk),
        "customersMonitor": len(monitor),
        "customersHealthy": len(healthy),

        "revenueAtRisk": rnd(
            sum_by(
                customers,
                lambda customer:
                customer["revenueAtRisk"]
            )
        ),

        "totalArr": rnd(
            sum_by(
                customers,
                lambda customer:
                customer["arr"]
            )
        ),

        "totalOpportunities": len(
            all_opportunities
        ),

        "totalExpansionPotential": rnd(
            sum_by(
                all_opportunities,
                lambda opportunity:
                opportunity["value"]
            )
        ),

        "aiActionsPending": len(
            all_actions
        ),

        "avgHealthScore": rnd(
            sum_by(
                customers,
                lambda customer:
                customer["healthScore"]
            )
            / total
        ),

        "healthChange": rnd(
            sum_by(
                customers,
                lambda customer:
                customer["healthChange"]
            )
            / total,
            1
        ),

        "healthDistribution": [
            {
                "name": "Healthy",
                "value": len(healthy),
            },
            {
                "name": "Monitor",
                "value": len(monitor),
            },
            {
                "name": "At Risk",
                "value": len(at_risk),
            },
        ],

        "healthTrend": health_trend,

        "expansionByType": expansion_by_type,

        "revenueAtRiskByBucket":
            revenue_at_risk_by_bucket,

        "upcomingRenewals": len([
            customer
            for customer in customers
            if customer["daysToRenewal"] <= 90
        ]),

        "criticalTickets": rnd(
            sum_by(
                customers,
                lambda customer:
                customer["support"]["criticalTickets"]
            )
        ),

        "openTicketRate": rnd(
            sum_by(
                customers,
                lambda customer:
                customer["support"]["openTicketRate"]
            )
            / total,
            1
        ),

        "ticketGrowth": rnd(
            sum_by(
                customers,
                lambda customer:
                customer["support"]["ticketGrowth"]
            )
            / total,
            1
        ),
    }

    # --------------------------------------------------------
    # Actions
    # --------------------------------------------------------

    priority_order = {
        "High": 0,
        "Medium": 1,
        "Low": 2,
    }

    actions = sorted(
        all_actions,
        key=lambda action:
        priority_order[action["priority"]]
    )

    # --------------------------------------------------------
    # Opportunities
    # --------------------------------------------------------

    opportunities = [
        {
            **opportunity,
            "customerId": customer["id"],
            "customerName": customer["name"],
            "healthScore": customer["healthScore"],
            "segment": customer["segment"],
        }
        for customer in customers
        for opportunity in customer["opportunities"]
    ]

    # --------------------------------------------------------
    # Anomalies
    # --------------------------------------------------------

    anomalies = [
        {
            "id": (
                f"{customer['id']}-AN{i}"
            ),
            "customerId": customer["id"],
            "customerName": customer["name"],
            **anomaly,
        }
        for customer in customers
        for i, anomaly in enumerate(
            customer["anomalies"]
        )
    ]

    # --------------------------------------------------------
    # Insights
    # --------------------------------------------------------

    insights = []

    for customer in customers:

        if customer["healthStatus"] != "Healthy":

            insights.append({
                "id": (
                    f"{customer['id']}-INS-R"
                ),
                "type": "Risk",
                "customerId": customer["id"],
                "customerName": customer["name"],
                "insight": (
                    f"{customer['name']} "
                    f"{'has declining usage' if customer['usageGrowth'] < 0 else 'shows stalling usage'} "
                    "ahead of renewal"
                ),
                "why": customer["riskWhy"],
                "evidence": customer["riskEvidence"],
                "priority": customer["riskPriority"],
            })

        if customer["opportunities"]:

            opportunity = customer["opportunities"][0]

            insights.append({
                "id": (
                    f"{customer['id']}-INS-O"
                ),
                "type": "Opportunity",
                "customerId": customer["id"],
                "customerName": customer["name"],
                "insight": (
                    f"{customer['name']}: "
                    f"{opportunity['opportunity']}"
                ),
                "why": opportunity["why"],
                "evidence": [
                    {
                        **evidence,
                        "tone": "neutral",
                    }
                    for evidence in opportunity["evidence"]
                ],
                "priority": opportunity["priority"],
            })

        if customer["featureAdoption"] < 50:

            insights.append({
                "id": (
                    f"{customer['id']}-INS-A"
                ),
                "type": "Adoption",
                "customerId": customer["id"],
                "customerName": customer["name"],
                "insight": (
                    f"{customer['name']} has low feature adoption "
                    f"({customer['featureAdoption']}%)"
                ),
                "why": (
                    "Several available features are underused, "
                    "limiting realized value."
                ),
                "evidence": [
                    {
                        "label": feature["name"],
                        "value": (
                            f"{feature['adoptionPct']}%"
                        ),
                        "tone": "negative",
                    }
                    for feature in customer["adoptionGaps"][:3]
                ],
                "priority": (
                    "High"
                    if customer["featureAdoption"] < 40
                    else "Medium"
                ),
            })

    insights = sorted(
        insights,
        key=lambda insight:
        priority_order[insight["priority"]]
    )

    # --------------------------------------------------------
    # Portfolio usage trend
    # --------------------------------------------------------

    portfolio_usage_trend = []

    for i in range(12):

        usage_volume = rnd(
            sum_by(
                customers,
                lambda customer:
                customer["monthly"][i]["usageVolume"]
            )
        )

        active_users = rnd(
            sum_by(
                customers,
                lambda customer:
                customer["monthly"][i]["activeUsers"]
            )
        )

        if i == 0:

            usage_growth = 0

        else:

            previous_usage = rnd(
                sum_by(
                    customers,
                    lambda customer:
                    customer["monthly"][i - 1]["usageVolume"]
                )
            )

            usage_growth = (
                rnd(
                    (
                        usage_volume
                        - previous_usage
                    )
                    / previous_usage
                    * 100,
                    1
                )
                if previous_usage
                else 0
            )

        mau = active_users
        wau = rnd(mau * 0.63)
        dau = rnd(wau * 0.42)

        portfolio_usage_trend.append({
            "month": MONTHS[i],
            "usageVolume": usage_volume,
            "activeUsers": active_users,
            "usageGrowth": usage_growth,
            "dau": dau,
            "wau": wau,
            "mau": mau,
        })

    # --------------------------------------------------------
    # Portfolio feature metrics
    # --------------------------------------------------------

    portfolio_features = []

    for feature_name in FEATURE_NAMES:

        rows = [
            next(
                feature
                for feature in customer["features"]
                if feature["name"] == feature_name
            )
            for customer in customers
        ]

        eligible = rnd(
            sum_by(
                rows,
                lambda feature:
                feature["eligibleUsers"]
            )
        )

        adopters = rnd(
            sum_by(
                rows,
                lambda feature:
                feature["adopters"]
            )
        )

        adoption_pct = (
            adopters / eligible * 100
            if eligible
            else 0
        )

        portfolio_features.append({
            "feature": feature_name,
            "eligibleUsers": eligible,
            "adopters": adopters,
            "adoptionPct": rnd(
                adoption_pct,
                1
            ),
            "adoptionChange": rnd(
                avg([
                    feature["adoptionChange"]
                    for feature in rows
                ]),
                1
            ),
            "benchmark": rows[0]["benchmark"],
            "gap": rnd(
                max(
                    0,
                    rows[0]["benchmark"]
                    - adoption_pct
                ),
                1
            ),
            "usageVolume": rnd(
                sum_by(
                    rows,
                    lambda feature:
                    feature["usageVolume"]
                )
            ),
            "customersAffected": len([
                feature
                for feature in rows
                if feature["gap"] > 0
            ]),
        })

    # --------------------------------------------------------
    # Distributions
    # --------------------------------------------------------

    adoption_stage_distribution = [
        {
            "stage": stage,
            "count": len([
                customer
                for customer in customers
                if customer["adoptionStage"] == stage
            ]),
        }
        for stage in [
            "Onboarding",
            "Growing",
            "Established",
            "Power User",
        ]
    ]

    expansion_readiness_distribution = [
        {
            "readiness": readiness,
            "count": len([
                customer
                for customer in customers
                if customer["expansionReadiness"]
                == readiness
            ]),
        }
        for readiness in [
            "High",
            "Medium",
            "Low",
        ]
    ]

    # --------------------------------------------------------
    # Metadata
    # --------------------------------------------------------

    meta = {
        "MONTHS": MONTHS,
        "YEAR": YEAR,
        "PRODUCTS": PRODUCTS,
        "FEATURE_NAMES": FEATURE_NAMES,
        "SEGMENTS": SEGMENTS,
        "HEALTH_STATUSES": HEALTH_STATUSES,
        "OPPORTUNITY_TYPES": OPPORTUNITY_TYPES,
        "RENEWAL_BUCKETS": RENEWAL_BUCKETS,
        "referenceDate": REFERENCE_DATE.isoformat(),
    }

    return {
        "customers": customers,
        "portfolio": portfolio,
        "actions": actions,
        "opportunities": opportunities,
        "anomalies": anomalies,
        "insights": insights,
        "portfolioUsageTrend": portfolio_usage_trend,
        "portfolioFeatures": portfolio_features,
        "adoptionStageDistribution":
            adoption_stage_distribution,
        "expansionReadinessDistribution":
            expansion_readiness_distribution,
        "meta": meta,
    }


# ============================================================
# BUNDLE
# ============================================================

BUNDLE = compute_bundle()