import mariadb
from fastapi import APIRouter, HTTPException

# from fastapi.responses import JSONResponse
from app.utils.helper_functions import uuid_to_bin
from db import get_connection
import uuid

router = APIRouter()


# Create user
@router.post("/")
def create_user(email: str, name: str):
    conn = get_connection()
    cur = conn.cursor()
    try:
        user_id = uuid.uuid4().bytes  # MariaDB BINARY(16)
        cur.execute(
            "INSERT INTO users (id, email, name) VALUES (?, ?, ?)",
            (user_id, email, name),
        )
        conn.commit()
        return {"id": uuid.UUID(bytes=user_id).hex, "email": email, "name": name}
    except mariadb.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already exists")
    finally:
        cur.close()
        conn.close()


# List conversations for a user
@router.get("/{user_id}/conversations")
def list_conversations(user_id: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, status, started_at FROM conversations WHERE user_id = ? ORDER BY started_at DESC",
        (uuid_to_bin(user_id),),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {"id": str(uuid.UUID(bytes=row[0])), "status": row[1], "createdAt": row[2]}
        for row in rows
    ]
