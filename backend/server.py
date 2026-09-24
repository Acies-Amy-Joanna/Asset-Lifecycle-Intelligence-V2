from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import Optional
from derive import BUNDLE


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')


# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")




class ActionOverride(BaseModel):
    status: Optional[str] = None
    owner: Optional[str] = None

async def _overrides_map():
    return {}

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
