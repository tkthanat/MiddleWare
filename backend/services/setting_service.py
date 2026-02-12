from sqlalchemy.orm import Session
from database import SessionLocal
import models

def get_settings():
    db = SessionLocal()
    try:
        settings = db.query(models.SystemSetting).filter(models.SystemSetting.id == 1).first()
        if not settings:
            settings = models.SystemSetting(id=1)
            db.add(settings)
            db.commit()
            db.refresh(settings)
        return settings
    finally:
        db.close()

def update_settings(data: dict):
    db = SessionLocal()
    try:
        settings = db.query(models.SystemSetting).filter(models.SystemSetting.id == 1).first()
        if settings:
            for key, value in data.items():
                if hasattr(settings, key):
                    setattr(settings, key, value)
            db.commit()
            db.refresh(settings)
            return settings
    finally:
        db.close()