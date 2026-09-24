import pandas as pd
import psycopg2


EXCEL_FILE = r"C:\Users\Amy\Documents\VLabs\ALI_Udemy_MVP_Mock_Data_Final.xlsx"

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "ali_customer_intelligence",
    "user": "postgres",
    "password": "psqlpassword"
}


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


def to_date(value):
    """
    Convert pandas date/timestamp values to Python date.
    Return None for blank/NaT values.
    """
    if pd.isna(value):
        return None

    return pd.to_datetime(value).date()


def load_data():

    print("Reading Excel file...")

    # -------------------------
    # Read Excel sheets
    # -------------------------

    customer = pd.read_excel(
        EXCEL_FILE,
        sheet_name="Customer"
    )

    product_feature = pd.read_excel(
        EXCEL_FILE,
        sheet_name="Product_Feature"
    )

    users = pd.read_excel(
        EXCEL_FILE,
        sheet_name="User"
    )

    usage = pd.read_excel(
        EXCEL_FILE,
        sheet_name="Usage"
    )

    subscription = pd.read_excel(
        EXCEL_FILE,
        sheet_name="Subscription_License"
    )

    renewal = pd.read_excel(
        EXCEL_FILE,
        sheet_name="Renewal"
    )

    commercial = pd.read_excel(
        EXCEL_FILE,
        sheet_name="Commercial"
    )

    support = pd.read_excel(
        EXCEL_FILE,
        sheet_name="Support"
    )

    print("Excel loaded successfully.")

    print(f"Customer: {len(customer)} rows")
    print(f"Product_Feature: {len(product_feature)} rows")
    print(f"User: {len(users)} rows")
    print(f"Usage: {len(usage)} rows")
    print(f"Subscription_License: {len(subscription)} rows")
    print(f"Renewal: {len(renewal)} rows")
    print(f"Commercial: {len(commercial)} rows")
    print(f"Support: {len(support)} rows")

    # -------------------------
    # Convert date columns
    # -------------------------

    customer["customer_since"] = customer["customer_since"].apply(to_date)

    usage["date"] = usage["date"].apply(to_date)

    subscription["start_date"] = subscription["start_date"].apply(to_date)
    subscription["end_date"] = subscription["end_date"].apply(to_date)

    renewal["renewal_date"] = renewal["renewal_date"].apply(to_date)

    support["date"] = support["date"].apply(to_date)
    support["resolved_date"] = support["resolved_date"].apply(to_date)

    # -------------------------
    # Database connection
    # -------------------------

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # =====================================================
        # CUSTOMER
        # =====================================================

        print("\nLoading Customer...")

        for _, row in customer.iterrows():

            cursor.execute(
                """
                INSERT INTO customer (
                    customer_id,
                    customer_name,
                    industry,
                    segment,
                    country,
                    region,
                    employee_count,
                    account_owner,
                    customer_since,
                    customer_status
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    row["customer_id"],
                    row["customer_name"],
                    row["industry"],
                    row["segment"],
                    row["country"],
                    row["region"],
                    row["employee_count"],
                    row["account_owner"],
                    row["customer_since"],
                    row["customer_status"]
                )
            )

        print(f"Customer loaded: {len(customer)}")


        # =====================================================
        # PRODUCT FEATURE
        # =====================================================

        print("Loading Product_Feature...")

        for _, row in product_feature.iterrows():

            cursor.execute(
                """
                INSERT INTO product_feature (
                    product_id,
                    product_name,
                    feature_id,
                    feature_name,
                    feature_category
                )
                VALUES (%s,%s,%s,%s,%s)
                """,
                (
                    row["product_id"],
                    row["product_name"],
                    row["feature_id"],
                    row["feature_name"],
                    row["feature_category"]
                )
            )

        print(f"Product_Feature loaded: {len(product_feature)}")


        # =====================================================
        # USER
        # =====================================================

        print("Loading User...")

        for _, row in users.iterrows():

            cursor.execute(
                """
                INSERT INTO app_user (
                    user_id,
                    customer_id,
                    department,
                    role,
                    region,
                    status
                )
                VALUES (%s,%s,%s,%s,%s,%s)
                """,
                (
                    row["user_id"],
                    row["customer_id"],
                    row["department"],
                    row["role"],
                    row["region"],
                    row["status"]
                )
            )

        print(f"User loaded: {len(users)}")


        # =====================================================
        # USAGE
        # =====================================================

        print("Loading Usage...")

        for _, row in usage.iterrows():

            cursor.execute(
                """
                INSERT INTO usage (
                    usage_id,
                    customer_id,
                    user_id,
                    feature_id,
                    usage_date,
                    sessions,
                    minutes,
                    actions
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    row["usage_id"],
                    row["customer_id"],
                    row["user_id"],
                    row["feature_id"],
                    row["date"],
                    row["sessions"],
                    row["minutes"],
                    row["actions"]
                )
            )

        print(f"Usage loaded: {len(usage)}")


        # =====================================================
        # SUBSCRIPTION LICENSE
        # =====================================================

        print("Loading Subscription_License...")

        for _, row in subscription.iterrows():

            cursor.execute(
                """
                INSERT INTO subscription_license (
                    subscription_id,
                    customer_id,
                    product,
                    plan,
                    start_date,
                    end_date,
                    status,
                    purchased_seats,
                    assigned_seats,
                    active_seats
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    row["subscription_id"],
                    row["customer_id"],
                    row["product"],
                    row["plan"],
                    row["start_date"],
                    row["end_date"],
                    row["status"],
                    row["purchased_seats"],
                    row["assigned_seats"],
                    row["active_seats"]
                )
            )

        print(f"Subscription_License loaded: {len(subscription)}")


        # =====================================================
        # RENEWAL
        # =====================================================

        print("Loading Renewal...")

        for _, row in renewal.iterrows():

            cursor.execute(
                """
                INSERT INTO renewal (
                    renewal_id,
                    customer_id,
                    renewal_date,
                    renewal_value,
                    status
                )
                VALUES (%s,%s,%s,%s,%s)
                """,
                (
                    row["renewal_id"],
                    row["customer_id"],
                    row["renewal_date"],
                    row["renewal_value"],
                    row["status"]
                )
            )

        print(f"Renewal loaded: {len(renewal)}")


        # =====================================================
        # COMMERCIAL
        # =====================================================

        print("Loading Commercial...")

        for _, row in commercial.iterrows():

            cursor.execute(
                """
                INSERT INTO commercial (
                    customer_id,
                    arr,
                    currency
                )
                VALUES (%s,%s,%s)
                """,
                (
                    row["customer_id"],
                    row["ARR"],
                    row["currency"]
                )
            )

        print(f"Commercial loaded: {len(commercial)}")


        # =====================================================
        # SUPPORT
        # =====================================================

        print("Loading Support...")

        for _, row in support.iterrows():

            cursor.execute(
                """
                INSERT INTO support (
                    ticket_id,
                    customer_id,
                    ticket_date,
                    resolved_date,
                    category,
                    severity,
                    status
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    row["ticket_id"],
                    row["customer_id"],
                    row["date"],
                    row["resolved_date"],
                    row["category"],
                    row["severity"],
                    row["status"]
                )
            )

        print(f"Support loaded: {len(support)}")


        # =====================================================
        # COMMIT
        # =====================================================

        conn.commit()

        print("\n===================================")
        print("ALL DATA LOADED SUCCESSFULLY")
        print("===================================")


    except Exception as e:

        conn.rollback()

        print("\n===================================")
        print("ERROR — TRANSACTION ROLLED BACK")
        print("===================================")
        print(e)

        raise


    finally:

        cursor.close()
        conn.close()


if __name__ == "__main__":
    load_data()