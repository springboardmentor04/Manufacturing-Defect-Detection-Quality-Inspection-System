#!/usr/bin/env python3
import asyncio
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_mongodb():
    try:
        from backend.database import client
        result = await client.admin.command('ping')
        print('✓ MongoDB connected:', result)
        return True
    except Exception as e:
        print(f'✗ MongoDB connection failed: {e}')
        return False

if __name__ == '__main__':
    success = asyncio.run(test_mongodb())
    sys.exit(0 if success else 1)
