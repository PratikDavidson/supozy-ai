from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Body
from app.controllers.agent_controller import QueryAgent, EmbeddingAgent

# from fastapi.responses import JSONResponse
from db import get_connection
import uuid
from app.models.model import Message, SendMessageInput, StartConversationRequest
from app.utils.helper_functions import uuid_to_bin

router = APIRouter()


@router.get("/{conversation_id}/history", response_model=List[Message])
def get_chat_history(conversation_id: str):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, text, sender, created_at
        FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
    """,
        (uuid_to_bin(conversation_id),),
    )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    messages = [
        Message(
            id=row[0],
            text=row[1],
            sender=row[2],
            timestamp=row[3].isoformat() + "Z"
            if hasattr(row[3], "isoformat")
            else str(row[3]),
            status="sent",
        )
        for row in rows
    ]
    return messages


@router.post("/{conversation_id}/send")
async def send_message(conversation_id: str, data: SendMessageInput = Body(...)):
    conn = get_connection()
    cur = conn.cursor()

    # Get current timestamp once for consistency
    current_time = (
        datetime.now(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )

    # Insert user message
    cur.execute(
        """
        INSERT INTO messages (conversation_id, sender, text)
        VALUES (?, 'user', ?)
    """,
        (uuid_to_bin(conversation_id), data.text),
    )
    conn.commit()
    message_id = cur.lastrowid
    assistant_message = await QueryAgent.process_query(data.text)
    assistant_message = "Hello!"
    cur.execute(
        """
        INSERT INTO messages (conversation_id, sender, text)
        VALUES (?, 'assistant', ?)
    """,
        (uuid_to_bin(conversation_id), assistant_message),
    )
    conn.commit()
    assistant_id = cur.lastrowid

    cur.close()
    conn.close()

    return {
        "userMessage": {
            "id": message_id,
            "text": data.text,
            "sender": "user",
            "timestamp": current_time,
            "status": "sent",
        },
        "assistantMessage": {
            "id": assistant_id,
            "text": assistant_message,
            "sender": "assistant",
            "timestamp": current_time,
            "status": "sent",
        },
    }


@router.post("/start")
def start_conversation(req: StartConversationRequest):
    conn = get_connection()
    cur = conn.cursor()

    conversation_id = uuid.uuid4()
    cur.execute(
        """
        INSERT INTO conversations (id, user_id, status)
        VALUES (?, ?, 'active')
    """,
        (conversation_id.bytes, uuid_to_bin(req.user_id)),
    )
    conn.commit()
    cur.close()
    conn.close()

    return {"conversationId": str(conversation_id)}


# Close/archive conversation
@router.post("/{conversation_id}/close")
async def close_conversation(conversation_id: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE conversations SET status = 'closed' WHERE id = ?",
        (uuid_to_bin(conversation_id),),
    )
    conn.commit()
    await EmbeddingAgent(conversation_id)
    cur.close()
    conn.close()
    return {"conversationId": conversation_id, "status": "closed"}
