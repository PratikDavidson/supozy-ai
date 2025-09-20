import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

API_KEY = os.environ.get("GROQ_API_KEY")


class GroqClient:
    def __init__(self):
        self.client = Groq(api_key=API_KEY)

    async def add_user_message(self, messages, message):
        user_message = {"role": "user", "content": message}
        messages.append(user_message)

    async def add_assistant_message(self, messages, message, tool_calls):
        if tool_calls:
            assistant_message = {
                "role": "assistant",
                "content": message,
                "tool_calls": tool_calls,
            }
        else:
            assistant_message = {"role": "assistant", "content": message}
        messages.append(assistant_message)

    async def chat(self, messages, tools=None):
        params = {"model": "openai/gpt-oss-20b", "messages": messages}
        if tools:
            params["tools"] = tools
            params["tool_choice"] = "auto"

        chat_completion = self.client.chat.completions.create(**params)

        return chat_completion
