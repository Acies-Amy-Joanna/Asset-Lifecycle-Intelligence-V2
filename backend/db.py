import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv


load_dotenv()


DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "database": os.getenv("POSTGRES_DB", "ali_customer_intelligence"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD"),
}


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


def fetch_all(query, params=None):
    """
    Execute a SELECT query and return rows as dictionaries.
    """

    conn = get_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            return cursor.fetchall()

    finally:
        conn.close()


def fetch_customers():
    return fetch_all(
        """
        SELECT
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
        FROM customer
        ORDER BY customer_id;
        """
    )


def fetch_product_features():
    return fetch_all(
        """
        SELECT
            product_id,
            product_name,
            feature_id,
            feature_name,
            feature_category
        FROM product_feature
        ORDER BY feature_id;
        """
    )


def fetch_users():
    return fetch_all(
        """
        SELECT
            user_id,
            customer_id,
            department,
            role,
            region,
            status
        FROM app_user
        ORDER BY user_id;
        """
    )


def fetch_usage():
    return fetch_all(
        """
        SELECT
            usage_id,
            customer_id,
            user_id,
            feature_id,
            usage_date,
            sessions,
            minutes,
            actions
        FROM usage
        ORDER BY usage_date, customer_id, user_id, feature_id;
        """
    )


def fetch_subscriptions():
    return fetch_all(
        """
        SELECT
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
        FROM subscription_license
        ORDER BY subscription_id;
        """
    )


def fetch_renewals():
    return fetch_all(
        """
        SELECT
            renewal_id,
            customer_id,
            renewal_date,
            renewal_value,
            status
        FROM renewal
        ORDER BY renewal_date;
        """
    )


def fetch_commercial():
    return fetch_all(
        """
        SELECT
            customer_id,
            arr,
            currency
        FROM commercial
        ORDER BY customer_id;
        """
    )


def fetch_support():
    return fetch_all(
        """
        SELECT
            ticket_id,
            customer_id,
            ticket_date,
            resolved_date,
            category,
            severity,
            status
        FROM support
        ORDER BY ticket_date;
        """
    )


def fetch_all_data():
    """
    Load all raw ALI data from PostgreSQL.
    """

    return {
        "customers": fetch_customers(),
        "features": fetch_product_features(),
        "users": fetch_users(),
        "usage": fetch_usage(),
        "subscriptions": fetch_subscriptions(),
        "renewals": fetch_renewals(),
        "commercial": fetch_commercial(),
        "support": fetch_support(),
    }