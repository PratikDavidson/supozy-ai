from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chat_route
from app.routers import user_route

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_route.router, prefix="/api/chat", tags=["Chat"])
app.include_router(user_route.router, prefix="/api/user", tags=["User"])


@app.get("/", tags=["Root"])
async def root():
    return {"message": "Hello World"}
