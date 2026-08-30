"""
Integration tests for FastAPI router endpoints and analytics logic using AsyncClient.
"""
import unittest
from unittest.mock import patch, MagicMock, AsyncMock
from bson import ObjectId
import httpx

from app.main import app
from app.models.user import UserRole
from app.utils.security import create_access_token


class MockAsyncCursor:
    def __init__(self, items):
        self.items = items

    def sort(self, *args, **kwargs):
        return self

    def skip(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    async def __aiter__(self):
        for item in self.items:
            yield item


class TestAPIEndpoints(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        transport = httpx.ASGITransport(app=app)
        self.client = httpx.AsyncClient(transport=transport, base_url="http://testserver")

        self.eng_id = str(ObjectId())
        self.sup_id = str(ObjectId())

        self.engineer_token = create_access_token(
            data={"sub": self.eng_id, "role": UserRole.QUALITY_ENGINEER.value, "full_name": "Quality Engineer User"}
        )
        self.supervisor_token = create_access_token(
            data={"sub": self.sup_id, "role": UserRole.FACTORY_SUPERVISOR.value, "full_name": "Plant Supervisor"}
        )

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_health_check(self):
        response = await self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")

    async def test_unauthenticated_request_rejected(self):
        response = await self.client.get("/api/inspections")
        self.assertEqual(response.status_code, 401)

    @patch("app.utils.dependencies.users_collection")
    @patch("app.routers.inspections.inspections_collection")
    async def test_list_inspections_quality_engineer(self, mock_inspections, mock_users):
        mock_users.find_one = AsyncMock(
            return_value={
                "_id": ObjectId(self.eng_id),
                "email": "eng@factory.com",
                "full_name": "Quality Engineer User",
                "role": UserRole.QUALITY_ENGINEER.value,
                "is_active": True,
            }
        )

        mock_cursor = MockAsyncCursor([
            {
                "_id": ObjectId("507f1f77bcf86cd799439011"),
                "product_name": "Screw",
                "image_filename": "sample.jpg",
                "uploaded_by": self.eng_id,
                "uploaded_by_name": "Quality Engineer User",
                "status": "pass",
                "severity_score": 0.0,
                "severity_level": "Low",
                "source": "manual_upload",
                "created_at": "2026-08-25T12:00:00Z",
            }
        ])

        mock_inspections.count_documents = AsyncMock(return_value=1)
        mock_inspections.find = MagicMock(return_value=mock_cursor)

        response = await self.client.get(
            "/api/inspections",
            headers={"Authorization": f"Bearer {self.engineer_token}"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["items"][0]["product_name"], "Screw")
        self.assertEqual(data["items"][0]["severity_level"], "Low")

    @patch("app.utils.dependencies.users_collection")
    @patch("app.routers.analytics.inspections_collection")
    async def test_get_quality_metrics(self, mock_inspections, mock_users):
        mock_users.find_one = AsyncMock(
            return_value={
                "_id": ObjectId(self.sup_id),
                "email": "sup@factory.com",
                "full_name": "Plant Supervisor",
                "role": UserRole.FACTORY_SUPERVISOR.value,
                "is_active": True,
            }
        )
        mock_inspections.count_documents = AsyncMock(return_value=10)

        def mock_aggregate(pipeline):
            class AsyncAgg:
                def __aiter__(self):
                    async def gen():
                        yield {"_id": None, "avg": 25.5}

                    return gen()

            return AsyncAgg()

        mock_inspections.aggregate = mock_aggregate

        response = await self.client.get(
            "/api/analytics/quality-metrics",
            headers={"Authorization": f"Bearer {self.supervisor_token}"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("quality_index", data)
        self.assertIn("pass_rate_pct", data)
        self.assertIn("avg_inspection_time_ms", data)


if __name__ == "__main__":
    unittest.main()
