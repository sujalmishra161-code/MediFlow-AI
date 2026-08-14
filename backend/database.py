import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Use SQLite locally by default. Can easily be pointed to PostgreSQL by changing this env var.
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mediflow.db")
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{db_path}")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
