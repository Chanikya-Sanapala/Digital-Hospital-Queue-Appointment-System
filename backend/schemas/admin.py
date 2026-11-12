from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class AdminDashboardMetrics(BaseModel):
    total_appointments_today: int
    waiting_customers: int
    completed_services: int
    average_waiting_time_minutes: float
    total_registered_customers: int

class DepartmentPerformance(BaseModel):
    department_id: str
    department_name: str
    total_tokens: int
    completed_tokens: int
    waiting_tokens: int
    avg_service_duration_minutes: float

class AdminAnalyticsResponse(BaseModel):
    total_appointments: int
    completed_appointments: int
    cancelled_appointments: int
    missed_appointments: int
    average_waiting_time_minutes: float
    average_service_duration_minutes: float
    department_performance: List[DepartmentPerformance]
    daily_volume: List[Dict[str, Any]]

