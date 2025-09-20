from fastapi import HTTPException
import mariadb
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Access database environment variables
user = os.getenv("USER")
password = os.getenv("PASSWORD")
host = os.getenv("HOST")
port = int(os.getenv("PORT"))
database = os.getenv("DATABASE")


# Connect to your database
def get_connection():
    try:
        conn = mariadb.connect(
            user=user,
            password=password,
            host=host,
            port=port,
            database=database,
        )
        return conn
    except mariadb.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
