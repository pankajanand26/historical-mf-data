from fastapi import APIRouter, HTTPException, Query
from app.models.performance import SchemeResult, SchemeSearchResponse, IndexFundResult, IndexFundListResponse
from app.services.benchmarking import search_schemes, get_index_funds

router = APIRouter(prefix="/api/schemes", tags=["Schemes"])


@router.get("/search", response_model=SchemeSearchResponse)
def search_funds(
    q: str = Query(..., min_length=2, description="Fund name search query"),
    limit: int = Query(20, ge=1, le=100),
):
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty")

    rows = search_schemes(q.strip(), limit=limit)
    results = [
        SchemeResult(
            scheme_code=r["scheme_code"],
            scheme_name=r["scheme_name"],
        )
        for r in rows
    ]
    return SchemeSearchResponse(results=results, total=len(results))


@router.get("/index-funds", response_model=IndexFundListResponse)
def list_index_funds(
    limit: int = Query(200, ge=1, le=500),
):
    rows = get_index_funds(limit=limit)
    results = [
        IndexFundResult(
            scheme_code=r["scheme_code"],
            scheme_name=r["scheme_name"],
        )
        for r in rows
    ]
    return IndexFundListResponse(results=results, total=len(results))
