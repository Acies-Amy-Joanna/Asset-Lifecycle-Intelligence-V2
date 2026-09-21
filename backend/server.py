from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from derive import BUNDLE


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str


class ActionOverride(BaseModel):
    status: Optional[str] = None
    owner: Optional[str] = None


async def _overrides_map():
    docs = await db.action_overrides.find({}, {"_id": 0}).to_list(2000)
    return {d["action_id"]: {k: v for k, v in d.items() if k != "action_id"} for d in docs}


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "ALI Customer Intelligence API"}


@api_router.get("/bootstrap")
async def bootstrap():
    """All derived intelligence + shared action overrides in one call."""
    return {**BUNDLE, "actionOverrides": await _overrides_map()}


@api_router.get("/customers")
async def get_customers():
    return BUNDLE["customers"]


@api_router.get("/customers/{customer_id}")
async def get_customer(customer_id: str):
    c = next((c for c in BUNDLE["customers"] if c["id"] == customer_id), None)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return c


@api_router.get("/portfolio")
async def get_portfolio():
    return BUNDLE["portfolio"]


@api_router.get("/actions")
async def get_actions():
    return {"actions": BUNDLE["actions"], "actionOverrides": await _overrides_map()}


@api_router.get("/action-overrides")
async def get_action_overrides():
    return await _overrides_map()


@api_router.put("/actions/{action_id}")
async def update_action(action_id: str, patch: ActionOverride):
    """Shared (team-wide) action status/owner, persisted in MongoDB."""
    update = {k: v for k, v in patch.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.action_overrides.update_one(
        {"action_id": action_id}, {"$set": {"action_id": action_id, **update}}, upsert=True
    )
    doc = await db.action_overrides.find_one({"action_id": action_id}, {"_id": 0, "action_id": 0})
    return {"action_id": action_id, **(doc or {})}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()