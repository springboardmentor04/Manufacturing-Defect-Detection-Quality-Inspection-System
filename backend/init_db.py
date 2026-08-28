import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))

from app.database.session import engine, SessionLocal
from app.models.all_models import Base, Role, User
from app.core.security import get_password_hash

def init_db():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Create default roles
    roles = ["ADMIN", "QUALITY_ENGINEER", "SUPERVISOR", "OPERATOR"]
    for role_name in roles:
        if not db.query(Role).filter(Role.name == role_name).first():
            db.add(Role(name=role_name))
            
    db.commit()
    
    # Create default admin
    admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
    if admin_role and not db.query(User).filter(User.username == "admin").first():
        admin = User(
            username="admin",
            email="admin@visioninspect.local",
            hashed_password=get_password_hash("admin123"),
            role_id=admin_role.id
        )
        db.add(admin)
        db.commit()
        print("Admin user created (admin / admin123)")

if __name__ == "__main__":
    init_db()
