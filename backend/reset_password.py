import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

async def reset():
    mongo_url = os.getenv('MONGODB_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.getenv('DATABASE_NAME', 'visioninspect_db')]
    
    # Generate the exact hash for the password the user is typing
    new_hash = pwd_context.hash('Shivam@9080')
    
    # Update the user record
    result = await db.users.update_one(
        {'email': 'divyanshutrip2003@gmail.com'}, 
        {'$set': {'hashed_password': new_hash}}
    )
    
    print('Password reset successfully! Modified count:', result.modified_count)
    
    # Verify it works immediately
    updated_user = await db.users.find_one({'email': 'divyanshutrip2003@gmail.com'})
    if updated_user:
        print('Verification successful:', pwd_context.verify('Shivam@9080', updated_user['hashed_password']))
    else:
        print('User not found after update.')
        
    client.close()

asyncio.run(reset())
