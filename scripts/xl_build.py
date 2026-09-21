import openpyxl, json
from collections import defaultdict

wb = openpyxl.load_workbook("/tmp/ali.xlsx", read_only=True, data_only=True)

def rows(name):
    ws = wb[name]
    it = ws.iter_rows(values_only=True)
    header = next(it)
    return it

MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

# ---- Customer ----
cust = {}
for r in rows("Customer"):
    cid = r[0]
    cust[cid] = {
        "id": cid, "name": r[1], "industry": r[2], "segment": r[3],
        "country": r[4], "region": r[5], "employeeCount": r[6],
        "accountOwner": r[7], "customerSince": str(r[9])[:10],
    }

# ---- Features ----
features = {}
for r in rows("Product_Feature"):
    features[r[2]] = {"id": r[2], "name": r[3], "category": r[4], "product": r[1]}

# ---- Users per customer ----
user_count = defaultdict(int)
for r in rows("User"):
    user_count[r[1]] += 1

# ---- Subscription ----
for r in rows("Subscription_License"):
    cid = r[1]
    cust[cid]["subscription"] = {
        "product": r[2], "plan": r[3], "startDate": str(r[4])[:10], "endDate": str(r[5])[:10],
        "purchasedSeats": r[7], "assignedSeats": r[8], "activeSeats": r[9],
    }

# ---- Renewal ----
for r in rows("Renewal"):
    cid = r[1]
    cust[cid]["renewalDate"] = str(r[2])[:10]
    cust[cid]["renewalValue"] = r[3]

# ---- Commercial ----
for r in rows("Commercial"):
    cid = r[0]
    cust[cid]["arr"] = r[1]
    cust[cid]["revenueAtRisk"] = r[2]
    cust[cid]["expansionPotential"] = r[3]
    cust[cid]["upsellPotential"] = r[4]
    cust[cid]["crossSellPotential"] = r[5]

# ---- Usage aggregation ----
# monthly sessions/minutes + distinct active users; per-feature distinct adopters (year/last3/prev3) + sessions
month_sessions = defaultdict(lambda: defaultdict(int))   # cid -> midx -> sessions
month_minutes  = defaultdict(lambda: defaultdict(int))
month_users    = defaultdict(lambda: defaultdict(set))   # cid -> midx -> {users}
feat_year      = defaultdict(lambda: defaultdict(set))   # cid -> fid -> {users}
feat_last      = defaultdict(lambda: defaultdict(set))
feat_prev      = defaultdict(lambda: defaultdict(set))
feat_sessions  = defaultdict(lambda: defaultdict(int))

for r in rows("Usage"):
    cid, uid, fid = r[1], r[2], r[3]
    midx = int(str(r[4])[5:7]) - 1
    sessions = r[5] or 0
    minutes = r[6] or 0
    month_sessions[cid][midx] += sessions
    month_minutes[cid][midx] += minutes
    month_users[cid][midx].add(uid)
    feat_year[cid][fid].add(uid)
    feat_sessions[cid][fid] += sessions
    if midx >= 9:      # Oct-Dec
        feat_last[cid][fid].add(uid)
    elif 6 <= midx <= 8:  # Jul-Sep
        feat_prev[cid][fid].add(uid)

# ---- Support aggregation ----
sup_total = defaultdict(int); sup_open = defaultdict(int); sup_crit = defaultdict(int)
sup_month = defaultdict(lambda: defaultdict(int))
for r in rows("Support"):
    cid = r[1]; midx = int(str(r[2])[5:7]) - 1
    sev = r[4]; status = r[5]
    sup_total[cid] += 1
    sup_month[cid][midx] += 1
    if status in ("Open", "In Progress"): sup_open[cid] += 1
    if sev in ("Critical", "High"): sup_crit[cid] += 1

# ---- assemble ----
out = []
for cid, c in cust.items():
    c["totalUsers"] = user_count[cid]
    c["monthly"] = [{
        "month": MONTHS[m],
        "sessions": month_sessions[cid].get(m, 0),
        "minutes": month_minutes[cid].get(m, 0),
        "activeUsers": len(month_users[cid].get(m, set())),
    } for m in range(12)]
    c["features"] = [{
        "id": fid, "name": features[fid]["name"], "category": features[fid]["category"],
        "adoptersYear": len(feat_year[cid].get(fid, set())),
        "adoptersLast3": len(feat_last[cid].get(fid, set())),
        "adoptersPrev3": len(feat_prev[cid].get(fid, set())),
        "sessions": feat_sessions[cid].get(fid, 0),
    } for fid in sorted(features.keys())]
    c["support"] = {
        "total": sup_total[cid], "open": sup_open[cid], "critical": sup_crit[cid],
        "monthly": [sup_month[cid].get(m, 0) for m in range(12)],
        "lastMonth": sup_month[cid].get(11, 0), "prevMonth": sup_month[cid].get(10, 0),
    }
    out.append(c)

with open("/app/frontend/src/data/ali_data.json", "w") as f:
    json.dump(out, f, separators=(",", ":"))

print("wrote", len(out), "customers")
import os
print("size:", os.path.getsize("/app/frontend/src/data/ali_data.json"), "bytes")
print("sample monthly C001:", json.dumps(out[0]["monthly"]))
print("sample features C001:", json.dumps(out[0]["features"]))
print("sample support C001:", out[0]["support"])
print("commercial C001:", out[0]["arr"], out[0]["revenueAtRisk"], out[0]["expansionPotential"], out[0]["upsellPotential"], out[0]["crossSellPotential"])
