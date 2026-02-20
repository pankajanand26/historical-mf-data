from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import amc_router, analysis_router, expense_router

app = FastAPI(
    title="AMC Track Record Analysis API",
    description="Analyze and compare mutual fund performance across AMCs",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(amc_router)
app.include_router(analysis_router)
app.include_router(expense_router)


@app.get("/")
async def root():
    return {
        "message": "AMC Track Record Analysis API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
