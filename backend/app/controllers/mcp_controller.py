import json

# import asyncio
from fastmcp import Client
from fastmcp.client.transports import StreamableHttpTransport
from app.controllers.groq_controller import GroqClient


class MariadbMCPClient:
    def __init__(self, url):
        self.transport = StreamableHttpTransport(url=url)
        self.client = Client(self.transport)
        self.grok_client = GroqClient()
        self._connected = False

    async def __aenter__(self):
        """Async context manager entry"""
        await self.client.__aenter__()
        self._connected = True
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        self._connected = False
        return await self.client.__aexit__(exc_type, exc_val, exc_tb)

    async def connect(self):
        """Alternative connection method"""
        if not self._connected:
            await self.client.__aenter__()
            self._connected = True

    async def disconnect(self):
        """Alternative disconnection method"""
        if self._connected:
            await self.client.__aexit__(None, None, None)
            self._connected = False

    async def get_tools(self):
        if not self._connected:
            raise RuntimeError(
                "Client not connected. Use 'async with client:' or call connect() first."
            )

        tools = await self.client.list_tools()
        formatted_tools = []

        for tool in tools:
            parameters = (
                tool.inputSchema
                if tool.inputSchema
                else {"type": "object", "properties": {}, "required": []}
            )

            if "type" not in parameters:
                parameters["type"] = "object"
            if "properties" not in parameters:
                parameters["properties"] = {}
            if "required" not in parameters:
                parameters["required"] = []

            formatted_tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description or f"Execute {tool.name}",
                        "parameters": parameters,
                    },
                }
            )

        return formatted_tools

    async def run_tools(self, tool_calls):
        if not self._connected:
            raise RuntimeError(
                "Client not connected. Use 'async with client:' or call connect() first."
            )

        tool_results = []
        for tool_call in tool_calls:
            print(f"# Executing tool: {tool_call.function.name}")
            try:
                tool_result = await self.client.call_tool(
                    tool_call.function.name, json.loads(tool_call.function.arguments)
                )
                tool_results.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": tool_result.content[0].text,
                    }
                )
            except Exception as e:
                tool_results.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(
                            {"error": str(e), "tool": tool_call.function.name}
                        ),
                    }
                )
        return tool_results

    async def process(self, data, messages):
        tools = await self.get_tools()

        if data:
            await self.grok_client.add_user_message(messages, data)

        while True:
            response = await self.grok_client.chat(messages, tools=tools)

            await self.grok_client.add_assistant_message(
                messages,
                response.choices[0].message.content,
                response.choices[0].message.tool_calls,
            )
            if response.choices[0].finish_reason != "tool_calls":
                break

            tool_results = await self.run_tools(response.choices[0].message.tool_calls)

            messages.extend(tool_results)

        return response.choices[0].message.content, messages


# async def main():
#    async with MariadbMCPClient(url="http://127.0.0.1:9090/mcp") as agent:
#        messages = [
#            {
#                "role": "system",
#                "content": """You are a mariadb SQL expert and use only (insert_docs_vector_store, execute_sql tools, get_table_schema, get_table_schema_with_relations) to perform the task on the database "supozy_db".
#                                      <task>
#                                          1. List messages of conversation_id(df482017-fff1-4039-8e28-5233c54dcf2c) from table 'messages'.
#                                          2. Analyze the user & assistant messages very carefully and transform it into a single query/resolution data.
#                                          3. Analyze the vector store 'conversation_embeddings'.
#                                          4. Generate embeddings on the transformed data and insert into vector store 'conversation_embeddings' using insert_docs_vector_store.
#                                      </task>
#                                      <insert_docs_vector_store_schema>
#                                           {
#                                              "tool": "insert_docs_vector_store",
#                                              "parameters": {
#                                                "database_name": "test_db",
#                                                "vector_store_name": "my_vectors",
#                                                "documents": ["Sample text 1", "Sample text 2"],
#                                                "metadata": [{"source": "doc1"}, {"source": "doc2"}]
#                                              }
#                                            }
#                                      </insert_docs_vector_store_schema>
#
#                                      FOLLOW the order of task.
#                                      DO NOT USE any delete or create tools under any circumstance.""",
#            }
#        ]
#        response, messages = await agent.process("", messages)
#
#
## Run the async function
# if __name__ == "__main__":
#    asyncio.run(main())
