import openpyxl
from collections import defaultdict
wb = openpyxl.load_workbook("/tmp/ali.xlsx", read_only=True, data_only=True)

def rows(name):
    ws = wb[name]
    it = ws.iter_rows(values_only=True)
    header = next(it)
    return header, it

# features
h, it = rows("Product_Feature")
print("FEATURES:")
for r in it:
    print("  ", r)

# usage date range + months
h, it = rows("Usage")
months = set(); custs = set(); minv=None; maxv=None; n=0
for r in it:
    n += 1
    d = str(r[4])[:10]
    months.add(d[:7]); custs.add(r[1])
    if minv is None or d < minv: minv = d
    if maxv is None or d > maxv: maxv = d
print("USAGE rows:", n, "date range:", minv, "->", maxv)
print("USAGE months:", sorted(months))
print("USAGE customers:", sorted(custs))

# support statuses/severities + date range
h, it = rows("Support")
st=defaultdict(int); sev=defaultdict(int); smin=None;smax=None
for r in it:
    st[r[5]]+=1; sev[r[4]]+=1
    d=str(r[2])[:10]
    if smin is None or d<smin: smin=d
    if smax is None or d>smax: smax=d
print("SUPPORT status:", dict(st))
print("SUPPORT severity:", dict(sev))
print("SUPPORT date range:", smin, "->", smax)

# users per customer
h, it = rows("User")
uc=defaultdict(int)
for r in it: uc[r[1]]+=1
print("USERS per customer:", dict(uc))

# all customers full
h, it = rows("Customer")
print("CUSTOMER cols:", h)
for r in it: print("  ", r)
