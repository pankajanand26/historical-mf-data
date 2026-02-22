from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import schemes_router, performance_router, portfolio_router

app = FastAPI(
    title="Performance Attribution & Benchmarking API",
    description="Compute rolling returns and benchmark mutual fund schemes against user-selected index funds",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(schemes_router)
app.include_router(performance_router)
app.include_router(portfolio_router)


@app.get("/")
async def root():
    return {
        "message": "Performance Attribution & Benchmarking API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
