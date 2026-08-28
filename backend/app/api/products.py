from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.all_models import Product, ProductionBatch
from app.schemas.all_schemas import ProductCreate, ProductResponse, BatchCreate, BatchResponse
from app.api.deps import get_current_active_user
from app.models.all_models import User

router = APIRouter()

@router.post("/", response_model=ProductResponse)
def create_product(product: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    db_product = Product(
        name=product.name,
        description=product.description,
        product_code=product.product_code,
        production_line=product.production_line,
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.get("/", response_model=List[ProductResponse])
def get_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Public endpoint: return products without requiring authentication so the
    # frontend can display the catalog in development/demo environments.
    return db.query(Product).offset(skip).limit(limit).all()

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
