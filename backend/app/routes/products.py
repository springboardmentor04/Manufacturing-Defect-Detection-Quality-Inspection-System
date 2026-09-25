from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..database import get_db
from ..dependencies import current_user
from ..models import Product

router = APIRouter(prefix="/api/products", tags=["Products"])

@router.get("")
def list_products(db: Session = Depends(get_db), user = Depends(current_user)):
    products = db.scalars(select(Product).order_by(Product.product_code)).all()
    return [{
        "id": p.id,
        "product_code": p.product_code,
        "product_name": p.product_name,
        "product_category": p.product_category,
        "production_line": p.production_line
    } for p in products]
