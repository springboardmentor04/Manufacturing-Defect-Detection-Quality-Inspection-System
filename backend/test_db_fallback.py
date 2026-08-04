import asyncio
import importlib


def test_database_fallback_uses_in_memory_users_when_db_has_no_match():
    module = importlib.import_module('database')

    class DummyCollection:
        async def find_one(self, *args, **kwargs):
            return None

        async def insert_one(self, *args, **kwargs):
            raise RuntimeError('simulated db outage')

        async def count_documents(self, *args, **kwargs):
            return 0

    class DummyDb:
        users = DummyCollection()
        inspections = DummyCollection()

    module.db = DummyDb()

    async def run_checks():
        from main import login_user

        user = await login_user(
            type('Login', (), {'email': 'engineer@factory.com', 'password': 'password123'})()
        )
        assert user.user.email == 'engineer@factory.com'

    asyncio.run(run_checks())


def test_database_errors_are_exposed_when_fallback_disabled():
    module = importlib.import_module('database')
    import main

    class DummyCollection:
        async def find_one(self, *args, **kwargs):
            raise RuntimeError('simulated db outage')

        async def insert_one(self, *args, **kwargs):
            raise RuntimeError('simulated db outage')

        async def count_documents(self, *args, **kwargs):
            raise RuntimeError('simulated db outage')

    class DummyDb:
        users = DummyCollection()
        inspections = DummyCollection()

    module.db = DummyDb()
    main.USE_IN_MEMORY_FALLBACK = False

    async def run_checks():
        try:
            await main._store_user({'email': 'x@example.com'})
        except RuntimeError as exc:
            assert 'MongoDB' in str(exc)
        else:
            raise AssertionError('Expected MongoDB error to be raised when fallback is disabled')

    asyncio.run(run_checks())
