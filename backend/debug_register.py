import traceback
from database import SessionLocal, engine, Base
from models import User, Inspection
from routers.auth import register
from schemas.auth import UserRegisterRequest

Base.metadata.create_all(bind=engine)
session = SessionLocal()
try:
    request = UserRegisterRequest(
        email='user@example.com',
        password='string',
        full_name='string',
        role='QUALITY_ENGINEER'
    )
    user = register(request, session)
    print('OK', user)
except Exception as e:
    traceback.print_exc()
finally:
    session.close()
