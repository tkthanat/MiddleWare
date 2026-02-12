from sqlalchemy.orm import Session
from models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, user_data: dict):
    existing_user = get_user_by_username(db, user_data["username"])
    if existing_user:
        return None

    hashed_pwd = get_password_hash(user_data["password"])
    new_user = User(
        username=user_data["username"],
        hashed_password=hashed_pwd,
        full_name=user_data.get("full_name", ""),
        role="user",
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user