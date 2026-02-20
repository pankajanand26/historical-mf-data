from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.models.metrics import ExpenseDragData, ExpenseDragPoint
from app.services.expense_drag import find_direct_regular_pairs, calculate_expense_drag

router = APIRouter(prefix="/api/expense", tags=["Expense Drag"])


@router.get("/pairs/{amc_name}")
async def get_direct_regular_pairs(amc_name: str):
    pairs = find_direct_regular_pairs(amc_name)
    
    if not pairs:
        raise HTTPException(
            status_code=404,
            detail=f"No Direct/Regular pairs found for AMC: {amc_name}"
        )
    
    return {"amc_name": amc_name, "pairs": pairs, "total": len(pairs)}


@router.get("/drag/{amc_name}", response_model=ExpenseDragData)
async def get_expense_drag(
    amc_name: str,
    scheme_name: Optional[str] = Query(None, description="Specific scheme name to analyze"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    pairs = find_direct_regular_pairs(amc_name)
    
    if not pairs:
        raise HTTPException(
            status_code=404,
            detail=f"No Direct/Regular pairs found for AMC: {amc_name}"
        )
    
    if scheme_name:
        matching_pairs = [p for p in pairs if scheme_name.lower() in p["scheme_name"].lower()]
        if not matching_pairs:
            raise HTTPException(
                status_code=404,
                detail=f"No matching scheme found: {scheme_name}"
            )
        pairs = matching_pairs[:1]
    
    all_time_series = []
    total_drag = 0
    count = 0
    
    for pair in pairs[:5]:
        drag_data = calculate_expense_drag(
            pair["direct_code"],
            pair["regular_code"],
            start_date,
            end_date
        )
        
        if drag_data["time_series"]:
            all_time_series.extend([
                ExpenseDragPoint(
                    date=point["date"],
                    direct_nav=point["direct_nav"],
                    regular_nav=point["regular_nav"],
                    expense_drag=point["expense_drag"],
                    expense_drag_percent=point["expense_drag_percent"],
                )
                for point in drag_data["time_series"]
            ])
            total_drag += drag_data["total_expense_drag"] or 0
            count += 1
    
    avg_drag = total_drag / count if count > 0 else 0
    
    return ExpenseDragData(
        amc_name=amc_name,
        scheme_pairs=pairs[:5],
        time_series=all_time_series,
        average_expense_drag=avg_drag,
        total_expense_drag=total_drag,
    )
