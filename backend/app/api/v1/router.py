"""Aggregates the v1 routers. Mounted under the prefix from settings."""

from fastapi import APIRouter

from app.api.v1 import notes, patients, summary

api_router = APIRouter()
api_router.include_router(patients.router)
api_router.include_router(notes.router)
api_router.include_router(summary.router)
