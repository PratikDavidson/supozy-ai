from typing import Optional
from pydantic import BaseModel


class Message(BaseModel):
    id: int
    text: str
    sender: str
    timestamp: str
    status: Optional[str] = "sent"


class SendMessageInput(BaseModel):
    text: str


class StartConversationRequest(BaseModel):
    user_id: str
